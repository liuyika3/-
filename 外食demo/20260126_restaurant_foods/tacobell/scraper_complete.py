#!/usr/bin/env python3
"""
Taco Bell 完整菜单爬虫 - 基于 API 和营养数据库
结合 Nutritionix API 获取完整的营养信息
"""

import json
import os
import re
import time
import requests
from pathlib import Path
import pandas as pd
from bs4 import BeautifulSoup
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scraper_complete.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class TacoBellCompleteScraper:
    """Taco Bell 完整菜单爬虫 - 整合所有数据源"""
    
    def __init__(self, output_dir='output_complete'):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # 创建图片保存目录
        self.images_dir = self.output_dir / 'images'
        self.images_dir.mkdir(exist_ok=True)
        
        # 数据存储
        self.all_items = []
        self.nutrition_db = {}  # 从 Nutritionix 获取的营养数据库
        
        # 网站URL
        self.base_url = 'https://www.tacobell.com'
        self.nutritionix_url = 'https://www.nutritionix.com/taco-bell/menu/premium'
        self.api_url = 'https://www.tacobell.com/tacobellwebservices/v4/tacobell/products/menu/0000'
        
        # HTTP headers
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json, text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.tacobell.com/'
        }
        
        # Session
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
    def download_image(self, image_url, item_name):
        """下载图片"""
        try:
            safe_name = "".join(c for c in item_name if c.isalnum() or c in (' ', '_', '-')).strip()
            safe_name = safe_name.replace(' ', '_')
            
            ext = '.jpg'
            if '.' in image_url.split('?')[0]:
                ext = '.' + image_url.split('?')[0].split('.')[-1].lower()
            
            filename = f"{safe_name}{ext}"
            filepath = self.images_dir / filename
            
            if filepath.exists():
                return str(filepath.relative_to(self.output_dir))
            
            response = self.session.get(image_url, timeout=30)
            
            if response.status_code == 200:
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                logger.info(f"图片下载成功: {filename}")
                return str(filepath.relative_to(self.output_dir))
            else:
                return None
                
        except Exception as e:
            logger.error(f"下载图片出错: {str(e)}")
            return None
    
    def load_nutritionix_data(self):
        """从 Nutritionix 加载营养信息数据库"""
        logger.info("正在从 Nutritionix 加载营养数据...")
        
        try:
            response = self.session.get(self.nutritionix_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 查找所有菜品的营养信息
            # Nutritionix 页面通常会有表格或结构化数据
            items = soup.find_all('div', class_=re.compile(r'item|product|menu'))
            
            logger.info(f"Nutritionix 页面已加载,找到 {len(items)} 个元素")
            
            # 尝试解析页面中的 JSON 数据
            scripts = soup.find_all('script')
            for script in scripts:
                if script.string and ('nutrition' in script.string.lower() or 'menu' in script.string.lower()):
                    try:
                        # 尝试提取 JSON
                        json_match = re.search(r'(\{.*\}|\[.*\])', script.string, re.DOTALL)
                        if json_match:
                            data = json.loads(json_match.group(1))
                            if isinstance(data, (list, dict)):
                                logger.info("成功提取 Nutritionix JSON 数据")
                                self.parse_nutritionix_json(data)
                                break
                    except:
                        pass
            
        except Exception as e:
            logger.error(f"加载 Nutritionix 数据失败: {str(e)}")
    
    def parse_nutritionix_json(self, data):
        """解析 Nutritionix JSON 数据"""
        # 根据实际数据结构解析
        # 这里需要根据真实的 JSON 结构来调整
        pass
    
    def get_menu_from_api(self):
        """从官方 API 获取菜单数据"""
        logger.info("正在从官方 API 获取菜单...")
        
        try:
            response = self.session.get(self.api_url, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            logger.info("成功获取官方 API 数据")
            
            # 解析 API 数据
            if isinstance(data, dict):
                self.parse_api_menu(data)
            
            return data
            
        except Exception as e:
            logger.error(f"获取 API 数据失败: {str(e)}")
            return None
    
    def parse_api_menu(self, data):
        """解析 API 菜单数据"""
        try:
            # 根据实际 API 结构解析
            # 通常会有 categories, products 等字段
            
            if 'products' in data:
                products = data['products']
                logger.info(f"API 返回 {len(products)} 个产品")
                
                for product in products:
                    item = self.parse_api_product(product)
                    if item:
                        self.all_items.append(item)
            
            elif 'categories' in data:
                categories = data['categories']
                logger.info(f"API 返回 {len(categories)} 个分类")
                
                for category in categories:
                    if 'products' in category:
                        for product in category['products']:
                            item = self.parse_api_product(product, category.get('name'))
                            if item:
                                self.all_items.append(item)
                                
        except Exception as e:
            logger.error(f"解析 API 数据失败: {str(e)}")
    
    def parse_api_product(self, product, category=None):
        """解析单个产品数据"""
        try:
            item = {}
            
            # 基本信息
            item['name'] = product.get('name', product.get('productName', ''))
            item['category'] = category or product.get('category', '')
            item['url'] = f"{self.base_url}/food/{product.get('url', '')}"
            
            # 图片
            if 'image' in product:
                item['image_url'] = product['image'].get('url') or product['image']
            elif 'imageUrl' in product:
                item['image_url'] = product['imageUrl']
            
            # 价格
            if 'price' in product:
                item['price'] = f"${product['price']}"
            
            # 营养信息
            if 'nutrition' in product:
                nutrition = product['nutrition']
                item.update(self.parse_nutrition_data(nutrition))
            
            # 成分
            if 'ingredients' in product:
                item['ingredients'] = ', '.join(product['ingredients'])
            
            # 描述
            if 'description' in product:
                item['description'] = product['description']
            
            return item
            
        except Exception as e:
            logger.error(f"解析产品数据出错: {str(e)}")
            return None
    
    def parse_nutrition_data(self, nutrition):
        """解析营养数据"""
        result = {}
        
        mapping = {
            'servingSize': 'serving_size',
            'calories': 'calories_kcal',
            'totalFat': 'total_fat_g',
            'saturatedFat': 'saturated_fat_g',
            'transFat': 'trans_fat_g',
            'cholesterol': 'cholesterol_mg',
            'sodium': 'sodium_mg',
            'totalCarbohydrate': 'total_carbs_g',
            'dietaryFiber': 'fiber_g',
            'sugars': 'sugars_g',
            'protein': 'protein_g'
        }
        
        for api_key, db_key in mapping.items():
            if api_key in nutrition:
                value = nutrition[api_key]
                if isinstance(value, dict):
                    value = value.get('value', value.get('amount', ''))
                result[db_key] = str(value)
        
        return result
    
    def scrape_all(self):
        """完整爬取流程"""
        try:
            logger.info("="*60)
            logger.info("开始完整爬取 Taco Bell 菜单")
            logger.info("="*60)
            
            # 1. 尝试从官方 API 获取数据
            api_data = self.get_menu_from_api()
            
            if api_data:
                logger.info(f"从 API 获取到 {len(self.all_items)} 个菜品")
            
            # 2. 如果 API 没有获取到数据,使用网页爬取方法
            if not self.all_items:
                logger.info("API 数据不可用,切换到网页爬取方法")
                self.scrape_from_website()
            
            # 3. 加载 Nutritionix 营养数据作为补充
            self.load_nutritionix_data()
            
            # 4. 下载图片
            logger.info("开始下载图片...")
            for item in self.all_items:
                if item.get('image_url'):
                    image_path = self.download_image(item['image_url'], item.get('name', 'unknown'))
                    item['image_path'] = image_path
                time.sleep(0.3)
            
            logger.info(f"爬取完成! 共获取 {len(self.all_items)} 个菜品")
            
            # 保存数据
            self.save_data()
            
        except Exception as e:
            logger.error(f"爬取过程出错: {str(e)}")
            import traceback
            traceback.print_exc()
    
    def scrape_from_website(self):
        """从网站爬取数据(备用方法)"""
        from scraper_api import TacoBellScraperAPI
        
        logger.info("使用网页爬取器...")
        scraper = TacoBellScraperAPI(output_dir=str(self.output_dir))
        
        # 获取分类
        categories = scraper.get_all_menu_categories()
        
        for category in categories:
            items = scraper.get_items_from_category(category['url'], category['name'])
            
            for item in items:
                detailed_item = scraper.get_item_details(item)
                self.all_items.append(detailed_item)
                time.sleep(0.5)
            
            time.sleep(2)
    
    def save_data(self):
        """保存数据"""
        if not self.all_items:
            logger.warning("没有数据可保存")
            return
        
        try:
            # JSON
            json_file = self.output_dir / 'tacobell_complete.json'
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(self.all_items, f, ensure_ascii=False, indent=2)
            logger.info(f"JSON: {json_file}")
            
            # Excel
            df = pd.DataFrame(self.all_items)
            
            priority_columns = [
                'name', 'category', 'url', 'image_url', 'image_path', 'price',
                'serving_size', 'ingredients',
                'calories_kcal', 'total_fat_g', 'saturated_fat_g', 'trans_fat_g',
                'cholesterol_mg', 'sodium_mg', 'total_carbs_g', 'fiber_g',
                'sugars_g', 'protein_g', 'description'
            ]
            
            columns_order = [col for col in priority_columns if col in df.columns]
            other_columns = [col for col in df.columns if col not in columns_order]
            columns_order.extend(other_columns)
            df = df[columns_order]
            
            excel_file = self.output_dir / 'tacobell_complete.xlsx'
            df.to_excel(excel_file, index=False, engine='openpyxl')
            logger.info(f"Excel: {excel_file}")
            
            # CSV
            csv_file = self.output_dir / 'tacobell_complete.csv'
            df.to_csv(csv_file, index=False, encoding='utf-8-sig')
            logger.info(f"CSV: {csv_file}")
            
            # 统计
            logger.info(f"\n" + "="*60)
            logger.info(f"数据统计:")
            logger.info(f"  总菜品数: {len(self.all_items)}")
            logger.info(f"  分类数: {df['category'].nunique() if 'category' in df.columns else 0}")
            logger.info(f"  有价格: {df['price'].notna().sum() if 'price' in df.columns else 0}")
            logger.info(f"  有图片: {df['image_path'].notna().sum() if 'image_path' in df.columns else 0}")
            logger.info(f"  有营养数据: {df['calories_kcal'].notna().sum() if 'calories_kcal' in df.columns else 0}")
            logger.info("="*60)
            
        except Exception as e:
            logger.error(f"保存数据失败: {str(e)}")


def main():
    """主函数"""
    scraper = TacoBellCompleteScraper()
    scraper.scrape_all()


if __name__ == '__main__':
    main()
