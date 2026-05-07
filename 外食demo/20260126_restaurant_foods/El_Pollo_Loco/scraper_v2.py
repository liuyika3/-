#!/usr/bin/env python3
"""
El Pollo Loco 爬虫 - 改进图片获取
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

class ElPolloLocoScraper:
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
        self.scraped_images = set()

    async def download_image(self, session, image_url, food_name):
        """异步下载图片"""
        if not image_url or '$fileName' in image_url or image_url in self.scraped_images:
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
                    # 检查文件大小
                    if len(content) > 1000:  # 至少1KB
                        with open(filepath, 'wb') as f:
                            f.write(content)
                        logger.info(f"✓ 下载图片: {filename}")
                        self.scraped_images.add(image_url)
                        return filepath

        except Exception as e:
            logger.debug(f"下载图片失败 {image_url}: {e}")

        return None

    async def scrape_category_items(self, page, category):
        """爬取分类下的菜品链接"""
        try:
            url = self.base_url + category["url"]
            logger.info(f"\n{'='*60}")
            logger.info(f"分类: {category['name']}")
            logger.info(f"{'='*60}")

            await page.goto(url, wait_until='domcontentloaded', timeout=60000)
            await page.wait_for_timeout(3000)

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
        """爬取菜品详情"""
        try:
            await page.goto(item_url, wait_until='domcontentloaded', timeout=60000)
            await page.wait_for_timeout(4000)  # 等待图片加载

            # 获取菜品名称
            food_name = None
            try:
                food_name = await page.locator('h1').first.text_content(timeout=5000)
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

            # 尝试多种方式获取图片URL
            image_url = None
            try:
                # 方法1: 从article img获取
                img_elem = await page.query_selector('article img')
                if img_elem:
                    # 尝试获取 src, data-src, srcset等
                    image_url = await img_elem.get_attribute('src')
                    if not image_url or '$fileName' in image_url:
                        image_url = await img_elem.get_attribute('data-src')
                    if not image_url or '$fileName' in image_url:
                        srcset = await img_elem.get_attribute('srcset')
                        if srcset:
                            # 从 srcset 中提取URL
                            urls = [url.split()[0] for url in srcset.split(',')]
                            if urls:
                                image_url = urls[0]

                    # 使用JavaScript获取computed style background image
                    if not image_url or '$fileName' in image_url:
                        bg_image = await page.evaluate('''() => {
                            const img = document.querySelector('article img');
                            if (img) {
                                const style = window.getComputedStyle(img);
                                const bg = style.backgroundImage;
                                if (bg && bg !== 'none') {
                                    const match = bg.match(/url\\("?([^"]+)"?\\)/);
                                    if (match) return match[1];
                                }
                            }
                            return null;
                        }''')
                        if bg_image:
                            image_url = bg_image

            except Exception as e:
                logger.debug(f"获取图片失败: {e}")

            # 确保URL完整
            if image_url and not image_url.startswith('http'):
                if image_url.startswith('//'):
                    image_url = 'https:' + image_url
                elif image_url.startswith('/'):
                    image_url = self.base_url + image_url

            # 下载图片
            local_image_path = None
            if image_url and '$fileName' not in image_url:
                local_image_path = await self.download_image(session, image_url, food_name)

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

            logger.info(f"✓ {food_name[:50]}")
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
                        await asyncio.sleep(0.5)

            await browser.close()

    def save_to_excel(self, output_file="El_Pollo_Loco_Menu_Final.xlsx"):
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
        logger.info(f"✓ {len(df[df['local_image_path'].notna()])} 张图片")
        logger.info(f"{'='*60}")

    async def run(self):
        await self.scrape_all()
        self.save_to_excel()

if __name__ == "__main__":
    asyncio.run(ElPolloLocoScraper().run())
