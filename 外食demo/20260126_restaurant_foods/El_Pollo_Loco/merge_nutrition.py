#!/usr/bin/env python3
"""
解析 El Pollo Loco 营养信息 PDF 并更新 Excel
"""

import pdfplumber
import pandas as pd
import re
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def parse_nutrition_pdf(pdf_path):
    """解析PDF提取营养信息"""
    nutrition_dict = {}

    try:
        with pdfplumber.open(pdf_path) as pdf:
            page = pdf.pages[0]
            text = page.extract_text()

            # 按行分割
            lines = text.split('\n')

            # 找到 FIRE-GRILLED CHICKEN 等分类
            current_section = None
            data_started = False

            for i, line in enumerate(lines):
                line = line.strip()

                # 识别分类标题
                if any(keyword in line for keyword in ['FIRE-GRILLED', 'SIDES', 'FEATURED', 'BURRITOS', 'BOWLS', 'TACOS', 'QUESADILLAS']):
                    current_section = line
                    data_started = True
                    logger.info(f"发现分类: {current_section}")
                    continue

                # 解析数据行
                if data_started and line:
                    # 尝试匹配营养数据行
                    # 格式: 名称 serving_size calories ... protein allergens
                    parts = line.split()

                    # 至少需要有名称和一些数字
                    if len(parts) >= 10:
                        try:
                            # 尝试找到第一个数字的位置
                            first_num_idx = None
                            for idx, part in enumerate(parts):
                                try:
                                    float(part)
                                    first_num_idx = idx
                                    break
                                except:
                                    continue

                            if first_num_idx:
                                # 名称是第一个数字之前的所有部分
                                name = ' '.join(parts[:first_num_idx])
                                # 数值部分
                                values = parts[first_num_idx:]

                                # 尝试解析营养数据
                                if len(values) >= 11:
                                    nutrition_dict[name] = {
                                        'serving_size': values[0] if len(values) > 0 else None,
                                        'calories': int(float(values[1])) if len(values) > 1 else None,
                                        'calories_from_fat': int(float(values[2])) if len(values) > 2 else None,
                                        'total_fat_g': float(values[3]) if len(values) > 3 else None,
                                        'saturated_fat_g': float(values[4]) if len(values) > 4 else None,
                                        'trans_fat_g': float(values[5]) if len(values) > 5 else None,
                                        'cholesterol_mg': int(float(values[6])) if len(values) > 6 else None,
                                        'sodium_mg': int(float(values[7])) if len(values) > 7 else None,
                                        'total_carbs_g': float(values[8]) if len(values) > 8 else None,
                                        'fiber_g': float(values[9]) if len(values) > 9 else None,
                                        'sugars_g': float(values[10]) if len(values) > 10 else None,
                                        'protein_g': float(values[11]) if len(values) > 11 else None,
                                    }
                                    logger.info(f"  解析: {name}")
                        except Exception as e:
                            logger.debug(f"跳过行: {line[:50]}... - {e}")
                            continue

        logger.info(f"\n总共解析了 {len(nutrition_dict)} 个菜品的营养信息")
        return nutrition_dict

    except Exception as e:
        logger.error(f"解析PDF失败: {e}")
        import traceback
        traceback.print_exc()
        return {}

def fuzzy_match_name(excel_name, pdf_names):
    """模糊匹配菜品名称"""
    excel_name_lower = excel_name.lower()

    # 清理名称
    excel_clean = re.sub(r'[^\w\s]', '', excel_name_lower)

    best_match = None
    best_score = 0

    for pdf_name in pdf_names:
        pdf_clean = re.sub(r'[^\w\s]', '', pdf_name.lower())

        # 计算相似度
        if excel_clean == pdf_clean:
            return pdf_name  # 完全匹配

        # 部分匹配
        if excel_clean in pdf_clean or pdf_clean in excel_clean:
            score = len(set(excel_clean.split()) & set(pdf_clean.split()))
            if score > best_score:
                best_score = score
                best_match = pdf_name

    return best_match if best_score > 0 else None

def update_excel_with_nutrition(excel_path, nutrition_dict, output_path):
    """将营养信息更新到Excel"""
    try:
        df = pd.read_excel(excel_path)
        logger.info(f"\n读取Excel: {len(df)} 条记录")

        matched_count = 0
        unmatched = []

        for idx, row in df.iterrows():
            food_name = row['food_name']

            # 尝试直接匹配
            if food_name in nutrition_dict:
                nutrition = nutrition_dict[food_name]
                matched_count += 1
            else:
                # 尝试模糊匹配
                matched_name = fuzzy_match_name(food_name, nutrition_dict.keys())
                if matched_name:
                    nutrition = nutrition_dict[matched_name]
                    matched_count += 1
                    logger.info(f"模糊匹配: '{food_name}' -> '{matched_name}'")
                else:
                    unmatched.append(food_name)
                    continue

            # 更新营养信息
            df.at[idx, 'serving_size'] = nutrition.get('serving_size')
            df.at[idx, 'calories'] = nutrition.get('calories')
            df.at[idx, 'total_fat_g'] = nutrition.get('total_fat_g')
            df.at[idx, 'saturated_fat_g'] = nutrition.get('saturated_fat_g')
            df.at[idx, 'trans_fat_g'] = nutrition.get('trans_fat_g')
            df.at[idx, 'cholesterol_mg'] = nutrition.get('cholesterol_mg')
            df.at[idx, 'sodium_mg'] = nutrition.get('sodium_mg')
            df.at[idx, 'total_carbs_g'] = nutrition.get('total_carbs_g')
            df.at[idx, 'fiber_g'] = nutrition.get('fiber_g')
            df.at[idx, 'sugars_g'] = nutrition.get('sugars_g')
            df.at[idx, 'protein_g'] = nutrition.get('protein_g')

        # 保存
        df.to_excel(output_path, index=False, engine='openpyxl')

        logger.info(f"\n{'='*60}")
        logger.info(f"✓ 成功匹配: {matched_count}/{len(df)} 条记录")
        logger.info(f"✓ 数据已保存: {output_path}")
        if unmatched:
            logger.info(f"\n未匹配的菜品 ({len(unmatched)}):")
            for name in unmatched[:20]:  # 只显示前20个
                logger.info(f"  - {name}")
        logger.info(f"{'='*60}")

    except Exception as e:
        logger.error(f"更新Excel失败: {e}")
        import traceback
        traceback.print_exc()

def main():
    pdf_path = "nutrition_guide.pdf"
    excel_path = "El_Pollo_Loco_Menu.xlsx"
    output_path = "El_Pollo_Loco_Menu_Final.xlsx"

    logger.info("="*60)
    logger.info("El Pollo Loco - 营养信息整合")
    logger.info("="*60)

    # 解析PDF
    nutrition_dict = parse_nutrition_pdf(pdf_path)

    if nutrition_dict:
        # 更新Excel
        update_excel_with_nutrition(excel_path, nutrition_dict, output_path)
    else:
        logger.error("未能从PDF提取营养数据")

if __name__ == "__main__":
    main()
