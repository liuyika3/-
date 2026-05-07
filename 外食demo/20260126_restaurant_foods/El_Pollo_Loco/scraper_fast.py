#!/usr/bin/env python3
"""
El Pollo Loco 快速爬虫 - 只爬取基本信息和图片
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
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scraper_fast.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ElPolloLocoFastScraper:
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
        """异步下载图片"""
        try:
            safe_filename = re.sub(r'[^\w\s-]', '', food_name).strip().replace(' ', '_')
            filename = f"{safe_filename}.jpg"
            filepath = os.path.join(self.images_dir, filename)

            if os.path.exists(filepath):
                logger.info(f"图片已存在: {filename}")
                return filepath

            async with session.get(image_url) as response:
                if response.status == 200:
                    content = await response.read()
                    with open(filepath, 'wb') as f:
                        f.write(content)
                    logger.info(f"✓ 已下载图片: {filename}")
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
            logger.error(f"爬取分类失败 {category['name']}: {e}")
            return []

    async def scrape_item_detail(self, page, item_url, category_name, session):
        """爬取菜品详情页 - 只获取基本信息"""
        try:
            await page.goto(item_url, wait_until='domcontentloaded', timeout=60000)
            await page.wait_for_timeout(2000)

            # 获取菜品名称
            food_name = None
            try:
                food_name = await page.locator('h1').first.text_content(timeout=5000)
            except:
                try:
                    food_name = await page.locator('article h1').first.text_content(timeout=5000)
                except:
                    food_name = "Unknown"

            food_name = food_name.strip() if food_name else "Unknown"

            # 获取描述
            description = ""
            try:
                desc_elem = await page.query_selector('article p')
                if desc_elem:
                    description = await desc_elem.text_content()
                    description = description.strip()
            except:
                pass

            # 获取图片 URL
            image_url = None
            try:
                img_elem = await page.query_selector('article img')
                if img_elem:
                    image_url = await img_elem.get_attribute('src')
                    if image_url and not image_url.startswith('http'):
                        image_url = self.base_url + image_url
            except:
                pass

            # 下载图片
            local_image_path = None
            if image_url:
                local_image_path = await self.download_image(session, image_url, food_name)

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
                'serving_size': None,
                'ingredients': None,
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

            logger.info(f"✓ {food_name}")
            return food_data

        except Exception as e:
            logger.error(f"爬取失败 {item_url}: {e}")
            return None

    async def scrape_all(self):
        """爬取所有菜品"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            async with aiohttp.ClientSession() as session:
                for category in self.categories:
                    item_links = await self.scrape_category_items(page, category)

                    for item_url in item_links:
                        food_data = await self.scrape_item_detail(page, item_url, category["name"], session)
                        if food_data:
                            self.foods_data.append(food_data)

                        await asyncio.sleep(0.5)

            await browser.close()

    def save_to_excel(self, output_file="El_Pollo_Loco_Menu.xlsx"):
        """保存数据到 Excel"""
        if not self.foods_data:
            logger.warning("没有数据可保存")
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
        logger.info(f"✓ {len(df[df['local_image_path'].notna()])} 张图片")
        logger.info(f"{'='*60}")

    async def run(self):
        """运行爬虫"""
        logger.info("="*60)
        logger.info("El Pollo Loco 快速爬虫")
        logger.info("="*60)

        await self.scrape_all()
        self.save_to_excel()

async def main():
    scraper = ElPolloLocoFastScraper()
    await scraper.run()

if __name__ == "__main__":
    asyncio.run(main())
