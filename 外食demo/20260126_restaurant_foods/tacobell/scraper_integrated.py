#!/usr/bin/env python3
"""
Taco Bell 完整数据爬虫 - 整合营养信息、过敏信息、成分说明
"""

import json
import time
import requests
from pathlib import Path
import pandas as pd
from bs4 import BeautifulSoup
import logging
import re
from openpyxl import Workbook
from openpyxl.utils.dataframe import dataframe_to_rows

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scraper_integrated.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class TacoBellIntegratedScraper:
    """Taco Bell 完整数据爬虫 - 整合所有数据源"""
    
    def __init__(self, output_dir='output_integrated'):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        self.images_dir = self.output_dir / 'images'
        self.images_dir.mkdir(exist_ok=True)
        
        # 数据存储
        self.menu_items = []          # 菜单基本信息
        self.nutrition_data = []       # 营养信息
        self.allergen_data = []        # 过敏信息
        self.ingredients_data = []     # 成分说明
        
        # URLs
        self.base_url = 'https://www.tacobell.com'
        self.api_url = 'https://www.tacobell.com/tacobellwebservices/v4/tacobell/products/menu/0000'
        self.nutritionix_url = 'https://www.nutritionix.com/taco-bell/menu/premium'
        self.allergen_url = 'https://www.tacobell.com/nutrition/allergen-info'
        self.ingredients_url = 'https://www.tacobell.com/nutrition/ingredients'
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        
        self.session = requests.Session()
        self.session.headers.update(self.headers)
    
    def download_image(self, image_url, item_name):
        """下载图片"""
        try:
            safe_name = "".join(c for c in item_name if c.isalnum() or c in (' ', '_', '-')).strip()
            safe_name = safe_name.replace(' ', '_')
            filename = f"{safe_name}.jpg"
            filepath = self.images_dir / filename
            
            if filepath.exists():
                return str(filepath.relative_to(self.output_dir))
            
            response = self.session.get(image_url, timeout=30)
            if response.status_code == 200:
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                return str(filepath.relative_to(self.output_dir))
            return None
        except Exception as e:
            logger.error(f"下载图片失败: {str(e)}")
            return None
    
    def get_menu_from_api(self):
        """从官方 API 获取菜单基本信息"""
        logger.info("=" * 70)
        logger.info("步骤 1: 从官方 API 获取菜单基本信息")
        logger.info("=" * 70)
        
        try:
            response = self.session.get(self.api_url, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            categories = data.get('menuProductCategories', [])
            logger.info(f"获取到 {len(categories)} 个分类")
            
            for category in categories:
                category_name = category.get('name', 'Unknown')
                products = category.get('products', [])
                
                for product in products:
                    item = {
                        'name': product.get('name', ''),
                        'code': product.get('code', ''),
                        'category': category_name,
                        'url': f"{self.base_url}{product.get('url', '')}",
                        'calories_api': product.get('calories', ''),
                        'vegetarian': product.get('hasAVA', False) or product.get('hasMeatless', False),
                    }
                    
                    # 价格
                    price_data = product.get('price', {})
                    if price_data:
                        item['price'] = price_data.get('formattedValue', '')
                    
                    # 图片
                    images = product.get('images', [])
                    for img in images:
                        if img.get('imageType') == 'PRIMARY' and img.get('format') == '269x269':
                            item['image_url'] = img.get('url', '')
                            break
                    
                    self.menu_items.append(item)
            
            logger.info(f"✓ 获取到 {len(self.menu_items)} 个菜品")
            return True
            
        except Exception as e:
            logger.error(f"获取菜单失败: {str(e)}")
            return False
    
    def get_nutrition_from_nutritionix(self):
        """从 Nutritionix 获取完整营养信息"""
        logger.info("=" * 70)
        logger.info("步骤 2: 从 Nutritionix 获取完整营养信息")
        logger.info("=" * 70)
        
        try:
            response = self.session.get(self.nutritionix_url, timeout=60)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 查找营养信息表格
            table = soup.find('table', class_='tblCompare')
            if not table:
                logger.warning("未找到营养信息表格")
                return False
            
            # 解析表头
            headers = []
            thead = table.find('thead')
            if thead:
                for th in thead.find_all('th'):
                    header_text = th.get_text(strip=True)
                    # 清理表头文本
                    header_text = re.sub(r'Sort by.*', '', header_text)
                    headers.append(header_text)
            
            logger.info(f"表头: {headers}")
            
            # 解析数据行
            tbody = table.find('tbody')
            if tbody:
                rows = tbody.find_all('tr')
                logger.info(f"找到 {len(rows)} 行数据")
                
                current_category = ""
                
                for row in rows:
                    # 检查是否是分类行
                    category_cell = row.find('td', class_='category')
                    if category_cell:
                        current_category = category_cell.get_text(strip=True)
                        continue
                    
                    cells = row.find_all('td')
                    if len(cells) >= 12:
                        # 获取菜品名称
                        name_cell = cells[0]
                        name_link = name_cell.find('a')
                        item_name = name_link.get_text(strip=True) if name_link else name_cell.get_text(strip=True)
                        
                        # 获取 serving size
                        serving_size = ""
                        serving_span = name_cell.find('span', class_='serving')
                        if serving_span:
                            serving_size = serving_span.get_text(strip=True)
                        
                        nutrition_item = {
                            'name': item_name,
                            'category_nutritionix': current_category,
                            'serving_size': serving_size,
                            'calories_kcal': cells[1].get_text(strip=True) if len(cells) > 1 else '',
                            'total_fat_g': cells[2].get_text(strip=True) if len(cells) > 2 else '',
                            'saturated_fat_g': cells[3].get_text(strip=True) if len(cells) > 3 else '',
                            'trans_fat_g': cells[4].get_text(strip=True) if len(cells) > 4 else '',
                            'cholesterol_mg': cells[5].get_text(strip=True) if len(cells) > 5 else '',
                            'sodium_mg': cells[6].get_text(strip=True) if len(cells) > 6 else '',
                            'total_carbs_g': cells[7].get_text(strip=True) if len(cells) > 7 else '',
                            'fiber_g': cells[8].get_text(strip=True) if len(cells) > 8 else '',
                            'sugars_g': cells[9].get_text(strip=True) if len(cells) > 9 else '',
                            'added_sugars_g': cells[10].get_text(strip=True) if len(cells) > 10 else '',
                            'protein_g': cells[11].get_text(strip=True) if len(cells) > 11 else '',
                        }
                        
                        self.nutrition_data.append(nutrition_item)
            
            logger.info(f"✓ 获取到 {len(self.nutrition_data)} 条营养信息")
            return True
            
        except Exception as e:
            logger.error(f"获取营养信息失败: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    
    def get_allergen_info(self):
        """获取过敏信息"""
        logger.info("=" * 70)
        logger.info("步骤 3: 获取过敏信息")
        logger.info("=" * 70)
        
        try:
            response = self.session.get(self.allergen_url, timeout=60)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 查找过敏信息表格或数据
            # Taco Bell 的过敏信息页面可能有不同的结构
            
            # 尝试查找表格
            tables = soup.find_all('table')
            
            for table in tables:
                rows = table.find_all('tr')
                if len(rows) > 1:
                    # 解析表头
                    header_row = rows[0]
                    headers = [th.get_text(strip=True) for th in header_row.find_all(['th', 'td'])]
                    
                    if headers and any('allergen' in h.lower() or 'egg' in h.lower() or 'milk' in h.lower() for h in headers):
                        logger.info(f"找到过敏信息表格,表头: {headers}")
                        
                        for row in rows[1:]:
                            cells = row.find_all('td')
                            if cells:
                                item_name = cells[0].get_text(strip=True)
                                allergen_item = {'name': item_name}
                                
                                for i, header in enumerate(headers[1:], 1):
                                    if i < len(cells):
                                        # 检查是否有标记(通常是 X 或 ✓)
                                        cell_text = cells[i].get_text(strip=True)
                                        allergen_item[header] = 'Yes' if cell_text else 'No'
                                
                                self.allergen_data.append(allergen_item)
            
            # 如果没有找到表格,尝试从 iframe 或其他来源获取
            if not self.allergen_data:
                # 查找 iframe
                iframes = soup.find_all('iframe')
                for iframe in iframes:
                    src = iframe.get('src', '')
                    if 'nutritionix' in src or 'allergen' in src:
                        logger.info(f"发现过敏信息 iframe: {src}")
                        # 可以进一步获取 iframe 内容
            
            logger.info(f"✓ 获取到 {len(self.allergen_data)} 条过敏信息")
            return True
            
        except Exception as e:
            logger.error(f"获取过敏信息失败: {str(e)}")
            return False
    
    def get_ingredients_info(self):
        """获取成分说明"""
        logger.info("=" * 70)
        logger.info("步骤 4: 获取成分说明")
        logger.info("=" * 70)
        
        try:
            response = self.session.get(self.ingredients_url, timeout=60)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 查找成分信息
            # 通常成分信息会以列表或表格形式展示
            
            # 查找所有可能包含成分的元素
            ingredient_sections = soup.find_all(['div', 'section'], class_=re.compile(r'ingredient|content'))
            
            for section in ingredient_sections:
                # 查找标题和内容
                headings = section.find_all(['h2', 'h3', 'h4', 'strong'])
                for heading in headings:
                    item_name = heading.get_text(strip=True)
                    
                    # 查找后续的成分列表
                    next_elem = heading.find_next_sibling()
                    if next_elem:
                        ingredients_text = next_elem.get_text(strip=True)
                        if ingredients_text and len(ingredients_text) > 10:
                            self.ingredients_data.append({
                                'name': item_name,
                                'ingredients': ingredients_text
                            })
            
            # 如果没有找到,尝试其他方法
            if not self.ingredients_data:
                # 查找所有段落
                paragraphs = soup.find_all('p')
                current_item = None
                
                for p in paragraphs:
                    text = p.get_text(strip=True)
                    # 检查是否是菜品名称(通常是粗体或特定格式)
                    strong = p.find('strong')
                    if strong:
                        current_item = strong.get_text(strip=True)
                    elif current_item and len(text) > 20:
                        self.ingredients_data.append({
                            'name': current_item,
                            'ingredients': text
                        })
                        current_item = None
            
            logger.info(f"✓ 获取到 {len(self.ingredients_data)} 条成分信息")
            return True
            
        except Exception as e:
            logger.error(f"获取成分信息失败: {str(e)}")
            return False
    
    def download_all_images(self):
        """下载所有图片"""
        logger.info("=" * 70)
        logger.info("步骤 5: 下载菜品图片")
        logger.info("=" * 70)
        
        for idx, item in enumerate(self.menu_items, 1):
            if idx % 20 == 0:
                logger.info(f"图片下载进度: {idx}/{len(self.menu_items)}")
            
            if item.get('image_url'):
                image_path = self.download_image(item['image_url'], item.get('name', 'unknown'))
                item['image_path'] = image_path
            
            time.sleep(0.2)
        
        logger.info(f"✓ 图片下载完成")
    
    def merge_data(self):
        """合并所有数据"""
        logger.info("=" * 70)
        logger.info("步骤 6: 合并数据")
        logger.info("=" * 70)
        
        # 创建菜单 DataFrame
        df_menu = pd.DataFrame(self.menu_items)
        
        # 创建营养信息 DataFrame
        df_nutrition = pd.DataFrame(self.nutrition_data)
        
        # 标准化名称用于匹配
        def normalize_name(name):
            if not name:
                return ""
            # 转小写,移除特殊字符
            name = str(name).lower()
            name = re.sub(r'[®™©]', '', name)
            name = re.sub(r'\s+', ' ', name)
            name = name.strip()
            return name
        
        df_menu['name_normalized'] = df_menu['name'].apply(normalize_name)
        df_nutrition['name_normalized'] = df_nutrition['name'].apply(normalize_name)
        
        # 合并菜单和营养信息
        df_merged = pd.merge(
            df_menu, 
            df_nutrition, 
            on='name_normalized', 
            how='left',
            suffixes=('', '_nutrition')
        )
        
        # 清理列名
        if 'name_nutrition' in df_merged.columns:
            df_merged.drop('name_nutrition', axis=1, inplace=True)
        
        logger.info(f"✓ 合并完成: {len(df_merged)} 条记录")
        logger.info(f"  - 有营养数据的: {df_merged['calories_kcal'].notna().sum()}")
        
        return df_merged
    
    def save_to_excel(self, df_merged):
        """保存到 Excel,多个 Sheet"""
        logger.info("=" * 70)
        logger.info("步骤 7: 保存数据到 Excel")
        logger.info("=" * 70)
        
        excel_file = self.output_dir / 'tacobell_complete_data.xlsx'
        
        with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
            # Sheet 1: 完整菜单数据(合并后)
            # 重新排列列顺序
            priority_columns = [
                'name', 'code', 'category', 'url', 'image_url', 'image_path',
                'price', 'serving_size',
                'calories_kcal', 'total_fat_g', 'saturated_fat_g', 'trans_fat_g',
                'cholesterol_mg', 'sodium_mg', 'total_carbs_g', 'fiber_g',
                'sugars_g', 'added_sugars_g', 'protein_g',
                'vegetarian', 'category_nutritionix'
            ]
            
            columns = [col for col in priority_columns if col in df_merged.columns]
            other_cols = [col for col in df_merged.columns if col not in columns and col != 'name_normalized']
            columns.extend(other_cols)
            
            df_main = df_merged[columns].copy()
            df_main.to_excel(writer, sheet_name='菜单完整数据', index=False)
            logger.info(f"  ✓ Sheet '菜单完整数据': {len(df_main)} 行")
            
            # Sheet 2: 营养信息详情
            if self.nutrition_data:
                df_nutrition = pd.DataFrame(self.nutrition_data)
                df_nutrition.to_excel(writer, sheet_name='营养信息', index=False)
                logger.info(f"  ✓ Sheet '营养信息': {len(df_nutrition)} 行")
            
            # Sheet 3: 过敏信息
            if self.allergen_data:
                df_allergen = pd.DataFrame(self.allergen_data)
                df_allergen.to_excel(writer, sheet_name='过敏信息', index=False)
                logger.info(f"  ✓ Sheet '过敏信息': {len(df_allergen)} 行")
            
            # Sheet 4: 成分说明
            if self.ingredients_data:
                df_ingredients = pd.DataFrame(self.ingredients_data)
                df_ingredients.to_excel(writer, sheet_name='成分说明', index=False)
                logger.info(f"  ✓ Sheet '成分说明': {len(df_ingredients)} 行")
            
            # Sheet 5: 数据统计
            stats = {
                '统计项': [
                    '总菜品数',
                    '分类数',
                    '有价格的菜品',
                    '有图片的菜品',
                    '有营养数据的菜品',
                    '素食选项数',
                    '营养信息条目数',
                    '过敏信息条目数',
                    '成分说明条目数',
                ],
                '数值': [
                    len(df_merged),
                    df_merged['category'].nunique() if 'category' in df_merged.columns else 0,
                    df_merged['price'].notna().sum() if 'price' in df_merged.columns else 0,
                    df_merged['image_path'].notna().sum() if 'image_path' in df_merged.columns else 0,
                    df_merged['calories_kcal'].notna().sum() if 'calories_kcal' in df_merged.columns else 0,
                    df_merged['vegetarian'].sum() if 'vegetarian' in df_merged.columns else 0,
                    len(self.nutrition_data),
                    len(self.allergen_data),
                    len(self.ingredients_data),
                ]
            }
            df_stats = pd.DataFrame(stats)
            df_stats.to_excel(writer, sheet_name='数据统计', index=False)
            logger.info(f"  ✓ Sheet '数据统计'")
        
        logger.info(f"\n✓ Excel 文件已保存: {excel_file}")
        
        # 同时保存 JSON 和 CSV
        json_file = self.output_dir / 'tacobell_complete_data.json'
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump({
                'menu': df_merged.to_dict('records'),
                'nutrition': self.nutrition_data,
                'allergen': self.allergen_data,
                'ingredients': self.ingredients_data
            }, f, ensure_ascii=False, indent=2)
        logger.info(f"✓ JSON 文件已保存: {json_file}")
        
        csv_file = self.output_dir / 'tacobell_complete_data.csv'
        df_main.to_csv(csv_file, index=False, encoding='utf-8-sig')
        logger.info(f"✓ CSV 文件已保存: {csv_file}")
        
        return excel_file
    
    def scrape_all(self):
        """执行完整爬取流程"""
        logger.info("\n" + "=" * 70)
        logger.info("Taco Bell 完整数据爬虫启动")
        logger.info("=" * 70 + "\n")
        
        # 1. 获取菜单基本信息
        self.get_menu_from_api()
        
        # 2. 获取营养信息
        self.get_nutrition_from_nutritionix()
        
        # 3. 获取过敏信息
        self.get_allergen_info()
        
        # 4. 获取成分说明
        self.get_ingredients_info()
        
        # 5. 下载图片
        self.download_all_images()
        
        # 6. 合并数据
        df_merged = self.merge_data()
        
        # 7. 保存到 Excel
        excel_file = self.save_to_excel(df_merged)
        
        # 打印最终统计
        logger.info("\n" + "=" * 70)
        logger.info("爬取完成! 最终统计:")
        logger.info("=" * 70)
        logger.info(f"  菜单菜品: {len(self.menu_items)}")
        logger.info(f"  营养信息: {len(self.nutrition_data)}")
        logger.info(f"  过敏信息: {len(self.allergen_data)}")
        logger.info(f"  成分说明: {len(self.ingredients_data)}")
        logger.info(f"\n  输出文件: {excel_file}")
        logger.info("=" * 70)
        
        return excel_file


def main():
    scraper = TacoBellIntegratedScraper()
    scraper.scrape_all()


if __name__ == '__main__':
    main()
