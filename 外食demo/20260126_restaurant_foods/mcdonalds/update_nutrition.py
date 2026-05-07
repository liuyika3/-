#!/usr/bin/env python3
"""
麦当劳菜单数据 - 手动补充完整营养信息
基于官网数据手动整理
"""

import pandas as pd
import json
from datetime import datetime

# Big Mac 完整营养数据 (来自麦当劳官网)
BIG_MAC_NUTRITION = {
    'calories': 580,
    'protein_g': 25,
    'total_carbs_g': 45,
    'total_carbs_dv': 16,
    'total_fat_g': 34,
    'total_fat_dv': 43,
    'saturated_fat_g': 11,
    'saturated_fat_dv': 56,
    'trans_fat_g': 1,
    'cholesterol_mg': 85,
    'cholesterol_dv': 28,
    'sodium_mg': 1060,
    'sodium_dv': 46,
    'dietary_fiber_g': 3,
    'dietary_fiber_dv': 10,
    'total_sugars_g': 7,
    'added_sugars_g': 5,
    'added_sugars_dv': 10,
    'vitamin_d_mcg': 0,
    'vitamin_d_dv': 0,
    'calcium_mg': 120,
    'calcium_dv': 10,
    'iron_mg': 4,
    'iron_dv': 25,
    'potassium_mg': 370,
    'potassium_dv': 8
}

BIG_MAC_INGREDIENTS = [
    {
        'order': 1,
        'name': 'Big Mac Bun',
        'details': 'Enriched Flour (wheat Flour, Malted Barley Flour, Niacin, Reduced Iron, Thiamine Mononitrate, Riboflavin, Folic Acid), Water, Sugar, Yeast, Soybean Oil, Contains 2% Or Less: Sesame Seeds, Salt, Wheat Gluten, Calcium Sulfate, Natural Flavors, Dough Conditioners (May Contain One Or More Of: Sodium Stearoyl Lactylate, Datem, Ascorbic Acid, Azodicarbonamide, Mono And Diglycerides, Ethoxylated Monoglycerides, Monocalcium Phosphate, Enzymes, Guar Gum, Calcium Peroxide), Calcium Propionate (preservative).',
        'allergens': ['Wheat', 'Barley', 'Soy', 'Sesame']
    },
    {
        'order': 2,
        'name': '100% Beef Patty',
        'details': '100% Pure USDA Inspected Beef; No Fillers, No Extenders.',
        'allergens': []
    },
    {
        'order': 3,
        'name': 'Shredded Lettuce',
        'details': 'Lettuce.',
        'allergens': []
    },
    {
        'order': 4,
        'name': 'Big Mac Sauce',
        'details': 'Soybean Oil, Sweet Relish (diced Pickles, Sugar, High Fructose Corn Syrup, Distilled Vinegar, Salt, Corn Syrup, Xanthan Gum, Calcium Chloride, Spice Extractives), Water, Egg Yolks, Distilled Vinegar, Spices, Onion Powder, Salt, Propylene Glycol Alginate, Sodium Benzoate (preservative), Mustard Bran, Sugar, Garlic Powder, Vegetable Protein (hydrolyzed Corn, Soy And Wheat), Caramel Color, Extractives Of Paprika, Soy Lecithin, Turmeric (color), Calcium Disodium Edta (protect Flavor).',
        'allergens': ['Egg', 'Soy', 'Wheat']
    },
    {
        'order': 5,
        'name': 'Pasteurized Process American Cheese',
        'details': 'Milk, Cream, Water, Sodium Citrate, Salt, Cheese Cultures, Citric Acid, Enzymes, Soy Lecithin, Color Added.',
        'allergens': ['Milk', 'Soy']
    },
    {
        'order': 6,
        'name': 'Pickle Slices',
        'details': 'Cucumbers, Water, Distilled Vinegar, Salt, Calcium Chloride, Alum, Potassium Sorbate (preservative), Natural Flavors, Polysorbate 80, Extractives Of Turmeric (color).',
        'allergens': []
    },
    {
        'order': 7,
        'name': 'Onions',
        'details': 'Onions.',
        'allergens': []
    }
]

# 常见食物的营养数据 (基于麦当劳官网)
NUTRITION_DATA = {
    'big-mac': {'calories': 580, 'protein_g': 25, 'total_carbs_g': 45, 'total_fat_g': 34, 'sodium_mg': 1060},
    'quarter-pounder-with-cheese': {'calories': 520, 'protein_g': 30, 'total_carbs_g': 42, 'total_fat_g': 26, 'sodium_mg': 1140},
    'double-quarter-pounder-with-cheese': {'calories': 740, 'protein_g': 48, 'total_carbs_g': 43, 'total_fat_g': 42, 'sodium_mg': 1360},
    'mcdouble': {'calories': 390, 'protein_g': 22, 'total_carbs_g': 33, 'total_fat_g': 18, 'sodium_mg': 920},
    'cheeseburger': {'calories': 300, 'protein_g': 15, 'total_carbs_g': 32, 'total_fat_g': 12, 'sodium_mg': 720},
    'hamburger': {'calories': 250, 'protein_g': 12, 'total_carbs_g': 31, 'total_fat_g': 8, 'sodium_mg': 510},
    'egg-mcmuffin': {'calories': 310, 'protein_g': 17, 'total_carbs_g': 30, 'total_fat_g': 13, 'sodium_mg': 770},
    'sausage-mcmuffin': {'calories': 400, 'protein_g': 14, 'total_carbs_g': 29, 'total_fat_g': 26, 'sodium_mg': 780},
    'sausage-mcmuffin-with-egg': {'calories': 480, 'protein_g': 21, 'total_carbs_g': 30, 'total_fat_g': 31, 'sodium_mg': 900},
    'bacon-egg-cheese-biscuit': {'calories': 460, 'protein_g': 17, 'total_carbs_g': 38, 'total_fat_g': 26, 'sodium_mg': 1300},
    'mccrispy-chicken-sandwich': {'calories': 470, 'protein_g': 26, 'total_carbs_g': 46, 'total_fat_g': 20, 'sodium_mg': 1140},
    'filet-o-fish': {'calories': 380, 'protein_g': 16, 'total_carbs_g': 39, 'total_fat_g': 18, 'sodium_mg': 580},
    'mcchicken': {'calories': 400, 'protein_g': 14, 'total_carbs_g': 40, 'total_fat_g': 21, 'sodium_mg': 560},
    'chicken-mcnuggets-4-piece': {'calories': 170, 'protein_g': 9, 'total_carbs_g': 10, 'total_fat_g': 10, 'sodium_mg': 330},
    'small-french-fries': {'calories': 230, 'protein_g': 3, 'total_carbs_g': 29, 'total_fat_g': 11, 'sodium_mg': 160},
    'hash-browns': {'calories': 140, 'protein_g': 1, 'total_carbs_g': 15, 'total_fat_g': 8, 'sodium_mg': 310},
    'mcflurry-with-oreo-cookies': {'calories': 410, 'protein_g': 8, 'total_carbs_g': 64, 'total_fat_g': 14, 'sodium_mg': 280},
    'vanilla-cone': {'calories': 200, 'protein_g': 5, 'total_carbs_g': 32, 'total_fat_g': 5, 'sodium_mg': 80},
    'chocolate-shake-small': {'calories': 520, 'protein_g': 12, 'total_carbs_g': 86, 'total_fat_g': 14, 'sodium_mg': 300},
    'coca-cola-small': {'calories': 200, 'protein_g': 0, 'total_carbs_g': 55, 'total_fat_g': 0, 'sodium_mg': 10},
    'iced-coffee-small': {'calories': 150, 'protein_g': 2, 'total_carbs_g': 28, 'total_fat_g': 4, 'sodium_mg': 50},
    'coffee-small': {'calories': 5, 'protein_g': 0, 'total_carbs_g': 0, 'total_fat_g': 0, 'sodium_mg': 5},
}

def main():
    print("=" * 60)
    print("🍔 更新麦当劳数据 - 添加完整营养信息")
    print("=" * 60)
    
    # 加载已有数据
    with open('foods_data.json', 'r', encoding='utf-8') as f:
        foods = json.load(f)
    
    print(f"\n📂 加载了 {len(foods)} 个食物")
    
    # 更新营养数据
    updated_count = 0
    for food in foods:
        food_id = food.get('food_id', '')
        if food_id in NUTRITION_DATA:
            food['nutrition'] = NUTRITION_DATA[food_id]
            updated_count += 1
        
        # 特别处理 Big Mac
        if food_id == 'big-mac':
            food['nutrition'] = BIG_MAC_NUTRITION
            food['ingredients'] = BIG_MAC_INGREDIENTS
            food['allergens'] = ['Wheat', 'Barley', 'Soy', 'Sesame', 'Egg', 'Milk']
    
    print(f"✅ 更新了 {updated_count} 个食物的营养数据")
    
    # 创建Excel
    print("\n📊 生成完整Excel...")
    
    # 主表
    master_data = []
    for food in foods:
        nutrition = food.get('nutrition', {})
        master_data.append({
            'food_id': food.get('food_id', ''),
            'food_name': food.get('food_name', ''),
            'food_name_cn': '',
            'category': food.get('category', ''),
            'product_url': food.get('product_url', ''),
            'local_image_path': food.get('local_image_path', ''),
            'calories': nutrition.get('calories', ''),
            'protein_g': nutrition.get('protein_g', ''),
            'total_carbs_g': nutrition.get('total_carbs_g', ''),
            'total_fat_g': nutrition.get('total_fat_g', ''),
            'sodium_mg': nutrition.get('sodium_mg', ''),
            'allergens': ', '.join(food.get('allergens', [])),
            'scraped_date': datetime.now().strftime('%Y-%m-%d')
        })
    
    df_master = pd.DataFrame(master_data)
    
    # 营养成分详细表 (Big Mac)
    nutrition_detail = []
    for food in foods:
        if food.get('food_id') == 'big-mac':
            row = {'food_id': 'big-mac'}
            row.update(BIG_MAC_NUTRITION)
            nutrition_detail.append(row)
            break
    
    df_nutrition = pd.DataFrame(nutrition_detail)
    
    # 配料表 (Big Mac)
    ingredients_data = []
    for food in foods:
        if food.get('food_id') == 'big-mac':
            for ing in BIG_MAC_INGREDIENTS:
                ingredients_data.append({
                    'food_id': 'big-mac',
                    'ingredient_order': ing['order'],
                    'ingredient_name': ing['name'],
                    'ingredient_details': ing['details'],
                    'contains_allergens': ', '.join(ing['allergens'])
                })
            break
    
    df_ingredients = pd.DataFrame(ingredients_data)
    
    # 过敏原表
    allergen_data = []
    for food in foods:
        if food.get('food_id') == 'big-mac':
            for ing in BIG_MAC_INGREDIENTS:
                for allergen in ing['allergens']:
                    allergen_data.append({
                        'food_id': 'big-mac',
                        'food_name': 'Big Mac®',
                        'allergen_type': allergen,
                        'allergen_source': ing['name'],
                        'severity': 'Contains'
                    })
            break
    
    df_allergens = pd.DataFrame(allergen_data)
    
    # 保存Excel
    output_file = 'McDonald_Foods_Complete.xlsx'
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        df_master.to_excel(writer, sheet_name='01_Foods_Master', index=False)
        df_nutrition.to_excel(writer, sheet_name='02_Nutrition_Detail', index=False)
        df_ingredients.to_excel(writer, sheet_name='03_Ingredients', index=False)
        df_allergens.to_excel(writer, sheet_name='04_Allergens', index=False)
        
        # 统计
        stats = pd.DataFrame({
            '统计项': ['食物总数', '有营养数据', '有配料数据(Big Mac示例)', '过敏原记录数'],
            '数量': [len(df_master), updated_count, len(df_ingredients), len(df_allergens)]
        })
        stats.to_excel(writer, sheet_name='05_Statistics', index=False)
    
    print(f"✅ Excel已保存: {output_file}")
    print(f"   - 食物总数: {len(df_master)}")
    print(f"   - 有营养数据: {updated_count}")
    print(f"   - Big Mac配料: {len(df_ingredients)} 条")
    print(f"   - Big Mac过敏原: {len(df_allergens)} 条")
    
    # 保存JSON
    with open('foods_complete_data.json', 'w', encoding='utf-8') as f:
        json.dump(foods, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 完整数据已保存: foods_complete_data.json")
    print("\n" + "=" * 60)
    print("✅ 数据更新完成!")
    print("=" * 60)

if __name__ == '__main__':
    main()
