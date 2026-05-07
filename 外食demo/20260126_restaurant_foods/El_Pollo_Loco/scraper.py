#!/usr/bin/env python3
"""
El Pollo Loco 餐厅菜谱爬虫
- 从网站爬取菜品信息和图片
- 从 PDF 获取营养信息
- 合并数据并保存为 Excel
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
import os
import time
import json
from urllib.parse import urljoin
import re
from datetime import datetime
import logging

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
        self.nutrition_pdf_url = "https://www.elpolloloco.com/content/pdfs/epl_web_nutrition_guide_mod_1A_2026_hr-2.pdf"

        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }

        self.images_dir = "images"
        os.makedirs(self.images_dir, exist_ok=True)

        self.foods_data = []

    def scrape_menu(self):
        """爬取菜单页面"""
        logger.info(f"正在访问菜单页面: {self.menu_url}")

        try:
            response = requests.get(self.menu_url, headers=self.headers, timeout=30)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # 保存 HTML 用于调试
            with open('menu_page.html', 'w', encoding='utf-8') as f:
                f.write(soup.prettify())
            logger.info("已保存菜单页面 HTML 到 menu_page.html")

            # 尝试多种选择器找到菜品项
            # 1. 尝试找 product cards
            product_cards = soup.find_all(class_=re.compile('product|item|card', re.I))
            logger.info(f"找到 {len(product_cards)} 个产品卡片")

            # 2. 尝试找图片
            images = soup.find_all('img')
            logger.info(f"找到 {len(images)} 张图片")

            # 3. 查找所有链接
            links = soup.find_all('a', href=True)
            logger.info(f"找到 {len(links)} 个链接")

            return soup

        except Exception as e:
            logger.error(f"爬取菜单页面失败: {e}")
            raise

    def download_image(self, image_url, food_name):
        """下载图片到本地"""
        try:
            # 清理文件名
            safe_filename = re.sub(r'[^\w\s-]', '', food_name).strip().replace(' ', '_')
            file_ext = os.path.splitext(image_url.split('?')[0])[1] or '.jpg'
            filename = f"{safe_filename}{file_ext}"
            filepath = os.path.join(self.images_dir, filename)

            # 如果文件已存在，跳过
            if os.path.exists(filepath):
                logger.info(f"图片已存在: {filename}")
                return filepath

            # 下载图片
            response = requests.get(image_url, headers=self.headers, timeout=30)
            response.raise_for_status()

            with open(filepath, 'wb') as f:
                f.write(response.content)

            logger.info(f"已下载图片: {filename}")
            time.sleep(0.5)  # 避免请求过快

            return filepath

        except Exception as e:
            logger.error(f"下载图片失败 {image_url}: {e}")
            return None

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
            'serving_size',
            'ingredients',
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
        logger.info(f"数据已保存到: {output_file}")
        logger.info(f"共 {len(df)} 条记录")

    def run(self):
        """运行爬虫"""
        logger.info("=" * 60)
        logger.info("开始爬取 El Pollo Loco 菜单数据")
        logger.info("=" * 60)

        # 第一步：爬取菜单页面
        soup = self.scrape_menu()

        logger.info("\n需要进一步分析 HTML 结构来提取菜品数据")
        logger.info("请查看 menu_page.html 文件")

        return soup

if __name__ == "__main__":
    scraper = ElPolloLocoScraper()
    scraper.run()
