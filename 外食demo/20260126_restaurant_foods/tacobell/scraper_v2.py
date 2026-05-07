#!/usr/bin/env python3
"""
Taco Bell 完整数据爬虫 V2 - 改进版
- 改进名称匹配算法
- 添加过敏信息爬取
- 添加成分说明爬取
"""

import json
import time
import requests
from pathlib import Path
import pandas as pd
from bs4 import BeautifulSoup
import logging
import re
from difflib import SequenceMatcher

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scraper_v2.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class TacoBellScraperV2:
    """Taco Bell 完整数据爬虫 V2"""
    
    def __init__(self, output_dir='output_v2'):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        self.images_dir = self.output_dir / 'images'
        self.images_dir.mkdir(exist_ok=True)
        
        # 数据存储
        self.menu_items = []
        self.nutrition_data = []
        self.allergen_data = []
        self.ingredients_data = []
        
        # URLs
        self.base_url = 'https://www.tacobell.com'
        self.api_url = 'https://www.tacobell.com/tacobellwebservices/v4/tacobell/products/menu/0000'
        self.nutritionix_url = 'https://www.nutritionix.com/taco-bell/menu/premium'
        self.allergen_url = 'https://www.nutritionix.com/taco-bell/menu/special-diets/premium'
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
        except:
            return None
    
    def normalize_name(self, name):
        """标准化名称用于匹配"""
        if not name:
            return ""
        name = str(name).lower()
        # 移除特殊字符
        name = re.sub(r'[®™©]', '', name)
        # 移除括号内容
        name = re.sub(r'\([^)]*\)', '', name)
        # 移除多余空格
        name = re.sub(r'\s+', ' ', name)
        # 移除常见后缀
        name = re.sub(r'\s*(combo|box|pack|meal)$', '', name, flags=re.IGNORECASE)
        return name.strip()
    
    def fuzzy_match(self, name1, name2, threshold=0.7):
        """模糊匹配两个名称"""
        n1 = self.normalize_name(name1)
        n2 = self.normalize_name(name2)
        
        # 完全匹配
        if n1 == n2:
            return True
        
        # 包含关系
        if n1 in n2 or n2 in n1:
            return True
        
        # 相似度匹配
        ratio = SequenceMatcher(None, n1, n2).ratio()
        return ratio >= threshold
    
    def get_menu_from_api(self):
        """从官方 API 获取菜单"""
        logger.info("=" * 70)
        logger.info("步骤 1: 获取菜单基本信息")
        logger.info("=" * 70)
        
        try:
            response = self.session.get(self.api_url, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            categories = data.get('menuProductCategories', [])
            
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
                    
                    price_data = product.get('price', {})
                    if price_data:
                        item['price'] = price_data.get('formattedValue', '')
                    
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
        """从 Nutritionix 获取营养信息"""
        logger.info("=" * 70)
        logger.info("步骤 2: 获取营养信息")
        logger.info("=" * 70)
        
        try:
            response = self.session.get(self.nutritionix_url, timeout=60)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            table = soup.find('table', class_='tblCompare')
            
            if not table:
                logger.warning("未找到营养信息表格")
                return False
            
            tbody = table.find('tbody')
            if tbody:
                rows = tbody.find_all('tr')
                current_category = ""
                
                for row in rows:
                    # 检查分类行
                    category_cell = row.find('td', class_='category')
                    if category_cell:
                        current_category = category_cell.get_text(strip=True)
                        continue
                    
                    cells = row.find_all('td')
                    if len(cells) >= 12:
                        name_cell = cells[0]
                        name_link = name_cell.find('a')
                        item_name = name_link.get_text(strip=True) if name_link else name_cell.get_text(strip=True)
                        
                        # 获取 serving size
                        serving_size = ""
                        serving_span = name_cell.find('span', class_='serving')
                        if serving_span:
                            serving_size = serving_span.get_text(strip=True)
                        
                        # 清理名称(移除 serving size)
                        if serving_size:
                            item_name = item_name.replace(serving_size, '').strip()
                        
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
            
            # 查找过敏信息表格
            table = soup.find('table', class_='tblCompare')
            
            if table:
                # 解析表头
                headers = []
                thead = table.find('thead')
                if thead:
                    for th in thead.find_all('th'):
                        header_text = th.get_text(strip=True)
                        header_text = re.sub(r'Sort by.*', '', header_text)
                        headers.append(header_text)
                
                logger.info(f"过敏信息表头: {headers}")
                
                # 解析数据
                tbody = table.find('tbody')
                if tbody:
                    rows = tbody.find_all('tr')
                    current_category = ""
                    
                    for row in rows:
                        category_cell = row.find('td', class_='category')
                        if category_cell:
                            current_category = category_cell.get_text(strip=True)
                            continue
                        
                        cells = row.find_all('td')
                        if cells:
                            name_cell = cells[0]
                            name_link = name_cell.find('a')
                            item_name = name_link.get_text(strip=True) if name_link else name_cell.get_text(strip=True)
                            
                            allergen_item = {
                                'name': item_name,
                                'category': current_category
                            }
                            
                            # 解析过敏原标记
                            for i, header in enumerate(headers[1:], 1):
                                if i < len(cells):
                                    cell_content = cells[i]
                                    # 检查是否有标记(通常是图标或文字)
                                    has_allergen = bool(cell_content.find('img') or 
                                                       cell_content.get_text(strip=True) in ['X', '✓', 'Yes', '•'])
                                    allergen_item[header] = 'Yes' if has_allergen else 'No'
                            
                            self.allergen_data.append(allergen_item)
            
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
            
            # 查找 iframe
            iframe = soup.find('iframe')
            if iframe:
                iframe_src = iframe.get('src', '')
                if iframe_src:
                    logger.info(f"发现成分说明 iframe: {iframe_src}")
                    
                    # 获取 iframe 内容
                    if not iframe_src.startswith('http'):
                        iframe_src = f"https://www.nutritionix.com{iframe_src}"
                    
                    iframe_response = self.session.get(iframe_src, timeout=60)
                    iframe_soup = BeautifulSoup(iframe_response.text, 'html.parser')
                    
                    # 查找成分列表
                    ingredient_items = iframe_soup.find_all(['div', 'p', 'li'], class_=re.compile(r'ingredient|item'))
                    
                    for item in ingredient_items:
                        # 查找名称和成分
                        name_elem = item.find(['strong', 'b', 'h3', 'h4'])
                        if name_elem:
                            item_name = name_elem.get_text(strip=True)
                            
                            # 获取成分文本
                            ingredients_text = item.get_text(strip=True)
                            ingredients_text = ingredients_text.replace(item_name, '', 1).strip()
                            
                            if ingredients_text and len(ingredients_text) > 10:
                                self.ingredients_data.append({
                                    'name': item_name,
                                    'ingredients': ingredients_text
                                })
            
            # 如果没有找到 iframe,尝试直接解析页面
            if not self.ingredients_data:
                # 查找所有可能的成分区块
                content_divs = soup.find_all('div', class_=re.compile(r'content|ingredient|statement'))
                
                for div in content_divs:
                    # 查找标题和内容对
                    headings = div.find_all(['h2', 'h3', 'h4', 'strong'])
                    for heading in headings:
                        item_name = heading.get_text(strip=True)
                        
                        # 查找后续的成分文本
                        next_elem = heading.find_next_sibling(['p', 'div', 'span'])
                        if next_elem:
                            ingredients_text = next_elem.get_text(strip=True)
                            if ingredients_text and len(ingredients_text) > 20:
                                self.ingredients_data.append({
                                    'name': item_name,
                                    'ingredients': ingredients_text
                                })
            
            logger.info(f"✓ 获取到 {len(self.ingredients_data)} 条成分信息")
            return True
        except Exception as e:
            logger.error(f"获取成分信息失败: {str(e)}")
            return False
    
    def download_all_images(self):
        """下载所有图片"""
        logger.info("=" * 70)
        logger.info("步骤 5: 下载图片")
        logger.info("=" * 70)
        
        for idx, item in enumerate(self.menu_items, 1):
            if idx % 20 == 0:
                logger.info(f"进度: {idx}/{len(self.menu_items)}")
            
            if item.get('image_url'):
                image_path = self.download_image(item['image_url'], item.get('name', 'unknown'))
                item['image_path'] = image_path
            
            time.sleep(0.2)
        
        logger.info("✓ 图片下载完成")
    
    def merge_data(self):
        """合并所有数据 - 改进版匹配算法"""
        logger.info("=" * 70)
        logger.info("步骤 6: 合并数据")
        logger.info("=" * 70)
        
        # 创建营养数据字典,用于快速查找
        nutrition_dict = {}
        for item in self.nutrition_data:
            normalized = self.normalize_name(item['name'])
            nutrition_dict[normalized] = item
        
        # 为每个菜单项匹配营养数据
        matched_count = 0
        
        for menu_item in self.menu_items:
            menu_name = menu_item['name']
            menu_normalized = self.normalize_name(menu_name)
            
            # 尝试精确匹配
            if menu_normalized in nutrition_dict:
                nutrition = nutrition_dict[menu_normalized]
                menu_item.update({
                    'serving_size': nutrition.get('serving_size', ''),
                    'calories_kcal': nutrition.get('calories_kcal', ''),
                    'total_fat_g': nutrition.get('total_fat_g', ''),
                    'saturated_fat_g': nutrition.get('saturated_fat_g', ''),
                    'trans_fat_g': nutrition.get('trans_fat_g', ''),
                    'cholesterol_mg': nutrition.get('cholesterol_mg', ''),
                    'sodium_mg': nutrition.get('sodium_mg', ''),
                    'total_carbs_g': nutrition.get('total_carbs_g', ''),
                    'fiber_g': nutrition.get('fiber_g', ''),
                    'sugars_g': nutrition.get('sugars_g', ''),
                    'added_sugars_g': nutrition.get('added_sugars_g', ''),
                    'protein_g': nutrition.get('protein_g', ''),
                })
                matched_count += 1
                continue
            
            # 尝试模糊匹配
            best_match = None
            best_ratio = 0
            
            for nutrition_name, nutrition in nutrition_dict.items():
                ratio = SequenceMatcher(None, menu_normalized, nutrition_name).ratio()
                if ratio > best_ratio and ratio >= 0.6:
                    best_ratio = ratio
                    best_match = nutrition
            
            if best_match:
                menu_item.update({
                    'serving_size': best_match.get('serving_size', ''),
                    'calories_kcal': best_match.get('calories_kcal', ''),
                    'total_fat_g': best_match.get('total_fat_g', ''),
                    'saturated_fat_g': best_match.get('saturated_fat_g', ''),
                    'trans_fat_g': best_match.get('trans_fat_g', ''),
                    'cholesterol_mg': best_match.get('cholesterol_mg', ''),
                    'sodium_mg': best_match.get('sodium_mg', ''),
                    'total_carbs_g': best_match.get('total_carbs_g', ''),
                    'fiber_g': best_match.get('fiber_g', ''),
                    'sugars_g': best_match.get('sugars_g', ''),
                    'added_sugars_g': best_match.get('added_sugars_g', ''),
                    'protein_g': best_match.get('protein_g', ''),
                    'matched_name': best_match.get('name', ''),
                })
                matched_count += 1
        
        logger.info(f"✓ 匹配完成: {matched_count}/{len(self.menu_items)} 个菜品有营养数据")
        
        return pd.DataFrame(self.menu_items)
    
    def save_to_excel(self, df_merged):
        """保存到 Excel"""
        logger.info("=" * 70)
        logger.info("步骤 7: 保存数据")
        logger.info("=" * 70)
        
        excel_file = self.output_dir / 'tacobell_complete_v2.xlsx'
        
        with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
            # Sheet 1: 完整菜单数据
            priority_columns = [
                'name', 'code', 'category', 'url', 'image_url', 'image_path',
                'price', 'serving_size',
                'calories_kcal', 'total_fat_g', 'saturated_fat_g', 'trans_fat_g',
                'cholesterol_mg', 'sodium_mg', 'total_carbs_g', 'fiber_g',
                'sugars_g', 'added_sugars_g', 'protein_g',
                'vegetarian', 'calories_api'
            ]
            
            columns = [col for col in priority_columns if col in df_merged.columns]
            other_cols = [col for col in df_merged.columns if col not in columns]
            columns.extend(other_cols)
            
            df_main = df_merged[columns].copy()
            df_main.to_excel(writer, sheet_name='菜单完整数据', index=False)
            logger.info(f"  ✓ Sheet '菜单完整数据': {len(df_main)} 行")
            
            # Sheet 2: 营养信息
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
            
            # Sheet 5: 统计
            stats_data = {
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
            df_stats = pd.DataFrame(stats_data)
            df_stats.to_excel(writer, sheet_name='数据统计', index=False)
        
        logger.info(f"\n✓ Excel: {excel_file}")
        
        # JSON
        json_file = self.output_dir / 'tacobell_complete_v2.json'
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump({
                'menu': df_merged.to_dict('records'),
                'nutrition': self.nutrition_data,
                'allergen': self.allergen_data,
                'ingredients': self.ingredients_data
            }, f, ensure_ascii=False, indent=2)
        logger.info(f"✓ JSON: {json_file}")
        
        # CSV
        csv_file = self.output_dir / 'tacobell_complete_v2.csv'
        df_main.to_csv(csv_file, index=False, encoding='utf-8-sig')
        logger.info(f"✓ CSV: {csv_file}")
        
        return excel_file
    
    def scrape_all(self):
        """执行完整爬取"""
        logger.info("\n" + "=" * 70)
        logger.info("Taco Bell 完整数据爬虫 V2 启动")
        logger.info("=" * 70 + "\n")
        
        self.get_menu_from_api()
        self.get_nutrition_from_nutritionix()
        self.get_allergen_info()
        self.get_ingredients_info()
        self.download_all_images()
        df_merged = self.merge_data()
        excel_file = self.save_to_excel(df_merged)
        
        # 统计
        logger.info("\n" + "=" * 70)
        logger.info("爬取完成!")
        logger.info("=" * 70)
        logger.info(f"  菜单菜品: {len(self.menu_items)}")
        logger.info(f"  营养信息: {len(self.nutrition_data)}")
        logger.info(f"  过敏信息: {len(self.allergen_data)}")
        logger.info(f"  成分说明: {len(self.ingredients_data)}")
        logger.info(f"  有营养数据: {df_merged['calories_kcal'].notna().sum() if 'calories_kcal' in df_merged.columns else 0}")
        logger.info(f"\n  输出: {excel_file}")
        logger.info("=" * 70)


def main():
    scraper = TacoBellScraperV2()
    scraper.scrape_all()


if __name__ == '__main__':
    main()
