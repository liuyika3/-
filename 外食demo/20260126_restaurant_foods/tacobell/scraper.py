#!/usr/bin/env python3
"""
Taco Bell 菜单爬虫
爬取所有菜品的详细信息,包括营养数据、成分、图片等
"""

import json
import os
import time
import requests
from urllib.parse import urljoin
from pathlib import Path
import pandas as pd
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
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


class TacoBellScraper:
    """Taco Bell 菜单爬虫"""
    
    def __init__(self, output_dir='output'):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # 创建图片保存目录
        self.images_dir = self.output_dir / 'images'
        self.images_dir.mkdir(exist_ok=True)
        
        # 数据存储
        self.all_items = []
        
        # 网站URL
        self.base_url = 'https://www.tacobell.com'
        self.menu_url = f'{self.base_url}/food'
        self.nutrition_url = f'{self.base_url}/nutrition/info'
        
        # 初始化浏览器
        self.driver = None
        
    def setup_driver(self):
        """设置浏览器驱动"""
        chrome_options = Options()
        chrome_options.add_argument('--headless')  # 无头模式
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
        
        self.driver = webdriver.Chrome(options=chrome_options)
        self.wait = WebDriverWait(self.driver, 20)
        logger.info("浏览器驱动初始化成功")
        
    def close_driver(self):
        """关闭浏览器"""
        if self.driver:
            self.driver.quit()
            logger.info("浏览器驱动已关闭")
    
    def download_image(self, image_url, item_name):
        """下载图片"""
        try:
            # 清理文件名
            safe_name = "".join(c for c in item_name if c.isalnum() or c in (' ', '_', '-')).strip()
            safe_name = safe_name.replace(' ', '_')
            
            # 获取图片扩展名
            ext = '.jpg'  # 默认jpg
            if '.' in image_url.split('?')[0]:
                ext = '.' + image_url.split('?')[0].split('.')[-1].lower()
            
            filename = f"{safe_name}{ext}"
            filepath = self.images_dir / filename
            
            # 如果文件已存在,跳过下载
            if filepath.exists():
                logger.info(f"图片已存在: {filename}")
                return str(filepath.relative_to(self.output_dir))
            
            # 下载图片
            response = requests.get(image_url, timeout=30, headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            })
            
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
    
    def get_menu_categories(self):
        """获取所有菜单分类"""
        logger.info("开始获取菜单分类...")
        self.driver.get(self.menu_url)
        time.sleep(3)
        
        categories = []
        try:
            # 查找所有分类卡片
            category_elements = self.driver.find_elements(By.CSS_SELECTOR, 'article[role="article"]')
            
            for element in category_elements:
                try:
                    # 获取分类名称和链接
                    link = element.find_element(By.CSS_SELECTOR, 'a')
                    category_url = link.get_attribute('href')
                    
                    # 获取分类名称
                    name_elem = element.find_element(By.TAG_NAME, 'strong, h2, h3, h4')
                    category_name = name_elem.text.strip()
                    
                    if category_url and category_name:
                        categories.append({
                            'name': category_name,
                            'url': category_url
                        })
                        logger.info(f"发现分类: {category_name}")
                        
                except Exception as e:
                    logger.warning(f"解析分类时出错: {str(e)}")
                    continue
            
            logger.info(f"共找到 {len(categories)} 个分类")
            return categories
            
        except Exception as e:
            logger.error(f"获取菜单分类失败: {str(e)}")
            return []
    
    def get_items_from_category(self, category_url, category_name):
        """从分类页面获取所有菜品"""
        logger.info(f"开始爬取分类: {category_name}")
        self.driver.get(category_url)
        time.sleep(3)
        
        items = []
        try:
            # 查找所有菜品卡片
            item_elements = self.driver.find_elements(By.CSS_SELECTOR, 'div[class*="menu-item"], article[class*="product"]')
            
            if not item_elements:
                # 尝试另一种选择器
                item_elements = self.driver.find_elements(By.CSS_SELECTOR, 'div > a[href*="/food/"]')
            
            for element in item_elements:
                try:
                    # 获取菜品链接
                    item_link = None
                    if element.tag_name == 'a':
                        item_link = element.get_attribute('href')
                    else:
                        link_elem = element.find_element(By.CSS_SELECTOR, 'a[href*="/food/"]')
                        item_link = link_elem.get_attribute('href')
                    
                    if item_link and '/food/' in item_link:
                        # 获取菜品基本信息
                        item_name = None
                        try:
                            name_elem = element.find_element(By.CSS_SELECTOR, 'h4, h3, strong')
                            item_name = name_elem.text.strip()
                        except:
                            pass
                        
                        # 获取图片URL
                        image_url = None
                        try:
                            img_elem = element.find_element(By.TAG_NAME, 'img')
                            image_url = img_elem.get_attribute('src')
                        except:
                            pass
                        
                        # 获取价格和卡路里
                        price_cal = None
                        try:
                            price_elem = element.find_element(By.CSS_SELECTOR, 'p, div[class*="price"]')
                            price_cal = price_elem.text.strip()
                        except:
                            pass
                        
                        items.append({
                            'name': item_name,
                            'url': item_link,
                            'category': category_name,
                            'image_url': image_url,
                            'price_cal_text': price_cal
                        })
                        
                        if item_name:
                            logger.info(f"  找到菜品: {item_name}")
                        
                except Exception as e:
                    logger.warning(f"解析菜品时出错: {str(e)}")
                    continue
            
            logger.info(f"分类 {category_name} 共找到 {len(items)} 个菜品")
            return items
            
        except Exception as e:
            logger.error(f"从分类页面获取菜品失败: {str(e)}")
            return []
    
    def get_item_details(self, item):
        """获取菜品详细信息"""
        item_url = item['url']
        item_name = item.get('name', 'Unknown')
        
        logger.info(f"获取菜品详情: {item_name}")
        
        try:
            self.driver.get(item_url)
            time.sleep(2)
            
            # 解析价格和卡路里(从页面顶部获取)
            try:
                price_elem = self.driver.find_element(By.CSS_SELECTOR, 'div[class*="price"], span[class*="price"]')
                price_text = price_elem.text.strip()
                
                # 提取价格
                if '$' in price_text:
                    price = price_text.split('$')[-1].split()[0]
                    item['price'] = f"${price}"
                    
            except:
                pass
            
            try:
                cal_elem = self.driver.find_element(By.XPATH, '//*[contains(text(), "Cal")]')
                cal_text = cal_elem.text.strip()
                
                # 提取卡路里范围
                import re
                cal_match = re.search(r'(\d+(?:-\d+)?)\s*Cal', cal_text)
                if cal_match:
                    item['calories_range'] = cal_match.group(1)
                    
            except:
                pass
            
            # 获取菜品描述
            try:
                desc_elem = self.driver.find_element(By.CSS_SELECTOR, 'p[class*="description"], div[class*="description"]')
                item['description'] = desc_elem.text.strip()
            except:
                pass
            
            # 获取默认配置的成分
            try:
                ingredients = []
                ingredient_elems = self.driver.find_elements(By.CSS_SELECTOR, 'div[class*="included"] button, div[class*="ingredient"]')
                
                for elem in ingredient_elems:
                    ing_text = elem.text.strip()
                    if ing_text:
                        ingredients.append(ing_text)
                
                if ingredients:
                    item['default_ingredients'] = ', '.join(ingredients)
                    
            except:
                pass
            
            # 点击营养信息链接
            try:
                nutrition_link = self.driver.find_element(By.LINK_TEXT, 'Nutrition Info')
                nutrition_link.click()
                time.sleep(2)
                
                # 等待弹窗出现
                self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'dialog, div[role="dialog"]')))
                
                # 切换到 iframe(如果存在)
                iframes = self.driver.find_elements(By.TAG_NAME, 'iframe')
                if iframes:
                    self.driver.switch_to.frame(iframes[0])
                
                # 解析营养信息
                nutrition_data = self.parse_nutrition_info()
                item.update(nutrition_data)
                
                # 切换回主文档
                self.driver.switch_to.default_content()
                
                # 关闭弹窗
                try:
                    close_btn = self.driver.find_element(By.CSS_SELECTOR, 'button[aria-label*="Close"], button[class*="close"]')
                    close_btn.click()
                    time.sleep(1)
                except:
                    pass
                    
            except Exception as e:
                logger.warning(f"获取营养信息失败: {str(e)}")
            
            # 下载图片
            if item.get('image_url'):
                image_path = self.download_image(item['image_url'], item_name)
                item['image_path'] = image_path
            
            return item
            
        except Exception as e:
            logger.error(f"获取菜品详情失败 {item_name}: {str(e)}")
            return item
    
    def parse_nutrition_info(self):
        """解析营养信息弹窗"""
        nutrition_data = {}
        
        try:
            # 查找所有营养信息行
            rows = self.driver.find_elements(By.CSS_SELECTOR, 'tr, div[class*="nutrition-row"]')
            
            for row in rows:
                try:
                    text = row.text.strip()
                    if not text:
                        continue
                    
                    # 解析不同的营养信息
                    if 'Serving Size' in text or 'Serving size' in text:
                        nutrition_data['serving_size'] = text.split('\n')[-1].strip()
                    elif 'Calories' in text and 'kcal' not in text:
                        cal_value = ''.join(filter(str.isdigit, text))
                        if cal_value:
                            nutrition_data['calories_kcal'] = cal_value
                    elif 'Total Fat' in text or 'total fat' in text.lower():
                        fat_match = re.search(r'(\d+\.?\d*)\s*g', text)
                        if fat_match:
                            nutrition_data['total_fat_g'] = fat_match.group(1)
                    elif 'Saturated Fat' in text or 'saturated fat' in text.lower():
                        sat_match = re.search(r'(\d+\.?\d*)\s*g', text)
                        if sat_match:
                            nutrition_data['saturated_fat_g'] = sat_match.group(1)
                    elif 'Trans Fat' in text or 'trans fat' in text.lower():
                        trans_match = re.search(r'(\d+\.?\d*)\s*g', text)
                        if trans_match:
                            nutrition_data['trans_fat_g'] = trans_match.group(1)
                    elif 'Cholesterol' in text:
                        chol_match = re.search(r'(\d+\.?\d*)\s*mg', text)
                        if chol_match:
                            nutrition_data['cholesterol_mg'] = chol_match.group(1)
                    elif 'Sodium' in text:
                        sodium_match = re.search(r'(\d+\.?\d*)\s*mg', text)
                        if sodium_match:
                            nutrition_data['sodium_mg'] = sodium_match.group(1)
                    elif 'Total Carb' in text or 'total carb' in text.lower():
                        carb_match = re.search(r'(\d+\.?\d*)\s*g', text)
                        if carb_match:
                            nutrition_data['total_carbs_g'] = carb_match.group(1)
                    elif 'Fiber' in text and 'Dietary' in text:
                        fiber_match = re.search(r'(\d+\.?\d*)\s*g', text)
                        if fiber_match:
                            nutrition_data['fiber_g'] = fiber_match.group(1)
                    elif 'Sugar' in text:
                        sugar_match = re.search(r'(\d+\.?\d*)\s*g', text)
                        if sugar_match:
                            nutrition_data['sugars_g'] = sugar_match.group(1)
                    elif 'Protein' in text:
                        protein_match = re.search(r'(\d+\.?\d*)\s*g', text)
                        if protein_match:
                            nutrition_data['protein_g'] = protein_match.group(1)
                            
                except:
                    continue
            
            return nutrition_data
            
        except Exception as e:
            logger.error(f"解析营养信息失败: {str(e)}")
            return {}
    
    def scrape_all(self):
        """爬取所有菜品"""
        try:
            self.setup_driver()
            
            # 1. 获取所有分类
            categories = self.get_menu_categories()
            
            if not categories:
                logger.error("未找到任何分类,退出爬取")
                return
            
            # 2. 遍历每个分类
            for category in categories:
                try:
                    # 获取分类下的所有菜品
                    items = self.get_items_from_category(category['url'], category['name'])
                    
                    # 3. 获取每个菜品的详细信息
                    for item in items:
                        try:
                            detailed_item = self.get_item_details(item)
                            self.all_items.append(detailed_item)
                            
                            # 每爬取一个菜品后短暂休息
                            time.sleep(1)
                            
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
            
        finally:
            self.close_driver()
    
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
            columns_order = [
                'name', 'category', 'url', 'image_url', 'image_path', 'price',
                'calories_range', 'serving_size', 'default_ingredients',
                'calories_kcal', 'total_fat_g', 'saturated_fat_g', 'trans_fat_g',
                'cholesterol_mg', 'sodium_mg', 'total_carbs_g', 'fiber_g',
                'sugars_g', 'protein_g', 'description'
            ]
            
            # 只保留存在的列
            columns_order = [col for col in columns_order if col in df.columns]
            df = df[columns_order]
            
            excel_file = self.output_dir / 'tacobell_menu.xlsx'
            df.to_excel(excel_file, index=False, engine='openpyxl')
            logger.info(f"Excel 数据已保存: {excel_file}")
            
            # 保存为 CSV
            csv_file = self.output_dir / 'tacobell_menu.csv'
            df.to_csv(csv_file, index=False, encoding='utf-8-sig')
            logger.info(f"CSV 数据已保存: {csv_file}")
            
        except Exception as e:
            logger.error(f"保存数据失败: {str(e)}")


def main():
    """主函数"""
    logger.info("="*50)
    logger.info("Taco Bell 菜单爬虫启动")
    logger.info("="*50)
    
    scraper = TacoBellScraper(output_dir='output')
    scraper.scrape_all()
    
    logger.info("="*50)
    logger.info("爬取任务完成")
    logger.info("="*50)


if __name__ == '__main__':
    main()
