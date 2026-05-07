#!/usr/bin/env python3
"""
Taco Bell 菜单爬虫 - 优化版本
基于网站实际的 API 和结构进行爬取
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
        logging.FileHandler('scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class TacoBellScraperAPI:
    """Taco Bell 菜单爬虫 - 基于 API 的高效版本"""
    
    def __init__(self, output_dir='output'):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # 创建图片保存目录
        self.images_dir = self.output_dir / 'images'
        self.images_dir.mkdir(exist_ok=True)
        
        # 数据存储
        self.all_items = []
        self.nutrition_data = {}
        
        # 网站URL
        self.base_url = 'https://www.tacobell.com'
        
        # HTTP headers
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
        
        # Session
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
    def download_image(self, image_url, item_name):
        """下载图片"""
        try:
            # 清理文件名
            safe_name = "".join(c for c in item_name if c.isalnum() or c in (' ', '_', '-')).strip()
            safe_name = safe_name.replace(' ', '_')
            
            # 获取图片扩展名
            ext = '.jpg'
            if '.' in image_url.split('?')[0]:
                ext = '.' + image_url.split('?')[0].split('.')[-1].lower()
            
            filename = f"{safe_name}{ext}"
            filepath = self.images_dir / filename
            
            # 如果文件已存在,跳过下载
            if filepath.exists():
                logger.info(f"图片已存在: {filename}")
                return str(filepath.relative_to(self.output_dir))
            
            # 下载图片
            response = self.session.get(image_url, timeout=30)
            
            if response.status_code == 200:
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                logger.info(f"图片下载成功: {filename}")
                return str(filepath.relative_to(self.output_dir))
            else:
                logger.warning(f"图片下载失败: {image_url}, 状态码: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"下载图片时出错: {image_url}, 错误: {str(e)}")
            return None
    
    def get_menu_page_html(self, url):
        """获取页面 HTML"""
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            return response.text
        except Exception as e:
            logger.error(f"获取页面失败 {url}: {str(e)}")
            return None
    
    def get_all_menu_categories(self):
        """获取所有菜单分类"""
        logger.info("开始获取菜单分类...")
        
        menu_url = f"{self.base_url}/food"
        html = self.get_menu_page_html(menu_url)
        
        if not html:
            return []
        
        soup = BeautifulSoup(html, 'html.parser')
        categories = []
        
        # 查找所有分类链接
        category_links = soup.find_all('a', href=re.compile(r'/food/[^/]+$'))
        
        seen_urls = set()
        for link in category_links:
            href = link.get('href')
            if href and href not in seen_urls:
                full_url = f"{self.base_url}{href}" if href.startswith('/') else href
                
                # 获取分类名称
                name_elem = link.find(['strong', 'h2', 'h3', 'h4', 'span'])
                category_name = name_elem.get_text(strip=True) if name_elem else link.get_text(strip=True)
                
                if category_name and full_url not in seen_urls:
                    categories.append({
                        'name': category_name,
                        'url': full_url
                    })
                    seen_urls.add(full_url)
                    logger.info(f"发现分类: {category_name}")
        
        logger.info(f"共找到 {len(categories)} 个分类")
        return categories
    
    def get_items_from_category(self, category_url, category_name):
        """从分类页面获取所有菜品"""
        logger.info(f"开始爬取分类: {category_name}")
        
        html = self.get_menu_page_html(category_url)
        if not html:
            return []
        
        soup = BeautifulSoup(html, 'html.parser')
        items = []
        
        # 查找所有菜品链接 - 匹配更深层的路径如 /food/tacos/soft-taco
        item_links = soup.find_all('a', href=re.compile(r'/food/[^/]+/[^/]+'))
        
        seen_urls = set()
        for link in item_links:
            href = link.get('href')
            if not href or href in seen_urls:
                continue
            
            full_url = f"{self.base_url}{href}" if href.startswith('/') else href
            
            # 跳过分类页面本身
            if full_url == category_url:
                continue
            
            # 查找菜品名称
            item_name = None
            name_elem = link.find(['h4', 'h3', 'strong'])
            if name_elem:
                item_name = name_elem.get_text(strip=True)
            
            # 如果在链接内部没找到名称,查找父元素
            if not item_name:
                parent = link.find_parent()
                if parent:
                    name_elem = parent.find(['h4', 'h3', 'strong'])
                    if name_elem:
                        item_name = name_elem.get_text(strip=True)
            
            # 查找图片
            image_url = None
            img = link.find('img')
            if img:
                image_url = img.get('src')
            else:
                parent = link.find_parent()
                if parent:
                    img = parent.find('img')
                    if img:
                        image_url = img.get('src')
            
            # 查找价格和卡路里信息
            price_cal_text = None
            parent = link.find_parent()
            if parent:
                price_elem = parent.find('p', string=re.compile(r'\$|Cal'))
                if price_elem:
                    price_cal_text = price_elem.get_text(strip=True)
            
            if item_name and full_url not in seen_urls:
                items.append({
                    'name': item_name,
                    'url': full_url,
                    'category': category_name,
                    'image_url': image_url,
                    'price_cal_text': price_cal_text
                })
                seen_urls.add(full_url)
                logger.info(f"  找到菜品: {item_name}")
        
        logger.info(f"分类 {category_name} 共找到 {len(items)} 个菜品")
        return items
    
    def parse_price_cal_text(self, text):
        """解析价格和卡路里文本"""
        result = {}
        
        if not text:
            return result
        
        # 解析价格
        price_match = re.search(r'\$(\d+\.?\d*)', text)
        if price_match:
            result['price'] = f"${price_match.group(1)}"
        
        # 解析卡路里
        cal_match = re.search(r'(\d+(?:-\d+)?)\s*Cal', text)
        if cal_match:
            result['calories'] = cal_match.group(1)
        
        return result
    
    def get_item_details(self, item):
        """获取菜品详细信息"""
        item_url = item['url']
        item_name = item.get('name', 'Unknown')
        
        logger.info(f"获取菜品详情: {item_name}")
        
        try:
            html = self.get_menu_page_html(item_url)
            if not html:
                return item
            
            soup = BeautifulSoup(html, 'html.parser')
            
            # 解析价格和卡路里
            if item.get('price_cal_text'):
                parsed_data = self.parse_price_cal_text(item['price_cal_text'])
                item.update(parsed_data)
            
            # 从页面中获取价格(如果之前没有)
            if not item.get('price'):
                price_elem = soup.find(string=re.compile(r'\$\d+\.?\d*'))
                if price_elem:
                    price_match = re.search(r'\$(\d+\.?\d*)', price_elem)
                    if price_match:
                        item['price'] = f"${price_match.group(1)}"
            
            # 获取卡路里(从页面顶部)
            if not item.get('calories'):
                cal_elem = soup.find(string=re.compile(r'\d+(?:-\d+)?\s*Cal'))
                if cal_elem:
                    cal_match = re.search(r'(\d+(?:-\d+)?)\s*Cal', cal_elem)
                    if cal_match:
                        item['calories'] = cal_match.group(1)
            
            # 获取描述
            desc_elem = soup.find('p', string=re.compile(r'.{20,}'))
            if desc_elem:
                desc_text = desc_elem.get_text(strip=True)
                if len(desc_text) > 20:  # 确保是真实的描述而不是其他文本
                    item['description'] = desc_text
            
            # 获取成分信息
            ingredients = []
            
            # 查找 "What's Included" 部分
            whats_included = soup.find(string=re.compile(r"What'?s Included", re.I))
            if whats_included:
                parent = whats_included.find_parent()
                if parent:
                    # 查找所有成分按钮或选择框
                    ing_elems = parent.find_all(['button', 'div', 'span'], string=re.compile(r'\w+'))
                    for elem in ing_elems:
                        ing_text = elem.get_text(strip=True)
                        # 过滤掉无关文本
                        if ing_text and len(ing_text) < 50 and not any(skip in ing_text.lower() for skip in ['what', 'included', 'group', 'option', 'current', 'selection']):
                            if ing_text not in ingredients:
                                ingredients.append(ing_text)
            
            if ingredients:
                item['ingredients'] = ', '.join(ingredients[:10])  # 限制数量
            
            # 尝试获取营养信息(从内联数据或脚本)
            # 查找包含营养数据的 script 标签
            scripts = soup.find_all('script', type='application/json')
            for script in scripts:
                try:
                    data = json.loads(script.string)
                    # 尝试从 JSON 中提取营养信息
                    # 这里需要根据实际的数据结构调整
                    if isinstance(data, dict):
                        nutrition = self.extract_nutrition_from_json(data)
                        if nutrition:
                            item.update(nutrition)
                            break
                except:
                    pass
            
            # 下载图片
            if item.get('image_url'):
                image_path = self.download_image(item['image_url'], item_name)
                item['image_path'] = image_path
            
            time.sleep(0.5)  # 礼貌延时
            return item
            
        except Exception as e:
            logger.error(f"获取菜品详情失败 {item_name}: {str(e)}")
            return item
    
    def extract_nutrition_from_json(self, data, nutrition=None):
        """递归从 JSON 中提取营养信息"""
        if nutrition is None:
            nutrition = {}
        
        if isinstance(data, dict):
            for key, value in data.items():
                key_lower = key.lower()
                
                # 匹配营养字段
                if 'calorie' in key_lower and isinstance(value, (int, float, str)):
                    nutrition['calories_kcal'] = str(value).split()[0]
                elif 'fat' in key_lower and 'total' in key_lower:
                    nutrition['total_fat_g'] = str(value).split()[0]
                elif 'saturated' in key_lower:
                    nutrition['saturated_fat_g'] = str(value).split()[0]
                elif 'trans' in key_lower:
                    nutrition['trans_fat_g'] = str(value).split()[0]
                elif 'cholesterol' in key_lower:
                    nutrition['cholesterol_mg'] = str(value).split()[0]
                elif 'sodium' in key_lower:
                    nutrition['sodium_mg'] = str(value).split()[0]
                elif 'carb' in key_lower and 'total' in key_lower:
                    nutrition['total_carbs_g'] = str(value).split()[0]
                elif 'fiber' in key_lower:
                    nutrition['fiber_g'] = str(value).split()[0]
                elif 'sugar' in key_lower:
                    nutrition['sugars_g'] = str(value).split()[0]
                elif 'protein' in key_lower:
                    nutrition['protein_g'] = str(value).split()[0]
                elif 'serving' in key_lower and 'size' in key_lower:
                    nutrition['serving_size'] = str(value)
                
                # 递归搜索
                if isinstance(value, (dict, list)):
                    self.extract_nutrition_from_json(value, nutrition)
        
        elif isinstance(data, list):
            for item in data:
                self.extract_nutrition_from_json(item, nutrition)
        
        return nutrition
    
    def load_nutrition_data(self):
        """
        从营养信息页面加载所有菜品的营养数据
        这个页面包含了所有菜品的完整营养信息
        """
        logger.info("开始加载营养信息数据库...")
        
        nutrition_url = f"{self.base_url}/nutrition/info"
        html = self.get_menu_page_html(nutrition_url)
        
        if not html:
            logger.warning("无法加载营养信息页面")
            return
        
        soup = BeautifulSoup(html, 'html.parser')
        
        # 查找所有营养信息表格或数据结构
        # 这里需要根据实际页面结构调整
        
        # 尝试从页面的 JavaScript 数据中提取
        scripts = soup.find_all('script')
        for script in scripts:
            if script.string and 'nutrition' in script.string.lower():
                try:
                    # 尝试提取 JSON 数据
                    json_match = re.search(r'(\{.*\}|\[.*\])', script.string, re.DOTALL)
                    if json_match:
                        data = json.loads(json_match.group(1))
                        logger.info("找到营养数据 JSON")
                        # 存储供后续使用
                        # 这里需要根据实际数据结构解析
                        break
                except:
                    pass
        
        logger.info("营养信息数据库加载完成")
    
    def scrape_all(self):
        """爬取所有菜品"""
        try:
            # 先尝试加载营养信息数据库
            self.load_nutrition_data()
            
            # 1. 获取所有分类
            categories = self.get_all_menu_categories()
            
            if not categories:
                logger.error("未找到任何分类,退出爬取")
                return
            
            # 2. 遍历每个分类
            for idx, category in enumerate(categories, 1):
                logger.info(f"处理分类 {idx}/{len(categories)}: {category['name']}")
                
                try:
                    # 获取分类下的所有菜品
                    items = self.get_items_from_category(category['url'], category['name'])
                    
                    # 3. 获取每个菜品的详细信息
                    for item_idx, item in enumerate(items, 1):
                        try:
                            logger.info(f"  处理菜品 {item_idx}/{len(items)}")
                            detailed_item = self.get_item_details(item)
                            self.all_items.append(detailed_item)
                            
                        except Exception as e:
                            logger.error(f"处理菜品失败: {str(e)}")
                            continue
                    
                    # 每完成一个分类后休息
                    time.sleep(2)
                    
                except Exception as e:
                    logger.error(f"处理分类 {category['name']} 失败: {str(e)}")
                    continue
            
            logger.info(f"爬取完成! 共获取 {len(self.all_items)} 个菜品")
            
            # 保存数据
            self.save_data()
            
        except Exception as e:
            logger.error(f"爬取过程出错: {str(e)}")
    
    def save_data(self):
        """保存数据到文件"""
        if not self.all_items:
            logger.warning("没有数据可保存")
            return
        
        try:
            # 保存为 JSON
            json_file = self.output_dir / 'tacobell_menu.json'
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(self.all_items, f, ensure_ascii=False, indent=2)
            logger.info(f"JSON 数据已保存: {json_file}")
            
            # 保存为 Excel
            df = pd.DataFrame(self.all_items)
            
            # 重新排列列顺序
            priority_columns = [
                'name', 'category', 'url', 'image_url', 'image_path', 'price',
                'calories', 'serving_size', 'ingredients',
                'calories_kcal', 'total_fat_g', 'saturated_fat_g', 'trans_fat_g',
                'cholesterol_mg', 'sodium_mg', 'total_carbs_g', 'fiber_g',
                'sugars_g', 'protein_g', 'description'
            ]
            
            # 只保留存在的列
            columns_order = [col for col in priority_columns if col in df.columns]
            # 添加其他列
            other_columns = [col for col in df.columns if col not in columns_order]
            columns_order.extend(other_columns)
            
            df = df[columns_order]
            
            excel_file = self.output_dir / 'tacobell_menu.xlsx'
            df.to_excel(excel_file, index=False, engine='openpyxl')
            logger.info(f"Excel 数据已保存: {excel_file}")
            
            # 保存为 CSV
            csv_file = self.output_dir / 'tacobell_menu.csv'
            df.to_csv(csv_file, index=False, encoding='utf-8-sig')
            logger.info(f"CSV 数据已保存: {csv_file}")
            
            # 打印统计信息
            logger.info(f"\n数据统计:")
            logger.info(f"  总菜品数: {len(self.all_items)}")
            logger.info(f"  分类数: {df['category'].nunique()}")
            logger.info(f"  有价格的: {df['price'].notna().sum()}")
            logger.info(f"  有图片的: {df['image_path'].notna().sum()}")
            
        except Exception as e:
            logger.error(f"保存数据失败: {str(e)}")


def main():
    """主函数"""
    logger.info("="*50)
    logger.info("Taco Bell 菜单爬虫启动")
    logger.info("="*50)
    
    scraper = TacoBellScraperAPI(output_dir='output')
    scraper.scrape_all()
    
    logger.info("="*50)
    logger.info("爬取任务完成")
    logger.info("="*50)


if __name__ == '__main__':
    main()
