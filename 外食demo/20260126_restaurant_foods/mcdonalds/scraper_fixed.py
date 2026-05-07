#!/usr/bin/env python3
"""
麦当劳菜单完整数据爬虫 - 修复版
精确提取营养数据
"""

from playwright.sync_api import sync_playwright
import pandas as pd
import os
import re
import time
import json
from datetime import datetime
import requests

# 配置
BASE_URL = "https://www.mcdonalds.com"
MENU_URL = "https://www.mcdonalds.com/us/en-us/full-menu.html"
IMAGE_DIR = "images"
INGREDIENT_IMAGE_DIR = "images/ingredients"

def ensure_dir(path):
    """确保目录存在"""
    if not os.path.exists(path):
        os.makedirs(path)

def download_image(url, save_path):
    """下载图片"""
    if os.path.exists(save_path):
        return True
    try:
        if url.startswith('//'):
            url = 'https:' + url
        elif not url.startswith('http'):
            from urllib.parse import urljoin
            url = urljoin(BASE_URL, url)
        
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            with open(save_path, 'wb') as f:
                f.write(response.content)
            return True
    except Exception as e:
        print(f"    ⚠️ 图片下载失败: {e}")
    return False

def parse_nutrition_value(text):
    """解析营养数值 - 只提取数字,不包含单位"""
    if not text:
        return None
    # 移除所有非数字和小数点的字符
    cleaned = re.sub(r'[^\d.]', '', text)
    if cleaned and cleaned != '.':
        try:
            return float(cleaned)
        except:
            pass
    return None

def parse_dv_percent(text):
    """解析每日推荐百分比"""
    if not text:
        return None
    match = re.search(r'(\d+)\s*%', text)
    if match:
        return int(match.group(1))
    return None

def get_menu_items(page):
    """获取菜单中所有食物的链接"""
    print("\n📋 获取菜单列表...")
    
    page.goto(MENU_URL, wait_until='domcontentloaded', timeout=90000)
    time.sleep(5)
    
    foods = []
    product_links = page.query_selector_all('a[href*="/product/"], a[href*="/meal/"]')
    
    seen_urls = set()
    for link in product_links:
        try:
            href = link.get_attribute('href')
            if not href or href in seen_urls or '/meal/' in href:
                continue
            
            seen_urls.add(href)
            
            name = link.text_content().strip()
            name = re.sub(r'^\d+\s*', '', name)
            name = re.sub(r'\s+Cal\.$', '', name)
            name = name.strip()
            
            if not name or len(name) < 2:
                continue
            
            img = link.query_selector('img')
            img_url = img.get_attribute('src') or '' if img else ''
            
            from urllib.parse import urljoin
            full_url = urljoin(BASE_URL, href)
            food_id_match = re.search(r'/product/([^.]+)', href)
            food_id = food_id_match.group(1) if food_id_match else f'item_{len(foods)}'
            
            foods.append({
                'food_id': food_id,
                'food_name': name,
                'product_url': full_url,
                'main_image_url': img_url
            })
        except:
            continue
    
    unique_foods = []
    seen_ids = set()
    for food in foods:
        if food['food_id'] not in seen_ids:
            seen_ids.add(food['food_id'])
            unique_foods.append(food)
    
    print(f"✅ 找到 {len(unique_foods)} 个食物")
    return unique_foods

def scrape_product_detail(page, url, food_id, food_name):
    """爬取单个食物的详细信息 - 修复版"""
    try:
        print(f"  🔍 访问: {food_name[:40]}...")
        
        page.goto(url, wait_until='domcontentloaded', timeout=90000)
        time.sleep(3)
        
        detail = {
            'calories': None,
            'description': '',
            'nutrition': {},
            'ingredients': [],
            'allergens': set()
        }
        
        # 1. 提取卡路里 - 优化提取逻辑
        try:
            # 方法1: 查找包含"Cal"或"calories"的元素
            cal_selectors = [
                'text=/\\d+\\s*Cal/i',
                'text=/\\d+\\s*calories/i',
                '[class*="calorie"]',
                '[class*="Cal"]'
            ]
            
            for selector in cal_selectors:
                try:
                    cal_elem = page.locator(selector).first
                    if cal_elem.is_visible(timeout=1000):
                        cal_text = cal_elem.text_content()
                        cal_value = parse_nutrition_value(cal_text)
                        if cal_value and cal_value > 0:
                            detail['calories'] = int(cal_value)
                            break
                except:
                    continue
        except:
            pass
        
        # 2. 提取描述
        try:
            paras = page.query_selector_all('p')
            for p in paras:
                text = p.text_content().strip()
                # 跳过法律声明
                if 'Terms and Conditions' in text or 'arbitration' in text:
                    continue
                if len(text) > 50 and ('100%' in text or 'beef' in text.lower() or 'chicken' in text.lower()):
                    detail['description'] = text[:500]
                    break
        except:
            pass
        
        # 3. 展开营养信息
        try:
            nutrition_buttons = page.locator('button:has-text("Nutrition")').all()
            for btn in nutrition_buttons:
                try:
                    if btn.is_visible(timeout=500):
                        btn.click()
                        time.sleep(1)
                        break
                except:
                    continue
        except:
            pass
        
        # 4. 提取营养成分 - 精确提取
        try:
            # 定义营养素映射
            nutrition_map = {
                'protein': 'protein',
                'total carbohydrate': 'total_carbs',
                'total carbs': 'total_carbs',
                'carbohydrate': 'total_carbs',
                'total fat': 'total_fat',
                'saturated fat': 'saturated_fat',
                'trans fat': 'trans_fat',
                'cholesterol': 'cholesterol',
                'sodium': 'sodium',
                'dietary fiber': 'dietary_fiber',
                'total sugars': 'total_sugars',
                'added sugars': 'added_sugars',
                'includes': 'added_sugars',  # "Includes X g Added Sugars"
                'vitamin d': 'vitamin_d',
                'calcium': 'calcium',
                'iron': 'iron',
                'potassium': 'potassium'
            }
            
            # 单位映射
            unit_map = {
                'protein': 'g',
                'total_carbs': 'g',
                'total_fat': 'g',
                'saturated_fat': 'g',
                'trans_fat': 'g',
                'cholesterol': 'mg',
                'sodium': 'mg',
                'dietary_fiber': 'g',
                'total_sugars': 'g',
                'added_sugars': 'g',
                'vitamin_d': 'mcg',
                'calcium': 'mg',
                'iron': 'mg',
                'potassium': 'mg'
            }
            
            # 查找所有可能包含营养信息的元素
            nutrition_sections = page.query_selector_all('[class*="nutrition"], [class*="nutrient"], li, div')
            
            for elem in nutrition_sections:
                try:
                    text = elem.text_content().lower().strip()
                    
                    # 跳过空行和无关内容
                    if not text or len(text) > 200:
                        continue
                    
                    # 匹配营养素
                    for key, field in nutrition_map.items():
                        if key in text:
                            # 提取数值
                            value = parse_nutrition_value(text)
                            
                            # 提取DV%
                            dv = parse_dv_percent(text)
                            
                            # 保存数据
                            if value is not None:
                                field_name = f"{field}_{unit_map[field]}"
                                # 只保存非零值,或者确认网页显示为0
                                if value > 0 or '0g' in text or '0mg' in text or '0mcg' in text:
                                    detail['nutrition'][field_name] = value
                            
                            if dv is not None and dv > 0:
                                detail['nutrition'][f"{field}_dv"] = dv
                            
                            break
                except:
                    continue
        except Exception as e:
            print(f"    ⚠️ 营养提取错误: {e}")
        
        # 5. 展开过敏原信息
        try:
            allergen_buttons = page.locator('button:has-text("Allergen")').all()
            for btn in allergen_buttons:
                try:
                    if btn.is_visible(timeout=500):
                        btn.click()
                        time.sleep(1)
                        break
                except:
                    continue
        except:
            pass
        
        # 6. 提取配料信息
        try:
            headings = page.query_selector_all('h3, h4')
            for heading in headings:
                heading_text = heading.text_content().strip()
                
                if any(x in heading_text.lower() for x in ['nutrition', 'allergen', 'related', 'disclaimer']):
                    continue
                
                next_text = heading.evaluate('el => el.nextElementSibling?.textContent || ""')
                
                if 'ingredients:' in next_text.lower():
                    ingredients_text = re.sub(r'ingredients:\s*', '', next_text, flags=re.IGNORECASE)
                    
                    # 检测过敏原
                    allergens_found = []
                    allergen_keywords = {
                        'wheat': 'Wheat', 'milk': 'Milk', 'egg': 'Egg', 'soy': 'Soy',
                        'sesame': 'Sesame', 'fish': 'Fish', 'shellfish': 'Shellfish',
                        'peanut': 'Peanut', 'tree nut': 'Tree Nut', 'barley': 'Barley'
                    }
                    
                    for keyword, allergen in allergen_keywords.items():
                        if keyword in ingredients_text.lower():
                            allergens_found.append(allergen)
                            detail['allergens'].add(allergen)
                    
                    detail['ingredients'].append({
                        'order': len(detail['ingredients']) + 1,
                        'name': heading_text,
                        'details': ingredients_text.strip(),
                        'allergens': allergens_found
                    })
        except:
            pass
        
        detail['allergens'] = list(detail['allergens'])
        
        # 打印摘要
        cal = detail['calories'] or '-'
        ing_count = len(detail['ingredients'])
        allergen_count = len(detail['allergens'])
        nutr_count = len([k for k in detail['nutrition'].keys() if not k.endswith('_dv')])
        print(f"      ✓ {cal} Cal, {nutr_count} 营养项, {ing_count} 配料, {allergen_count} 过敏原")
        
        return detail
        
    except Exception as e:
        print(f"      ❌ 错误: {e}")
        return None

def main():
    print("=" * 70)
    print("🍔 麦当劳菜单完整数据爬虫 - 修复版")
    print("=" * 70)
    
    ensure_dir(IMAGE_DIR)
    ensure_dir(INGREDIENT_IMAGE_DIR)
    
    all_foods = []
    
    with sync_playwright() as p:
        print("\n🌐 启动浏览器...")
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = context.new_page()
        
        # 1. 获取菜单列表
        foods = get_menu_items(page)
        
        # 2. 爬取每个食物的详情
        print(f"\n🔍 开始爬取详情 (共 {len(foods)} 个)...")
        
        for i, food in enumerate(foods):
            print(f"\n[{i+1}/{len(foods)}] {food['food_name'][:50]}...")
            
            # 下载主图
            if food.get('main_image_url'):
                img_filename = f"{food['food_id']}.jpg"
                img_path = os.path.join(IMAGE_DIR, img_filename)
                if download_image(food['main_image_url'], img_path):
                    food['local_image_path'] = img_path
                else:
                    food['local_image_path'] = ''
            
            # 获取详情
            detail = scrape_product_detail(page, food['product_url'], food['food_id'], food['food_name'])
            food['detail'] = detail
            
            all_foods.append(food)
            time.sleep(1)
        
        browser.close()
    
    # 3. 生成Excel
    print(f"\n📊 生成Excel...")
    create_complete_excel(all_foods, 'McDonald_Foods_Fixed.xlsx')
    
    # 4. 保存JSON
    with open('foods_fixed_data.json', 'w', encoding='utf-8') as f:
        json.dump(all_foods, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 完整数据已保存: foods_fixed_data.json")
    print("\n" + "=" * 70)
    print("✅ 爬取完成!")
    print("=" * 70)

def create_complete_excel(foods, output_file):
    """创建完整Excel"""
    print(f"\n📊 生成Excel: {output_file}")
    
    # 主表
    master_data = []
    for food in foods:
        detail = food.get('detail') or {}
        nutrition = detail.get('nutrition', {})
        
        master_data.append({
            'food_id': food.get('food_id', ''),
            'food_name': food.get('food_name', ''),
            'food_name_cn': '',
            'product_url': food.get('product_url', ''),
            'local_image_path': food.get('local_image_path', ''),
            'calories': detail.get('calories') if detail.get('calories') else '',
            'protein_g': nutrition.get('protein_g') if nutrition.get('protein_g') else '',
            'total_carbs_g': nutrition.get('total_carbs_g') if nutrition.get('total_carbs_g') else '',
            'total_fat_g': nutrition.get('total_fat_g') if nutrition.get('total_fat_g') else '',
            'sodium_mg': nutrition.get('sodium_mg') if nutrition.get('sodium_mg') else '',
            'description': detail.get('description', '')[:500],
            'allergens': ', '.join(detail.get('allergens', [])),
            'ingredient_count': len(detail.get('ingredients', [])),
            'scraped_date': datetime.now().strftime('%Y-%m-%d')
        })
    
    df_master = pd.DataFrame(master_data)
    
    # 营养成分详细表
    nutrition_data = []
    for food in foods:
        detail = food.get('detail') or {}
        nutrition = detail.get('nutrition', {})
        if nutrition:
            row = {
                'food_id': food.get('food_id', ''),
                'food_name': food.get('food_name', '')
            }
            # 只添加非空的营养素
            for key, value in nutrition.items():
                if value is not None and value != '':
                    row[key] = value
            nutrition_data.append(row)
    
    df_nutrition = pd.DataFrame(nutrition_data) if nutrition_data else pd.DataFrame()
    
    # 配料表
    ingredients_data = []
    for food in foods:
        detail = food.get('detail') or {}
        for ing in detail.get('ingredients', []):
            ingredients_data.append({
                'food_id': food.get('food_id', ''),
                'food_name': food.get('food_name', ''),
                'ingredient_order': ing.get('order', ''),
                'ingredient_name': ing.get('name', ''),
                'ingredient_image_url': ing.get('image_url', ''),
                'local_image_path': ing.get('local_image_path', ''),
                'ingredient_details': ing.get('details', '')[:1000],
                'contains_allergens': ', '.join(ing.get('allergens', []))
            })
    
    df_ingredients = pd.DataFrame(ingredients_data) if ingredients_data else pd.DataFrame()
    
    # 过敏原表
    allergen_data = []
    for food in foods:
        detail = food.get('detail') or {}
        for ing in detail.get('ingredients', []):
            for allergen in ing.get('allergens', []):
                allergen_data.append({
                    'food_id': food.get('food_id', ''),
                    'food_name': food.get('food_name', ''),
                    'allergen_type': allergen,
                    'allergen_source': ing.get('name', ''),
                    'severity': 'Contains'
                })
    
    df_allergens = pd.DataFrame(allergen_data) if allergen_data else pd.DataFrame()
    
    # 保存Excel
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        df_master.to_excel(writer, sheet_name='01_Foods_Master', index=False)
        
        if not df_nutrition.empty:
            df_nutrition.to_excel(writer, sheet_name='02_Nutrition', index=False)
        
        if not df_ingredients.empty:
            df_ingredients.to_excel(writer, sheet_name='03_Ingredients', index=False)
        
        if not df_allergens.empty:
            df_allergens.to_excel(writer, sheet_name='04_Allergens', index=False)
        
        # 统计
        stats = pd.DataFrame({
            '统计项': [
                '食物总数',
                '有卡路里数据',
                '有营养数据',
                '有配料数据',
                '配料总数',
                '过敏原记录数',
                '下载图片数'
            ],
            '数量': [
                len(df_master),
                df_master['calories'].notna().sum(),
                len(df_nutrition),
                df_ingredients['food_id'].nunique() if not df_ingredients.empty else 0,
                len(df_ingredients),
                len(df_allergens),
                df_master['local_image_path'].notna().sum()
            ]
        })
        stats.to_excel(writer, sheet_name='05_Statistics', index=False)
    
    print(f"✅ Excel已保存: {output_file}")

if __name__ == '__main__':
    main()
