#!/usr/bin/env python3
"""
使用 MCP 浏览器工具批量爬取详细信息
这个脚本将生成 MCP 命令序列供执行
"""

import json
from pathlib import Path

# 读取 ref 映射
with open('more_info_refs.json', 'r', encoding='utf-8') as f:
    ref_map = json.load(f)

# 读取主表格数据
with open('nutrition_table_data.json', 'r', encoding='utf-8') as f:
    main_data = json.load(f)

print(f"总共 {len(ref_map)} 个菜品待爬取")
print(f"主表格数据: {len(main_data)} 个菜品")

# 生成爬取脚本
output_dir = Path('detailed_data')
output_dir.mkdir(exist_ok=True)

print(f"\n输出目录: {output_dir.absolute()}")
print("\n开始批量爬取...")
print("=" * 70)

# 为每个菜品生成爬取指令
for idx, ref_item in enumerate(ref_map[:20], 1):  # 先爬取前20个作为测试
    name = ref_item['name']
    ref = ref_item['ref']
    
    print(f"\n[{idx}/20] {name}")
    print(f"  Ref: {ref}")
    print(f"  操作:")
    print(f"    1. browser_click(ref='{ref}')")
    print(f"    2. browser_wait_for(text='Nutrition Facts')")
    print(f"    3. browser_snapshot() -> 提取数据")
    print(f"    4. browser_click(ref='close_button') -> 关闭对话框")

print("\n" + "=" * 70)
print("由于 MCP 工具需要逐个手动调用,这里提供了前20个菜品的爬取指令")
print("实际执行需要通过 Cursor MCP 工具逐个点击")
print("\n建议: 使用 Playwright 自动化脚本进行批量爬取")
