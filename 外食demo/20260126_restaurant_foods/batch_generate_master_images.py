#!/usr/bin/env python3
"""
为 Restaurant_Foods_Master_Table.xlsx 中 local_image_path 为空的记录
使用 Gemini 2.5 Flash Image Batch API 生成图片，保存到本地并回写 Excel。

Prompt 使用: generate_food_pic_prompt.md
"""

import os
import json
import base64
import pandas as pd
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO
from datetime import datetime
import time
import re

# 路径配置（相对本脚本所在目录）
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MASTER_TABLE = os.path.join(BASE_DIR, 'Restaurant_Foods_Master_Table.xlsx')
PROMPT_TEMPLATE_FILE = os.path.join(BASE_DIR, 'generate_food_pic_prompt.md')
OUTPUT_IMAGE_DIR = os.path.join(BASE_DIR, 'generated_images')
BATCH_SIZE = 100  # 每批最多 100 条，避免单次请求过大
BATCH_JOBS_FILE = os.path.join(BASE_DIR, 'batch_jobs_master.json')


def load_prompt_template():
    with open(PROMPT_TEMPLATE_FILE, 'r', encoding='utf-8') as f:
        return f.read()


def build_prompt(template, restaurant_name, food_name):
    return template.replace('{{restaurant_name}}', restaurant_name).replace('{{food_name}}', food_name)


def sanitize_filename(s):
    s = re.sub(r'[^\w\s\-]', '', s)
    s = re.sub(r'\s+', '_', s).strip('_')
    return s[:80] if s else 'unknown'


def main():
    print('='*80)
    print('Master Table 缺图记录 - Batch 图片生成')
    print('='*80)
    
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print('错误: 请设置环境变量 GEMINI_API_KEY')
        return
    
    # 1. 读取总表，筛选 local_image_path 为空的记录
    print('\n1. 读取总表...')
    df = pd.read_excel(MASTER_TABLE)
    empty_mask = df['local_image_path'].isna() | (df['local_image_path'].astype(str).str.strip() == '')
    to_gen = df[empty_mask].copy()
    to_gen['_orig_index'] = to_gen.index
    to_gen = to_gen.reset_index(drop=True)
    
    n_total = len(to_gen)
    print(f'   待生成图片数量: {n_total}')
    if n_total == 0:
        print('   没有需要生成的记录，退出。')
        return
    
    template = load_prompt_template()
    os.makedirs(OUTPUT_IMAGE_DIR, exist_ok=True)
    
    # 2. 按批创建 JSONL 并提交 Batch 作业
    jobs = []
    client = genai.Client(api_key=api_key)
    
    for batch_start in range(0, n_total, BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, n_total)
        batch_slice = to_gen.iloc[batch_start:batch_end]
        
        input_file = os.path.join(BASE_DIR, f'batch_input_master_{batch_start}_{batch_end}.jsonl')
        
        print(f'\n2.{len(jobs)+1} 创建并提交批次 {batch_start+1}-{batch_end}...')
        
        with open(input_file, 'w', encoding='utf-8') as f:
            for i, (_, row) in enumerate(batch_slice.iterrows()):
                idx = batch_start + i
                prompt = build_prompt(template, row['restaurant_name'], row['food_name'])
                req = {
                    "key": f"idx-{idx}",
                    "request": {
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generation_config": {"responseModalities": ["IMAGE"]}
                    }
                }
                f.write(json.dumps(req, ensure_ascii=False) + '\n')
        
        # 上传并创建作业
        uploaded = client.files.upload(
            file=input_file,
            config=types.UploadFileConfig(
                mime_type='application/jsonl',
                display_name=f'master_images_{batch_start}_{batch_end}_{datetime.now().strftime("%Y%m%d%H%M%S")}'
            )
        )
        job = client.batches.create(
            model='gemini-2.5-flash-image',
            src=uploaded.name,
            config={'display_name': f'MasterTable_Images_{batch_start}_{batch_end}'}
        )
        jobs.append({
            'job_name': job.name,
            'batch_start': batch_start,
            'batch_end': batch_end,
            'input_file': input_file
        })
        print(f'   作业已创建: {job.name}')
    
    # 保存作业列表，供下载脚本使用
    with open(BATCH_JOBS_FILE, 'w', encoding='utf-8') as f:
        json.dump({
            'total': n_total,
            'jobs': jobs,
            'created_at': datetime.now().isoformat()
        }, f, indent=2)
    
    print(f'\n   已提交 {len(jobs)} 个 Batch 作业，信息已保存到: {BATCH_JOBS_FILE}')
    print('\n请等待约 5–10 分钟后运行下载脚本:')
    print('  python3 download_master_batch_results.py')
    print('='*80)


if __name__ == '__main__':
    main()
