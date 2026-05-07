#!/usr/bin/env python3
"""
使用 Gemini Batch API 生成第 11-30 个食物的图片
"""

import os
import json
import pandas as pd
from google import genai
from google.genai import types
from datetime import datetime

# 配置
EXCEL_FILE = 'tacobell_nutrition_info.xlsx'
PROMPT_FILE = 'generated_pics/pic_generating_prompt.md'
OUTPUT_DIR = 'generated_pics'

# 读取 Prompt 模板
with open(PROMPT_FILE, 'r', encoding='utf-8') as f:
    PROMPT_TEMPLATE = f.read()

print('='*80)
print('准备 Batch API 请求 - 生成第 11-30 个食物图片')
print('='*80)

# 读取食物名称
print('\n1. 读取食物名称...')
df = pd.read_excel(EXCEL_FILE)
food_names = df['name'].tolist()[10:30]  # 第 11-30 个
print(f'   ✓ 读取了 {len(food_names)} 个食物名称')
print(f'   范围: 第 11-30 个')

# 创建 JSONL 输入文件
print('\n2. 创建 JSONL 输入文件...')
input_file = 'batch_input_11_30.jsonl'
with open(input_file, 'w', encoding='utf-8') as f:
    for idx, food_name in enumerate(food_names, start=11):
        prompt = PROMPT_TEMPLATE.replace('{{food_name}}', food_name)
        
        request = {
            "key": f"food-{idx}",
            "request": {
                "contents": [{"parts": [{"text": prompt}]}],
                "generation_config": {
                    "responseModalities": ["IMAGE"]
                }
            }
        }
        
        f.write(json.dumps(request, ensure_ascii=False) + '\n')

print(f'   ✓ 已创建 {input_file}')

# 初始化客户端
print('\n3. 初始化 Gemini 客户端...')
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
print('   ✓ 客户端初始化完成')

# 上传输入文件
print('\n4. 上传输入文件...')
uploaded_file = client.files.upload(
    file=input_file,
    config=types.UploadFileConfig(
        mime_type='application/jsonl',
        display_name=f'tacobell_batch_11_30_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
    )
)
print(f'   ✓ 文件已上传: {uploaded_file.name}')

# 创建批处理作业
print('\n5. 创建 Batch 作业...')
batch_job = client.batches.create(
    model='gemini-2.5-flash-image',
    src=uploaded_file.name,
    config={
        'display_name': f'TacoBell_Foods_11_30_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
    }
)

print(f'   ✓ Batch 作业已创建')
print(f'   作业名称: {batch_job.name}')
print(f'   状态: {batch_job.state.name}')

# 保存作业信息
job_info_file = 'batch_job_11_30_info.json'
with open(job_info_file, 'w') as f:
    json.dump({
        'job_name': batch_job.name,
        'created_at': datetime.now().isoformat(),
        'start_index': 11,
        'end_index': 30,
        'count': 20
    }, f, indent=2)

print(f'\n   作业信息已保存到: {job_info_file}')

print('\n' + '='*80)
print('Batch 作业已提交！')
print('='*80)
print(f'\n作业名称: {batch_job.name}')
print('\n说明：')
print('1. 作业将在后台异步处理，通常需要几分钟')
print('2. 完成后使用以下命令检查状态并下载结果：')
print(f'\n   python3 download_batch_results_robust.py {batch_job.name} 11 30')
print('\n' + '='*80)
