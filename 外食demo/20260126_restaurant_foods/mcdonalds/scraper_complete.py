#!/usr/bin/env python3
"""
麦当劳菜单完整数据爬虫
爬取每个食物的详情页,获取营养成分、配料、过敏原等完整信息
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
import os
import re
import time
import json
from datetime import datetime
from urllib.parse import urljoin

# 配置
BASE_URL = "https://www.mcdonalds.com"
IMAGE_DIR = "images"
INGREDIENT_IMAGE_DIR = "images/ingredients"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

def ensure_dir(path):
    """确保目录存在"""
    if not os.path.exists(path):
        os.makedirs(path)

def download_image(url, save_path):
    """下载图片到本地"""
    if os.path.exists(save_path):
        return True
    try:
        if url.startswith('//'):
            url = 'https:' + url
        elif not url.startswith('http'):
            url = urljoin(BASE_URL, url)
        
        response = requests.get(url, headers=HEADERS, timeout=30)
        if response.status_code == 200:
            with open(save_path, 'wb') as f:
                f.write(response.content)
            return True
    except Exception as e:
        print(f"    ⚠️ 图片下载失败: {e}")
    return False

def parse_nutrition_value(text):
    """解析营养成分值"""
    if not text:
        return None, None
    
    # 匹配数值和单位
    match = re.search(r'([\d.]+)\s*(g|mg|mcg|Cal|%)?', text)
    if match:
        value = float(match.group(1))
        unit = match.group(2) or ''
        return value, unit
    return None, None

def parse_dv_percent(text):
    """解析每日推荐摄入百分比"""
    if not text:
        return None
    match = re.search(r'(\d+)\s*%', text)
    if match:
        return int(match.group(1))
    return None

def fetch_product_detail(url, food_id):
    """获取单个产品的详细信息"""
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        if response.status_code != 200:
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        text = response.text
        
        detail = {
            'food_id': food_id,
            'calories': None,
            'description': '',
            'nutrition': {},
            'ingredients': [],
            'allergens': []
        }
        
        # 1. 提取描述
        # 查找主要描述段落
        desc_patterns = [
            r'There are (\d+) calories',
            r'(\d+) calories in',
        ]
        for pattern in desc_patterns:
            match = re.search(pattern, text)
            if match:
                detail['calories'] = int(match.group(1))
                break
        
        # 提取描述文本
        desc_match = re.search(r'<p[^>]*>([^<]*100%[^<]*)</p>', text)
        if desc_match:
            detail['description'] = desc_match.group(1).strip()
        
        # 2. 提取营养成分
        # 从页面文本中提取
        nutrition_patterns = {
            'protein_g': r'Protein[:\s]*(\d+)\s*g',
            'total_carbs_g': r'Total Carbs[:\s]*(\d+)\s*g',
            'total_fat_g': r'Total Fat[:\s]*(\d+)\s*g',
            'saturated_fat_g': r'Saturated Fat[:\s]*(\d+)\s*g',
            'trans_fat_g': r'Trans Fat[:\s]*(\d+)\s*g',
            'cholesterol_mg': r'Cholesterol[:\s]*(\d+)\s*mg',
            'sodium_mg': r'Sodium[:\s]*(\d+)\s*mg',
            'dietary_fiber_g': r'Dietary Fiber[:\s]*(\d+)\s*g',
            'total_sugars_g': r'Total Sugars[:\s]*(\d+)\s*g',
            'added_sugars_g': r'Added Sugars[:\s]*(\d+)\s*g',
            'vitamin_d_mcg': r'Vitamin D[:\s]*(\d+)\s*mcg',
            'calcium_mg': r'Calcium[:\s]*(\d+)\s*mg',
            'iron_mg': r'Iron[:\s]*(\d+)\s*mg',
            'potassium_mg': r'Potassium[:\s]*(\d+)\s*mg',
        }
        
        for key, pattern in nutrition_patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                detail['nutrition'][key] = int(match.group(1))
        
        # 提取DV百分比
        dv_patterns = {
            'total_carbs_dv': r'Total Carbs[^)]*\((\d+)\s*%',
            'total_fat_dv': r'Total Fat[^)]*\((\d+)\s*%',
            'saturated_fat_dv': r'Saturated Fat[^)]*\((\d+)\s*%',
            'cholesterol_dv': r'Cholesterol[^)]*\((\d+)\s*%',
            'sodium_dv': r'Sodium[^)]*\((\d+)\s*%',
            'dietary_fiber_dv': r'Dietary Fiber[^)]*\((\d+)\s*%',
            'added_sugars_dv': r'Added Sugars[^)]*\((\d+)\s*%',
            'vitamin_d_dv': r'Vitamin D[^)]*\((\d+)\s*%',
            'calcium_dv': r'Calcium[^)]*\((\d+)\s*%',
            'iron_dv': r'Iron[^)]*\((\d+)\s*%',
            'potassium_dv': r'Potassium[^)]*\((\d+)\s*%',
        }
        
        for key, pattern in dv_patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                detail['nutrition'][key] = int(match.group(1))
        
        # 3. 提取配料信息
        # 查找配料标题和内容
        ingredient_sections = re.findall(
            r'<h3[^>]*>([^<]+)</h3>\s*<p[^>]*>Ingredients:\s*([^<]+)</p>',
            text, re.IGNORECASE | re.DOTALL
        )
        
        for i, (name, ingredients_text) in enumerate(ingredient_sections):
            name = name.strip()
            ingredients_text = ingredients_text.strip()
            
            # 检测过敏原
            allergens_found = []
            allergen_keywords = ['wheat', 'milk', 'egg', 'soy', 'sesame', 'fish', 'shellfish', 'peanut', 'tree nut', 'barley']
            for allergen in allergen_keywords:
                if allergen.lower() in ingredients_text.lower():
                    allergens_found.append(allergen.title())
            
            detail['ingredients'].append({
                'order': i + 1,
                'name': name,
                'details': ingredients_text,
                'allergens': allergens_found
            })
            
            # 收集所有过敏原
            for a in allergens_found:
                if a not in detail['allergens']:
                    detail['allergens'].append(a)
        
        # 4. 提取配料图片URL
        ingredient_img_pattern = r'https://s7d1\.scene7\.com/is/image/mcdonalds/[^"\'?\s]*ingredient[^"\'?\s]*'
        ingredient_imgs = re.findall(ingredient_img_pattern, text, re.IGNORECASE)
        
        # 去重
        ingredient_imgs = list(set(ingredient_imgs))
        
        # 匹配配料图片到配料
        for i, ing in enumerate(detail['ingredients']):
            ing['image_url'] = ''
            ing['local_image_path'] = ''
            
            # 尝试匹配图片
            ing_name_lower = ing['name'].lower().replace(' ', '_').replace("'", '')
            for img_url in ingredient_imgs:
                if ing_name_lower in img_url.lower() or any(word in img_url.lower() for word in ing['name'].lower().split()):
                    ing['image_url'] = img_url
                    break
        
        return detail
        
    except Exception as e:
        print(f"    ❌ 解析错误: {e}")
        return None

def download_ingredient_images(foods_with_details):
    """下载配料图片"""
    ensure_dir(INGREDIENT_IMAGE_DIR)
    
    total_downloaded = 0
    for food in foods_with_details:
        if 'detail' not in food or not food['detail']:
            continue
        
        for ing in food['detail'].get('ingredients', []):
            img_url = ing.get('image_url', '')
            if not img_url:
                continue
            
            # 生成文件名
            food_id = food['food_id']
            ing_name = ing['name'].lower().replace(' ', '_').replace("'", "").replace('®', '')
            filename = f"{food_id}_{ing_name}.jpg"
            local_path = os.path.join(INGREDIENT_IMAGE_DIR, filename)
            
            if download_image(img_url, local_path):
                ing['local_image_path'] = local_path
                total_downloaded += 1
    
    print(f"  ✅ 下载了 {total_downloaded} 张配料图片")
    return foods_with_details

def create_complete_excel(foods, output_file='McDonald_Foods_Complete.xlsx'):
    """创建完整的Excel文件"""
    print(f"\n📊 生成完整Excel文件: {output_file}")
    
    # 1. 主表数据
    master_data = []
    for food in foods:
        detail = food.get('detail', {}) or {}
        nutrition = detail.get('nutrition', {})
        
        master_data.append({
            'food_id': food.get('food_id', ''),
            'food_name': food.get('food_name', ''),
            'food_name_cn': '',
            'category': food.get('category', ''),
            'product_url': food.get('product_url', ''),
            'main_image_url': food.get('main_image_url', ''),
            'local_image_path': food.get('local_image_path', ''),
            'calories': detail.get('calories', ''),
            'description': detail.get('description', ''),
            'allergens': ', '.join(detail.get('allergens', [])),
            'scraped_date': datetime.now().strftime('%Y-%m-%d')
        })
    
    df_master = pd.DataFrame(master_data)
    
    # 2. 营养成分表
    nutrition_data = []
    for food in foods:
        detail = food.get('detail', {}) or {}
        nutrition = detail.get('nutrition', {})
        
        if nutrition:
            row = {'food_id': food.get('food_id', '')}
            row.update(nutrition)
            nutrition_data.append(row)
    
    df_nutrition = pd.DataFrame(nutrition_data) if nutrition_data else pd.DataFrame()
    
    # 3. 配料表
    ingredients_data = []
    for food in foods:
        detail = food.get('detail', {}) or {}
        for ing in detail.get('ingredients', []):
            ingredients_data.append({
                'food_id': food.get('food_id', ''),
                'ingredient_order': ing.get('order', ''),
                'ingredient_name': ing.get('name', ''),
                'ingredient_image_url': ing.get('image_url', ''),
                'local_image_path': ing.get('local_image_path', ''),
                'ingredient_details': ing.get('details', ''),
                'contains_allergens': ', '.join(ing.get('allergens', []))
            })
    
    df_ingredients = pd.DataFrame(ingredients_data) if ingredients_data else pd.DataFrame()
    
    # 4. 过敏原汇总表
    allergen_data = []
    for food in foods:
        detail = food.get('detail', {}) or {}
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
    
    # 保存到Excel
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        df_master.to_excel(writer, sheet_name='01_Foods_Master', index=False)
        
        if not df_nutrition.empty:
            df_nutrition.to_excel(writer, sheet_name='02_Nutrition', index=False)
        
        if not df_ingredients.empty:
            df_ingredients.to_excel(writer, sheet_name='03_Ingredients', index=False)
        
        if not df_allergens.empty:
            df_allergens.to_excel(writer, sheet_name='04_Allergens', index=False)
        
        # 统计信息
        stats_data = {
            '统计项': ['食物总数', '有营养数据', '有配料数据', '有过敏原数据', '配料总数', '过敏原记录数'],
            '数量': [
                len(df_master),
                len(df_nutrition),
                df_ingredients['food_id'].nunique() if not df_ingredients.empty else 0,
                df_allergens['food_id'].nunique() if not df_allergens.empty else 0,
                len(df_ingredients),
                len(df_allergens)
            ]
        }
        pd.DataFrame(stats_data).to_excel(writer, sheet_name='05_Statistics', index=False)
    
    print(f"✅ Excel已保存: {output_file}")
    print(f"   - 食物总数: {len(df_master)}")
    print(f"   - 营养数据: {len(df_nutrition)} 条")
    print(f"   - 配料数据: {len(df_ingredients)} 条")
    print(f"   - 过敏原数据: {len(df_allergens)} 条")
    
    return df_master

def main():
    """主函数"""
    print("=" * 60)
    print("🍔 麦当劳菜单完整数据爬虫")
    print("=" * 60)
    
    # 1. 加载已有的食物列表
    print("\n📂 加载食物列表...")
    with open('foods_data.json', 'r', encoding='utf-8') as f:
        foods = json.load(f)
    print(f"   找到 {len(foods)} 个食物")
    
    # 2. 爬取每个食物的详情
    print(f"\n🔍 开始爬取详情页 (共 {len(foods)} 个)...")
    
    for i, food in enumerate(foods):
        url = food.get('product_url', '')
        food_id = food.get('food_id', '')
        food_name = food.get('food_name', '')[:30]
        
        print(f"  [{i+1}/{len(foods)}] {food_name}...")
        
        if not url or '/meal/' in url:  # 跳过套餐页面
            food['detail'] = None
            continue
        
        detail = fetch_product_detail(url, food_id)
        food['detail'] = detail
        
        if detail:
            cal = detail.get('calories', '-')
            ing_count = len(detail.get('ingredients', []))
            allergen_count = len(detail.get('allergens', []))
            print(f"       ✓ {cal} Cal, {ing_count} 配料, {allergen_count} 过敏原")
        else:
            print(f"       ⚠️ 无详情数据")
        
        # 避免请求过快
        time.sleep(0.5)
    
    # 3. 下载配料图片
    print(f"\n📸 下载配料图片...")
    foods = download_ingredient_images(foods)
    
    # 4. 生成完整Excel
    create_complete_excel(foods)
    
    # 5. 保存完整JSON
    with open('foods_complete_data.json', 'w', encoding='utf-8') as f:
        json.dump(foods, f, ensure_ascii=False, indent=2)
    print(f"\n💾 完整数据已保存: foods_complete_data.json")
    
    print("\n" + "=" * 60)
    print("✅ 完整数据爬取完成!")
    print("=" * 60)

if __name__ == '__main__':
    main()
