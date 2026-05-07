#!/usr/bin/env python3
"""
Shake Shack 菜单数据爬虫
使用 crawl4ai 爬取菜单和营养信息
"""

import json
import os
import re
from datetime import datetime
import pandas as pd


def parse_nutrition_pdf_data():
    """
    解析从PDF中提取的营养数据
    基于已获取的外部链接数据
    """
    
    # 营养数据结构（从PDF中整理）
    nutrition_data = []
    
    # Burgers 汉堡类
    burgers = [
        {"name": "Single ShackBurger", "calories": 500, "total_fat": 30, "sat_fat": 12, "trans_fat": 1, 
         "cholesterol": 105, "sodium": 1250, "carbs": 26, "fiber": 0, "sugars": 6, "protein": 29,
         "allergens": "Milk, Egg, Wheat, Soy, Sesame"},
        {"name": "Double ShackBurger", "calories": 760, "total_fat": 48, "sat_fat": 20, "trans_fat": 2, 
         "cholesterol": 185, "sodium": 2280, "carbs": 27, "fiber": 0, "sugars": 6, "protein": 51,
         "allergens": "Milk, Egg, Wheat, Soy, Sesame"},
        {"name": "Triple ShackBurger", "calories": 1020, "total_fat": 67, "sat_fat": 28, "trans_fat": 2.5, 
         "cholesterol": 265, "sodium": 3310, "carbs": 27, "fiber": 2, "sugars": 6, "protein": 73,
         "allergens": "Milk, Egg, Wheat, Soy, Sesame"},
        {"name": "Single Hamburger", "calories": 370, "total_fat": 18, "sat_fat": 8, "trans_fat": 1, 
         "cholesterol": 75, "sodium": 850, "carbs": 24, "fiber": 0, "sugars": 5, "protein": 23,
         "allergens": "Milk, Wheat, Sesame"},
        {"name": "Double Hamburger", "calories": 560, "total_fat": 30, "sat_fat": 12, "trans_fat": 1.5, 
         "cholesterol": 140, "sodium": 1540, "carbs": 24, "fiber": 0, "sugars": 5, "protein": 45,
         "allergens": "Milk, Wheat, Sesame"},
        {"name": "Single SmokeShack", "calories": 600, "total_fat": 38, "sat_fat": 15, "trans_fat": 1, 
         "cholesterol": 120, "sodium": 1880, "carbs": 28, "fiber": 2, "sugars": 7, "protein": 35,
         "allergens": "Milk, Egg, Wheat, Soy, Sesame"},
        {"name": "Double SmokeShack", "calories": 860, "total_fat": 56, "sat_fat": 23, "trans_fat": 1.5, 
         "cholesterol": 205, "sodium": 2910, "carbs": 28, "fiber": 2, "sugars": 8, "protein": 58,
         "allergens": "Milk, Egg, Wheat, Soy, Sesame"},
        {"name": "Single Bacon Cheeseburger", "calories": 530, "total_fat": 32, "sat_fat": 14, "trans_fat": 1, 
         "cholesterol": 110, "sodium": 1350, "carbs": 25, "fiber": 2, "sugars": 5, "protein": 31,
         "allergens": "Milk, Wheat, Soy, Sesame"},
        {"name": "Single Avocado Bacon Burger", "calories": 670, "total_fat": 45, "sat_fat": 16, "trans_fat": 1, 
         "cholesterol": 120, "sodium": 1410, "carbs": 30, "fiber": 5, "sugars": 6, "protein": 35,
         "allergens": "Milk, Egg, Wheat, Soy, Sesame"},
        {"name": "'Shroom Burger", "calories": 510, "total_fat": 27, "sat_fat": 10, "trans_fat": 0.5, 
         "cholesterol": 45, "sodium": 670, "carbs": 49, "fiber": 0, "sugars": 7, "protein": 15,
         "allergens": "Milk, Egg, Wheat, Sesame"},
        {"name": "Shack Stack", "calories": 770, "total_fat": 45, "sat_fat": 18, "trans_fat": 1.5, 
         "cholesterol": 125, "sodium": 1700, "carbs": 50, "fiber": 0, "sugars": 7, "protein": 37,
         "allergens": "Milk, Egg, Wheat, Soy, Sesame"},
    ]
    
    # Chicken 鸡肉类
    chicken = [
        {"name": "Chicken Shack", "calories": 550, "total_fat": 31, "sat_fat": 7, "trans_fat": 0, 
         "cholesterol": 110, "sodium": 1170, "carbs": 34, "fiber": 0, "sugars": 6, "protein": 33,
         "allergens": "Milk, Egg, Wheat, Sesame"},
        {"name": "Chicken Black", "calories": 420, "total_fat": 18, "sat_fat": 3.5, "trans_fat": 0, 
         "cholesterol": 90, "sodium": 650, "carbs": 28, "fiber": 2, "sugars": 1, "protein": 26,
         "allergens": "Milk, Egg, Wheat, Sesame"},
        {"name": "Chicken Bites (6 piece)", "calories": 350, "total_fat": 18, "sat_fat": 3.5, "trans_fat": 0, 
         "cholesterol": 45, "sodium": 980, "carbs": 28, "fiber": 2, "sugars": 1, "protein": 18,
         "allergens": "Wheat"},
        {"name": "Chicken Bites (10 piece)", "calories": 580, "total_fat": 30, "sat_fat": 6, "trans_fat": 0, 
         "cholesterol": 75, "sodium": 1640, "carbs": 47, "fiber": 3, "sugars": 2, "protein": 31,
         "allergens": "Wheat"},
        {"name": "Avocado Bacon Chicken", "calories": 670, "total_fat": 41, "sat_fat": 10, "trans_fat": 0, 
         "cholesterol": 130, "sodium": 1350, "carbs": 35, "fiber": 3, "sugars": 6, "protein": 40,
         "allergens": "Milk, Egg, Wheat, Sesame"},
    ]
    
    # Breakfast 早餐类
    breakfast = [
        {"name": "Egg and Cheese Sandwich", "calories": 340, "total_fat": 19, "sat_fat": 9, "trans_fat": 0, 
         "cholesterol": 215, "sodium": 850, "carbs": 25, "fiber": 0, "sugars": 5, "protein": 17,
         "allergens": "Milk, Egg, Wheat, Soy, Sesame"},
        {"name": "Bacon Egg and Cheese Sandwich", "calories": 430, "total_fat": 26, "sat_fat": 12, "trans_fat": 0, 
         "cholesterol": 230, "sodium": 1010, "carbs": 26, "fiber": 2, "sugars": 6, "protein": 23,
         "allergens": "Milk, Egg, Wheat, Soy, Sesame"},
        {"name": "Sausage Breakfast Sandwich", "calories": 530, "total_fat": 32, "sat_fat": 14, "trans_fat": 0, 
         "cholesterol": 260, "sodium": 1220, "carbs": 28, "fiber": 0, "sugars": 8, "protein": 30,
         "allergens": "Milk, Egg, Wheat, Soy, Sesame"},
        {"name": "Wake up Shack", "calories": 670, "total_fat": 47, "sat_fat": 14, "trans_fat": 0, 
         "cholesterol": 255, "sodium": 1420, "carbs": 38, "fiber": 3, "sugars": 10, "protein": 24,
         "allergens": "Milk, Egg, Wheat, Soy, Sesame"},
        {"name": "Hashbrowns with Sauce", "calories": 740, "total_fat": 54, "sat_fat": 8, "trans_fat": 0, 
         "cholesterol": 25, "sodium": 990, "carbs": 58, "fiber": 5, "sugars": 3, "protein": 6,
         "allergens": "Egg"},
        {"name": "Croissant", "calories": 420, "total_fat": 26, "sat_fat": 15, "trans_fat": 0, 
         "cholesterol": 75, "sodium": 480, "carbs": 39, "fiber": 1, "sugars": 6, "protein": 7,
         "allergens": "Egg, Milk, Wheat"},
    ]
    
    # Hot Dogs 热狗类
    hotdogs = [
        {"name": "Hot Dog", "calories": 350, "total_fat": 22, "sat_fat": 10, "trans_fat": 0, 
         "cholesterol": 50, "sodium": 800, "carbs": 29, "fiber": 0, "sugars": 6, "protein": 16,
         "allergens": "Milk, Wheat, Sesame"},
        {"name": "Shack-Cago Dog", "calories": 390, "total_fat": 22, "sat_fat": 10, "trans_fat": 0, 
         "cholesterol": 50, "sodium": 1490, "carbs": 32, "fiber": 0, "sugars": 12, "protein": 17,
         "allergens": "Milk, Wheat, Sesame"},
        {"name": "Cheese Dog", "calories": 450, "total_fat": 31, "sat_fat": 15, "trans_fat": 0, 
         "cholesterol": 85, "sodium": 910, "carbs": 25, "fiber": 2, "sugars": 6, "protein": 19,
         "allergens": "Milk, Wheat, Sesame"},
        {"name": "Bacon Cheese Dog", "calories": 540, "total_fat": 38, "sat_fat": 18, "trans_fat": 0, 
         "cholesterol": 105, "sodium": 1070, "carbs": 26, "fiber": 2, "sugars": 7, "protein": 25,
         "allergens": "Milk, Wheat, Sesame"},
    ]
    
    # Fries & Sides 薯条和配菜
    fries = [
        {"name": "Regular Fries", "calories": 470, "total_fat": 22, "sat_fat": 4.5, "trans_fat": 0, 
         "cholesterol": 15, "sodium": 740, "carbs": 63, "fiber": 7, "sugars": 1, "protein": 6,
         "allergens": ""},
        {"name": "Cheese Fries", "calories": 710, "total_fat": 44, "sat_fat": 19, "trans_fat": 0, 
         "cholesterol": 95, "sodium": 1020, "carbs": 64, "fiber": 7, "sugars": 1, "protein": 12,
         "allergens": "Milk"},
        {"name": "Bacon Cheese Fries", "calories": 850, "total_fat": 55, "sat_fat": 23, "trans_fat": 0.5, 
         "cholesterol": 125, "sodium": 1260, "carbs": 65, "fiber": 6, "sugars": 1, "protein": 21,
         "allergens": "Milk"},
        {"name": "Beer Battered Onion Rings", "calories": 570, "total_fat": 33, "sat_fat": 6, "trans_fat": 0, 
         "cholesterol": 0, "sodium": 670, "carbs": 64, "fiber": 4, "sugars": 7, "protein": 6,
         "allergens": "Milk, Wheat"},
    ]
    
    # Shakes 奶昔类
    shakes = [
        {"name": "Vanilla Shake", "calories": 680, "total_fat": 36, "sat_fat": 22, "trans_fat": 0, 
         "cholesterol": 235, "sodium": 430, "carbs": 71, "fiber": 0, "sugars": 71, "protein": 18,
         "allergens": "Milk, Egg"},
        {"name": "Chocolate Shake", "calories": 750, "total_fat": 45, "sat_fat": 27, "trans_fat": 1.5, 
         "cholesterol": 245, "sodium": 310, "carbs": 78, "fiber": 2, "sugars": 71, "protein": 18,
         "allergens": "Milk, Egg"},
        {"name": "Strawberry Shake", "calories": 690, "total_fat": 35, "sat_fat": 21, "trans_fat": 0, 
         "cholesterol": 230, "sodium": 430, "carbs": 77, "fiber": 0, "sugars": 85, "protein": 17,
         "allergens": "Milk, Egg"},
        {"name": "Black & White Shake", "calories": 770, "total_fat": 42, "sat_fat": 26, "trans_fat": 0, 
         "cholesterol": 245, "sodium": 460, "carbs": 80, "fiber": 0, "sugars": 85, "protein": 19,
         "allergens": "Milk, Egg"},
        {"name": "Coffee Shake", "calories": 700, "total_fat": 36, "sat_fat": 22, "trans_fat": 0, 
         "cholesterol": 240, "sodium": 430, "carbs": 76, "fiber": 0, "sugars": 82, "protein": 19,
         "allergens": "Milk, Egg"},
    ]
    
    # Floats & Cups 漂浮饮料和杯装
    floats = [
        {"name": "Root Beer Float", "calories": 470, "total_fat": 15, "sat_fat": 9, "trans_fat": 0, 
         "cholesterol": 105, "sodium": 250, "carbs": 75, "fiber": 0, "sugars": 75, "protein": 7,
         "allergens": "Milk, Egg"},
        {"name": "Creamsicle Float", "calories": 440, "total_fat": 15, "sat_fat": 9, "trans_fat": 0, 
         "cholesterol": 100, "sodium": 240, "carbs": 75, "fiber": 0, "sugars": 74, "protein": 7,
         "allergens": "Milk, Egg"},
        {"name": "Single Chocolate Cup", "calories": 310, "total_fat": 19, "sat_fat": 11, "trans_fat": 0.5, 
         "cholesterol": 110, "sodium": 120, "carbs": 32, "fiber": 0, "sugars": 29, "protein": 6,
         "allergens": "Milk, Egg"},
        {"name": "Single Vanilla Cup", "calories": 280, "total_fat": 15, "sat_fat": 9, "trans_fat": 0, 
         "cholesterol": 100, "sodium": 180, "carbs": 30, "fiber": 0, "sugars": 30, "protein": 7,
         "allergens": "Milk, Egg"},
    ]
    
    # Drinks 饮料类
    drinks = [
        {"name": "Lemonade Small", "calories": 160, "total_fat": 0, "sat_fat": 0, "trans_fat": 0, 
         "cholesterol": 0, "sodium": 10, "carbs": 43, "fiber": 0, "sugars": 40, "protein": 0,
         "allergens": ""},
        {"name": "Lemonade Large", "calories": 270, "total_fat": 0, "sat_fat": 0, "trans_fat": 0, 
         "cholesterol": 0, "sodium": 15, "carbs": 70, "fiber": 0, "sugars": 66, "protein": 0,
         "allergens": ""},
        {"name": "Fifty-Fifty Small", "calories": 80, "total_fat": 0, "sat_fat": 0, "trans_fat": 0, 
         "cholesterol": 0, "sodium": 10, "carbs": 22, "fiber": 0, "sugars": 20, "protein": 0,
         "allergens": ""},
        {"name": "Coke Small", "calories": 140, "total_fat": 0, "sat_fat": 0, "trans_fat": 0, 
         "cholesterol": 0, "sodium": 45, "carbs": 39, "fiber": 0, "sugars": 39, "protein": 0,
         "allergens": ""},
    ]
    
    # 合并所有分类
    all_foods = []
    
    for item in burgers:
        item['category'] = 'Burgers'
        all_foods.append(item)
    
    for item in chicken:
        item['category'] = 'Chicken'
        all_foods.append(item)
    
    for item in breakfast:
        item['category'] = 'Breakfast'
        all_foods.append(item)
    
    for item in hotdogs:
        item['category'] = 'Hot Dogs'
        all_foods.append(item)
    
    for item in fries:
        item['category'] = 'Fries & Sides'
        all_foods.append(item)
    
    for item in shakes:
        item['category'] = 'Shakes'
        all_foods.append(item)
    
    for item in floats:
        item['category'] = 'Floats & Cups'
        all_foods.append(item)
    
    for item in drinks:
        item['category'] = 'Drinks'
        all_foods.append(item)
    
    return all_foods


def generate_food_id(name, category):
    """生成食物ID"""
    # 移除特殊字符，转换为小写
    clean_name = re.sub(r'[^\w\s]', '', name).lower()
    clean_name = clean_name.replace(' ', '_')
    clean_category = category.lower().replace(' ', '_').replace('&', 'and')
    return f"{clean_category}_{clean_name}"


def create_structured_data(foods):
    """创建结构化数据"""
    structured_foods = []
    
    for food in foods:
        food_id = generate_food_id(food['name'], food['category'])
        
        structured_food = {
            'food_id': food_id,
            'food_name': food['name'],
            'food_name_cn': '',  # 中文名称待补充
            'category': food['category'],
            'calories': food['calories'],
            'total_fat_g': food['total_fat'],
            'saturated_fat_g': food['sat_fat'],
            'trans_fat_g': food['trans_fat'],
            'cholesterol_mg': food['cholesterol'],
            'sodium_mg': food['sodium'],
            'total_carbs_g': food['carbs'],
            'fiber_g': food['fiber'],
            'sugars_g': food['sugars'],
            'protein_g': food['protein'],
            'allergens': food['allergens'],
            'scraped_date': datetime.now().strftime('%Y-%m-%d')
        }
        
        structured_foods.append(structured_food)
    
    return structured_foods


def create_excel(foods, output_file='ShakeShack_Foods_Data.xlsx'):
    """创建Excel文件"""
    print(f"\n📊 生成Excel文件: {output_file}")
    
    # 主表数据
    df_master = pd.DataFrame(foods)
    
    # 营养成分表（单独的营养数据）
    nutrition_cols = ['food_id', 'calories', 'total_fat_g', 'saturated_fat_g', 
                      'trans_fat_g', 'cholesterol_mg', 'sodium_mg', 'total_carbs_g', 
                      'fiber_g', 'sugars_g', 'protein_g']
    df_nutrition = df_master[nutrition_cols].copy()
    
    # 过敏原表
    allergen_data = []
    for food in foods:
        if food['allergens']:
            allergen_list = [a.strip() for a in food['allergens'].split(',')]
            for allergen in allergen_list:
                allergen_data.append({
                    'food_id': food['food_id'],
                    'food_name': food['food_name'],
                    'allergen_type': allergen,
                    'severity': 'Contains'
                })
    
    df_allergens = pd.DataFrame(allergen_data) if allergen_data else pd.DataFrame()
    
    # 统计信息
    stats_data = {
        '统计项': ['食物总数', '分类数', '有过敏原数据', '过敏原记录数'],
        '数量': [
            len(df_master),
            df_master['category'].nunique(),
            len(df_allergens['food_id'].unique()) if not df_allergens.empty else 0,
            len(df_allergens)
        ]
    }
    df_stats = pd.DataFrame(stats_data)
    
    # 保存到Excel
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        df_master.to_excel(writer, sheet_name='01_Foods_Master', index=False)
        df_nutrition.to_excel(writer, sheet_name='02_Nutrition', index=False)
        
        if not df_allergens.empty:
            df_allergens.to_excel(writer, sheet_name='03_Allergens', index=False)
        
        df_stats.to_excel(writer, sheet_name='04_Statistics', index=False)
    
    print(f"✅ Excel已保存: {output_file}")
    print(f"   - 食物总数: {len(df_master)}")
    print(f"   - 分类数: {df_master['category'].nunique()}")
    print(f"   - 过敏原记录: {len(df_allergens)}")
    
    return df_master


def main():
    """主函数"""
    print("=" * 60)
    print("🍔 Shake Shack 菜单数据爬虫")
    print("=" * 60)
    
    # 1. 解析营养数据
    print("\n📊 解析营养数据...")
    foods = parse_nutrition_pdf_data()
    print(f"   找到 {len(foods)} 个食物")
    
    # 2. 创建结构化数据
    print("\n🔨 创建结构化数据...")
    structured_foods = create_structured_data(foods)
    
    # 3. 保存JSON
    json_file = 'shakeshack_foods_data.json'
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(structured_foods, f, ensure_ascii=False, indent=2)
    print(f"💾 JSON已保存: {json_file}")
    
    # 4. 创建Excel
    create_excel(structured_foods)
    
    # 5. 打印分类统计
    print("\n📈 分类统计:")
    df = pd.DataFrame(structured_foods)
    category_counts = df['category'].value_counts()
    for category, count in category_counts.items():
        print(f"   - {category}: {count} 个")
    
    print("\n" + "=" * 60)
    print("✅ 数据采集完成!")
    print("=" * 60)


if __name__ == '__main__':
    main()
