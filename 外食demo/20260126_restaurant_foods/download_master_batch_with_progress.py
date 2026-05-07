#!/usr/bin/env python3
"""
带进度的 Master Table Batch 结果下载脚本。
显示：作业状态、下载进度提示、保存图片进度（当前/总数、百分比）。
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
WAIT_INTERVAL = 60


def sanitize_filename(s):
    s = re.sub(r'[^\w\s\-]', '', s)
    s = re.sub(r'\s+', '_', s).strip('_')
    return s[:80] if s else 'unknown'


def download_with_retry(client, file_name, max_retries=3):
    for attempt in range(max_retries):
        try:
            sys.stdout.write('    正在下载结果文件（约 10–30MB，请稍候）... ')
            sys.stdout.flush()
            content = client.files.download(file=file_name)
            print(f'完成 ({len(content) / 1024 / 1024:.1f} MB)')
            sys.stdout.flush()
            return content
        except Exception as e:
            print(f'\n    下载失败 (尝试 {attempt+1}/{max_retries}): {e}')
            if attempt < max_retries - 1:
                time.sleep((attempt + 1) * 10)
    raise RuntimeError('下载失败')


def wait_for_jobs(client, jobs):
    print('\n[等待] 轮询 Batch 作业状态（每 60 秒）...')
    while True:
        states = []
        for j in jobs:
            job = client.batches.get(name=j['job_name'])
            states.append(job.state.name)
            print(f'  {j["job_name"]}: {job.state.name}')
        if all(s == 'JOB_STATE_SUCCEEDED' for s in states):
            print('  全部完成！\n')
            return True
        if any(s == 'JOB_STATE_FAILED' for s in states):
            print('  存在失败作业，继续处理已完成的。\n')
            return False
        print(f'  下次检查: {WAIT_INTERVAL} 秒后\n')
        sys.stdout.flush()
        time.sleep(WAIT_INTERVAL)


def main():
    do_wait = '--wait' in sys.argv

    print('='*80)
    print('下载 Batch 结果并更新 Master Table（带进度）')
    print('='*80)

    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print('错误: 请设置 GEMINI_API_KEY 环境变量')
        return 1

    if not os.path.exists(BATCH_JOBS_FILE):
        print(f'错误: 未找到 {BATCH_JOBS_FILE}，请先运行 batch_generate_master_images.py')
        return 1

    with open(BATCH_JOBS_FILE, 'r', encoding='utf-8') as f:
        meta = json.load(f)

    n_total = meta['total']
    jobs = meta['jobs']
    client = genai.Client(api_key=api_key)

    if do_wait:
        wait_for_jobs(client, jobs)

    df = pd.read_excel(MASTER_TABLE)
    empty_mask = df['local_image_path'].isna() | (df['local_image_path'].astype(str).str.strip() == '')
    to_gen = df[empty_mask].copy()
    to_gen['_orig_index'] = to_gen.index
    to_gen = to_gen.reset_index(drop=True)

    path_by_idx = {}
    os.makedirs(OUTPUT_IMAGE_DIR, exist_ok=True)

    total_saved = 0
    total_in_batches = sum(j['batch_end'] - j['batch_start'] for j in jobs)

    for job_i, job_info in enumerate(jobs):
        job_name = job_info['job_name']
        batch_start = job_info['batch_start']
        batch_end = job_info['batch_end']
        batch_count = batch_end - batch_start

        print(f'\n[作业 {job_i+1}/{len(jobs)}] 批次 {batch_start+1}–{batch_end}（共 {batch_count} 条）')
        sys.stdout.flush()

        job = client.batches.get(name=job_name)
        if job.state.name != 'JOB_STATE_SUCCEEDED':
            print(f'    状态: {job.state.name}，跳过')
            sys.stdout.flush()
            continue

        result_file = job.dest.file_name
        content = download_with_retry(client, result_file)
        sys.stdout.flush()

        lines = [L for L in content.decode('utf-8').splitlines() if L.strip()]
        saved_in_batch = 0
        for line_i, line in enumerate(lines):
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
                                saved_in_batch += 1
                                total_saved += 1
                                break
            except Exception:
                pass

            # 进度：每 10 条或最后一条打印一次
            current = line_i + 1
            if current % 10 == 0 or current == len(lines):
                pct = 100 * total_saved / n_total if n_total else 0
                print(f'    保存图片进度: {total_saved}/{n_total} ({pct:.0f}%)  [本批已保存: {saved_in_batch}]')
                sys.stdout.flush()

        print(f'    本作业完成，本批保存: {saved_in_batch} 张，累计: {total_saved} 张')
        sys.stdout.flush()

    print('\n[更新 Excel] 写入 local_image_path...')
    sys.stdout.flush()
    for idx, rel_path in path_by_idx.items():
        orig_index = to_gen.iloc[idx]['_orig_index']
        df.at[orig_index, 'local_image_path'] = rel_path

    df.to_excel(MASTER_TABLE, index=False)
    print(f'    已保存: {MASTER_TABLE}')

    print(f'\n{"="*80}')
    print(f'全部完成！成功: {len(path_by_idx)} 张，图片目录: {OUTPUT_IMAGE_DIR}')
    print(f'{"="*80}')
    sys.stdout.flush()
    return 0


if __name__ == '__main__':
    sys.exit(main())
