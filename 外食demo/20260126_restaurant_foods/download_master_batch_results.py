#!/usr/bin/env python3
"""
下载 Master Table 批量图片生成结果，保存图片并更新 Excel 中的 local_image_path。
依赖 batch_generate_master_images.py 生成的 batch_jobs_master.json。

用法:
  python3 download_master_batch_results.py          # 仅处理已完成的作业
  python3 download_master_batch_results.py --wait   # 等待所有作业完成后下载并更新 Excel
"""

import os
import sys
import json
import base64
import pandas as pd
from google import genai
from PIL import Image
from io import BytesIO
from datetime import datetime
import time
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MASTER_TABLE = os.path.join(BASE_DIR, 'Restaurant_Foods_Master_Table.xlsx')
OUTPUT_IMAGE_DIR = os.path.join(BASE_DIR, 'generated_images')
BATCH_JOBS_FILE = os.path.join(BASE_DIR, 'batch_jobs_master.json')
WAIT_INTERVAL = 60  # 轮询间隔（秒）


def sanitize_filename(s):
    s = re.sub(r'[^\w\s\-]', '', s)
    s = re.sub(r'\s+', '_', s).strip('_')
    return s[:80] if s else 'unknown'


def download_with_retry(client, file_name, max_retries=3):
    for attempt in range(max_retries):
        try:
            content = client.files.download(file=file_name)
            return content
        except Exception as e:
            print(f'    下载失败 (尝试 {attempt+1}/{max_retries}): {e}')
            if attempt < max_retries - 1:
                time.sleep((attempt + 1) * 10)
    raise RuntimeError('下载失败')


def wait_for_jobs(client, jobs):
    """等待所有作业完成"""
    print('\n等待所有 Batch 作业完成（每 60 秒检查一次）...')
    while True:
        states = []
        for j in jobs:
            job = client.batches.get(name=j['job_name'])
            states.append(job.state.name)
            print(f'  {j["job_name"]}: {job.state.name}')
        if all(s == 'JOB_STATE_SUCCEEDED' for s in states):
            print('  全部完成！')
            return True
        if any(s == 'JOB_STATE_FAILED' for s in states):
            print('  存在失败作业，继续处理已完成的。')
            return False
        print(f'  下次检查: {WAIT_INTERVAL} 秒后\n')
        time.sleep(WAIT_INTERVAL)


def main():
    do_wait = '--wait' in sys.argv
    
    print('='*80)
    print('下载 Batch 结果并更新 Master Table')
    print('='*80)
    
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print('错误: 请设置 GEMINI_API_KEY')
        return
    
    if not os.path.exists(BATCH_JOBS_FILE):
        print(f'错误: 未找到 {BATCH_JOBS_FILE}，请先运行 batch_generate_master_images.py')
        return
    
    with open(BATCH_JOBS_FILE, 'r', encoding='utf-8') as f:
        meta = json.load(f)
    
    n_total = meta['total']
    jobs = meta['jobs']
    client = genai.Client(api_key=api_key)
    
    if do_wait:
        wait_for_jobs(client, jobs)
    
    # 读取总表，获取待更新行的原始索引与名称信息
    df = pd.read_excel(MASTER_TABLE)
    empty_mask = df['local_image_path'].isna() | (df['local_image_path'].astype(str).str.strip() == '')
    to_gen = df[empty_mask].copy()
    to_gen['_orig_index'] = to_gen.index
    to_gen = to_gen.reset_index(drop=True)
    
    # 用于回写: path_by_idx[i] = 相对路径
    path_by_idx = {}
    
    os.makedirs(OUTPUT_IMAGE_DIR, exist_ok=True)
    
    for j, job_info in enumerate(jobs):
        job_name = job_info['job_name']
        batch_start = job_info['batch_start']
        batch_end = job_info['batch_end']
        
        print(f'\n处理作业 {j+1}/{len(jobs)}: {batch_start+1}-{batch_end}...')
        
        job = client.batches.get(name=job_name)
        if job.state.name != 'JOB_STATE_SUCCEEDED':
            print(f'   跳过（状态: {job.state.name}）')
            continue
        
        result_file = job.dest.file_name
        print('   下载结果...')
        content = download_with_retry(client, result_file)
        
        # 解析 JSONL，保存图片并记录路径
        for line in content.decode('utf-8').splitlines():
            if not line.strip():
                continue
            try:
                data = json.loads(line)
                key = data.get('key', '')
                if not key or '-' not in key:
                    continue
                idx = int(key.split('-')[1])
                if idx < 0 or idx >= n_total:
                    continue
                
                row = to_gen.iloc[idx]
                restaurant = row['restaurant_name']
                food_name = row['food_name']
                
                if 'response' in data and data['response']:
                    candidates = data['response'].get('candidates', [])
                    if candidates:
                        parts = candidates[0].get('content', {}).get('parts', [])
                        for part in parts:
                            if 'inlineData' in part:
                                img_data = base64.b64decode(part['inlineData'].get('data', ''))
                                img = Image.open(BytesIO(img_data))
                                
                                r_slug = sanitize_filename(str(restaurant))
                                f_slug = sanitize_filename(str(food_name))
                                ts = datetime.now().strftime('%Y%m%d_%H%M%S')
                                filename = f'{idx:04d}_{r_slug}_{f_slug}_{ts}.png'
                                rel_path = os.path.join('generated_images', filename)
                                filepath = os.path.join(BASE_DIR, rel_path)
                                
                                img.save(filepath)
                                path_by_idx[idx] = rel_path.replace('\\', '/')
                                print(f'   ✓ [{idx}] {food_name[:50]}')
                                break
                        else:
                            print(f'   ✗ [{idx}] 无图片数据')
                    else:
                        print(f'   ✗ [{idx}] 无候选')
                elif 'error' in data:
                    print(f'   ✗ [{idx}] 错误')
            except Exception as e:
                print(f'   ✗ 解析行出错: {e}')
    
    # 回写 Excel
    print('\n更新 Excel...')
    for idx, rel_path in path_by_idx.items():
        orig_index = to_gen.iloc[idx]['_orig_index']
        df.at[orig_index, 'local_image_path'] = rel_path
    
    df.to_excel(MASTER_TABLE, index=False)
    print(f'   已保存: {MASTER_TABLE}')
    
    print(f'\n{"="*80}')
    print(f'完成！成功生成并写入路径: {len(path_by_idx)} 张')
    print(f'图片目录: {OUTPUT_IMAGE_DIR}')
    print(f'{"="*80}')


if __name__ == '__main__':
    main()
