#!/usr/bin/env python3
"""
麦当劳菜单完整数据爬虫 - 最终版
使用Browser MCP工具进行精确提取
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pandas as pd
import json
import re
import time
from datetime import datetime
import requests
from urllib.parse import urljoin

# 配置
BASE_URL = "https://www.mcdonalds.com"
MENU_URL = "https://www.mcdonalds.com/us/en-us/full-menu.html"
IMAGE_DIR = "images"

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

def download_image(url, save_path):
    if os.path.exists(save_path):
        return True
    try:
        if url.startswith('//'):
            url = 'https:' + url
        elif not url.startswith('http'):
            url = urljoin(BASE_URL, url)
        
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            with open(save_path, 'wb') as f:
                f.write(response.content)
            return True
    except:
        pass
    return False

def extract_number(text):
    """从文本中提取数字"""
    if not text:
        return None
    # 查找第一个数字
    match = re.search(r'(\d+(?:\.\d+)?)', text)
    if match:
        try:
            num = float(match.group(1))
            return int(num) if num == int(num) else num
        except:
            pass
    return None

def parse_nutrition_line(text):
    """解析营养信息行
    例如: "1060mg Sodium (46 % DV) 1060milligrams (46 Percent Daily Values )"
    返回: {'value': 1060, 'dv': 46}
    """
    result = {}
    
    # 提取数值
    value = extract_number(text)
    if value is not None:
        result['value'] = value
    
    # 提取DV%
    dv_match = re.search(r'(\d+)\s*%', text)
    if dv_match:
        result['dv'] = int(dv_match.group(1))
    
    return result

print("=" * 70)
print("🍔 麦当劳菜单完整数据爬虫 - 最终版")
print("=" * 70)

ensure_dir(IMAGE_DIR)

# 读取现有的JSON数据
with open('foods_playwright_data.json', 'r', encoding='utf-8') as f:
    foods = json.load(f)

print(f"\n加载了 {len(foods)} 个食物")
print("\n开始修复营养数据...")

# 使用playwright重新爬取营养数据
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})
    
    for i, food in enumerate(foods):
        print(f"\n[{i+1}/{len(foods)}] {food['food_name'][:50]}...")
        
        try:
            # 访问产品页
            page.goto(food['product_url'], wait_until='domcontentloaded', timeout=90000)
            time.sleep(2)
            
            detail = food.get('detail', {})
            if not detail:
                detail = {'nutrition': {}, 'ingredients': [], 'allergens': []}
                food['detail'] = detail
            
            # 1. 提取卡路里 - 查找包含"Cal"的listitem
            try:
                cal_items = page.locator('listitem:has-text("Cal")').all()
                for item in cal_items:
                    text = item.text_content()
                    if 'calories' in text.lower():
                        cal = extract_number(text)
                        if cal and cal > 0:
                            detail['calories'] = cal
                            break
            except:
                pass
            
            # 2. 提取营养成分 - 从listitem中提取
            nutrition_map = {
                'protein': ('protein_g', 'protein_dv'),
                'total carbs': ('total_carbs_g', 'total_carbs_dv'),
                'total fat': ('total_fat_g', 'total_fat_dv'),
                'saturated fat': ('saturated_fat_g', 'saturated_fat_dv'),
                'trans fat': ('trans_fat_g', None),
                'cholesterol': ('cholesterol_mg', 'cholesterol_dv'),
                'sodium': ('sodium_mg', 'sodium_dv'),
                'dietary fiber': ('dietary_fiber_g', 'dietary_fiber_dv'),
                'total sugars': ('total_sugars_g', None),
                'added sugars': ('added_sugars_g', 'added_sugars_dv'),
                'vitamin d': ('vitamin_d_mcg', 'vitamin_d_dv'),
                'calcium': ('calcium_mg', 'calcium_dv'),
                'iron': ('iron_mg', 'iron_dv'),
                'potassium': ('potassium_mg', 'potassium_dv')
            }
            
            try:
                # 获取所有营养信息的listitem
                nutrition_items = page.locator('listitem').all()
                
                for item in nutrition_items:
                    text = item.text_content().lower()
                    
                    # 匹配营养素类型
                    for keyword, (value_key, dv_key) in nutrition_map.items():
                        if keyword in text:
                            parsed = parse_nutrition_line(text)
                            
                            if 'value' in parsed and parsed['value'] is not None:
                                # 只保存非零值,或明确显示为0的
                                if parsed['value'] > 0 or '0g' in text or '0mg' in text or '0mcg' in text:
                                    detail['nutrition'][value_key] = parsed['value']
                            
                            if 'dv' in parsed and dv_key and parsed['dv'] > 0:
                                detail['nutrition'][dv_key] = parsed['dv']
                            
                            break
            except Exception as e:
                print(f"    ⚠️ 营养提取错误: {e}")
            
            # 打印更新摘要
            cal = detail.get('calories', '-')
            nutr_count = len([k for k in detail['nutrition'].keys() if not k.endswith('_dv')])
            print(f"      ✓ {cal} Cal, {nutr_count} 营养项")
            
        except Exception as e:
            print(f"      ❌ 错误: {e}")
        
        time.sleep(0.5)
    
    browser.close()

# 保存更新后的数据
with open('foods_final_data.json', 'w', encoding='utf-8') as f:
    json.dump(foods, f, ensure_ascii=False, indent=2)

print(f"\n💾 完整数据已保存: foods_final_data.json")

# 生成Excel
print(f"\n📊 生成Excel...")

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
        'calories': detail.get('calories') or '',
        'protein_g': nutrition.get('protein_g') or '',
        'total_carbs_g': nutrition.get('total_carbs_g') or '',
        'total_fat_g': nutrition.get('total_fat_g') or '',
        'sodium_mg': nutrition.get('sodium_mg') or '',
        'description': detail.get('description', '')[:500],
        'allergens': ', '.join(detail.get('allergens', [])) if isinstance(detail.get('allergens'), list) else '',
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
        allergens = ing.get('allergens', [])
        ingredients_data.append({
            'food_id': food.get('food_id', ''),
            'food_name': food.get('food_name', ''),
            'ingredient_order': ing.get('order', ''),
            'ingredient_name': ing.get('name', ''),
            'ingredient_details': ing.get('details', '')[:1000],
            'contains_allergens': ', '.join(allergens) if isinstance(allergens, list) else ''
        })

df_ingredients = pd.DataFrame(ingredients_data) if ingredients_data else pd.DataFrame()

# 过敏原表
allergen_data = []
for food in foods:
    detail = food.get('detail') or {}
    for ing in detail.get('ingredients', []):
        allergens = ing.get('allergens', [])
        if isinstance(allergens, list):
            for allergen in allergens:
                allergen_data.append({
                    'food_id': food.get('food_id', ''),
                    'food_name': food.get('food_name', ''),
                    'allergen_type': allergen,
                    'allergen_source': ing.get('name', ''),
                    'severity': 'Contains'
                })

df_allergens = pd.DataFrame(allergen_data) if allergen_data else pd.DataFrame()

# 保存Excel
output_file = 'McDonald_Foods_Final.xlsx'
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
            df_master['calories'].astype(str).str.strip().replace('', None).notna().sum(),
            len(df_nutrition),
            df_ingredients['food_id'].nunique() if not df_ingredients.empty else 0,
            len(df_ingredients),
            len(df_allergens),
            df_master['local_image_path'].astype(str).str.strip().replace('', None).notna().sum()
        ]
    })
    stats.to_excel(writer, sheet_name='05_Statistics', index=False)

print(f"✅ Excel已保存: {output_file}")
print(f"   - 食物总数: {len(df_master)}")
print(f"   - 营养数据: {len(df_nutrition)} 条")
print(f"   - 配料数据: {len(df_ingredients)} 条")
print(f"   - 过敏原数据: {len(df_allergens)} 条")

print("\n" + "=" * 70)
print("✅ 数据修复完成!")
print("=" * 70)

# 最后运行质量检查
print("\n运行质量检查...")
os.system('python3 check_data_quality.py')
