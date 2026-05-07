#!/usr/bin/env python3
"""
生成 Shake Shack 总表
整合所有数据：名称、图片本地路径、说明、价格、营养素等
"""

import json
import os
import re
import pandas as pd
from datetime import datetime


def normalize_name(name):
    """标准化食物名称用于匹配"""
    if not name:
        return ""
    # 移除特殊字符，转为小写
    name = re.sub(r'[®™©]', '', name)
    name = re.sub(r'[^\w\s]', ' ', name)
    name = re.sub(r'\s+', ' ', name).strip().lower()
    # 移除 Single/Double/Triple 前缀用于匹配
    name = re.sub(r'^(single|double|triple)\s+', '', name)
    return name


def find_best_match(nutrition_name, browser_items):
    """为营养数据找到最匹配的浏览器数据项"""
    norm_nutrition = normalize_name(nutrition_name)
    best_match = None
    best_score = 0
    
    for browser_item in browser_items:
        browser_name = browser_item.get('food_name', '')
        norm_browser = normalize_name(browser_name)
        
        if not norm_browser or len(norm_browser) < 3:
            continue
        
        # 计算匹配分数
        score = 0
        # 完全匹配
        if norm_nutrition == norm_browser:
            score = 100
        # 包含匹配
        elif norm_nutrition in norm_browser or norm_browser in norm_nutrition:
            score = 50 + min(len(norm_nutrition), len(norm_browser)) / max(len(norm_nutrition), len(norm_browser)) * 50
        # 关键词匹配
        else:
            nutrition_words = set(norm_nutrition.split())
            browser_words = set(norm_browser.split())
            common_words = nutrition_words & browser_words
            if common_words:
                score = len(common_words) / max(len(nutrition_words), len(browser_words)) * 30
        
        if score > best_score:
            best_score = score
            best_match = browser_item
    
    return best_match if best_score > 20 else None


def find_image_by_name(food_name, image_dir):
    """根据食物名称在 images 目录中查找匹配的图片"""
    if not os.path.isdir(image_dir):
        return ""
    
    norm_name = normalize_name(food_name)
    if not norm_name:
        return ""
    
    # 提取关键词（移除常见词）
    keywords = [w for w in norm_name.split() if w not in ['single', 'double', 'triple', 'and', 'the', 'with']]
    
    best_match = ""
    best_score = 0
    
    for filename in os.listdir(image_dir):
        if not filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            continue
        
        # 跳过截图和临时文件
        if filename.startswith('_') or filename.startswith('img_') or filename.startswith('homepage'):
            continue
        
        file_stem = os.path.splitext(filename)[0].lower().replace('_', ' ').replace('-', ' ')
        
        # 计算匹配分数
        score = 0
        for keyword in keywords:
            if keyword in file_stem:
                score += 1
        
        if score > best_score and score >= len(keywords) * 0.5:
            best_score = score
            best_match = os.path.join(image_dir, filename)
    
    return best_match


def build_master_table():
    """构建总表"""
    print("=" * 80)
    print("📊 构建 Shake Shack 总表")
    print("=" * 80)
    
    # 1. 加载营养数据（基础数据）
    nutrition_file = 'shakeshack_foods_data.json'
    print(f"\n📂 加载营养数据: {nutrition_file}")
    with open(nutrition_file, 'r', encoding='utf-8') as f:
        nutrition_data = json.load(f)
    print(f"   ✓ 加载 {len(nutrition_data)} 条营养数据")
    
    # 2. 加载浏览器爬取数据（图片、描述、价格）
    browser_file = 'shakeshack_browser_data.json'
    browser_items = []
    if os.path.exists(browser_file):
        print(f"\n📂 加载浏览器数据: {browser_file}")
        with open(browser_file, 'r', encoding='utf-8') as f:
            browser_data = json.load(f)
            browser_items = browser_data.get('items', [])
        print(f"   ✓ 加载 {len(browser_items)} 条浏览器数据")
    
    # 3. 构建总表
    print(f"\n🔨 构建总表...")
    master_table = []
    
    for nutrition_item in nutrition_data:
        food_name = nutrition_item.get('food_name', '')
        food_id = nutrition_item.get('food_id', '')
        
        # 创建基础行（从营养数据）
        row = {
            'food_id': food_id,
            'food_name': food_name,
            'food_name_cn': nutrition_item.get('food_name_cn', ''),
            'category': nutrition_item.get('category', ''),
            'description': '',  # 待填充
            'price': '',  # 待填充
            'image_url': '',  # 待填充
            'local_image_path': '',  # 待填充
            # 营养信息
            'calories': nutrition_item.get('calories', ''),
            'total_fat_g': nutrition_item.get('total_fat_g', ''),
            'saturated_fat_g': nutrition_item.get('saturated_fat_g', ''),
            'trans_fat_g': nutrition_item.get('trans_fat_g', ''),
            'cholesterol_mg': nutrition_item.get('cholesterol_mg', ''),
            'sodium_mg': nutrition_item.get('sodium_mg', ''),
            'total_carbs_g': nutrition_item.get('total_carbs_g', ''),
            'fiber_g': nutrition_item.get('fiber_g', ''),
            'sugars_g': nutrition_item.get('sugars_g', ''),
            'protein_g': nutrition_item.get('protein_g', ''),
            'allergens': nutrition_item.get('allergens', ''),
            'scraped_date': nutrition_item.get('scraped_date', datetime.now().strftime('%Y-%m-%d')),
        }
        
        # 尝试匹配浏览器数据
        browser_match = find_best_match(food_name, browser_items)
        if browser_match:
            # 填充描述、价格、图片URL
            if browser_match.get('description'):
                row['description'] = browser_match.get('description', '')
            if browser_match.get('price'):
                row['price'] = browser_match.get('price', '')
            if browser_match.get('image_url'):
                row['image_url'] = browser_match.get('image_url', '')
            if browser_match.get('local_image_path'):
                row['local_image_path'] = browser_match.get('local_image_path', '')
        
        # 如果还没有本地图片路径，尝试从 images 目录查找
        if not row['local_image_path']:
            img_path = find_image_by_name(food_name, 'images')
            if img_path:
                row['local_image_path'] = img_path
        
        master_table.append(row)
    
    # 4. 添加浏览器数据中独有的项（不在营养数据中的）
    print(f"\n➕ 添加浏览器独有项...")
    nutrition_names = {normalize_name(n.get('food_name', '')) for n in nutrition_data}
    added_count = 0
    
    for browser_item in browser_items:
        browser_name = browser_item.get('food_name', '')
        norm_browser = normalize_name(browser_name)
        
        # 跳过导航项和分类项
        skip_keywords = ['menu', 'catering', 'gift', 'store', 'values', 'fundraising', 
                        'careers', 'help', 'sign in', 'order now', 'burgers', 'chicken',
                        'good fit', 'sides', 'shakes', 'desserts', 'drinks', 'dogs',
                        'large orders', 'limited time', 'slide']
        if any(kw in norm_browser for kw in skip_keywords) or len(norm_browser) < 3:
            continue
        
        # 检查是否已在营养数据中
        if norm_browser not in nutrition_names:
            # 检查是否与营养数据中的项相似（避免重复）
            is_duplicate = False
            for nutrition_item in nutrition_data:
                if find_best_match(nutrition_item.get('food_name', ''), [browser_item]):
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                row = {
                    'food_id': f"browser_{added_count}",
                    'food_name': browser_name,
                    'food_name_cn': '',
                    'category': '',
                    'description': browser_item.get('description', ''),
                    'price': browser_item.get('price', ''),
                    'image_url': browser_item.get('image_url', ''),
                    'local_image_path': browser_item.get('local_image_path', ''),
                    # 营养信息为空
                    'calories': '',
                    'total_fat_g': '',
                    'saturated_fat_g': '',
                    'trans_fat_g': '',
                    'cholesterol_mg': '',
                    'sodium_mg': '',
                    'total_carbs_g': '',
                    'fiber_g': '',
                    'sugars_g': '',
                    'protein_g': '',
                    'allergens': '',
                    'scraped_date': datetime.now().strftime('%Y-%m-%d'),
                }
                
                # 尝试查找图片
                if not row['local_image_path']:
                    img_path = find_image_by_name(browser_name, 'images')
                    if img_path:
                        row['local_image_path'] = img_path
                
                master_table.append(row)
                added_count += 1
    
    print(f"   ✓ 添加 {added_count} 条浏览器独有项")
    
    # 5. 统计
    print(f"\n📈 总表统计:")
    print(f"   - 总记录数: {len(master_table)}")
    print(f"   - 有描述: {sum(1 for r in master_table if r.get('description'))} 条")
    print(f"   - 有价格: {sum(1 for r in master_table if r.get('price'))} 条")
    print(f"   - 有图片路径: {sum(1 for r in master_table if r.get('local_image_path'))} 条")
    print(f"   - 有营养数据: {sum(1 for r in master_table if r.get('calories'))} 条")
    
    # 6. 保存 JSON
    output_json = 'shakeshack_总表.json'
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(master_table, f, ensure_ascii=False, indent=2)
    print(f"\n💾 JSON 已保存: {output_json}")
    
    # 7. 保存 Excel
    output_excel = 'ShakeShack_总表.xlsx'
    df = pd.DataFrame(master_table)
    
    # 重新排列列顺序，使重要信息在前
    column_order = [
        'food_id', 'food_name', 'food_name_cn', 'category',
        'description', 'price',
        'image_url', 'local_image_path',
        'calories', 'total_fat_g', 'saturated_fat_g', 'trans_fat_g',
        'cholesterol_mg', 'sodium_mg', 'total_carbs_g', 'fiber_g',
        'sugars_g', 'protein_g', 'allergens', 'scraped_date'
    ]
    
    # 确保所有列都存在
    for col in column_order:
        if col not in df.columns:
            df[col] = ''
    
    df = df[column_order]
    
    with pd.ExcelWriter(output_excel, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='总表', index=False)
        
        # 按分类统计
        if 'category' in df.columns:
            category_stats = df.groupby('category').agg({
                'food_name': 'count',
                'calories': lambda x: sum(1 for v in x if v),
                'local_image_path': lambda x: sum(1 for v in x if v),
                'price': lambda x: sum(1 for v in x if v),
            }).rename(columns={
                'food_name': '食物数量',
                'calories': '有营养数据',
                'local_image_path': '有图片',
                'price': '有价格'
            })
            category_stats.to_excel(writer, sheet_name='分类统计')
    
    print(f"💾 Excel 已保存: {output_excel}")
    
    print("\n" + "=" * 80)
    print("✅ 总表生成完成！")
    print("=" * 80)
    
    return master_table


if __name__ == '__main__':
    build_master_table()
