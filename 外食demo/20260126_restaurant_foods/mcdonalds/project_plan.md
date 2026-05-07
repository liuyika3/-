# 麦当劳菜单数据采集项目规划

## 📋 项目概述

**目标**: 爬取麦当劳官网(美国站)所有菜单食物的完整信息

**数据源**: https://www.mcdonalds.com/us/en-us/full-menu.html

**调研日期**: 2026-01-26

---

## 🔍 网站结构调研结果

### 1. 菜单分类结构
麦当劳官网将食物分为以下类别:
- ✅ Extra Value Meals (超值套餐)
- ✅ McValue® (麦当劳价值套餐)
- ✅ Breakfast (早餐)
- ✅ Burgers (汉堡)
- ✅ Chicken & Fish Sandwiches (鸡肉鱼类三明治)
- ✅ McNuggets® & McCrispy® Strips (麦乐鸡和脆鸡条)
- ✅ Snack Wrap® (小食卷)
- ✅ Fries & Sides (薯条和配菜)
- ✅ Happy Meal® (开心乐园餐)
- ✅ Sweets & Treats (甜品)
- ✅ McCafé® Coffees (咖啡)
- ✅ Beverages (饮料)
- ✅ Sauces & Condiments (酱料调味品)

### 2. 食物详情页包含的信息

以 Big Mac® 为例 (https://www.mcdonalds.com/us/en-us/product/big-mac.html):

#### ✅ 基本信息
- 食物名称: Big Mac®
- 卡路里: 580 Cal.
- 分类: Burgers
- 产品描述: 详细的营销文案
- 主产品图片: 高清大图

#### ✅ 配料信息 (Ingredients)
包含7个配料,每个配料有:
1. 配料名称 (如: Big Mac Bun)
2. 配料图片 (轮播展示)
3. 配料详细成分列表
4. 过敏原信息 (从成分中识别)

配料列表:
1. Big Mac Bun (面包)
2. 100% Beef Patty (牛肉饼)
3. Shredded Lettuce (生菜丝)
4. Big Mac Sauce (巨无霸酱)
5. Pasteurized Process American Cheese (美式芝士)
6. Pickle Slices (酸黄瓜片)
7. Onions (洋葱)

#### ✅ 营养成分 (Nutrition Facts)
需要点击"Nutrition Summary"展开,包含:

**宏量营养素:**
- Protein (蛋白质): 25g
- Total Carbs (碳水化合物): 45g (16% DV)
- Total Fat (脂肪): 34g (43% DV)
  - Saturated Fat (饱和脂肪): 11g (56% DV)
  - Trans Fat (反式脂肪): 1g
- Cholesterol (胆固醇): 85mg (28% DV)
- Dietary Fiber (膳食纤维): 3g (10% DV)
- Total Sugars (总糖): 7g
  - Added Sugars (添加糖): 5g (10% DV)

**微量营养素:**
- Vitamin D (维生素D): 0mcg (0% DV)
- Calcium (钙): 120mg (10% DV)
- Iron (铁): 4mg (25% DV)
- Potassium (钾): 370mg (8% DV)
- Sodium (钠): 1060mg (46% DV)

#### ✅ 过敏原信息 (Allergen Information)
需要点击"Allergen Information"展开
- 识别食物中包含的常见过敏原
- 从配料成分中提取(Contains / May Contain)

常见过敏原:
- Wheat (小麦)
- Milk (乳制品)
- Egg (鸡蛋)
- Soy (大豆)
- Sesame (芝麻)
- Fish (鱼类)
- Shellfish (贝类)
- Tree Nuts (坚果)
- Peanuts (花生)

---

## 🎯 技术实施方案

### 技术栈选择

**爬虫框架**: 
- **Selenium** 或 **Playwright** (推荐Playwright,更现代化)
- 原因: 页面动态加载,需要点击展开按钮

**编程语言**: Python 3.10+

**核心库**:
```python
playwright>=1.40.0  # 浏览器自动化
pandas>=2.0.0       # 数据处理
openpyxl>=3.1.0     # Excel读写
requests>=2.31.0    # 图片下载
beautifulsoup4>=4.12.0  # HTML解析(辅助)
```

### 爬取流程设计

```
第一步: 获取菜单列表
├─ 访问 full-menu.html
├─ 解析所有分类
└─ 提取所有食物链接和基本信息

第二步: 遍历每个食物详情页
├─ 访问食物详情页
├─ 等待页面完全加载
├─ 提取基本信息(名称、卡路里、描述、主图)
├─ 点击"Nutrition Summary"按钮展开
├─ 提取营养成分数据
├─ 点击"Allergen Information"按钮展开
├─ 提取过敏原信息
├─ 轮播点击配料图片
├─ 提取每个配料的图片URL
└─ 解析配料详细成分

第三步: 数据清洗和结构化
├─ 数值单位转换(g, mg, mcg统一)
├─ 过敏原提取和标准化
├─ URL验证
└─ 关系数据整理

第四步: 数据存储
├─ 保存到Excel(4个工作表)
├─ 保存原始JSON(备份)
└─ 可选: 批量下载图片
```

### 反爬策略应对

1. **请求延迟**: 每次请求间隔1-3秒随机延迟
2. **User-Agent轮换**: 模拟真实浏览器
3. **Headless模式**: 可选无头模式(调试时关闭)
4. **错误重试**: 网络异常自动重试(最多3次)
5. **断点续爬**: 保存进度,支持中断后继续

---

## 📊 数据存储结构

### Excel文件结构 (4个工作表)

#### 1️⃣ **Master主表** (01_Master_主表)
存储食物基本信息

| 字段 | 类型 | 说明 |
|------|------|------|
| food_id | TEXT | 唯一标识符 |
| food_name | TEXT | 英文名称 |
| food_name_cn | TEXT | 中文名称(待翻译) |
| category | TEXT | 分类 |
| product_url | TEXT | 详情页URL |
| main_image_url | TEXT | 主图URL |
| calories | INTEGER | 卡路里 |
| description | TEXT | 食物描述 |
| price | TEXT | 价格(如有) |
| availability | TEXT | 供应状态 |
| scraped_date | DATE | 爬取日期 |

#### 2️⃣ **Nutrition营养成分表** (02_Nutrition_营养成分)
存储详细营养数据(一对一关系)

包含26个营养指标字段:
- 蛋白质、碳水、脂肪等宏量营养素
- 维生素、矿物质等微量营养素
- 每项包含含量和DV%(每日推荐百分比)

#### 3️⃣ **Ingredients配料表** (03_Ingredients_配料)
存储配料信息(一对多关系)

| 字段 | 类型 | 说明 |
|------|------|------|
| food_id | TEXT | 关联主表 |
| ingredient_order | INTEGER | 配料顺序 |
| ingredient_name | TEXT | 配料名称 |
| ingredient_image_url | TEXT | 配料图片URL |
| ingredient_details | TEXT | 详细成分 |
| contains_allergens | TEXT | 包含的过敏原 |

#### 4️⃣ **Allergens过敏原表** (04_Allergens_过敏原)
存储过敏原信息(一对多关系)

| 字段 | 类型 | 说明 |
|------|------|------|
| food_id | TEXT | 关联主表 |
| allergen_type | TEXT | 过敏原类型 |
| allergen_source | TEXT | 来源配料 |
| severity | TEXT | 严重程度 |

---

## ⚙️ 代码模块设计

```
mcdonalds_scraper/
├── config.py              # 配置文件(URL、延迟、路径等)
├── scraper.py             # 核心爬虫类
├── parser.py              # 数据解析器
├── storage.py             # 数据存储(Excel/JSON)
├── utils.py               # 工具函数(重试、日志等)
├── main.py                # 主程序入口
└── requirements.txt       # 依赖包列表
```

### 核心类设计

```python
class McDonaldsScraper:
    """麦当劳菜单爬虫"""
    
    def __init__(self, headless=True):
        """初始化浏览器"""
        
    def get_menu_categories(self):
        """获取所有菜单分类"""
        
    def get_food_links(self, category):
        """获取分类下所有食物链接"""
        
    def scrape_food_detail(self, food_url):
        """爬取单个食物详情"""
        
    def extract_nutrition(self, page):
        """提取营养成分"""
        
    def extract_ingredients(self, page):
        """提取配料信息"""
        
    def extract_allergens(self, ingredients):
        """提取过敏原"""
        
    def save_data(self, data):
        """保存数据到Excel"""
```

---

## 📈 预估工作量

### 数据量估算
- 预估食物数量: **150-200个**
- 平均每个食物爬取时间: **10-15秒**
- 总爬取时间: **25-50分钟**

### 开发时间估算
1. **环境搭建**: 0.5小时
2. **爬虫核心开发**: 3-4小时
3. **数据解析和清洗**: 2-3小时
4. **测试和调试**: 2小时
5. **文档和优化**: 1小时

**总计**: 8-11小时

---

## 🚀 实施步骤

### Phase 1: 准备阶段 (已完成 ✅)
- [x] 网站结构调研
- [x] 数据表结构设计
- [x] Excel模板创建
- [x] 项目规划文档

### Phase 2: 开发阶段 (待进行)
- [ ] 搭建开发环境
- [ ] 编写爬虫核心代码
- [ ] 实现数据解析器
- [ ] 实现数据存储模块
- [ ] 单元测试

### Phase 3: 测试阶段
- [ ] 小规模测试(10个食物)
- [ ] 问题修复和优化
- [ ] 全量爬取测试

### Phase 4: 执行阶段
- [ ] 正式爬取所有数据
- [ ] 数据验证和清洗
- [ ] 图片批量下载(可选)
- [ ] 数据分析和可视化(可选)

---

## ⚠️ 注意事项

### 法律和道德
1. ✅ **遵守robots.txt**: 检查网站爬虫协议
2. ✅ **合理使用**: 仅用于个人学习/研究
3. ✅ **频率控制**: 避免对服务器造成压力
4. ⚠️ **版权尊重**: 图片仅保存URL,不用于商业用途

### 技术风险
1. **页面结构变更**: 官网改版可能导致选择器失效
2. **动态加载失败**: 网络不稳定可能影响数据完整性
3. **反爬虫机制**: 可能触发验证码或IP封禁

### 解决方案
- 使用CSS选择器和XPath双重定位
- 实现错误捕获和自动重试
- 添加日志记录便于调试
- 分批次爬取,避免一次性请求过多

---

## 📝 待审核内容

### 请审核以下内容:

1. ✅ **数据表结构是否合理?**
   - 4个工作表的字段设计
   - 主表和子表的关系设计
   - 是否有遗漏的重要字段?

2. ✅ **数据粒度是否符合需求?**
   - 营养成分是否需要更详细?
   - 配料信息是否需要进一步拆分?
   - 是否需要价格历史记录?

3. ✅ **技术方案是否可行?**
   - Playwright vs Selenium的选择
   - 数据存储格式(Excel vs Database)
   - 图片处理策略(URL vs 下载)

4. ✅ **项目范围是否明确?**
   - 是否只爬取美国站?
   - 是否需要其他国家/地区的数据?
   - 是否需要定期更新数据?

---

## 📞 下一步行动

**请您审核以上规划和Excel模板,确认以下问题:**

1. 数据表头是否满足需求?是否需要增加/删除字段?
2. 是否需要调整数据结构?
3. 确认后即可开始编写爬虫代码

**已生成的文件:**
- ✅ `data_structure.md` - 数据结构设计文档
- ✅ `McDonald_Foods_Data_Template.xlsx` - Excel模板(含示例数据)
- ✅ `project_plan.md` - 本项目规划文档

---

**项目状态**: 🟡 等待审核
**下一步**: 等待确认后开始Phase 2开发
