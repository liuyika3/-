#!/usr/bin/env python3
"""
构建扩展版餐厅营养总表：至少 10 个连锁品牌。
- 合并现有 Restaurant_Foods_Master_Table.xlsx（3 家）
- 合并 El Pollo Loco 数据
- 合并 sources/ 目录下 CSV/Excel（可选）
- 若不足 10 家，则从内置样本数据补充（Burger King, Wendy's, KFC 等）

输出：Restaurant_Foods_Master_Table_Extended.xlsx
"""

import os
import re
import glob

try:
    import pandas as pd
except ImportError:
    print("请先安装依赖:")
    print("  pip install pandas openpyxl")
    print("安装完成后重新运行本脚本。")
    raise SystemExit(1)

# 与现有总表一致的列（用于写入 Excel）
MASTER_COLUMNS = [
    "restaurant_name",
    "food_name",
    "calories",
    "protein_g",
    "total_fat_g",
    "sodium_mg",
    "total_carbs_g",
    "saturated_fat_g",
    "trans_fat_g",
    "cholesterol_mg",
    "fiber_g",
    "sugars_g",
    "food_id",
    "food_name_cn",
    "description",
    "allergens",
    "local_image_path",
    "scraped_date",
]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MASTER_PATH = os.path.join(SCRIPT_DIR, "Restaurant_Foods_Master_Table.xlsx")
EXTENDED_PATH = os.path.join(SCRIPT_DIR, "Restaurant_Foods_Master_Table_Extended.xlsx")
SOURCES_DIR = os.path.join(SCRIPT_DIR, "sources")
EL_POLLO_DIR = os.path.join(SCRIPT_DIR, "El_Pollo_Loco")


def _ensure_columns(df: pd.DataFrame) -> pd.DataFrame:
    """确保 df 含有 MASTER_COLUMNS，缺失列填空."""
    for col in MASTER_COLUMNS:
        if col not in df.columns:
            df[col] = None
    return df[[c for c in MASTER_COLUMNS if c in df.columns]]


def _normalize_numeric(val):
    if pd.isna(val):
        return None
    if isinstance(val, (int, float)):
        return float(val) if val == val else None  # NaN check
    s = str(val).strip().replace(",", ".")
    s = re.sub(r"^[<\s]*(\d+\.?\d*).*", r"\1", s)
    try:
        return float(s)
    except ValueError:
        return None


def load_existing_master() -> pd.DataFrame:
    """加载现有 3 家总表."""
    if not os.path.exists(MASTER_PATH):
        print(f"跳过（不存在）: {MASTER_PATH}")
        return pd.DataFrame()
    df = pd.read_excel(MASTER_PATH)
    for c in MASTER_COLUMNS:
        if c not in df.columns:
            df[c] = None
    df = df[[c for c in MASTER_COLUMNS if c in df.columns]]
    print(f"  已加载现有总表: {len(df)} 行, 品牌 {df['restaurant_name'].nunique()} 家")
    return df


def _map_el_pollo_row(row, col_map) -> dict:
    out = {c: None for c in MASTER_COLUMNS}
    out["restaurant_name"] = "El Pollo Loco"
    for excel_col, master_col in col_map.items():
        if master_col in out and excel_col in row.index:
            v = row[excel_col]
            if master_col in ("calories", "sodium_mg", "cholesterol_mg") and v is not None:
                try:
                    out[master_col] = int(_normalize_numeric(v))
                except (TypeError, ValueError):
                    out[master_col] = _normalize_numeric(v)
            elif master_col in ("protein_g", "total_fat_g", "total_carbs_g", "saturated_fat_g", "trans_fat_g", "fiber_g", "sugars_g") and v is not None:
                out[master_col] = _normalize_numeric(v)
            else:
                out[master_col] = v if pd.notna(v) else None
    return out


def load_el_pollo_loco() -> pd.DataFrame:
    """从 El_Pollo_Loco 目录下 Excel 加载，列名做兼容映射."""
    candidates = [
        os.path.join(EL_POLLO_DIR, "El_Pollo_Loco_Final_Complete.xlsx"),
        os.path.join(EL_POLLO_DIR, "El_Pollo_Loco_Complete.xlsx"),
        os.path.join(EL_POLLO_DIR, "El_Pollo_Loco_Menu_Final.xlsx"),
    ]
    for path in candidates:
        if not os.path.exists(path):
            continue
        try:
            df = pd.read_excel(path, sheet_name=0)
        except Exception as e:
            print(f"  读取失败 {path}: {e}")
            continue
        # 列名多种可能
        col_map = {}
        renames = {
            "Item": "food_name",
            "item": "food_name",
            "Name": "food_name",
            "name": "food_name",
            "Calories": "calories",
            "calories": "calories",
            "Protein": "protein_g",
            "protein": "protein_g",
            "Protein (g)": "protein_g",
            "Total Fat": "total_fat_g",
            "total_fat_g": "total_fat_g",
            "Total Fat (g)": "total_fat_g",
            "Sodium": "sodium_mg",
            "sodium_mg": "sodium_mg",
            "Sodium (mg)": "sodium_mg",
            "Carbs": "total_carbs_g",
            "Carbohydrates": "total_carbs_g",
            "total_carbs_g": "total_carbs_g",
            "Total Carbs (g)": "total_carbs_g",
            "Saturated Fat": "saturated_fat_g",
            "saturated_fat_g": "saturated_fat_g",
            "Fiber": "fiber_g",
            "fiber_g": "fiber_g",
            "Fiber (g)": "fiber_g",
            "Sugars": "sugars_g",
            "sugars_g": "sugars_g",
            "Cholesterol": "cholesterol_mg",
            "cholesterol_mg": "cholesterol_mg",
            "Description": "description",
            "description": "description",
        }
        for excel_col in df.columns:
            key = excel_col.strip() if isinstance(excel_col, str) else str(excel_col)
            if key in renames:
                col_map[excel_col] = renames[key]
            elif key in MASTER_COLUMNS:
                col_map[excel_col] = key
        if "food_name" not in [col_map.get(c) for c in df.columns]:
            # 用第一列作为名称
            first = df.columns[0]
            col_map[first] = "food_name"
        rows = []
        for _, row in df.iterrows():
            d = _map_el_pollo_row(row, col_map)
            if d.get("food_name") and (d.get("calories") is not None or d.get("protein_g") is not None):
                rows.append(d)
        if rows:
            out = pd.DataFrame(rows)
            for c in MASTER_COLUMNS:
                if c not in out.columns:
                    out[c] = None
            out = out[MASTER_COLUMNS]
            print(f"  已加载 El Pollo Loco: {path}, {len(out)} 行")
            return out
    print("  未找到可用的 El Pollo Loco Excel")
    return pd.DataFrame()


def load_sources_dir() -> pd.DataFrame:
    """加载 sources/ 下 CSV/Excel，列名需包含 restaurant_name 或首列为 brand，以及 food_name/item、calories、protein 等."""
    if not os.path.exists(SOURCES_DIR):
        return pd.DataFrame()
    frames = []
    for path in glob.glob(os.path.join(SOURCES_DIR, "*.csv")) + glob.glob(os.path.join(SOURCES_DIR, "*.xlsx")):
        try:
            if path.endswith(".csv"):
                df = pd.read_csv(path, encoding="utf-8", errors="ignore")
            else:
                df = pd.read_excel(path, sheet_name=0)
        except Exception as e:
            print(f"  跳过 {path}: {e}")
            continue
        # 统一列名映射（常见 Kaggle/MenuStat 命名）
        rename = {}
        for c in df.columns:
            c0 = str(c).strip().lower()
            if "restaurant" in c0 or c0 == "brand":
                rename[c] = "restaurant_name"
            elif c0 in ("item", "menu item", "product"):
                rename[c] = "food_name"
            elif c0 in ("name", "description") and "food_name" not in [rename.get(x) for x in df.columns]:
                rename[c] = "food_name"
            elif "calorie" in c0:
                rename[c] = "calories"
            elif "protein" in c0 and "g" in c0 or c0 == "protein":
                rename[c] = "protein_g"
            elif "total fat" in c0 or "fat" == c0:
                rename[c] = "total_fat_g"
            elif "sodium" in c0:
                rename[c] = "sodium_mg"
            elif "carb" in c0 or "carbohydrate" in c0:
                rename[c] = "total_carbs_g"
            elif "saturated" in c0:
                rename[c] = "saturated_fat_g"
            elif "fiber" in c0 or "fibre" in c0:
                rename[c] = "fiber_g"
            elif "sugar" in c0:
                rename[c] = "sugars_g"
            elif "cholesterol" in c0:
                rename[c] = "cholesterol_mg"
        df = df.rename(columns=rename)
        if "restaurant_name" not in df.columns and "food_name" in df.columns:
            # 从文件名推断品牌
            base = os.path.basename(path).lower()
            if "mcdonald" in base or "mcd" in base:
                df["restaurant_name"] = "McDonald's"
            elif "wendy" in base:
                df["restaurant_name"] = "Wendy's"
            elif "burger" in base or "bk" in base:
                df["restaurant_name"] = "Burger King"
            elif "kfc" in base:
                df["restaurant_name"] = "KFC"
            elif "subway" in base:
                df["restaurant_name"] = "Subway"
            elif "chipotle" in base:
                df["restaurant_name"] = "Chipotle"
            else:
                df["restaurant_name"] = "Unknown"
        if "food_name" not in df.columns:
            for c in ["Item", "item", "Name", "name", "Menu Item"]:
                if c in df.columns:
                    df["food_name"] = df[c]
                    break
        if "food_name" in df.columns and "restaurant_name" in df.columns:
            for col in MASTER_COLUMNS:
                if col not in df.columns:
                    df[col] = None
            df = df[MASTER_COLUMNS]
            frames.append(df)
            print(f"  已加载 sources: {os.path.basename(path)}, {len(df)} 行")
    if not frames:
        return pd.DataFrame()
    return pd.concat(frames, ignore_index=True)


def get_embedded_extra_brands() -> pd.DataFrame:
    """内置样本：补充至 10+ 品牌用的示例行（可被 Kaggle/MenuStat 替换）."""
    # 每个品牌若干行，列与 MASTER_COLUMNS 一致
    # 数据为示例值，仅用于 demo 结构完整
    samples = [
        ("Burger King", "Whopper", 657, 28, 37, 980, 49, 11, 1.5, 90, 2, 11),
        ("Burger King", "Chicken Fries (9 pc)", 390, 22, 22, 1080, 26, 4, 0, 95, 1, 0),
        ("Burger King", "Garden Side Salad", 25, 2, 1, 60, 4, 0, 0, 0, 1, 2),
        ("Wendy's", "Dave's Single", 590, 34, 34, 1100, 41, 12, 1.5, 105, 2, 9),
        ("Wendy's", "Grilled Chicken Sandwich", 370, 34, 10, 800, 42, 2, 0, 95, 3, 7),
        ("Wendy's", "Apple Pecan Salad (Half)", 340, 18, 18, 750, 28, 4, 0, 60, 5, 18),
        ("KFC", "Original Recipe Chicken (1 pc)", 390, 28, 24, 1040, 11, 5, 0, 135, 0, 0),
        ("KFC", "Grilled Chicken Breast", 220, 38, 7, 710, 0, 2, 0, 125, 0, 0),
        ("KFC", "Green Beans", 25, 1, 0, 370, 4, 0, 0, 0, 2, 0),
        ("Subway", "6\" Turkey Breast", 280, 18, 3.5, 800, 46, 1, 0, 45, 2, 7),
        ("Subway", "6\" Rotisserie Chicken", 350, 29, 7, 900, 45, 2, 0, 95, 3, 6),
        ("Subway", "Veggie Delite 6\"", 200, 8, 2.5, 280, 38, 0.5, 0, 0, 2, 5),
        ("Chipotle", "Chicken Bowl (standard)", 705, 48, 27, 1645, 62, 8, 0, 165, 16, 6),
        ("Chipotle", "Steak Salad", 445, 38, 24, 895, 18, 9, 0, 130, 6, 5),
        ("Chipotle", "Veggie Bowl", 605, 22, 32, 1615, 68, 10, 0, 0, 18, 8),
        ("Dunkin'", "Egg White Veggie Wake-Up Wrap", 290, 14, 12, 680, 28, 4, 0, 25, 2, 2),
        ("Dunkin'", "Turkey Sausage Sandwich", 430, 24, 21, 930, 35, 7, 0, 65, 1, 4),
        ("Dunkin'", "Oatmeal", 290, 8, 4, 150, 56, 0.5, 0, 0, 6, 18),
        ("Starbucks", "Spinach, Feta & Egg White Wrap", 290, 20, 10, 830, 31, 5, 0, 0, 3, 3),
        ("Starbucks", "Chicken & Maple Butter Sandwich", 500, 28, 24, 780, 46, 8, 0, 95, 2, 10),
        ("Starbucks", "Oatmeal", 160, 5, 2.5, 125, 28, 0.5, 0, 0, 4, 0),
        ("Pizza Hut", "2 Medium Slices Cheese", 380, 18, 14, 920, 42, 6, 0, 35, 2, 4),
        ("Pizza Hut", "Grilled Chicken Caesar Salad", 220, 28, 9, 680, 10, 3, 0, 75, 2, 3),
        ("Domino's", "Thin Crust Cheese (Medium 2 slices)", 280, 14, 10, 560, 36, 4, 0, 25, 2, 3),
        ("Domino's", "Chicken Habanero (2 pieces)", 160, 10, 8, 420, 10, 2, 0, 50, 0, 0),
        ("Chick-fil-A", "Grilled Chicken Sandwich", 320, 28, 5, 730, 40, 1, 0, 65, 2, 6),
        ("Chick-fil-A", "Market Salad", 540, 28, 35, 1020, 28, 8, 0, 145, 5, 18),
        ("Chick-fil-A", "Grilled Nuggets (8 ct)", 130, 22, 3, 440, 2, 0.5, 0, 65, 0, 0),
    ]
    rows = []
    for rn, fn, cal, p, f, sod, carb, sat, trans, chol, fib, sug in samples:
        rows.append({
            "restaurant_name": rn,
            "food_name": fn,
            "calories": cal,
            "protein_g": p,
            "total_fat_g": f,
            "sodium_mg": sod,
            "total_carbs_g": carb,
            "saturated_fat_g": sat,
            "trans_fat_g": trans,
            "cholesterol_mg": chol,
            "fiber_g": fib,
            "sugars_g": sug,
            "food_id": None,
            "food_name_cn": None,
            "description": None,
            "allergens": None,
            "local_image_path": None,
            "scraped_date": None,
        })
    return pd.DataFrame(rows)


def main():
    os.makedirs(SOURCES_DIR, exist_ok=True)
    all_dfs = []

    print("1. 加载现有总表 (McDonald's, Taco Bell, Shake Shack)...")
    df_master = load_existing_master()
    if len(df_master) > 0:
        all_dfs.append(df_master)

    print("2. 加载 El Pollo Loco...")
    df_el = load_el_pollo_loco()
    if len(df_el) > 0:
        all_dfs.append(df_el)

    print("3. 加载 sources/ 下 CSV/Excel...")
    df_sources = load_sources_dir()
    if len(df_sources) > 0:
        all_dfs.append(df_sources)

    brands_so_far = set()
    for d in all_dfs:
        if "restaurant_name" in d.columns:
            brands_so_far.update(d["restaurant_name"].dropna().unique().tolist())

    if len(brands_so_far) < 10:
        print("4. 品牌不足 10 家，加入内置样本数据...")
        df_extra = get_embedded_extra_brands()
        # 只加尚未出现的品牌
        extra_brands = {"Burger King", "Wendy's", "KFC", "Subway", "Chipotle", "Dunkin'", "Starbucks", "Pizza Hut", "Domino's", "Chick-fil-A"}
        to_add = extra_brands - brands_so_far
        if to_add:
            mask = df_extra["restaurant_name"].isin(to_add)
            all_dfs.append(df_extra.loc[mask])
            print(f"  已补充品牌: {sorted(to_add)}")
    else:
        print("4. 已满 10+ 家，跳过内置样本")

    if not all_dfs:
        print("无任何数据，退出")
        return
    out = pd.concat(all_dfs, ignore_index=True)
    for c in MASTER_COLUMNS:
        if c not in out.columns:
            out[c] = None
    out = out[MASTER_COLUMNS]
    out.to_excel(EXTENDED_PATH, index=False, sheet_name="Master")
    brands = out["restaurant_name"].dropna().unique()
    print(f"\n已生成: {EXTENDED_PATH}")
    print(f"总行数: {len(out)}, 品牌数: {len(brands)}")
    print("品牌列表:", sorted(brands.tolist()))


if __name__ == "__main__":
    main()
