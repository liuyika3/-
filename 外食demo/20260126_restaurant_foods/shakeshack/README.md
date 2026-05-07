# Shake Shack 菜单数据采集项目

> 从 Shake Shack 官网采集所有菜单食物的完整信息：**图片（必下载）**、**描述(desc)**、**价格**、营养成分、过敏原

## 📁 项目文件

```
shakeshack/
├── README.md
├── scraper_browser.py           # 推荐：纯网页浏览爬虫，抓图片/desc/价格并下载图片
├── scraper.py                   # 仅营养数据（从 PDF 与既有 JSON 整合）
├── shakeshack_browser_data.json # 浏览器爬取结果（含图、desc、价格、营养）
├── ShakeShack_Browser_Data.xlsx # 同上，Excel
├── shakeshack_foods_data.json   # 营养数据 JSON
├── ShakeShack_Foods_Data.xlsx   # 营养数据 Excel
└── images/                      # 所有下载的菜品/轮播图片
```

## 🎯 项目目标

- ✅ **图片**：页面内图片全部下载到 `images/`
- ✅ **描述 (desc)**：轮播文案、产品描述
- ✅ **价格**：页面上能解析到的 $ 价格
- ✅ 食物名称、分类、卡路里与营养成分、过敏原（含与 PDF 的合并）

## 🔍 数据源

**菜单页面**: https://shakeshack.com/#/  
**营养与过敏**: https://shakeshack.com/sites/default/files/2026-01/_Master%20Nut%20%26%20Allergen%201.6.26.pdf

## 🚀 使用方法（纯网页浏览，不用 API）

```bash
# 推荐：抓首页 + 点餐页，图片必下载，并抓 desc、价格
python3 scraper_browser.py

# 仅抓首页（更快，图/desc/价格较少）：跳过点餐流程
DO_ORDER_FLOW=0 python3 scraper_browser.py
```

**说明**：`scraper_browser.py` 使用 Playwright 模拟浏览器访问，不调用任何 API。

## 📊 输出说明（scraper_browser.py）

- **01_Items**：菜品/展示项，含 `food_name`, `description`, `price`, `image_url`, `local_image_path` 及营养字段
- **02_Images**：本次抓到的图片及本地路径
- **03_Prices**：页面上解析到的价格

## 📈 数据字段

### 主表字段
- food_id: 食物ID
- food_name: 食物名称
- category: 分类
- calories: 卡路里
- total_fat_g: 总脂肪(克)
- saturated_fat_g: 饱和脂肪(克)
- trans_fat_g: 反式脂肪(克)
- cholesterol_mg: 胆固醇(毫克)
- sodium_mg: 钠(毫克)
- total_carbs_g: 总碳水化合物(克)
- fiber_g: 膳食纤维(克)
- sugars_g: 糖(克)
- protein_g: 蛋白质(克)
- allergens: 过敏原列表
- scraped_date: 采集日期

---

**项目状态**: 🟢 开发中
**创建日期**: 2026-01-28
