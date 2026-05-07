#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查并下载 Batch API 作业结果
"""

import os
import json
import base64
import pandas as pd
from google import genai
from PIL import Image
from io import BytesIO
from datetime import datetime

# 配置
BATCH_JOB_NAME = "batches/klrsu991dls0e1c1en8vqga62y8d8x57qpu5"  # 从之前的输出获取
EXCEL_FILE = "/Users/maodedog/Desktop/CodeProject/business/20260126_restaurant_foods/tacobell/nutrition_info_detailed/tacobell_nutrition_info.xlsx"
OUTPUT_DIR = "/Users/maodedog/Desktop/CodeProject/business/20260126_restaurant_foods/tacobell/nutrition_info_detailed/generated_pics"

# Gemini API Key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def sanitize_filename(name):
    """清理文件名"""
    return "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in name).strip()

def main():
    print("="*80)
    print("检查 Batch 作业状态并下载结果")
    print("="*80)
    
    # 初始化 Client
    print("\n初始化 Gemini API Client...")
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    # 获取作业状态
    print(f"\n查询作业: {BATCH_JOB_NAME}")
    batch_job = client.batches.get(name=BATCH_JOB_NAME)
    
    print(f"作业状态: {batch_job.state.name}")
    print(f"创建时间: {batch_job.create_time}")
    
    if hasattr(batch_job, 'update_time'):
        print(f"更新时间: {batch_job.update_time}")
    
    # 如果作业还在进行中
    if batch_job.state.name in ['JOB_STATE_PENDING', 'JOB_STATE_RUNNING']:
        print(f"\n作业还在处理中，请稍后再检查")
        print(f"当前状态: {batch_job.state.name}")
        return
    
    # 如果作业失败
    if batch_job.state.name == 'JOB_STATE_FAILED':
        print(f"\n✗ 作业失败")
        if hasattr(batch_job, 'error'):
            print(f"错误信息: {batch_job.error}")
        return
    
    # 如果作业成功
    if batch_job.state.name == 'JOB_STATE_SUCCEEDED':
        print(f"\n✓ 作业成功完成！")
        
        # 读取 Excel 获取食物名称
        df = pd.read_excel(EXCEL_FILE)
        food_names = df['name'].tolist()[:10]
        
        # 下载结果
        result_file_name = batch_job.dest.file_name
        print(f"\n下载结果文件: {result_file_name}")
        
        file_content_bytes = client.files.download(file=result_file_name)
        file_content = file_content_bytes.decode('utf-8')
        
        print(f"\n开始保存图片...")
        success_count = 0
        fail_count = 0
        
        # 解析 JSONL
        for line in file_content.splitlines():
            if not line:
                continue
            
            parsed_response = json.loads(line)
            key = parsed_response.get('key', '')
            request_idx = int(key.split('-')[1]) if key else 0
            
            if request_idx == 0 or request_idx > len(food_names):
                continue
            
            food_name = food_names[request_idx - 1]
            
            # 检查响应
            if 'response' in parsed_response and parsed_response['response']:
                candidates = parsed_response['response'].get('candidates', [])
                
                if candidates:
                    parts = candidates[0].get('content', {}).get('parts', [])
                    
                    for part in parts:
                        if 'inlineData' in part:
                            inline_data = part['inlineData']
                            image_data_b64 = inline_data.get('data', '')
                            
                            if image_data_b64:
                                # 解码并保存
                                image_bytes = base64.b64decode(image_data_b64)
                                image = Image.open(BytesIO(image_bytes))
                                
                                clean_name = sanitize_filename(food_name)
                                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                                filename = f"{request_idx:03d}_{clean_name}_batch_{timestamp}.png"
                                filepath = os.path.join(OUTPUT_DIR, filename)
                                
                                image.save(filepath)
                                success_count += 1
                                print(f"  ✓ [{request_idx}] {food_name} -> {filename}")
                                break
                else:
                    fail_count += 1
                    print(f"  ✗ [{request_idx}] {food_name} - 无候选响应")
            
            elif 'error' in parsed_response:
                fail_count += 1
                print(f"  ✗ [{request_idx}] {food_name} - 错误: {parsed_response['error']}")
        
        print(f"\n{'='*80}")
        print(f"下载完成！")
        print(f"{'='*80}")
        print(f"成功: {success_count} 张")
        print(f"失败: {fail_count} 张")
        print(f"输出目录: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
