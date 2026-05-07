#!/usr/bin/env python3
"""
批量爬取 Taco Bell 所有菜品的详细营养信息
通过 Nutritionix 页面点击 [more info] 获取完整数据
"""

import json
import time
import re
from pathlib import Path

def extract_dialog_data(snapshot_file):
    """从浏览器快照中提取 dialog 中的详细信息"""
    with open(snapshot_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 查找 dialog 内容
    dialog_match = re.search(r'- dialog "([^"]+)".*?(?=\n  - (?:dialog|generic|main)\s)', content, re.DOTALL)
    if not dialog_match:
        return None
    
    item_name = dialog_match.group(1)
    dialog_content = dialog_match.group(0)
    
    # 提取详细信息
    detail = {
        'name': item_name,
        'nutrition_facts': {},
        'allergens': {},
        'ingredients': ''
    }
    
    # 1. 提取 Nutrition Facts
    # Serving Size
    serving_match = re.search(r'textbox.*?: "([^"]+)".*?(?:oz|g)', dialog_content)
    if serving_match:
        detail['nutrition_facts']['serving_size'] = serving_match.group(1)
    
    # Calories
    cal_match = re.search(r'text: Calories.*?generic.*?: "(\d+)"', dialog_content, re.DOTALL)
    if cal_match:
        detail['nutrition_facts']['calories'] = cal_match.group(1)
    
    # Total Fat
    tf_match = re.search(r'text: Total Fat.*?text: (\d+(?:\.\d+)?)g.*?text: (\d+)%', dialog_content, re.DOTALL)
    if tf_match:
        detail['nutrition_facts']['total_fat'] = {'value': tf_match.group(1) + 'g', 'daily_value': tf_match.group(2) + '%'}
    
    # Saturated Fat
    sf_match = re.search(r'text: Saturated Fat.*?text: (\d+(?:\.\d+)?)g.*?text: (\d+)%', dialog_content, re.DOTALL)
    if sf_match:
        detail['nutrition_facts']['saturated_fat'] = {'value': sf_match.group(1) + 'g', 'daily_value': sf_match.group(2) + '%'}
    
    # Trans Fat
    trans_match = re.search(r'Trans.*?Fat.*?text: (\d+(?:\.\d+)?)g', dialog_content, re.DOTALL)
    if trans_match:
        detail['nutrition_facts']['trans_fat'] = trans_match.group(1) + 'g'
    
    # Cholesterol
    chol_match = re.search(r'text: Cholesterol.*?text: (\d+)mg.*?text: (\d+)%', dialog_content, re.DOTALL)
    if chol_match:
        detail['nutrition_facts']['cholesterol'] = {'value': chol_match.group(1) + 'mg', 'daily_value': chol_match.group(2) + '%'}
    
    # Sodium
    sodium_match = re.search(r'text: Sodium.*?text: (\d+)mg.*?text: (\d+)%', dialog_content, re.DOTALL)
    if sodium_match:
        detail['nutrition_facts']['sodium'] = {'value': sodium_match.group(1) + 'mg', 'daily_value': sodium_match.group(2) + '%'}
    
    # Total Carbohydrates
    carb_match = re.search(r'text: Total Carbohydrates.*?text: (\d+(?:\.\d+)?)g.*?text: (\d+)%', dialog_content, re.DOTALL)
    if carb_match:
        detail['nutrition_facts']['total_carbohydrates'] = {'value': carb_match.group(1) + 'g', 'daily_value': carb_match.group(2) + '%'}
    
    # Dietary Fiber
    fiber_match = re.search(r'text: Dietary Fiber.*?text: (\d+(?:\.\d+)?)g.*?text: (\d+)%', dialog_content, re.DOTALL)
    if fiber_match:
        detail['nutrition_facts']['dietary_fiber'] = {'value': fiber_match.group(1) + 'g', 'daily_value': fiber_match.group(2) + '%'}
    
    # Sugars
    sugar_match = re.search(r'text: Sugars.*?text: (\d+(?:\.\d+)?)g', dialog_content, re.DOTALL)
    if sugar_match:
        detail['nutrition_facts']['sugars'] = sugar_match.group(1) + 'g'
    
    # Added Sugars
    added_sugar_match = re.search(r'text: Added Sugars.*?text: (\d+)%', dialog_content, re.DOTALL)
    if added_sugar_match:
        detail['nutrition_facts']['added_sugars'] = {'daily_value': added_sugar_match.group(1) + '%'}
    
    # Protein
    protein_match = re.search(r'text: Protein.*?text: ([<>]?\s*\d+(?:\.\d+)?)g', dialog_content, re.DOTALL)
    if protein_match:
        detail['nutrition_facts']['protein'] = protein_match.group(1).strip() + 'g'
    
    # Vitamins & Minerals
    vit_d_match = re.search(r'text: Vitamin D.*?text: (\d+(?:\.\d+)?)mcg.*?text: (\d+)%', dialog_content, re.DOTALL)
    if vit_d_match:
        detail['nutrition_facts']['vitamin_d'] = {'value': vit_d_match.group(1) + 'mcg', 'daily_value': vit_d_match.group(2) + '%'}
    
    calcium_match = re.search(r'text: Calcium.*?text: (\d+)mg.*?text: (\d+)%', dialog_content, re.DOTALL)
    if calcium_match:
        detail['nutrition_facts']['calcium'] = {'value': calcium_match.group(1) + 'mg', 'daily_value': calcium_match.group(2) + '%'}
    
    iron_match = re.search(r'text: Iron.*?text: (\d+(?:\.\d+)?)mg.*?text: (\d+)%', dialog_content, re.DOTALL)
    if iron_match:
        detail['nutrition_facts']['iron'] = {'value': iron_match.group(1) + 'mg', 'daily_value': iron_match.group(2) + '%'}
    
    potassium_match = re.search(r'text: Potassium.*?text: (\d+)mg.*?text: (\d+)%', dialog_content, re.DOTALL)
    if potassium_match:
        detail['nutrition_facts']['potassium'] = {'value': potassium_match.group(1) + 'mg', 'daily_value': potassium_match.group(2) + '%'}
    
    # 2. 提取 Allergens
    allergens = ['Eggs', 'Gluten', 'Milk', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts', 'Wheat', 'Soy', 'M.S.G.', 'Sesame']
    for allergen in allergens:
        # 查找过敏原行
        allergen_pattern = rf'row "{allergen}.*?" \[ref=.*?\]'
        allergen_match = re.search(allergen_pattern, dialog_content)
        if allergen_match:
            allergen_row = allergen_match.group(0)
            # 检查是否包含 (contains)
            if "This item contains" in allergen_row or "!" in allergen_row:
                detail['allergens'][allergen.replace('M.S.G.', 'MSG')] = 'contains'
            else:
                detail['allergens'][allergen.replace('M.S.G.', 'MSG')] = 'does_not_contain'
    
    # 3. 提取 Ingredients
    ingredients_match = re.search(r'heading "INGREDIENTS:".*?paragraph.*?text: "(.+?)"', dialog_content, re.DOTALL)
    if ingredients_match:
        detail['ingredients'] = ingredients_match.group(1)
    else:
        # 尝试另一种格式
        ingredients_match2 = re.search(r'heading "INGREDIENTS:".*?strong.*?: "(.+?)".*?text: ": (.+?)"', dialog_content, re.DOTALL)
        if ingredients_match2:
            detail['ingredients'] = f"{ingredients_match2.group(1)}: {ingredients_match2.group(2)}"
    
    return detail


# 这个脚本需要与浏览器MCP工具配合使用
# 由于需要人工干预点击,这里提供数据处理框架
print("数据提取函数已准备就绪")
print("请使用 MCP 浏览器工具逐个点击菜品的 [more info] 按钮")
print("每次点击后,调用 extract_dialog_data() 提取数据")
