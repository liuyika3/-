# Shake Shack 数据使用说明

## 📊 数据概览

**采集日期**: 2026-01-28  
**食物总数**: 43 个  
**分类数**: 8 个  
**数据来源**: [Shake Shack 营养信息PDF](https://shakeshack.com/sites/default/files/2026-01/_Master%20Nut%20%26%20Allergen%201.6.26.pdf)

## 📁 生成的文件

```
shakeshack/
├── shakeshack_foods_data.json       # JSON格式数据 (18KB)
├── ShakeShack_Foods_Data.xlsx       # Excel格式数据 (16KB)
├── scraper.py                       # 爬虫脚本
├── README.md                        # 项目说明
└── USAGE.md                         # 本文件
```

## 📈 分类统计

| 分类 | 数量 |
|------|------|
| Burgers (汉堡) | 11 个 |
| Breakfast (早餐) | 6 个 |
| Chicken (鸡肉) | 5 个 |
| Shakes (奶昔) | 5 个 |
| Hot Dogs (热狗) | 4 个 |
| Fries & Sides (薯条和配菜) | 4 个 |
| Floats & Cups (漂浮饮料和杯装) | 4 个 |
| Drinks (饮料) | 4 个 |

## 📋 Excel 工作表说明

### 01_Foods_Master (主表)
**包含字段**:
- `food_id`: 食物唯一ID
- `food_name`: 英文名称
- `food_name_cn`: 中文名称（待补充）
- `category`: 分类
- `calories`: 卡路里
- `total_fat_g`: 总脂肪（克）
- `saturated_fat_g`: 饱和脂肪（克）
- `trans_fat_g`: 反式脂肪（克）
- `cholesterol_mg`: 胆固醇（毫克）
- `sodium_mg`: 钠（毫克）
- `total_carbs_g`: 总碳水化合物（克）
- `fiber_g`: 膳食纤维（克）
- `sugars_g`: 糖（克）
- `protein_g`: 蛋白质（克）
- `allergens`: 过敏原
- `scraped_date`: 采集日期

**记录数**: 43 条

### 02_Nutrition (营养成分表)
营养成分详细数据，包含所有营养指标。

**记录数**: 43 条

### 03_Allergens (过敏原表)
过敏原详细列表，展开为每个食物的每个过敏原一条记录。

**字段**:
- `food_id`: 食物ID
- `food_name`: 食物名称
- `allergen_type`: 过敏原类型
- `severity`: 严重程度（Contains）

**记录数**: 121 条

### 04_Statistics (统计信息)
数据统计汇总表。

## 🍔 主要食物示例

### 汉堡类
- **Single ShackBurger**: 500 卡路里
- **Double ShackBurger**: 760 卡路里
- **'Shroom Burger** (蘑菇素食堡): 510 卡路里
- **Shack Stack**: 770 卡路里

### 鸡肉类
- **Chicken Shack**: 550 卡路里
- **Chicken Bites (6 piece)**: 350 卡路里
- **Avocado Bacon Chicken**: 670 卡路里

### 早餐类
- **Egg and Cheese Sandwich**: 340 卡路里
- **Bacon Egg and Cheese Sandwich**: 430 卡路里
- **Wake up Shack**: 670 卡路里

### 奶昔类
- **Vanilla Shake**: 680 卡路里
- **Chocolate Shake**: 750 卡路里
- **Coffee Shake**: 700 卡路里

## 🔍 过敏原统计

常见过敏原:
- **Milk** (牛奶): 大部分汉堡、奶昔含有
- **Egg** (鸡蛋): 汉堡酱料、奶昔、早餐含有
- **Wheat** (小麦): 面包、鸡肉含有
- **Soy** (大豆): 部分产品含有
- **Sesame** (芝麻): 面包含有

## 💡 使用建议

### 1. Python 读取 JSON
```python
import json

with open('shakeshack_foods_data.json', 'r', encoding='utf-8') as f:
    foods = json.load(f)

# 查找高蛋白食物
high_protein = [f for f in foods if f['protein_g'] >= 30]
print(f"高蛋白食物: {len(high_protein)} 个")
```

### 2. Pandas 读取 Excel
```python
import pandas as pd

# 读取主表
df = pd.read_excel('ShakeShack_Foods_Data.xlsx', sheet_name='01_Foods_Master')

# 分析营养成分
print(df.groupby('category')['calories'].mean())
```

### 3. 过敏原筛选
```python
# 读取过敏原表
df_allergens = pd.read_excel('ShakeShack_Foods_Data.xlsx', sheet_name='03_Allergens')

# 查找不含牛奶的食物
no_milk = df[~df['allergens'].str.contains('Milk', na=False)]
print(f"不含牛奶: {len(no_milk)} 个")
```

## 🔄 更新数据

如果需要更新数据:

```bash
# 重新运行爬虫
cd /Users/maodedog/Desktop/CodeProject/business/20260126_restaurant_foods/shakeshack
python3 scraper.py
```

## ⚠️ 注意事项

1. **数据来源**: 基于 Shake Shack 官方 2026年1月的营养信息PDF
2. **数据准确性**: 营养数据来自官方文件，但菜单可能随时间更新
3. **中文名称**: 需要人工补充 `food_name_cn` 字段
4. **图片**: 当前版本未包含产品图片，可后续扩展
5. **价格**: 未包含价格信息（官网未提供）

## 📞 数据质量

✅ **完整性**: 所有43个食物都有完整的营养数据  
✅ **准确性**: 数据来自官方PDF文档  
✅ **过敏原**: 121条过敏原记录，覆盖所有含过敏原食物  
✅ **结构化**: JSON和Excel两种格式，便于不同场景使用  

## 🎯 后续扩展建议

1. **图片采集**: 从官网爬取产品图片
2. **价格信息**: 如果有地区价格数据可补充
3. **中文翻译**: 补充中文名称
4. **定期更新**: 设置定时任务更新数据
5. **更多指标**: 如需要可添加每日摄入百分比(DV%)

---

**最后更新**: 2026-01-28  
**数据版本**: v1.0  
**联系方式**: 如有问题请查看 README.md
