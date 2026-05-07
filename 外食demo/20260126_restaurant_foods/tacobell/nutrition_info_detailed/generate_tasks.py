#!/usr/bin/env python3
"""
通过 MCP 浏览器工具批量爬取详细营养信息
"""

import json
import time
from pathlib import Path

# 读取菜品列表
with open('nutrition_table_data.json', 'r', encoding='utf-8') as f:
    items = json.load(f)

print(f"共 {len(items)} 个菜品需要获取详细信息")

# 由于需要通过 MCP 工具逐个点击,这里我们生成一个任务列表
# 供人工或自动化工具使用

tasks = []
for idx, item in enumerate(items, 1):
    task = {
        'index': idx,
        'name': item['name'],
        'status': 'pending',
        'actions': [
            f"1. 在营养信息页面找到 '{item['name']}'",
            "2. 点击 [more info] 链接",
            "3. 等待弹窗加载",
            "4. 提取 Nutrition Facts (完整营养成分表)",
            "5. 提取 Allergen Information (过敏原信息)",
            "6. 提取 Ingredients (成分列表)",
            "7. 关闭弹窗"
        ]
    }
    tasks.append(task)

# 保存任务列表
tasks_file = Path('scraping_tasks.json')
with open(tasks_file, 'w', encoding='utf-8') as f:
    json.dump(tasks, f, ensure_ascii=False, indent=2)

print(f"任务列表已保存: {tasks_file}")

# 生成任务说明文档
instructions_file = Path('爬取详细信息说明.md')
instructions_content = """# 获取详细营养信息说明

## 背景

已成功爬取 Taco Bell 营养信息主表格数据 (466个菜品)。
现需要获取每个菜品的详细信息,包括:

1. **完整 Nutrition Facts** - 美国标准营养成分表
2. **Allergen Information** - 过敏原信息
3. **Ingredients** - 完整成分列表

## 方法

### 方法一: 使用浏览器 MCP 工具 (推荐)

1. 打开营养信息页面: https://www.tacobell.com/nutrition/info
2. 使用 MCP 工具逐个点击菜品的 [more info] 链接
3. 从弹窗中提取详细信息
4. 保存到 JSON 文件

### 方法二: 手动爬取 (备选)

如果自动化困难,可以:
1. 手动访问页面
2. 点击 [more info]
3. 复制详细信息
4. 整理成结构化数据

### 方法三: Nutritionix API (如果可用)

Taco Bell 使用 Nutritionix 提供营养信息。如果有 API 访问权限:
1. 使用 Nutritionix API 查询菜品
2. 获取完整营养信息
3. 整合到现有数据

## 数据结构

期望的详细信息结构:

```json
{
  "name": "菜品名称",
  "nutrition_facts": {
    "serving_size": "1.5 oz",
    "servings_per_container": "1",
    "calories": "210",
    "calories_from_fat": "189",
    "total_fat": {
      "value": "21g",
      "daily_value": "27%"
    },
    "saturated_fat": {
      "value": "3g",
      "daily_value": "15%"
    },
    "trans_fat": "0g",
    "cholesterol": {
      "value": "10mg",
      "daily_value": "3%"
    },
    "sodium": {
      "value": "210mg",
      "daily_value": "9%"
    },
    "total_carbohydrates": {
      "value": "5g",
      "daily_value": "2%"
    },
    "dietary_fiber": {
      "value": "1g",
      "daily_value": "4%"
    },
    "sugars": "4g",
    "added_sugars": {
      "value": "4g",
      "daily_value": "8%"
    },
    "protein": "<1g",
    "vitamin_d": {
      "value": "0mcg",
      "daily_value": "0%"
    },
    "calcium": {
      "value": "10mg",
      "daily_value": "0%"
    },
    "iron": {
      "value": "0.3mg",
      "daily_value": "2%"
    },
    "potassium": {
      "value": "60mg",
      "daily_value": "2%"
    }
  },
  "allergens": {
    "eggs": "contains",
    "gluten": "does_not_contain",
    "milk": "does_not_contain",
    "fish": "does_not_contain",
    "shellfish": "does_not_contain",
    "tree_nuts": "does_not_contain",
    "peanuts": "does_not_contain",
    "wheat": "does_not_contain",
    "soy": "does_not_contain",
    "msg": "does_not_contain",
    "sesame": "does_not_contain"
  },
  "ingredients": "Soybean oil, water, tomato paste, sugar, distilled vinegar, egg yolks, contains 2% or less of: salt, chili peppers, chipotle peppers, spices, corn syrup, garlic powder, sodium acid sulfate, sodium benzoate and potassium sorbate (P), natural flavors, xanthan gum, propylene glycol alginate, fruit juice (VC), fruit juice concentrate (VC), disodium inosinate and disodium guanylate."
}
```

## 当前状态

- ✅ 主表格数据 (466个菜品) - 已完成
- ⏳ 详细营养信息 - 进行中
- ⏳ 过敏原信息 - 进行中
- ⏳ 成分列表 - 进行中

## 下一步

1. 测试 MCP 浏览器工具能否成功打开详情弹窗
2. 开发自动化脚本进行批量爬取
3. 或者采用备选方案 (手动/API)
4. 整合所有数据到最终文件

"""

with open(instructions_file, 'w', encoding='utf-8') as f:
    f.write(instructions_content)

print(f"说明文档已保存: {instructions_file}")

# 生成简化版任务清单 (前10个菜品作为测试)
test_items = items[:10]
print(f"\n建议先测试前 {len(test_items)} 个菜品:")
for idx, item in enumerate(test_items, 1):
    print(f"{idx}. {item['name']}")

print("\n提示: 使用 cursor-ide-browser MCP 工具逐个点击 [more info] 链接")
