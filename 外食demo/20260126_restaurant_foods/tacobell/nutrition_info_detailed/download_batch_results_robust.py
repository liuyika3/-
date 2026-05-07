#!/usr/bin/env python3
"""
稳健的 Batch 结果下载脚本
增加超时处理和重试机制
支持命令行参数指定作业和范围
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

# 默认配置
DEFAULT_BATCH_JOB = 'batches/klrsu991dls0e1c1en8vqga62y8d8x57qpu5'
DEFAULT_START_IDX = 1
DEFAULT_END_IDX = 10

OUTPUT_DIR = 'generated_pics'
EXCEL_FILE = 'tacobell_nutrition_info.xlsx'

# 解析命令行参数
if len(sys.argv) >= 2:
    BATCH_JOB_NAME = sys.argv[1]
else:
    BATCH_JOB_NAME = DEFAULT_BATCH_JOB

if len(sys.argv) >= 4:
    START_IDX = int(sys.argv[2])
    END_IDX = int(sys.argv[3])
else:
    START_IDX = DEFAULT_START_IDX
    END_IDX = DEFAULT_END_IDX

def sanitize_filename(name):
    """清理文件名中的非法字符"""
    return "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in name).strip()

def download_with_retry(client, file_name, max_retries=3):
    """带重试的文件下载"""
    for attempt in range(max_retries):
        try:
            print(f'  尝试下载 (第 {attempt + 1} 次)...')
            content = client.files.download(file=file_name)
            print(f'  ✓ 下载成功，大小: {len(content)} 字节')
            return content
        except Exception as e:
            print(f'  ✗ 下载失败: {e}')
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 10
                print(f'  等待 {wait_time} 秒后重试...')
                time.sleep(wait_time)
            else:
                raise

def main():
    print('='*80)
    print('下载 Batch 作业结果（稳健版）')
    print('='*80)
    print(f'\n作业: {BATCH_JOB_NAME}')
    print(f'范围: 第 {START_IDX}-{END_IDX} 个食物')
    
    # 初始化客户端
    client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
    
    # 获取作业信息
    print('\n1. 获取作业信息...')
    batch_job = client.batches.get(name=BATCH_JOB_NAME)
    print(f'   状态: {batch_job.state.name}')
    
    if batch_job.state.name != 'JOB_STATE_SUCCEEDED':
        print('   ✗ 作业未完成')
        return
    
    result_file = batch_job.dest.file_name
    print(f'   结果文件: {result_file}')
    
    # 下载结果
    print('\n2. 下载结果文件...')
    file_content = download_with_retry(client, result_file)
    
    # 保存到本地
    local_file = f'batch_results_{START_IDX}_{END_IDX}.jsonl'
    with open(local_file, 'wb') as f:
        f.write(file_content)
    print(f'   ✓ 已保存到 {local_file}')
    
    # 读取食物名称
    print('\n3. 读取食物名称...')
    df = pd.read_excel(EXCEL_FILE)
    food_names = df['name'].tolist()[START_IDX-1:END_IDX]
    print(f'   ✓ 读取了 {len(food_names)} 个食物名称')
    
    # 解析并保存图片
    print('\n4. 解析并保存图片:')
    success_count = 0
    fail_count = 0
    
    for line in file_content.decode('utf-8').splitlines():
        if not line.strip():
            continue
        
        try:
            data = json.loads(line)
            key = data.get('key', '')
            
            # 提取索引
            if not key or '-' not in key:
                continue
            
            idx = int(key.split('-')[1])
            
            if idx < START_IDX or idx > END_IDX:
                continue
            
            food_name = food_names[idx - START_IDX]
            
            # 检查响应
            if 'response' in data and data['response']:
                candidates = data['response'].get('candidates', [])
                if candidates:
                    parts = candidates[0].get('content', {}).get('parts', [])
                    
                    # 查找图片数据
                    for part in parts:
                        if 'inlineData' in part:
                            # 解码图片
                            img_data = base64.b64decode(part['inlineData'].get('data', ''))
                            img = Image.open(BytesIO(img_data))
                            
                            # 生成文件名
                            clean_name = sanitize_filename(food_name)
                            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                            filename = f'{idx:03d}_{clean_name}_batch_{timestamp}.png'
                            filepath = os.path.join(OUTPUT_DIR, filename)
                            
                            # 保存图片
                            img.save(filepath)
                            success_count += 1
                            print(f'   ✓ [{idx:02d}] {food_name}')
                            break
                    else:
                        fail_count += 1
                        print(f'   ✗ [{idx:02d}] {food_name} - 无图片数据')
                else:
                    fail_count += 1
                    print(f'   ✗ [{idx:02d}] {food_name} - 无候选响应')
            elif 'error' in data:
                fail_count += 1
                error_msg = data['error'].get('message', '未知错误')
                print(f'   ✗ [{idx:02d}] {food_name} - 错误: {error_msg}')
            
        except Exception as e:
            print(f'   ✗ 处理行出错: {e}')
            fail_count += 1
    
    print(f'\n{'='*80}')
    print(f'完成！')
    print(f'  成功: {success_count} 张')
    print(f'  失败: {fail_count} 张')
    print(f'  输出目录: {OUTPUT_DIR}')
    print(f'{'='*80}')

if __name__ == '__main__':
    main()
