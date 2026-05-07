#!/usr/bin/env python3
"""
El Pollo Loco 完整爬虫 - 包含 ingredients 和详细描述
"""

import asyncio
from playwright.async_api import async_playwright
import pandas as pd
import os
from datetime import datetime
import logging
import re
import aiohttp

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ElPolloLocoCompleteScraper:
    def __init__(self):
        self.base_url = "https://www.elpolloloco.com"
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
        """下载图片"""
        if not image_url or '$fileName' in image_url:
            return None

        try:
            safe_filename = re.sub(r'[^\w\s-]', '', food_name).strip().replace(' ', '_')
            filename = f"{safe_filename}.jpg"
            filepath = os.path.join(self.images_dir, filename)

            if os.path.exists(filepath):
                return filepath

            async with session.get(image_url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                if response.status == 200:
                    content = await response.read()
                    if len(content) > 1000:
                        with open(filepath, 'wb') as f:
                            f.write(content)
                        logger.debug(f"下载图片: {filename}")
                        return filepath
        except Exception as e:
            logger.debug(f"下载图片失败: {e}")

        return None

    async def scrape_category_items(self, page, category):
        """爬取分类下的菜品链接"""
        try:
            url = self.base_url + category["url"]
            logger.info(f"\n{'='*60}")
            logger.info(f"分类: {category['name']}")
            logger.info(f"{'='*60}")

            await page.goto(url, wait_until='domcontentloaded', timeout=60000)
            await page.wait_for_timeout(2000)

            items = await page.query_selector_all('a[href*="/our-food/"]')
            item_links = []

            for item in items:
                href = await item.get_attribute('href')
                if href and href.startswith('/our-food/') and href.count('/') >= 3:
                    if href not in [cat['url'] for cat in self.categories]:
                        full_url = self.base_url + href if not href.startswith('http') else href
                        if full_url not in item_links:
                            item_links.append(full_url)

            logger.info(f"找到 {len(item_links)} 个菜品")
            return item_links

        except Exception as e:
            logger.error(f"爬取分类失败: {e}")
            return []

    async def scrape_item_detail(self, page, item_url, category_name, session):
        """爬取菜品详情 - 完整版"""
        try:
            await page.goto(item_url, wait_until='domcontentloaded', timeout=60000)
            await page.wait_for_timeout(3000)

            # 1. 获取菜品名称
            food_name = None
            try:
                food_name = await page.locator('h1').first.text_content(timeout=5000)
            except:
                food_name = "Unknown"
            food_name = food_name.strip() if food_name else "Unknown"

            # 2. 获取第一段描述（主要描述）
            description = ""
            try:
                # 获取article下的第一个paragraph
                desc_paragraphs = await page.locator('article p').all()
                if desc_paragraphs:
                    description = await desc_paragraphs[0].text_content()
                    description = description.strip()
            except Exception as e:
                logger.debug(f"获取描述失败: {e}")

            # 3. 提取ingredients - 从FAQ或描述中提取
            ingredients = ""
            try:
                # 方法1: 查找FAQ中的成分信息
                faq_h3 = await page.locator('h3').all()
                for h3 in faq_h3:
                    h3_text = await h3.text_content()
                    if 'include' in h3_text.lower() or 'ingredient' in h3_text.lower():
                        # 获取下一个元素（通常是回答）
                        next_p = await page.evaluate('''(h3) => {
                            const next = h3.nextElementSibling;
                            return next ? next.textContent : null;
                        }''', h3)
                        if next_p:
                            ingredients = next_p.strip()
                            break

                # 方法2: 如果FAQ中没有，从描述中提取
                if not ingredients and description:
                    # 查找"Filled with", "comes with", "includes"等关键词后的内容
                    patterns = [
                        r'(?:filled with|comes with|includes|featuring)\s+([^.]+)',
                        r'(?:made with|contains)\s+([^.]+)'
                    ]
                    for pattern in patterns:
                        match = re.search(pattern, description, re.IGNORECASE)
                        if match:
                            ingredients = match.group(1).strip()
                            break

            except Exception as e:
                logger.debug(f"提取ingredients失败: {e}")

            # 4. 获取图片URL
            image_url = None
            try:
                img_elem = await page.query_selector('article img')
                if img_elem:
                    image_url = await img_elem.get_attribute('src')
                    if image_url and not image_url.startswith('http'):
                        if image_url.startswith('//'):
                            image_url = 'https:' + image_url
                        elif image_url.startswith('/'):
                            image_url = self.base_url + image_url
            except:
                pass

            # 5. 下载图片
            local_image_path = None
            if image_url and '$fileName' not in image_url:
                local_image_path = await self.download_image(session, image_url, food_name)

            # 6. 组装数据
            food_id = f"{category_name.lower().replace(' ', '_').replace('&', 'and')}_{food_name.lower().replace(' ', '_')}"

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
                'serving_size': None,
                'ingredients': ingredients if ingredients else None,
                'calories': None,
                'total_fat_g': None,
                'saturated_fat_g': None,
                'trans_fat_g': None,
                'cholesterol_mg': None,
                'sodium_mg': None,
                'total_carbs_g': None,
                'fiber_g': None,
                'sugars_g': None,
                'protein_g': None,
                'notes': None,
                'scraped_date': datetime.now().strftime('%Y-%m-%d')
            }

            logger.info(f"✓ {food_name[:50]}")
            if ingredients:
                logger.debug(f"  Ingredients: {ingredients[:80]}...")
            return food_data

        except Exception as e:
            logger.error(f"爬取失败 {item_url}: {e}")
            return None

    async def scrape_all(self):
        """爬取所有菜品"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            )
            page = await context.new_page()

            async with aiohttp.ClientSession() as session:
                for category in self.categories:
                    item_links = await self.scrape_category_items(page, category)
                    for item_url in item_links:
                        food_data = await self.scrape_item_detail(page, item_url, category["name"], session)
                        if food_data:
                            self.foods_data.append(food_data)
                        await asyncio.sleep(0.3)  # 稍快一点

            await browser.close()

    def save_to_excel(self, output_file="El_Pollo_Loco_Complete.xlsx"):
        """保存数据"""
        if not self.foods_data:
            logger.warning("没有数据")
            return

        df = pd.DataFrame(self.foods_data)
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

        for col in columns:
            if col not in df.columns:
                df[col] = None

        df = df[columns]
        df.to_excel(output_file, index=False, engine='openpyxl')

        logger.info(f"\n{'='*60}")
        logger.info(f"✓ 数据已保存: {output_file}")
        logger.info(f"✓ 共 {len(df)} 条记录")
        logger.info(f"✓ {len(df[df['description'].notna()])} 条有描述")
        logger.info(f"✓ {len(df[df['ingredients'].notna()])} 条有ingredients")
        logger.info(f"✓ {len(df[df['local_image_path'].notna()])} 张图片")
        logger.info(f"{'='*60}")

    async def run(self):
        logger.info("="*60)
        logger.info("El Pollo Loco 完整爬虫 - 包含 ingredients")
        logger.info("="*60)
        await self.scrape_all()
        self.save_to_excel()

if __name__ == "__main__":
    asyncio.run(ElPolloLocoCompleteScraper().run())
