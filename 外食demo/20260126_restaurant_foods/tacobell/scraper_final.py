#!/usr/bin/env python3
"""
Taco Bell 终极爬虫 - 从 API 和详情页获取完整数据
"""

import json
import time
import requests
from pathlib import Path
import pandas as pd
from bs4 import BeautifulSoup
import logging
import re

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scraper_final.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class TacoBellFinalScraper:
    """Taco Bell 终极爬虫"""
    
    def __init__(self, output_dir='output_final'):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        self.images_dir = self.output_dir / 'images'
        self.images_dir.mkdir(exist_ok=True)
        
        self.all_items = []
        
        self.base_url = 'https://www.tacobell.com'
        self.api_url = 'https://www.tacobell.com/tacobellwebservices/v4/tacobell/products/menu/0000'
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://www.tacobell.com/'
        }
        
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
    def download_image(self, image_url, item_name):
        """下载图片"""
        try:
            safe_name = "".join(c for c in item_name if c.isalnum() or c in (' ', '_', '-')).strip()
            safe_name = safe_name.replace(' ', '_')
            
            ext = '.jpg'
            filename = f"{safe_name}{ext}"
            filepath = self.images_dir / filename
            
            if filepath.exists():
                return str(filepath.relative_to(self.output_dir))
            
            response = self.session.get(image_url, timeout=30)
            
            if response.status_code == 200:
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                logger.info(f"下载图片: {filename}")
                return str(filepath.relative_to(self.output_dir))
            
            return None
                
        except Exception as e:
            logger.error(f"下载图片失败 {item_name}: {str(e)}")
            return None
    
    def get_menu_from_api(self):
        """从 API 获取菜单"""
        logger.info("从官方 API 获取菜单数据...")
        
        try:
            response = self.session.get(self.api_url, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            categories = data.get('menuProductCategories', [])
            logger.info(f"获取到 {len(categories)} 个分类")
            
            for category in categories:
                category_name = category.get('name', 'Unknown')
                products = category.get('products', [])
                
                logger.info(f"处理分类: {category_name} ({len(products)} 个产品)")
                
                for product in products:
                    item = self.parse_product(product, category_name)
                    if item:
                        self.all_items.append(item)
            
            return True
            
        except Exception as e:
            logger.error(f"获取 API 数据失败: {str(e)}")
            return False
    
    def parse_product(self, product, category_name):
        """解析产品数据"""
        try:
            item = {}
            
            # 基本信息
            item['name'] = product.get('name', '')
            item['code'] = product.get('code', '')
            item['category'] = category_name
            item['url'] = f"{self.base_url}{product.get('url', '')}"
            
            # 价格
            price_data = product.get('price', {})
            if price_data:
                item['price'] = price_data.get('formattedValue', '')
            
            # 卡路里
            item['calories'] = product.get('calories', '')
            
            # 图片 - 使用 269x269 格式
            images = product.get('images', [])
            for img in images:
                if img.get('imageType') == 'PRIMARY' and img.get('format') == '269x269':
                    item['image_url'] = img.get('url', '')
                    break
            
            # 描述
            item['description'] = product.get('description', '')
            
            # 标记
            item['vegetarian'] = product.get('hasAVA', False) or product.get('hasMeatless', False)
            
            logger.info(f"  解析产品: {item['name']}")
            
            return item
            
        except Exception as e:
            logger.error(f"解析产品失败: {str(e)}")
            return None
    
    def enrich_with_nutrition(self, item):
        """从详情页获取营养信息"""
        try:
            url = item.get('url')
            if not url:
                return item
            
            response = self.session.get(url, timeout=15)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 查找页面中的营养信息脚本
            scripts = soup.find_all('script', type='application/json')
            
            for script in scripts:
                try:
                    data = json.loads(script.string)
                    
                    # 递归查找营养数据
                    nutrition = self.find_nutrition_in_json(data)
                    if nutrition:
                        item.update(nutrition)
                        return item
                except:
                    continue
            
            # 如果从 JSON 中找不到,尝试从 HTML 中解析
            nutrition = self.parse_nutrition_from_html(soup)
            if nutrition:
                item.update(nutrition)
            
            return item
            
        except Exception as e:
            logger.warning(f"获取营养信息失败 {item.get('name')}: {str(e)}")
            return item
    
    def find_nutrition_in_json(self, data, nutrition=None):
        """递归查找 JSON 中的营养数据"""
        if nutrition is None:
            nutrition = {}
        
        if isinstance(data, dict):
            # 查找营养相关字段
            if 'servingSize' in data:
                nutrition['serving_size'] = str(data.get('servingSize', ''))
            if 'totalFat' in data:
                nutrition['total_fat_g'] = str(data.get('totalFat', ''))
            if 'saturatedFat' in data:
                nutrition['saturated_fat_g'] = str(data.get('saturatedFat', ''))
            if 'transFat' in data:
                nutrition['trans_fat_g'] = str(data.get('transFat', ''))
            if 'cholesterol' in data:
                nutrition['cholesterol_mg'] = str(data.get('cholesterol', ''))
            if 'sodium' in data:
                nutrition['sodium_mg'] = str(data.get('sodium', ''))
            if 'totalCarbohydrate' in data or 'carbohydrate' in data:
                nutrition['total_carbs_g'] = str(data.get('totalCarbohydrate') or data.get('carbohydrate', ''))
            if 'dietaryFiber' in data or 'fiber' in data:
                nutrition['fiber_g'] = str(data.get('dietaryFiber') or data.get('fiber', ''))
            if 'sugars' in data or 'sugar' in data:
                nutrition['sugars_g'] = str(data.get('sugars') or data.get('sugar', ''))
            if 'protein' in data:
                nutrition['protein_g'] = str(data.get('protein', ''))
            
            # 递归搜索
            for value in data.values():
                if isinstance(value, (dict, list)):
                    self.find_nutrition_in_json(value, nutrition)
        
        elif isinstance(data, list):
            for item in data:
                self.find_nutrition_in_json(item, nutrition)
        
        return nutrition if nutrition else None
    
    def parse_nutrition_from_html(self, soup):
        """从 HTML 解析营养信息"""
        nutrition = {}
        
        try:
            # 查找包含营养信息的文本
            text = soup.get_text()
            
            # 使用正则表达式提取
            patterns = {
                'serving_size': r'Serving\s+Size[:\s]+([^\n]+)',
                'total_fat_g': r'Total\s+Fat[:\s]+(\d+\.?\d*)\s*g',
                'saturated_fat_g': r'Saturated\s+Fat[:\s]+(\d+\.?\d*)\s*g',
                'trans_fat_g': r'Trans\s+Fat[:\s]+(\d+\.?\d*)\s*g',
                'cholesterol_mg': r'Cholesterol[:\s]+(\d+\.?\d*)\s*mg',
                'sodium_mg': r'Sodium[:\s]+(\d+\.?\d*)\s*mg',
                'total_carbs_g': r'Total\s+Carbohydrate[:\s]+(\d+\.?\d*)\s*g',
                'fiber_g': r'Dietary\s+Fiber[:\s]+(\d+\.?\d*)\s*g',
                'sugars_g': r'Sugars?[:\s]+(\d+\.?\d*)\s*g',
                'protein_g': r'Protein[:\s]+(\d+\.?\d*)\s*g',
            }
            
            for key, pattern in patterns.items():
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    nutrition[key] = match.group(1).strip()
            
        except Exception as e:
            logger.debug(f"HTML 解析失败: {str(e)}")
        
        return nutrition if nutrition else None
    
    def scrape_all(self):
        """完整爬取流程"""
        try:
            logger.info("="*70)
            logger.info("Taco Bell 终极爬虫启动")
            logger.info("="*70)
            
            # 1. 从 API 获取基本菜单数据
            success = self.get_menu_from_api()
            
            if not success or not self.all_items:
                logger.error("无法获取菜单数据")
                return
            
            logger.info(f"\n从 API 获取到 {len(self.all_items)} 个菜品")
            
            # 2. 为每个菜品补充营养信息(可选,比较慢)
            # 由于营养信息获取较慢,这里注释掉。如果需要完整营养数据,取消注释
            # logger.info("\n开始获取详细营养信息...")
            # for idx, item in enumerate(self.all_items, 1):
            #     if idx % 10 == 0:
            #         logger.info(f"进度: {idx}/{len(self.all_items)}")
            #     self.enrich_with_nutrition(item)
            #     time.sleep(0.5)  # 礼貌延时
            
            # 3. 下载图片
            logger.info("\n开始下载图片...")
            for idx, item in enumerate(self.all_items, 1):
                if idx % 20 == 0:
                    logger.info(f"图片下载进度: {idx}/{len(self.all_items)}")
                
                if item.get('image_url'):
                    image_path = self.download_image(item['image_url'], item.get('name', 'unknown'))
                    item['image_path'] = image_path
                
                time.sleep(0.2)
            
            logger.info(f"\n爬取完成! 共 {len(self.all_items)} 个菜品")
            
            # 4. 保存数据
            self.save_data()
            
        except Exception as e:
            logger.error(f"爬取出错: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # 即使出错也尝试保存已获取的数据
            if self.all_items:
                logger.info("尝试保存已获取的数据...")
                self.save_data()
    
    def save_data(self):
        """保存数据"""
        if not self.all_items:
            logger.warning("没有数据可保存")
            return
        
        try:
            # JSON
            json_file = self.output_dir / 'tacobell_menu_final.json'
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(self.all_items, f, ensure_ascii=False, indent=2)
            logger.info(f"\n✓ JSON 已保存: {json_file}")
            
            # DataFrame
            df = pd.DataFrame(self.all_items)
            
            # 列顺序
            priority_columns = [
                'name', 'code', 'category', 'url', 'image_url', 'image_path',
                'price', 'calories', 'serving_size',
                'total_fat_g', 'saturated_fat_g', 'trans_fat_g',
                'cholesterol_mg', 'sodium_mg', 'total_carbs_g',
                'fiber_g', 'sugars_g', 'protein_g',
                'description', 'vegetarian'
            ]
            
            columns = [col for col in priority_columns if col in df.columns]
            other_cols = [col for col in df.columns if col not in columns]
            columns.extend(other_cols)
            df = df[columns]
            
            # Excel
            excel_file = self.output_dir / 'tacobell_menu_final.xlsx'
            df.to_excel(excel_file, index=False, engine='openpyxl')
            logger.info(f"✓ Excel 已保存: {excel_file}")
            
            # CSV
            csv_file = self.output_dir / 'tacobell_menu_final.csv'
            df.to_csv(csv_file, index=False, encoding='utf-8-sig')
            logger.info(f"✓ CSV 已保存: {csv_file}")
            
            # 统计
            logger.info(f"\n" + "="*70)
            logger.info("数据统计:")
            logger.info(f"  总菜品数: {len(df)}")
            logger.info(f"  分类数: {df['category'].nunique()}")
            logger.info(f"  有价格: {df['price'].notna().sum()}")
            logger.info(f"  有图片: {df['image_path'].notna().sum()}")
            logger.info(f"  有卡路里: {df['calories'].notna().sum()}")
            logger.info(f"  素食选项: {df['vegetarian'].sum() if 'vegetarian' in df.columns else 0}")
            
            # 分类统计
            logger.info(f"\n各分类产品数:")
            category_counts = df['category'].value_counts()
            for cat, count in category_counts.items():
                logger.info(f"  {cat}: {count}")
            
            logger.info("="*70)
            
        except Exception as e:
            logger.error(f"保存数据失败: {str(e)}")
            import traceback
            traceback.print_exc()


def main():
    """主函数"""
    scraper = TacoBellFinalScraper()
    scraper.scrape_all()
    logger.info("\n任务完成!")


if __name__ == '__main__':
    main()
