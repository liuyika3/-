#!/usr/bin/env python3
"""
解析 El Pollo Loco 营养信息 PDF
并更新 Excel 文件
"""

import pdfplumber
import pandas as pd
import re
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def parse_nutrition_pdf(pdf_path):
    """解析PDF提取营养信息"""
    nutrition_data = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            logger.info(f"PDF总页数: {len(pdf.pages)}")

            for page_num, page in enumerate(pdf.pages, 1):
                logger.info(f"处理第 {page_num} 页...")

                # 提取表格
                tables = page.extract_tables()

                if tables:
                    for table_idx, table in enumerate(tables):
                        logger.info(f"  找到表格 {table_idx + 1}, 行数: {len(table)}")

                        # 显示前几行以便调试
                        for i, row in enumerate(table[:5]):
                            logger.info(f"    行 {i}: {row}")

                        nutrition_data.append({
                            'page': page_num,
                            'table_index': table_idx,
                            'data': table
                        })

                # 也提取纯文本以备用
                text = page.extract_text()
                if text:
                    lines = text.split('\n')[:10]  # 只显示前10行
                    logger.info(f"  页面文本预览: {lines}")

        return nutrition_data

    except Exception as e:
        logger.error(f"解析PDF失败: {e}")
        return []

def update_excel_with_nutrition(excel_path, nutrition_data, output_path):
    """将营养信息更新到Excel"""
    try:
        # 读取现有Excel
        df = pd.read_excel(excel_path)
        logger.info(f"读取Excel: {len(df)} 条记录")

        # TODO: 根据PDF结构匹配和更新营养信息
        # 这需要先查看PDF的实际结构

        # 保存更新后的Excel
        df.to_excel(output_path, index=False, engine='openpyxl')
        logger.info(f"已保存到: {output_path}")

    except Exception as e:
        logger.error(f"更新Excel失败: {e}")

def main():
    pdf_path = "nutrition_guide.pdf"
    excel_path = "El_Pollo_Loco_Menu.xlsx"
    output_path = "El_Pollo_Loco_Menu_With_Nutrition.xlsx"

    logger.info("="*60)
    logger.info("开始解析营养信息PDF")
    logger.info("="*60)

    # 解析PDF
    nutrition_data = parse_nutrition_pdf(pdf_path)

    if nutrition_data:
        logger.info(f"\n从PDF中提取了 {len(nutrition_data)} 个表格")

        # 保存原始提取数据用于调试
        with open('nutrition_data_raw.txt', 'w', encoding='utf-8') as f:
            for item in nutrition_data:
                f.write(f"\n\n=== 第 {item['page']} 页, 表格 {item['table_index']+1} ===\n")
                for row in item['data']:
                    f.write(f"{row}\n")

        logger.info("原始数据已保存到 nutrition_data_raw.txt")
        logger.info("请查看该文件以了解PDF结构，然后继续开发匹配逻辑")
    else:
        logger.warning("未能从PDF中提取数据")

if __name__ == "__main__":
    main()
