# McDonald's Complete Merged Sheet 说明文档

## 📋 概述

**Sheet名称**: `00_Complete_Merged`  
**位置**: 第1个Sheet (最前面)  
**创建日期**: 2026-01-30  
**数据行数**: 102 行  
**字段数量**: 40 个

## 🎯 设计目标

这个Sheet将原本分散在4个不同Sheet中的信息整合到一行,使每个食物的**完整信息**都在同一行中,便于:
- ✅ 快速查看单个食物的所有信息
- ✅ 数据导出和API集成
- ✅ 数据分析和统计
- ✅ 避免在多个Sheet之间跳转

## 📊 数据来源

整合了以下4个Sheet的数据:

| 源Sheet | 贡献字段数 | 处理方式 |
|---------|-----------|----------|
| `01_Foods_Master` | 14 | 直接合并 |
| `02_Nutrition` | 24 | 去重合并(移除已存在的基础营养字段) |
| `03_Ingredients` | 1 | **聚合**为 `ingredients_full` (354行→102行) |
| `04_Allergens` | 1 | **聚合**为 `allergens_full` (332行→102行) |

## 🗂️ 字段结构 (40个字段)

### 1️⃣ 基础信息 (14个字段)

来自 `01_Foods_Master`:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `food_id` | 文本 | 食物唯一标识符 |
| `food_name` | 文本 | 食物英文名称 |
| `food_name_cn` | 文本 | 食物中文名称 (待补充) |
| `product_url` | URL | 产品页面链接 |
| `local_image_path` | 路径 | 本地图片路径 |
| `calories` | 数值 | 热量 (kcal) |
| `protein_g` | 数值 | 蛋白质 (克) |
| `total_carbs_g` | 数值 | 总碳水化合物 (克) |
| `total_fat_g` | 数值 | 总脂肪 (克) |
| `sodium_mg` | 数值 | 钠 (毫克) |
| `description` | 文本 | 产品描述 |
| `allergens` | 文本 | 过敏原简要列表 |
| `ingredient_count` | 数值 | 配料数量 |
| `scraped_date` | 日期 | 数据抓取日期 |

### 2️⃣ 详细营养信息 (24个字段)

来自 `02_Nutrition` (带%DV值):

#### 宏量营养素
- `protein_dv`, `total_carbs_dv`, `total_fat_dv`
- `saturated_fat_g`, `saturated_fat_dv`
- `trans_fat_g`, `trans_fat_dv`
- `cholesterol_mg`, `cholesterol_dv`
- `sodium_dv`

#### 碳水化合物详情
- `dietary_fiber_g`, `dietary_fiber_dv`
- `total_sugars_g`, `total_sugars_dv`
- `added_sugars_g`, `added_sugars_dv`

#### 维生素和矿物质
- `vitamin_d_mcg`, `vitamin_d_dv`
- `calcium_mg`, `calcium_dv`
- `iron_mg`, `iron_dv`
- `potassium_mg`, `potassium_dv`

### 3️⃣ 聚合信息字段 (2个字段)

#### `ingredients_full` (文本,长字段)

**格式**: `配料名: 详细信息 | 配料名: 详细信息 | ...`

**示例**:
```
English Muffin: Enriched Flour (wheat Flour, Malted Barley Flour, Niacin, Iron, Thiamine, Riboflavin, Folic Acid), Water, Yeast... | Egg: Usda Grade A Eggs. | Canadian Bacon: Pork Cured With: Water, Sugar, Salt...
```

**来源**: 将 `03_Ingredients` 中同一 `food_id` 的所有配料按 `ingredient_order` 排序后合并

#### `allergens_full` (文本,长字段)

**格式**: `过敏原类型 (来源: 来源名称, 等级: 严重程度) | ...`

**示例**:
```
Wheat (来源: English Muffin, 等级: Contains) | Soy (来源: English Muffin, 等级: Contains) | Barley (来源: English Muffin, 等级: Contains) | Egg (来源: Egg, 等级: Contains)
```

**来源**: 将 `04_Allergens` 中同一 `food_id` 的所有过敏原信息合并

## 💡 使用示例

### Python 读取

```python
import pandas as pd

# 读取合并后的完整数据
df = pd.read_excel('McDonald_Foods_Final.xlsx', sheet_name='00_Complete_Merged')

# 查询特定食物
egg_mcmuffin = df[df['food_id'] == 'egg-mcmuffin'].iloc[0]

# 访问所有信息
print(f"名称: {egg_mcmuffin['food_name']}")
print(f"热量: {egg_mcmuffin['calories']} kcal")
print(f"蛋白质: {egg_mcmuffin['protein_g']}g")
print(f"配料: {egg_mcmuffin['ingredients_full']}")
print(f"过敏原: {egg_mcmuffin['allergens_full']}")
```

### Excel 查看

1. 打开 `McDonald_Foods_Final.xlsx`
2. 点击第一个Sheet `00_Complete_Merged`
3. 每一行包含一个食物的完整信息
4. 配料和过敏原字段较长,已自动设置为80字符宽度

## 🎨 格式设置

- **表头**: 深蓝色背景 (#366092) + 白色粗体文字
- **冻结窗格**: 首行已冻结,方便滚动浏览数据
- **列宽**:
  - 普通字段: 15字符
  - URL/路径字段: 40字符
  - 描述字段: 60字符
  - `ingredients_full` 和 `allergens_full`: 80字符

## 🔄 与原Sheet的关系

| Sheet名称 | 关系 | 说明 |
|-----------|------|------|
| `00_Complete_Merged` | **新增** | 完整合并视图,**推荐使用** |
| `01_Foods_Master` | 保留 | 基础信息表 |
| `02_Nutrition` | 保留 | 详细营养信息表 |
| `03_Ingredients` | 保留 | 配料明细表 (多行对一个食物) |
| `04_Allergens` | 保留 | 过敏原明细表 (多行对一个食物) |
| `05_Statistics` | 保留 | 统计信息 |

**注意**: 原有的5个Sheet都保留不变,可以根据需要选择使用。

## ⚠️ 注意事项

1. **长文本字段**: `ingredients_full` 和 `allergens_full` 可能非常长(数百到上千字符)
2. **数据同步**: 如果修改了 `03_Ingredients` 或 `04_Allergens`,需要重新运行合并脚本
3. **DV值含义**: DV = Daily Value (每日营养素参考值百分比)
4. **空值**: 部分字段可能为空 (NaN),使用时需要检查

## 🚀 优势

✅ **一站式数据访问** - 无需在多个Sheet间跳转  
✅ **适合导出** - 可直接导出为CSV或JSON  
✅ **便于分析** - 支持pandas等工具进行数据分析  
✅ **完整性** - 包含所有40个维度的信息  
✅ **结构化** - 配料和过敏原虽然合并但保持结构化格式  

## 📝 更新日志

- **2026-01-30**: 创建初始版本,合并前4个Sheet的数据

---

**维护建议**: 如果源数据有更新,重新运行合并脚本以保持数据同步。
