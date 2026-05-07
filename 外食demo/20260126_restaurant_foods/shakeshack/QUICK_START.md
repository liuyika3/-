# Shake Shack 数据快速开始

## 📦 文件说明

```
shakeshack/
├── 📄 shakeshack_foods_data.json       # JSON数据（43个食物）
├── 📊 ShakeShack_Foods_Data.xlsx       # Excel数据（4个工作表）
├── 🐍 scraper.py                       # 爬虫脚本
├── 📖 README.md                        # 项目说明
├── 📘 USAGE.md                         # 详细使用指南
├── 📗 DATA_SUMMARY.md                  # 数据总结报告
└── 📕 QUICK_START.md                   # 本文件
```

## ⚡ 5分钟快速上手

### 1️⃣ 查看数据（Python）

```python
import json
import pandas as pd

# 方式1：读取 JSON
with open('shakeshack_foods_data.json', 'r', encoding='utf-8') as f:
    foods = json.load(f)

print(f"共有 {len(foods)} 个食物")
print(f"第一个食物: {foods[0]['food_name']}")

# 方式2：读取 Excel
df = pd.read_excel('ShakeShack_Foods_Data.xlsx', sheet_name='01_Foods_Master')
print(df.head())
```

### 2️⃣ 常用查询

```python
import pandas as pd

df = pd.read_excel('ShakeShack_Foods_Data.xlsx', sheet_name='01_Foods_Master')

# 查找低卡路里食物（<400卡）
low_cal = df[df['calories'] < 400]
print(f"低卡食物: {len(low_cal)} 个")

# 查找高蛋白食物（>30g）
high_protein = df[df['protein_g'] > 30]
print(f"高蛋白食物: {len(high_protein)} 个")

# 查找不含鸡蛋的食物
no_egg = df[~df['allergens'].str.contains('Egg', na=False)]
print(f"不含鸡蛋: {len(no_egg)} 个")

# 按分类统计平均卡路里
print(df.groupby('category')['calories'].mean())
```

### 3️⃣ 数据可视化

```python
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_excel('ShakeShack_Foods_Data.xlsx', sheet_name='01_Foods_Master')

# 各分类食物数量
category_counts = df['category'].value_counts()
category_counts.plot(kind='bar', title='各分类食物数量')
plt.show()

# 卡路里分布
df['calories'].hist(bins=20, title='卡路里分布')
plt.xlabel('Calories')
plt.show()
```

### 4️⃣ 过敏原分析

```python
import pandas as pd

df_allergens = pd.read_excel('ShakeShack_Foods_Data.xlsx', sheet_name='03_Allergens')

# 统计各过敏原出现次数
allergen_counts = df_allergens['allergen_type'].value_counts()
print("过敏原统计:")
print(allergen_counts)

# 查找特定过敏原的食物
milk_foods = df_allergens[df_allergens['allergen_type'] == 'Milk']
print(f"\n含牛奶的食物: {milk_foods['food_name'].unique()}")
```

## 🎯 典型场景

### 场景1：营养师推荐
**需求**: 找出适合减脂的食物（低卡高蛋白）

```python
df = pd.read_excel('ShakeShack_Foods_Data.xlsx', sheet_name='01_Foods_Master')

# 筛选条件：卡路里<500 且 蛋白质>20g
healthy = df[(df['calories'] < 500) & (df['protein_g'] > 20)]
print(healthy[['food_name', 'calories', 'protein_g']])
```

### 场景2：过敏原筛查
**需求**: 为乳糖不耐症客户推荐食物

```python
df = pd.read_excel('ShakeShack_Foods_Data.xlsx', sheet_name='01_Foods_Master')

# 不含牛奶的食物
no_milk = df[~df['allergens'].str.contains('Milk', na=False)]
print(f"可选食物: {len(no_milk)} 个")
print(no_milk[['food_name', 'category', 'calories']])
```

### 场景3：营养对比
**需求**: 对比不同汉堡的营养成分

```python
df = pd.read_excel('ShakeShack_Foods_Data.xlsx', sheet_name='01_Foods_Master')

# 筛选汉堡类
burgers = df[df['category'] == 'Burgers']
comparison = burgers[['food_name', 'calories', 'protein_g', 'total_fat_g', 'sodium_mg']]
print(comparison.to_string(index=False))
```

## 📊 数据结构速查

### 主表字段（16个）
```
food_id              食物ID
food_name            英文名称
food_name_cn         中文名称（待补充）
category             分类
calories             卡路里
total_fat_g          总脂肪（克）
saturated_fat_g      饱和脂肪（克）
trans_fat_g          反式脂肪（克）
cholesterol_mg       胆固醇（毫克）
sodium_mg            钠（毫克）
total_carbs_g        总碳水化合物（克）
fiber_g              膳食纤维（克）
sugars_g             糖（克）
protein_g            蛋白质（克）
allergens            过敏原
scraped_date         采集日期
```

### 分类列表（8个）
```
Burgers              汉堡 (11个)
Breakfast            早餐 (6个)
Chicken              鸡肉 (5个)
Shakes               奶昔 (5个)
Hot Dogs             热狗 (4个)
Fries & Sides        薯条和配菜 (4个)
Floats & Cups        漂浮饮料 (4个)
Drinks               饮料 (4个)
```

### 常见过敏原
```
Milk                 牛奶
Egg                  鸡蛋
Wheat                小麦
Soy                  大豆
Sesame               芝麻
```

## 🔧 重新运行爬虫

```bash
cd /Users/maodedog/Desktop/CodeProject/business/20260126_restaurant_foods/shakeshack
python3 scraper.py
```

## 📚 更多信息

- **详细使用**: 查看 `USAGE.md`
- **数据总结**: 查看 `DATA_SUMMARY.md`
- **项目概述**: 查看 `README.md`

## ❓ 常见问题

**Q: 数据是最新的吗？**  
A: 数据基于 2026年1月的官方PDF，建议定期更新。

**Q: 为什么没有配料信息？**  
A: 当前版本仅采集营养数据，配料信息可后续扩展。

**Q: 如何添加中文名称？**  
A: 手动编辑 Excel 或 JSON 文件的 `food_name_cn` 字段。

**Q: 数据准确吗？**  
A: 所有数据来自 Shake Shack 官方营养信息PDF，准确可靠。

---

**🎉 开始探索数据吧！**

如有问题，请参考其他文档或查看爬虫脚本 `scraper.py`。
