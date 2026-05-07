# 扩展版总表（10+ 品牌）

## 生成方式

在 **20260126_restaurant_foods** 目录下执行：

```bash
python build_extended_master_table.py
```

会生成 **Restaurant_Foods_Master_Table_Extended.xlsx**。

## 数据来源（按优先级）

1. **现有总表**：`Restaurant_Foods_Master_Table.xlsx`（McDonald's, Taco Bell, Shake Shack）
2. **El Pollo Loco**：`El_Pollo_Loco/El_Pollo_Loco_Final_Complete.xlsx`（若存在且列可映射）
3. **sources/**：目录下任意 CSV/Excel，列名会尝试自动映射到总表（见 `sources/README.md`）
4. **内置样本**：若品牌数不足 10 家，脚本会自动补充 Burger King、Wendy's、KFC、Subway、Chipotle、Dunkin'、Starbucks、Pizza Hut、Domino's、Chick-fil-A 的示例行（每品牌数条），仅用于 demo 结构完整

## 使用扩展表跑 fat-loss-excel

- 将 `convert_excel_to_db.py` 中的 `EXCEL_PATH` 改为指向 `Restaurant_Foods_Master_Table_Extended.xlsx`（或复制扩展表到原路径并重命名为总表）。
- 重新执行 `npm run setup` 生成新的 SQLite，再 `npm start`。

## 列结构

与现有总表一致，见 `Restaurant_Foods_Master_Table_README.md`。核心列：`restaurant_name`, `food_name`, `calories`, `protein_g`, `total_fat_g`, `sodium_mg`, `total_carbs_g` 等。
