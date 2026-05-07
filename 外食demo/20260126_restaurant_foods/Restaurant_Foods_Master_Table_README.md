# 餐厅菜品营养数据总表

## 📊 文件信息

- **文件名**: `Restaurant_Foods_Master_Table.xlsx`
- **创建日期**: 2026-01-30
- **总数据量**: 834 条菜品
- **涵盖餐厅**: McDonald's, Shake Shack, Taco Bell
- **字段数量**: 18 个

## 📋 数据结构

### 一级字段 - 核心必备字段 (7个)

所有餐厅都具备的基础营养信息:

| 字段名 | 数据类型 | 说明 | 完整度 |
|--------|----------|------|--------|
| `restaurant_name` | 文本 | 餐厅名称 | 100% |
| `food_name` | 文本 | 菜品英文名称 | 100% |
| `calories` | 数值 | 热量 (kcal) | 72.4% |
| `protein_g` | 数值 | 蛋白质 (克) | 72.8% |
| `total_fat_g` | 数值 | 总脂肪 (克) | 72.7% |
| `sodium_mg` | 数值 | 钠 (毫克) | 72.7% |
| `total_carbs_g` | 数值 | 总碳水化合物 (克) | 72.8% |

### 二级字段 - 扩展营养字段 (5个)

部分餐厅提供的详细营养信息:

| 字段名 | 数据类型 | 说明 | 完整度 | 数据来源 |
|--------|----------|------|--------|----------|
| `saturated_fat_g` | 数值 | 饱和脂肪 (克) | 61.0% | Shake Shack ✓, Taco Bell ✓ |
| `trans_fat_g` | 数值 | 反式脂肪 (克) | 61.0% | Shake Shack ✓, Taco Bell ✓ |
| `cholesterol_mg` | 数值 | 胆固醇 (毫克) | 61.0% | Shake Shack ✓, Taco Bell ✓ |
| `fiber_g` | 数值 | 膳食纤维 (克) | 61.0% | Shake Shack ✓, Taco Bell ✓ |
| `sugars_g` | 数值 | 糖 (克) | 61.0% | Shake Shack ✓, Taco Bell ✓ |

### 二级字段 - 基础信息字段 (6个)

菜品的元数据和辅助信息:

| 字段名 | 数据类型 | 说明 | 完整度 | 数据来源 |
|--------|----------|------|--------|----------|
| `food_id` | 文本 | 菜品唯一标识符 | 44.1% | McDonald's ✓, Shake Shack ✓ |
| `food_name_cn` | 文本 | 菜品中文名称 | 0% | 待补充 |
| `description` | 文本 | 菜品描述 | 41.7% | McDonald's ✓, Shake Shack ✓ |
| `allergens` | 文本 | 过敏原信息 | 14.1% | McDonald's ✓, Shake Shack ✓ |
| `local_image_path` | 文本 | 本地图片路径 | 39.1% | McDonald's ✓, Shake Shack ✓ |
| `scraped_date` | 日期 | 数据抓取日期 | 44.1% | McDonald's ✓, Shake Shack ✓ |

## 🏪 各餐厅数据统计

### McDonald's (102 条)

- **核心营养数据**: 93-98% 完整度
- **扩展营养数据**: 0% (缺失饱和脂肪、纤维、糖等)
- **元数据**: 100% (包含ID、描述、图片等)

### Shake Shack (266 条)

- **核心营养数据**: 16% 完整度 (43/266条有完整数据)
- **扩展营养数据**: 16% 完整度
- **元数据**: 100% (包含ID、描述、图片等)

### Taco Bell (466 条)

- **核心营养数据**: 100% 完整度
- **扩展营养数据**: 100% 完整度
- **元数据**: 0% (缺失所有元数据)

## 🔧 字段标准化说明

在整合过程中,以下字段名称已被标准化:

| 原始字段名 | 标准化后 | 餐厅 |
|-----------|----------|------|
| `name` | `food_name` | Taco Bell |
| `total_carbohydrates_g` | `total_carbs_g` | Taco Bell |
| `dietary_fiber_g` | `fiber_g` | Taco Bell |
| `product_url` | (映射到 `image_url`) | McDonald's |

## 💡 使用建议

### 数据查询示例

```python
import pandas as pd

# 读取总表
df = pd.read_excel('Restaurant_Foods_Master_Table.xlsx')

# 查询特定餐厅
mcdonalds = df[df['restaurant_name'] == "McDonald's"]

# 查询高蛋白菜品 (>30g)
high_protein = df[df['protein_g'] > 30]

# 查询低卡路里菜品 (<300 kcal)
low_cal = df[df['calories'] < 300]

# 统计各餐厅平均热量
avg_calories = df.groupby('restaurant_name')['calories'].mean()
```

### 数据完整性注意事项

1. **空值处理**: 缺失数据用 `NaN` 表示,使用时需要检查空值
2. **数据类型**: 营养数据可能包含特殊值如 `<1` (Taco Bell),需要特殊处理
3. **中文名称**: 目前所有中文名称字段为空,需要后续补充

## 📈 数据覆盖率

- **7个核心字段**: 72-100% 覆盖率
- **5个扩展营养字段**: 61% 覆盖率 (Shake Shack + Taco Bell)
- **6个元信息字段**: 14-44% 覆盖率

## 🔄 未来优化建议

### 短期优化
1. 补充 McDonald's 的扩展营养数据(饱和脂肪、纤维、糖等)
2. 补充 Shake Shack 缺失的营养数据(223条)
3. 为 Taco Bell 添加菜品ID、图片和描述

### 长期优化
1. 添加所有菜品的中文名称
2. 统一图片资源管理
3. 添加价格信息(目前仅Shake Shack有)
4. 添加菜品分类(目前仅Shake Shack有)

## 📝 数据来源

| 餐厅 | 源文件 | 行数 | 原始字段数 |
|------|--------|------|------------|
| McDonald's | `mcdonalds/McDonald_Foods_Final.xlsx` | 102 | 14 |
| Shake Shack | `shakeshack/ShakeShack_总表.xlsx` | 266 | 20 |
| Taco Bell | `tacobell/nutrition_info_detailed/tacobell_nutrition_info.xlsx` | 466 | 12 |

## ⚠️ 数据质量说明

1. **Shake Shack**: 部分菜品(223/266)缺失营养数据,仅保留了菜品基础信息
2. **Taco Bell**: 完整营养数据但缺失所有元数据(ID、描述、图片等)
3. **McDonald's**: 核心营养数据完整,但缺失扩展营养信息

建议在使用数据前根据具体需求进行空值检查和数据验证。

---

**版本**: v1.0  
**更新日期**: 2026-01-30  
**维护者**: 数据整合脚本自动生成
