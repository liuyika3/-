# 麦当劳菜单数据 - 使用指南

## 🎯 快速开始

### 最终数据文件

**主文件**: `McDonald_Foods_Playwright.xlsx` (58KB)

这是使用Playwright浏览器自动化爬取的完整数据,包含:
- ✅ 102个食物的完整信息
- ✅ 28项营养成分
- ✅ 354条配料记录
- ✅ 332条过敏原记录
- ✅ 114张本地图片

---

## 📊 Excel工作表说明

### 1. Foods_Master (主表)
**用途**: 查看所有食物的基本信息和营养摘要

**关键字段**:
- `food_name`: 食物名称
- `calories`: 卡路里
- `protein_g`, `total_carbs_g`, `total_fat_g`: 三大营养素
- `allergens`: 过敏原列表
- `local_image_path`: 本地图片路径

### 2. Nutrition (营养详情)
**用途**: 详细的28项营养成分分析

**包含**:
- 宏量营养素(蛋白质、碳水、脂肪等)
- 微量营养素(维生素、矿物质)
- 每日推荐摄入百分比(DV%)

### 3. Ingredients (配料表)
**用途**: 查看每个食物的配料详情

**包含**:
- 配料名称和顺序
- 详细成分列表
- 包含的过敏原

### 4. Allergens (过敏原表)
**用途**: 过敏原追溯和筛选

**可以**:
- 按过敏原类型筛选
- 追溯过敏原来源
- 查看哪些食物含特定过敏原

### 5. Statistics (统计)
**用途**: 数据完整度统计

---

## 🔍 常见使用场景

### 场景1: 查找低卡路里食物
1. 打开 `01_Foods_Master` 工作表
2. 对 `calories` 列排序
3. 筛选卡路里 < 300 的食物

### 场景2: 查找不含某种过敏原的食物
1. 打开 `04_Allergens` 工作表
2. 筛选 `allergen_type` 列,例如 `Milk`
3. 找到包含牛奶的食物ID
4. 在主表中排除这些食物

### 场景3: 对比不同汉堡的营养成分
1. 打开 `02_Nutrition` 工作表
2. 筛选 `food_name` 包含 "Burger" 的行
3. 对比各项营养指标

### 场景4: 查看食物的完整配料
1. 打开 `03_Ingredients` 工作表
2. 筛选 `food_name` 为目标食物
3. 按 `ingredient_order` 排序
4. 查看完整配料列表

---

## 📁 图片使用

### 主图片
位置: `images/` 文件夹
命名: `{food_id}.jpg`
示例: `images/big-mac.jpg`

### 在Excel中查看
1. 找到食物的 `local_image_path` 字段
2. 使用文件管理器打开对应路径
3. 或者使用Python/脚本批量处理

---

## 🐍 Python使用示例

### 读取Excel数据

```python
import pandas as pd

# 读取主表
df_master = pd.read_excel('McDonald_Foods_Playwright.xlsx', sheet_name='01_Foods_Master')

# 查看前5行
print(df_master.head())

# 筛选高蛋白食物
high_protein = df_master[df_master['protein_g'] > 20]
print(high_protein[['food_name', 'protein_g', 'calories']])
```

### 读取JSON数据

```python
import json

# 读取完整JSON
with open('foods_playwright_data.json', 'r', encoding='utf-8') as f:
    foods = json.load(f)

# 查看Big Mac的完整数据
big_mac = [f for f in foods if f['food_id'] == 'big-mac'][0]
print(json.dumps(big_mac, indent=2, ensure_ascii=False))
```

---

## 🔄 重新爬取数据

如果需要更新数据:

```bash
cd /path/to/mcdonalds
python3 scraper_playwright.py
```

**注意**: 
- 需要安装 playwright: `pip install playwright`
- 首次使用需要安装浏览器: `playwright install chromium`
- 爬取时间约15-20分钟

---

## 📞 文件清单

### 数据文件
- `McDonald_Foods_Playwright.xlsx` - **主要数据文件** ⭐
- `foods_playwright_data.json` - JSON格式原始数据
- `images/` - 114张食物图片

### 文档文件
- `FINAL_REPORT.md` - 完整爬取报告
- `README.md` - 项目说明
- `USAGE.md` - 本使用指南

### 脚本文件
- `scraper_playwright.py` - Playwright爬虫(推荐)
- `scraper.py` - 基础爬虫
- `update_nutrition.py` - 营养数据更新脚本

---

## ⚠️ 重要提示

1. **数据时效**: 爬取于2026-01-26,建议定期更新
2. **图片路径**: 使用相对路径,需在项目目录中访问
3. **营养数据**: 基于麦当劳官方数据,实际可能有差异
4. **过敏原**: 仅供参考,实际以门店提供信息为准

---

## 🎓 进阶使用

### 数据分析
- 使用Pandas进行营养成分分析
- 使用Matplotlib/Seaborn可视化
- 导入数据库进行复杂查询

### 应用开发
- 开发营养查询APP
- 创建过敏原筛选工具
- 构建菜单推荐系统

---

**更新日期**: 2026-01-26
**数据来源**: McDonald's US Official Website
