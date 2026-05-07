#!/usr/bin/env python3
"""
删除 generated_images 中与 Excel 不一致的重复图片。
规则：同一索引（文件名前 4 位数字）对应多张图时，仅保留 Restaurant_Foods_Master_Table.xlsx
中 local_image_path 记录的那张，其余删除。
"""

import os
import re
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MASTER_TABLE = os.path.join(BASE_DIR, 'Restaurant_Foods_Master_Table.xlsx')
IMAGE_DIR = os.path.join(BASE_DIR, 'generated_images')


def index_from_filename(name):
    m = re.match(r'^(\d{4})_', name)
    return int(m.group(1)) if m else None


def main():
    print('='*60)
    print('删除 generated_images 中与 Excel 不一致的重复图片')
    print('='*60)

    df = pd.read_excel(MASTER_TABLE)
    paths = df['local_image_path'].dropna().astype(str).str.strip()
    paths = paths[paths != '']
    # Excel 中指向 generated_images 的路径（统一用正斜杠）
    excel_paths = set(p.replace('\\', '/') for p in paths if 'generated_images' in p)
    # 索引 -> Excel 中该索引对应的规范路径（文件名部分）
    index_to_canonical = {}
    for p in excel_paths:
        # p 形如 "generated_images/0001_xxx.png"
        name = os.path.basename(p)
        idx = index_from_filename(name)
        if idx is not None:
            index_to_canonical[idx] = p

    print(f'\nExcel 中 generated_images 路径数: {len(excel_paths)}')
    print(f'涉及索引数: {len(index_to_canonical)}')

    if not os.path.isdir(IMAGE_DIR):
        print(f'目录不存在: {IMAGE_DIR}')
        return

    files = [f for f in os.listdir(IMAGE_DIR) if f.lower().endswith('.png')]
    print(f'generated_images 下 PNG 文件数: {len(files)}')

    to_delete = []
    for f in files:
        rel_path = os.path.join('generated_images', f).replace('\\', '/')
        idx = index_from_filename(f)
        if idx is None:
            continue
        if idx not in index_to_canonical:
            # Excel 里没有这个索引，不删（可能是未写入 Excel 的）
            continue
        canonical = index_to_canonical[idx]
        if rel_path != canonical:
            to_delete.append(os.path.join(IMAGE_DIR, f))

    print(f'\n将删除的重复文件数: {len(to_delete)}')
    if not to_delete:
        print('没有需要删除的重复文件。')
        return

    for path in to_delete:
        try:
            os.remove(path)
            print(f'  已删除: {os.path.basename(path)}')
        except Exception as e:
            print(f'  删除失败 {path}: {e}')

    print(f'\n完成，已删除 {len(to_delete)} 个重复文件。')
    print('='*60)


if __name__ == '__main__':
    main()
