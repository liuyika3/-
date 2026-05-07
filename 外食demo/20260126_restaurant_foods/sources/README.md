# 扩展总表数据源 (sources)

将 CSV 或 Excel 放入此目录后，运行根目录下的 `build_extended_master_table.py` 会合并进 **Restaurant_Foods_Master_Table_Extended.xlsx**。

## 推荐数据来源（网上可获取）

| 来源 | 说明 | 链接/备注 |
|------|------|-----------|
| **MenuStat** | 多品牌年度营养数据 (Excel) | https://www.menustat.org/data.html 下载年度 xls，列名需在脚本中做映射 |
| **Kaggle - McDonald's** | 麦当劳全菜单营养 | https://www.kaggle.com/datasets/mcdonalds/nutrition-facts (menu.csv) |
| **Kaggle - Wendy's** | 温迪菜单营养 | https://www.kaggle.com/datasets/mattop/wendys-menu-nutrition-data |
| **Kaggle - 6 链** | McDonald's, Burger King, Wendy's, KFC, Taco Bell, Pizza Hut | 搜索 "fast food nutrition" 等 |

## 列名要求（与总表一致）

放入本目录的文件需包含以下列（或可被脚本自动映射的列名）：

- **restaurant_name**（或文件名/内容可推断品牌）
- **food_name**（或 Item / Name / Menu Item）
- **calories**
- **protein_g**
- **total_fat_g**
- **sodium_mg**
- **total_carbs_g**

可选：saturated_fat_g, trans_fat_g, cholesterol_mg, fiber_g, sugars_g, description, local_image_path 等。

脚本会尝试常见英文列名（如 Protein → protein_g, Total Fat → total_fat_g, Sodium → sodium_mg）自动映射；若品牌无法从列中识别，会尝试从**文件名**推断（如 `wendys.csv` → Wendy's）。

## 使用步骤

1. 从上述链接下载 CSV/Excel，放入 `sources/`。
2. 在项目根目录执行：  
   `python build_extended_master_table.py`
3. 生成结果：`Restaurant_Foods_Master_Table_Extended.xlsx`（至少 10 个品牌，不足时用内置样本补足）。
