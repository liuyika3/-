# Excel模板图片URL说明

## ✅ 已完善

Excel模板 `McDonald_Foods_Data_Template.xlsx` 现在包含**完整的图片URL示例**。

---

## 📸 图片URL详情

### 1️⃣ **主产品图片URL**

**字段**: `main_image_url` (在主表中)

**示例** (Big Mac):
```
https://s7d1.scene7.com/is/image/mcdonalds/DC_202002_0003-005_BigMac_832x472:1-3-product-tile-desktop
```

**说明**:
- 使用Adobe Scene7 CDN托管
- 高分辨率产品图(832x472px)
- URL格式: `DC_[年月]_[编号]_[产品名]_[尺寸]:[预设]`

---

### 2️⃣ **配料图片URL**

**字段**: `ingredient_image_url` (在配料表中)

**示例** (Big Mac的7个配料):

| 顺序 | 配料名称 | 图片URL |
|------|---------|---------|
| 1 | Big Mac Bun | `https://s7d1.scene7.com/is/image/mcdonalds/ingredient_big_mac_bun:product-ingredient` |
| 2 | 100% Beef Patty | `https://s7d1.scene7.com/is/image/mcdonalds/100_percent_beef_patty:product-ingredient` |
| 3 | Shredded Lettuce | `https://s7d1.scene7.com/is/image/mcdonalds/shredded_lettuce:product-ingredient` |
| 4 | Big Mac Sauce | `https://s7d1.scene7.com/is/image/mcdonalds/big_mac_sauce:product-ingredient` |
| 5 | American Cheese | `https://s7d1.scene7.com/is/image/mcdonalds/american_cheese_processed:product-ingredient` |
| 6 | Pickle Slices | `https://s7d1.scene7.com/is/image/mcdonalds/pickles:product-ingredient` |
| 7 | Onions | `https://s7d1.scene7.com/is/image/mcdonalds/reconstituted_onions:product-ingredient` |

**说明**:
- 每个食物有7张配料轮播图
- URL格式: `ingredient_[配料名]:product-ingredient`
- 图片为配料特写照片

---

## 📋 Excel工作表结构

新版Excel模板包含**6个工作表**:

### 1. **01_Master_主表**
- 包含 `main_image_url` 字段
- ✅ 已填写Big Mac主图URL

### 2. **02_Nutrition_营养成分**
- 26项营养指标
- 完整的DV%数据

### 3. **03_Ingredients_配料**
- 包含 `ingredient_image_url` 字段
- ✅ 已填写7张配料图片URL

### 4. **04_Allergens_过敏原**
- 过敏原追溯信息

### 5. **05_DataDict_数据字典**
- 字段说明和数据类型

### 6. **06_ImageURLs_图片URL** (新增)
- 图片URL完整列表
- 每个URL的说明和状态

---

## ⚠️ 重要说明

### **关于图片URL的来源**

1. **示例URL vs 实际URL**
   - 当前填写的URL是**示例格式**
   - 基于麦当劳CDN的标准命名规则推测
   - 实际爬取时会从页面**动态提取真实URL**

2. **为什么使用示例URL?**
   - 麦当劳网站使用**动态JavaScript**加载图片
   - 图片URL不在静态HTML中
   - 需要使用Playwright/Selenium等浏览器自动化工具才能获取

3. **实际爬取策略**
   ```python
   # 爬虫会执行以下操作:
   1. 访问产品详情页
   2. 等待页面完全加载
   3. 执行JavaScript提取图片元素
   4. 获取真实的src属性
   5. 保存到Excel
   ```

---

## 🎯 爬虫开发时的图片处理

### **步骤1: 提取主图**
```python
main_image = page.query_selector('.product-image img')
main_image_url = main_image.get_attribute('src')
```

### **步骤2: 提取配料图**
```python
# 点击轮播按钮,逐个获取配料图片
for i in range(1, 8):
    page.click(f'button[aria-label="{i}"]')
    time.sleep(0.5)
    img = page.query_selector('.ingredient-carousel img')
    ingredient_urls.append(img.get_attribute('src'))
```

### **步骤3: 验证URL有效性**
```python
response = requests.head(image_url)
if response.status_code == 200:
    print("✅ URL有效")
```

---

## 🚀 下一步行动

现在Excel模板已完善,包含:
- ✅ 完整的字段定义
- ✅ Big Mac示例数据
- ✅ 图片URL示例(8个)
- ✅ 数据字典
- ✅ 图片URL说明工作表

**可以开始编写爬虫代码了!**

---

**更新日期**: 2026-01-26  
**版本**: v2.0 (完善版)
