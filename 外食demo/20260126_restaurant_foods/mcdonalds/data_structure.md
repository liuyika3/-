# 麦当劳食物数据采集表头设计

## 数据表结构

### 主表: McDonald_Foods_Master

| 列名 | 数据类型 | 说明 | 示例 |
|------|---------|------|------|
| food_id | 文本 | 食物唯一标识符 | big-mac |
| food_name | 文本 | 食物名称 | Big Mac® |
| food_name_cn | 文本 | 中文名称(手动填写) | 巨无霸 |
| category | 文本 | 食物分类 | Burgers |
| product_url | 文本 | 产品详情页URL | https://www.mcdonalds.com/us/en-us/product/big-mac.html |
| main_image_url | 文本 | 主产品图片URL | https://... |
| calories | 数字 | 卡路里 | 580 |
| description | 文本(长) | 食物描述 | When a craving hits for those... |
| price | 文本 | 价格(如有) | $5.99 |
| availability | 文本 | 供应状态 | Available/Limited Time |

---

### 营养成分表: McDonald_Foods_Nutrition

| 列名 | 数据类型 | 说明 | 示例 |
|------|---------|------|------|
| food_id | 文本 | 关联主表ID | big-mac |
| protein_g | 数字 | 蛋白质(克) | 25 |
| total_carbs_g | 数字 | 总碳水化合物(克) | 45 |
| total_carbs_dv_pct | 数字 | 碳水DV百分比 | 16 |
| total_fat_g | 数字 | 总脂肪(克) | 34 |
| total_fat_dv_pct | 数字 | 脂肪DV百分比 | 43 |
| saturated_fat_g | 数字 | 饱和脂肪(克) | 11 |
| saturated_fat_dv_pct | 数字 | 饱和脂肪DV% | 56 |
| trans_fat_g | 数字 | 反式脂肪(克) | 1 |
| cholesterol_mg | 数字 | 胆固醇(毫克) | 85 |
| cholesterol_dv_pct | 数字 | 胆固醇DV% | 28 |
| dietary_fiber_g | 数字 | 膳食纤维(克) | 3 |
| dietary_fiber_dv_pct | 数字 | 纤维DV% | 10 |
| total_sugars_g | 数字 | 总糖(克) | 7 |
| added_sugars_g | 数字 | 添加糖(克) | 5 |
| added_sugars_dv_pct | 数字 | 添加糖DV% | 10 |
| vitamin_d_mcg | 数字 | 维生素D(微克) | 0 |
| vitamin_d_dv_pct | 数字 | 维生素D DV% | 0 |
| calcium_mg | 数字 | 钙(毫克) | 120 |
| calcium_dv_pct | 数字 | 钙DV% | 10 |
| iron_mg | 数字 | 铁(毫克) | 4 |
| iron_dv_pct | 数字 | 铁DV% | 25 |
| potassium_mg | 数字 | 钾(毫克) | 370 |
| potassium_dv_pct | 数字 | 钾DV% | 8 |
| sodium_mg | 数字 | 钠(毫克) | 1060 |
| sodium_dv_pct | 数字 | 钠DV% | 46 |

---

### 配料成分表: McDonald_Foods_Ingredients

| 列名 | 数据类型 | 说明 | 示例 |
|------|---------|------|------|
| food_id | 文本 | 关联主表ID | big-mac |
| ingredient_order | 数字 | 配料顺序 | 1 |
| ingredient_name | 文本 | 配料名称 | Big Mac Bun |
| ingredient_image_url | 文本 | 配料图片URL | https://... |
| ingredient_details | 文本(长) | 配料详细成分 | Enriched Flour (wheat Flour...) |
| contains_allergens | 文本 | 包含的过敏原 | Wheat, Barley, Soy, Sesame |

---

### 过敏信息表: McDonald_Foods_Allergens

| 列名 | 数据类型 | 说明 | 示例 |
|------|---------|------|------|
| food_id | 文本 | 关联主表ID | big-mac |
| allergen_type | 文本 | 过敏原类型 | Wheat |
| allergen_source | 文本 | 过敏原来源 | Big Mac Bun |
| severity | 文本 | 严重程度 | Contains/May Contain |

---

## 数据关系说明

```
McDonald_Foods_Master (1) ←→ (1) McDonald_Foods_Nutrition
                       ↓
                      (1:N)
                       ↓
       McDonald_Foods_Ingredients
                       ↓
                      (1:N)
                       ↓
        McDonald_Foods_Allergens
```

## 补充说明

1. **DV%**: Daily Value Percentage (每日建议摄入量百分比)
2. **配料图片**: 每个食物有多张配料展示图(轮播形式)
3. **过敏原**: 从配料成分中提取,包含"Contains"和"May Contain"两类
4. **数据完整性**: 所有URL字段在初期保存URL,后期可选择性下载图片到本地
