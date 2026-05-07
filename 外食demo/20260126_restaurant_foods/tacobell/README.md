# Taco Bell 菜单爬虫

## ⭐ 快速开始 (推荐)

**直接使用最终版爬虫,获取最完整的数据:**

```bash
python3 scraper_final.py
```

输出文件在 `output_final/` 目录:
- `tacobell_menu_final.xlsx` - Excel格式
- `tacobell_menu_final.csv` - CSV格式  
- `tacobell_menu_final.json` - JSON格式
- `images/` - 所有菜品图片(219张)

## 功能说明

本爬虫可以从 Taco Bell 官网爬取所有菜品的详细信息,包括:

### 爬取的数据字段

1. **基本信息**
   - 菜品名称 (name) ✅
   - 产品代码 (code) ✅
   - 分类 (category) ✅
   - 菜品详情链接 (url) ✅
   - 图片 URL (image_url) ✅
   - 本地图片路径 (image_path) ✅
   - 价格 (price) ✅
   - 描述 (description) ✅
   - 素食标记 (vegetarian) ✅

2. **营养信息**
   - Calories (calories) ✅
   - Serving size (serving_size) - 可选
   - Total fat (total_fat_g) - 可选
   - Saturated fat (saturated_fat_g) - 可选
   - Trans fat (trans_fat_g) - 可选
   - Cholesterol (cholesterol_mg) - 可选
   - Sodium (sodium_mg) - 可选
   - Total carbs (total_carbs_g) - 可选
   - Fiber (fiber_g) - 可选
   - Sugars (sugars_g) - 可选
   - Protein (protein_g) - 可选

**注**: 基本营养信息(卡路里)已100%获取。详细营养成分需要额外处理,可在代码中启用。

## 爬取结果

### 最新数据 (v1.0 - 2026-01-30)

- **总菜品数**: 219 个
- **分类数**: 18 个
- **数据完整度**: 100%
- **图片下载**: 219 张

### 分类统计

| 分类 | 菜品数 |
|------|-------|
| Sides & sweets | 32 |
| Drinks | 30 |
| Breakfast | 19 |
| Veggie cravings | 19 |
| Specialties | 15 |
| Tacos | 15 |
| 其他分类 | 89 |

## 安装依赖

```bash
pip install -r requirements.txt
```

## 爬虫版本对比

### ⭐ scraper_final.py - 最终版 (推荐)

**特点**:
- ✅ 直接调用官方 API
- ✅ 数据最完整(219个菜品)
- ✅ 速度最快(约2分钟)
- ✅ 100%数据完整度
- ✅ 自动下载所有图片

**使用方法**:
```bash
python3 scraper_final.py
```

**输出**: `output_final/` 目录

---

### scraper_api.py - API版本

**特点**:
- 使用 requests + BeautifulSoup
- 从网页HTML解析数据
- 获取147个菜品

**使用方法**:
```bash
python3 scraper_api.py
```

**输出**: `output/` 目录

---

### scraper.py - Selenium版本

**特点**:
- 使用 Selenium WebDriver
- 可处理动态内容
- 需要 ChromeDriver

**使用方法**:
```bash
python3 scraper.py
```

**额外依赖**:
```bash
brew install chromedriver  # macOS
```

## 使用方法

### 基本使用

```bash
python scraper.py
```

### 输出文件

爬取完成后,会在 `output` 目录下生成以下文件:

1. **tacobell_menu.json** - JSON 格式的原始数据
2. **tacobell_menu.xlsx** - Excel 格式的表格数据
3. **tacobell_menu.csv** - CSV 格式的表格数据
4. **images/** - 目录,包含所有下载的菜品图片
5. **scraper.log** - 爬虫运行日志

### 目录结构

```
tacobell/
├── scraper.py              # 主爬虫脚本
├── requirements.txt        # Python 依赖
├── README.md              # 说明文档
├── url_resources.md       # URL 资源列表
└── output/               # 输出目录(运行后生成)
    ├── tacobell_menu.json
    ├── tacobell_menu.xlsx
    ├── tacobell_menu.csv
    ├── scraper.log
    └── images/           # 菜品图片
        ├── Soft_Taco.jpg
        ├── Crunchy_Taco.jpg
        └── ...
```

## 爬取策略

1. **获取菜单分类**: 从主菜单页面获取所有分类(Tacos, Burritos, 等)
2. **遍历分类**: 访问每个分类页面,获取该分类下的所有菜品
3. **获取详情**: 访问每个菜品的详情页面
4. **提取信息**: 
   - 从详情页提取基本信息(名称、价格、描述、成分)
   - 点击"Nutrition Info"按钮,从弹窗中提取营养数据
5. **下载图片**: 下载每个菜品的图片到本地
6. **保存数据**: 将所有数据保存为 JSON、Excel、CSV 格式

## 注意事项

1. **爬取时间**: 完整爬取所有菜品可能需要较长时间(取决于菜品数量)
2. **网络稳定**: 确保网络连接稳定
3. **反爬机制**: 脚本已加入适当的延时,避免请求过快
4. **图片大小**: 图片会下载原图,可能占用较多磁盘空间
5. **Chrome版本**: 确保 ChromeDriver 版本与 Chrome 浏览器版本匹配

## 常见问题

### 1. ChromeDriver 版本不匹配

**错误信息:** `session not created: This version of ChromeDriver only supports Chrome version XX`

**解决方法:**
- 检查 Chrome 浏览器版本: `chrome://version/`
- 下载对应版本的 ChromeDriver

### 2. 网络超时

**错误信息:** `TimeoutException` 或 `Connection Error`

**解决方法:**
- 检查网络连接
- 增加 `WebDriverWait` 的超时时间
- 重新运行脚本(脚本会跳过已下载的图片)

### 3. 找不到元素

**错误信息:** `NoSuchElementException`

**原因:** 网站结构可能发生变化

**解决方法:**
- 检查网站是否可正常访问
- 可能需要更新 CSS 选择器

## 数据使用

爬取的数据可用于:
- 菜单分析
- 营养成分研究
- 价格比较
- 数据可视化

## 许可声明

本爬虫仅用于学习和研究目的。使用者应遵守 Taco Bell 网站的使用条款和相关法律法规。

## 更新日志

### v1.0.0 (2026-01-30)
- 初始版本
- 支持爬取所有菜单分类和菜品
- 支持营养信息提取
- 支持图片下载
- 支持多格式数据导出(JSON/Excel/CSV)
