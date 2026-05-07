#!/usr/bin/env python3
"""
El Pollo Loco 完整爬虫
- 使用 Playwright 浏览器自动化爬取所有菜品
- 从详细页面获取图片和描述
- 点击 Nutrition Info 按钮获取营养信息
- 下载图片到本地
- 保存为 Excel
"""

import asyncio
from playwright.async_api import async_playwright
import pandas as pd
import os
import time
from datetime import datetime
import logging
import re
import aiohttp

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ElPolloLocoScraper:
    def __init__(self):
        self.base_url = "https://www.elpolloloco.com"
        self.menu_url = "https://www.elpolloloco.com/our-food/"

        # 所有分类页面
        self.categories = [
            {"name": "Mango Habanero Chicken Meals", "url": "/our-food/mango-habanero-chicken-meals"},
            {"name": "Mango Habanero Family Chicken Meals", "url": "/our-food/mango-habanero-family-chicken-meals"},
            {"name": "Tostadas & Salads", "url": "/our-food/tostadas"},
            {"name": "Quesadillas & Nachos", "url": "/our-food/quesadillas-and-nachos"},
            {"name": "Chicken Meals", "url": "/our-food/individual-chicken"},
            {"name": "Family Meals", "url": "/our-food/family-dinners"},
            {"name": "Bowls", "url": "/our-food/bowls"},
            {"name": "Burritos", "url": "/our-food/burritos"},
            {"name": "Fire-Grilled Combos", "url": "/our-food/Fire-Grilled-Combos"},
            {"name": "Tacos", "url": "/our-food/tacos"},
            {"name": "Snacks & Sweets", "url": "/our-food/Snacks-Sweets"},
            {"name": "Kids Meals", "url": "/our-food/kids-meals"},
            {"name": "Sides, Drinks & Salsas", "url": "/our-food/sides-drinks-salsas"},
        ]

        self.images_dir = "images"
        os.makedirs(self.images_dir, exist_ok=True)

        self.foods_data = []

    async def download_image(self, session, image_url, food_name):
        """异步下载图片"""
        try:
            # 清理文件名
            safe_filename = re.sub(r'[^\w\s-]', '', food_name).strip().replace(' ', '_')
            filename = f"{safe_filename}.jpg"
            filepath = os.path.join(self.images_dir, filename)

            # 如果文件已存在，跳过
            if os.path.exists(filepath):
                logger.info(f"图片已存在: {filename}")
                return filepath

            # 下载图片
            async with session.get(image_url) as response:
                if response.status == 200:
                    content = await response.read()
                    with open(filepath, 'wb') as f:
                        f.write(content)
                    logger.info(f"已下载图片: {filename}")
                    return filepath
                else:
                    logger.error(f"下载图片失败 {image_url}: HTTP {response.status}")
                    return None

        except Exception as e:
            logger.error(f"下载图片异常 {image_url}: {e}")
            return None

    async def scrape_category_items(self, page, category):
        """爬取某个分类下的所有菜品链接"""
        try:
            url = self.base_url + category["url"]
            logger.info(f"\n{'='*60}")
            logger.info(f"正在爬取分类: {category['name']}")
            logger.info(f"URL: {url}")
            logger.info(f"{'='*60}")

            await page.goto(url, wait_until='domcontentloaded', timeout=60000)
            await page.wait_for_timeout(3000)

            # 查找所有菜品链接
            items = await page.query_selector_all('a[href*="/our-food/"]')

            item_links = []
            for item in items:
                href = await item.get_attribute('href')
                if href and href.startswith('/our-food/') and href.count('/') >= 3:
                    # 排除分类页面本身
                    if href not in [cat['url'] for cat in self.categories]:
                        full_url = self.base_url + href if not href.startswith('http') else href
                        if full_url not in item_links:
                            item_links.append(full_url)

            logger.info(f"找到 {len(item_links)} 个菜品链接")
            return item_links

        except Exception as e:
            logger.error(f"爬取分类 {category['name']} 失败: {e}")
            return []

    async def scrape_item_detail(self, page, item_url, category_name, session):
        """爬取菜品详情页"""
        try:
            logger.info(f"正在爬取菜品: {item_url}")

            await page.goto(item_url, wait_until='domcontentloaded', timeout=60000)
            await page.wait_for_timeout(5000)

            # 获取菜品名称 - 使用多种选择器尝试
            food_name = None
            try:
                food_name = await page.locator('h1').first.text_content(timeout=10000)
            except:
                try:
                    food_name = await page.locator('article h1').first.text_content(timeout=10000)
                except:
                    food_name = "Unknown"

            food_name = food_name.strip() if food_name else "Unknown"

            # 获取描述
            description = ""
            desc_elem = await page.query_selector('article p')
            if desc_elem:
                description = await desc_elem.text_content()
                description = description.strip()

            # 获取图片 URL
            image_url = None
            img_elem = await page.query_selector('article img')
            if img_elem:
                image_url = await img_elem.get_attribute('src')
                if image_url and not image_url.startswith('http'):
                    image_url = self.base_url + image_url

            # 下载图片
            local_image_path = None
            if image_url:
                local_image_path = await self.download_image(session, image_url, food_name)

            # 尝试获取营养信息
            nutrition_data = {}
            try:
                # 查找 Nutrition Info 按钮
                nutrition_btn = page.locator('a:has-text("Nutrition Info")').first
                if await nutrition_btn.count() > 0:
                    await nutrition_btn.click()
                    await page.wait_for_timeout(2000)

                    # 等待营养信息表格出现
                    table = page.locator('dialog table').first
                    if await table.count() > 0:
                        nutrition_data = await self.parse_nutrition_table(page)

                    # 关闭弹窗 - 尝试多种选择器
                    try:
                        close_btn = page.locator('button[class*="close"]').first
                        if await close_btn.count() > 0:
                            await close_btn.click(timeout=5000)
                    except:
                        # 尝试按 Escape 键关闭
                        await page.keyboard.press('Escape')

                    await page.wait_for_timeout(500)

            except Exception as e:
                logger.warning(f"获取营养信息失败: {e}")

            # 生成 food_id
            food_id = f"{category_name.lower().replace(' ', '_').replace('&', 'and')}_{food_name.lower().replace(' ', '_')}"

            # 组装数据
            food_data = {
                'food_id': food_id,
                'food_name': food_name,
                'food_name_cn': None,
                'category': category_name,
                'detail_link': item_url,
                'description': description,
                'price': None,
                'image_url': image_url,
                'local_image_path': local_image_path,
                'serving_size': nutrition_data.get('serving_size'),
                'ingredients': None,
                'calories': nutrition_data.get('calories'),
                'total_fat_g': nutrition_data.get('total_fat_g'),
                'saturated_fat_g': nutrition_data.get('saturated_fat_g'),
                'trans_fat_g': nutrition_data.get('trans_fat_g'),
                'cholesterol_mg': nutrition_data.get('cholesterol_mg'),
                'sodium_mg': nutrition_data.get('sodium_mg'),
                'total_carbs_g': nutrition_data.get('total_carbs_g'),
                'fiber_g': nutrition_data.get('fiber_g'),
                'sugars_g': nutrition_data.get('sugars_g'),
                'protein_g': nutrition_data.get('protein_g'),
                'notes': None,
                'scraped_date': datetime.now().strftime('%Y-%m-%d')
            }

            logger.info(f"✓ 成功爬取: {food_name}")
            return food_data

        except Exception as e:
            logger.error(f"爬取菜品详情失败 {item_url}: {e}")
            return None

    async def parse_nutrition_table(self, page):
        """解析营养信息表格"""
        try:
            nutrition_data = {}

            # 获取表格的所有行
            rows = await page.locator('dialog table tbody tr').all()

            for row in rows:
                cells = await row.locator('td').all()
                if len(cells) >= 2:
                    label_elem = cells[0]
                    value_elem = cells[1]

                    label = await label_elem.text_content()
                    value = await value_elem.text_content()

                    label = label.strip().lower()
                    value = value.strip()

                    # 提取数字
                    number = re.search(r'[\d.]+', value)
                    if number:
                        number = float(number.group())

                    # 映射字段
                    if 'serving size' in label:
                        nutrition_data['serving_size'] = value
                    elif label == 'calories':
                        nutrition_data['calories'] = int(number) if number else None
                    elif 'total fat' in label:
                        nutrition_data['total_fat_g'] = number
                    elif 'saturated fat' in label:
                        nutrition_data['saturated_fat_g'] = number
                    elif 'trans fat' in label:
                        nutrition_data['trans_fat_g'] = number
                    elif 'cholesterol' in label:
                        nutrition_data['cholesterol_mg'] = number
                    elif 'sodium' in label:
                        nutrition_data['sodium_mg'] = number
                    elif 'carbohydrate' in label:
                        nutrition_data['total_carbs_g'] = number
                    elif 'dietary fiber' in label or 'fiber' in label:
                        nutrition_data['fiber_g'] = number
                    elif 'sugar' in label:
                        nutrition_data['sugars_g'] = number
                    elif 'protein' in label:
                        nutrition_data['protein_g'] = number

            return nutrition_data

        except Exception as e:
            logger.error(f"解析营养表格失败: {e}")
            return {}

    async def scrape_all(self):
        """爬取所有菜品"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            # 创建 aiohttp session 用于下载图片
            async with aiohttp.ClientSession() as session:
                for category in self.categories:
                    # 获取该分类下的所有菜品链接
                    item_links = await self.scrape_category_items(page, category)

                    # 爬取每个菜品的详情
                    for item_url in item_links:
                        food_data = await self.scrape_item_detail(page, item_url, category["name"], session)
                        if food_data:
                            self.foods_data.append(food_data)

                        # 避免请求过快
                        await asyncio.sleep(1)

            await browser.close()

    def save_to_excel(self, output_file="El_Pollo_Loco_Menu.xlsx"):
        """保存数据到 Excel"""
        if not self.foods_data:
            logger.warning("没有数据可保存")
            return

        df = pd.DataFrame(self.foods_data)

        # 确保列顺序
        columns = [
            'food_id', 'food_name', 'food_name_cn', 'category',
            'detail_link', 'description', 'price',
            'image_url', 'local_image_path',
            'serving_size', 'ingredients',
            'calories', 'total_fat_g', 'saturated_fat_g', 'trans_fat_g',
            'cholesterol_mg', 'sodium_mg', 'total_carbs_g',
            'fiber_g', 'sugars_g', 'protein_g',
            'notes', 'scraped_date'
        ]

        # 添加缺失的列
        for col in columns:
            if col not in df.columns:
                df[col] = None

        df = df[columns]

        # 保存
        df.to_excel(output_file, index=False, engine='openpyxl')
        logger.info(f"\n{'='*60}")
        logger.info(f"数据已保存到: {output_file}")
        logger.info(f"共 {len(df)} 条记录")
        logger.info(f"{'='*60}")

    async def run(self):
        """运行爬虫"""
        logger.info("=" * 60)
        logger.info("开始爬取 El Pollo Loco 菜单数据")
        logger.info("=" * 60)

        await self.scrape_all()
        self.save_to_excel()

        logger.info("\n爬取完成!")

async def main():
    scraper = ElPolloLocoScraper()
    await scraper.run()

if __name__ == "__main__":
    asyncio.run(main())
