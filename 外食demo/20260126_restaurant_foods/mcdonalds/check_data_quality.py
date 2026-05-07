#!/usr/bin/env python3
"""
检查数据质量
"""
import pandas as pd
import numpy as np

# 读取Excel
excel_file = 'McDonald_Foods_Playwright.xlsx'
df_master = pd.read_excel(excel_file, sheet_name='01_Foods_Master')
df_nutrition = pd.read_excel(excel_file, sheet_name='02_Nutrition')

print("=" * 80)
print("📊 麦当劳数据质量检查报告")
print("=" * 80)

# 问题1: 检查缺失卡路里的食物
print("\n【问题1】缺失卡路里的食物:")
missing_calories = df_master[df_master['calories'].isna() | (df_master['calories'] == '')]
if len(missing_calories) > 0:
    print(f"❌ 发现 {len(missing_calories)} 个食物缺少卡路里:")
    for idx, row in missing_calories.iterrows():
        print(f"   - {row['food_name']} ({row['food_id']})")
else:
    print("✅ 所有食物都有卡路里数据")

# 问题2: 检查缺失三大营养素或钠的食物
print("\n【问题2】缺失三大营养素或钠的食物:")
print("\n在 Foods_Master 表中:")
missing_nutrients_master = df_master[
    df_master['protein_g'].isna() | 
    df_master['total_carbs_g'].isna() | 
    df_master['total_fat_g'].isna() | 
    df_master['sodium_mg'].isna()
]
if len(missing_nutrients_master) > 0:
    print(f"❌ 发现 {len(missing_nutrients_master)} 个食物缺少营养数据:")
    for idx, row in missing_nutrients_master.iterrows():
        missing = []
        if pd.isna(row['protein_g']): missing.append('蛋白质')
        if pd.isna(row['total_carbs_g']): missing.append('碳水')
        if pd.isna(row['total_fat_g']): missing.append('脂肪')
        if pd.isna(row['sodium_mg']): missing.append('钠')
        print(f"   - {row['food_name']} ({row['food_id']}): 缺{', '.join(missing)}")
else:
    print("✅ 所有食物都有三大营养素和钠")

print("\n在 Nutrition 表中:")
missing_nutrients_nutrition = df_nutrition[
    df_nutrition['protein_g'].isna() | 
    df_nutrition['total_carbs_g'].isna() | 
    df_nutrition['total_fat_g'].isna() | 
    df_nutrition['sodium_mg'].isna()
]
if len(missing_nutrients_nutrition) > 0:
    print(f"❌ 发现 {len(missing_nutrients_nutrition)} 个食物缺少营养数据:")
    for idx, row in missing_nutrients_nutrition.iterrows():
        missing = []
        if pd.isna(row['protein_g']): missing.append('蛋白质')
        if pd.isna(row['total_carbs_g']): missing.append('碳水')
        if pd.isna(row['total_fat_g']): missing.append('脂肪')
        if pd.isna(row['sodium_mg']): missing.append('钠')
        print(f"   - {row['food_name']} ({row['food_id']}): 缺{', '.join(missing)}")
else:
    print("✅ Nutrition表所有食物都有三大营养素和钠")

# 问题3: 检查营养素数据为0的情况
print("\n【问题3】营养素数据为0的食物 (可能应该是真实的0或空):")
nutrition_cols = ['protein_g', 'total_carbs_g', 'total_fat_g', 'saturated_fat_g', 
                  'trans_fat_g', 'cholesterol_mg', 'sodium_mg', 'dietary_fiber_g', 
                  'total_sugars_g', 'added_sugars_g']

zero_nutrients = []
for col in nutrition_cols:
    if col in df_nutrition.columns:
        zero_rows = df_nutrition[df_nutrition[col] == 0]
        if len(zero_rows) > 0:
            for idx, row in zero_rows.iterrows():
                zero_nutrients.append({
                    'food_name': row['food_name'],
                    'food_id': row['food_id'],
                    'nutrient': col,
                    'value': 0
                })

if zero_nutrients:
    print(f"⚠️ 发现 {len(zero_nutrients)} 个营养素值为0:")
    # 按食物分组
    from collections import defaultdict
    by_food = defaultdict(list)
    for item in zero_nutrients:
        by_food[item['food_name']].append(item['nutrient'])
    
    for food_name, nutrients in list(by_food.items())[:10]:  # 只显示前10个
        print(f"   - {food_name}: {', '.join(nutrients)}")
    
    if len(by_food) > 10:
        print(f"   ... 还有 {len(by_food) - 10} 个食物")
else:
    print("✅ 没有发现营养素值为0的情况")

# 统计所有营养素的缺失情况
print("\n【完整营养素缺失统计】")
print(f"总食物数: {len(df_nutrition)}")
print("\n各营养素缺失数量:")
for col in df_nutrition.columns:
    if col not in ['food_id', 'food_name']:
        missing_count = df_nutrition[col].isna().sum()
        if missing_count > 0:
            print(f"   {col}: {missing_count} 个缺失")

# 导出问题清单
print("\n" + "=" * 80)
print("📋 导出问题清单到 data_issues.csv")
issues = []

# 添加所有问题
for idx, row in missing_calories.iterrows():
    issues.append({
        'food_id': row['food_id'],
        'food_name': row['food_name'],
        'issue_type': '缺失卡路里',
        'issue_detail': 'calories为空'
    })

for idx, row in missing_nutrients_master.iterrows():
    missing = []
    if pd.isna(row['protein_g']): missing.append('protein_g')
    if pd.isna(row['total_carbs_g']): missing.append('total_carbs_g')
    if pd.isna(row['total_fat_g']): missing.append('total_fat_g')
    if pd.isna(row['sodium_mg']): missing.append('sodium_mg')
    issues.append({
        'food_id': row['food_id'],
        'food_name': row['food_name'],
        'issue_type': '缺失营养素',
        'issue_detail': f"Master表缺失: {', '.join(missing)}"
    })

for idx, row in missing_nutrients_nutrition.iterrows():
    missing = []
    if pd.isna(row['protein_g']): missing.append('protein_g')
    if pd.isna(row['total_carbs_g']): missing.append('total_carbs_g')
    if pd.isna(row['total_fat_g']): missing.append('total_fat_g')
    if pd.isna(row['sodium_mg']): missing.append('sodium_mg')
    issues.append({
        'food_id': row['food_id'],
        'food_name': row['food_name'],
        'issue_type': '缺失营养素',
        'issue_detail': f"Nutrition表缺失: {', '.join(missing)}"
    })

if issues:
    df_issues = pd.DataFrame(issues)
    df_issues.to_csv('data_issues.csv', index=False, encoding='utf-8-sig')
    print(f"✅ 问题清单已保存: 共 {len(issues)} 个问题")
else:
    print("✅ 没有发现问题")

print("\n" + "=" * 80)
print("检查完成!")
print("=" * 80)
