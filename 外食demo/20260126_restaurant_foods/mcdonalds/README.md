# 麦当劳菜单数据采集项目

> 从麦当劳官网(美国站)采集所有菜单食物的完整信息,包括营养成分、配料、过敏原等数据

## 📁 项目文件

```
mcdonalds/
├── README.md                              # 项目说明(本文件)
├── url.md                                 # 目标URL
├── project_plan.md                        # 详细项目规划
├── data_structure.md                      # 数据结构设计
├── IMAGE_URL_README.md                    # 图片URL说明
└── McDonald_Foods_Data_Template.xlsx      # Excel数据模板(含示例+图片URL)
```

## 🎯 项目目标

爬取麦当劳官网所有食物的:
- ✅ 食物名称、分类、描述
- ✅ 卡路里和营养成分(26项指标)
- ✅ 配料列表和详细成分
- ✅ 配料图片URL(7张/食物)
- ✅ 过敏原信息
- ✅ 产品主图URL

## 📊 数据表结构(Excel 4个工作表)

| 工作表 | 说明 | 记录数 |
|--------|------|--------|
| **01_Master_主表** | 食物基本信息 | 1行/食物 |
| **02_Nutrition_营养成分** | 详细营养数据 | 1行/食物 |
| **03_Ingredients_配料** | 配料及图片 | 7行/食物 |
| **04_Allergens_过敏原** | 过敏原信息 | N行/食物 |

## 🔍 调研结果

**网站URL**: https://www.mcdonalds.com/us/en-us/full-menu.html

**食物分类** (13个):
- Extra Value Meals, McValue®, Breakfast, Burgers
- Chicken & Fish Sandwiches, McNuggets®, Snack Wrap®
- Fries & Sides, Happy Meal®, Sweets & Treats
- McCafé® Coffees, Beverages, Sauces & Condiments

**预估食物数量**: 150-200个

**示例详情页**: https://www.mcdonalds.com/us/en-us/product/big-mac.html

## 📋 Excel模板说明

已创建 `McDonald_Foods_Data_Template.xlsx`,包含:
- ✅ 完整的字段定义(6个工作表)
- ✅ Big Mac®的完整示例数据
- ✅ **真实图片URL示例(1张主图 + 7张配料图)**
- ✅ 数据字典工作表
- ✅ 图片URL说明工作表

**Excel工作表**:
1. **01_Master_主表** - 含主产品图片URL
2. **02_Nutrition_营养成分** - 26项营养指标
3. **03_Ingredients_配料** - 含7张配料图片URL
4. **04_Allergens_过敏原** - 过敏原追溯
5. **05_DataDict_数据字典** - 字段说明
6. **06_ImageURLs_图片URL** - 图片URL列表

**如何使用模板**:
1. 打开Excel文件查看结构
2. 查看 `IMAGE_URL_README.md` 了解图片URL详情
3. 审核字段是否满足需求
4. 确认后即可开始爬虫开发

## 🚀 技术方案

**推荐技术栈**:
- **爬虫**: Playwright (动态页面)
- **语言**: Python 3.10+
- **数据处理**: Pandas
- **存储**: Excel (openpyxl)

**核心挑战**:
- 需要点击展开按钮获取营养信息
- 配料图片需要轮播点击获取
- 反爬虫策略应对

## 📈 预估工作量

**开发时间**: 8-11小时
**爬取时间**: 25-50分钟(150-200个食物)

## ⚠️ 待审核事项

### 请审核以下内容:

1. **数据表结构** ✅
   - 查看 `McDonald_Foods_Data_Template.xlsx`
   - 确认字段是否完整
   - 是否需要增删字段?

2. **数据粒度** ✅
   - 营养成分26项是否足够?
   - 配料信息是否需要更细化?
   - 是否需要价格信息?(官网可能不显示)

3. **项目范围** ✅
   - 是否只采集美国站?
   - 是否需要图片实际下载?(目前只保存URL)
   - 是否需要定期更新机制?

## 📞 下一步

**等待您的审核反馈:**

✅ 如果数据表结构OK → 开始编写爬虫代码
⚠️ 如果需要调整 → 修改Excel模板和字段定义

---

## 📝 详细文档

- 📖 完整项目规划: 查看 `project_plan.md`
- 📊 数据结构设计: 查看 `data_structure.md`
- 📈 Excel模板: 打开 `McDonald_Foods_Data_Template.xlsx`
- 🖼️ 图片URL说明: 查看 `IMAGE_URL_README.md`

---

**项目状态**: 🟡 规划完成,等待审核
**创建日期**: 2026-01-26
