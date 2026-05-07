#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
使用 Vertex AI Batch API 批量生成 Taco Bell 食物图片
优势：
- 成本节省 50%（相比实时 API）
- 更高的速率限制
- 适合大批量非紧急任务
"""

import os
import json
import time
import base64
import pandas as pd
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO
from datetime import datetime

# 配置
EXCEL_FILE = "/Users/maodedog/Desktop/CodeProject/business/20260126_restaurant_foods/tacobell/nutrition_info_detailed/tacobell_nutrition_info.xlsx"
PROMPT_TEMPLATE = "Real Food Picture: USA's taco bell's {food_name}\n正方形。要能放在网页食谱介绍中的图\n只有这一个食物，白色背景。\n通用说明：不要在图片中生成文字"
OUTPUT_DIR = "/Users/maodedog/Desktop/CodeProject/business/20260126_restaurant_foods/tacobell/nutrition_info_detailed/generated_pics"
CREDENTIALS_PATH = "/Users/maodedog/Desktop/CodeProject/system_resources/vertex_ai_credentials.json"
PROJECT_ID = "innertest-471009"
LOCATION = "us-central1"

# Batch 相关文件
BATCH_INPUT_FILE = os.path.join(OUTPUT_DIR, "batch_input_requests.jsonl")
BATCH_LOG_FILE = os.path.join(OUTPUT_DIR, "batch_generation_log.txt")

# Gemini API Key（从环境变量获取）
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("错误: 请设置 GEMINI_API_KEY 环境变量")
    print("获取 API Key: https://aistudio.google.com/apikey")
    exit(1)

# 创建输出目录
os.makedirs(OUTPUT_DIR, exist_ok=True)

def log_message(message, print_to_console=True):
    """记录日志"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {message}\n"
    
    with open(BATCH_LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(log_entry)
    
    if print_to_console:
        print(message)

def sanitize_filename(name):
    """清理文件名，移除不合法字符"""
    return "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in name).strip()

def create_batch_input_file(food_names, num_items=10):
    """
    创建 Batch API 的输入 JSONL 文件
    
    Args:
        food_names: 食物名称列表
        num_items: 要生成的图片数量
    """
    log_message(f"\n{'='*80}")
    log_message(f"创建 Batch 输入文件（生成前 {num_items} 个食物）")
    log_message(f"{'='*80}")
    
    requests = []
    
    for idx, food_name in enumerate(food_names[:num_items], start=1):
        prompt = PROMPT_TEMPLATE.format(food_name=food_name)
        
        request = {
            "key": f"request-{idx}",
            "request": {
                "contents": [{
                    "parts": [{"text": prompt}]
                }],
                "generation_config": {
                    "responseModalities": ["IMAGE"]
                }
            }
        }
        requests.append(request)
        log_message(f"  [{idx}/{num_items}] 添加请求: {food_name}")
    
    # 写入 JSONL 文件
    with open(BATCH_INPUT_FILE, 'w', encoding='utf-8') as f:
        for req in requests:
            f.write(json.dumps(req, ensure_ascii=False) + '\n')
    
    log_message(f"\n✓ Batch 输入文件已创建: {BATCH_INPUT_FILE}")
    log_message(f"  文件大小: {os.path.getsize(BATCH_INPUT_FILE)} bytes")
    
    return BATCH_INPUT_FILE

def upload_batch_file(client, file_path):
    """
    上传 Batch 输入文件到 File API
    
    Args:
        client: Genai client
        file_path: 文件路径
    
    Returns:
        上传后的文件对象
    """
    log_message(f"\n上传 Batch 文件到 File API...")
    
    uploaded_file = client.files.upload(
        file=file_path,
        config=types.UploadFileConfig(
            display_name='taco-bell-batch-image-requests',
            mime_type='jsonl'
        )
    )
    
    log_message(f"✓ 文件上传成功: {uploaded_file.name}")
    return uploaded_file

def create_batch_job(client, uploaded_file):
    """
    创建 Batch 作业
    
    Args:
        client: Genai client
        uploaded_file: 上传的文件对象
    
    Returns:
        Batch 作业对象
    """
    log_message(f"\n创建 Batch 作业...")
    
    batch_job = client.batches.create(
        model="gemini-2.5-flash-image",
        src=uploaded_file.name,
        config={
            'display_name': f"taco-bell-images-{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        }
    )
    
    log_message(f"✓ Batch 作业已创建: {batch_job.name}")
    log_message(f"  状态: {batch_job.state.name}")
    
    return batch_job

def monitor_batch_job(client, job_name, poll_interval=10):
    """
    监控 Batch 作业状态
    
    Args:
        client: Genai client
        job_name: 作业名称
        poll_interval: 轮询间隔（秒）
    
    Returns:
        完成的 Batch 作业对象
    """
    log_message(f"\n{'='*80}")
    log_message(f"监控 Batch 作业状态...")
    log_message(f"{'='*80}")
    
    completed_states = {
        'JOB_STATE_SUCCEEDED',
        'JOB_STATE_FAILED',
        'JOB_STATE_CANCELLED',
        'JOB_STATE_EXPIRED'
    }
    
    batch_job = client.batches.get(name=job_name)
    
    while batch_job.state.name not in completed_states:
        log_message(f"  当前状态: {batch_job.state.name} - 等待 {poll_interval} 秒后重试...")
        time.sleep(poll_interval)
        batch_job = client.batches.get(name=job_name)
    
    log_message(f"\n✓ 作业完成！最终状态: {batch_job.state.name}")
    
    if batch_job.state.name == 'JOB_STATE_FAILED':
        log_message(f"✗ 作业失败: {batch_job.error}")
    
    return batch_job

def download_and_save_results(client, batch_job, food_names):
    """
    下载 Batch 结果并保存图片
    
    Args:
        client: Genai client
        batch_job: 完成的 Batch 作业对象
        food_names: 食物名称列表（用于命名）
    
    Returns:
        成功保存的图片数量
    """
    if batch_job.state.name != 'JOB_STATE_SUCCEEDED':
        log_message("✗ 作业未成功，无法下载结果")
        return 0
    
    log_message(f"\n{'='*80}")
    log_message("下载并保存生成的图片...")
    log_message(f"{'='*80}")
    
    result_file_name = batch_job.dest.file_name
    log_message(f"\n结果文件: {result_file_name}")
    log_message("下载中...")
    
    # 下载结果文件
    file_content_bytes = client.files.download(file=result_file_name)
    file_content = file_content_bytes.decode('utf-8')
    
    success_count = 0
    fail_count = 0
    
    # 解析 JSONL 结果文件
    for line in file_content.splitlines():
        if not line:
            continue
        
        parsed_response = json.loads(line)
        
        # 提取 request key (e.g., "request-1")
        key = parsed_response.get('key', '')
        request_idx = int(key.split('-')[1]) if key else 0
        
        if request_idx == 0 or request_idx > len(food_names):
            continue
        
        food_name = food_names[request_idx - 1]
        
        # 检查是否有响应
        if 'response' in parsed_response and parsed_response['response']:
            candidates = parsed_response['response'].get('candidates', [])
            
            if candidates:
                parts = candidates[0].get('content', {}).get('parts', [])
                
                for part in parts:
                    # 查找图片数据
                    if 'inlineData' in part:
                        inline_data = part['inlineData']
                        mime_type = inline_data.get('mimeType', 'image/png')
                        image_data_b64 = inline_data.get('data', '')
                        
                        if image_data_b64:
                            # 解码并保存图片
                            image_bytes = base64.b64decode(image_data_b64)
                            image = Image.open(BytesIO(image_bytes))
                            
                            # 生成文件名
                            clean_name = sanitize_filename(food_name)
                            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                            filename = f"{request_idx:03d}_{clean_name}_{timestamp}.png"
                            filepath = os.path.join(OUTPUT_DIR, filename)
                            
                            # 保存
                            image.save(filepath)
                            success_count += 1
                            log_message(f"  ✓ [{request_idx}] {food_name}")
                            log_message(f"     保存到: {filename}")
                            break
            else:
                fail_count += 1
                log_message(f"  ✗ [{request_idx}] {food_name} - 无候选响应")
        
        elif 'error' in parsed_response:
            fail_count += 1
            error_msg = parsed_response['error']
            log_message(f"  ✗ [{request_idx}] {food_name} - 错误: {error_msg}")
    
    log_message(f"\n{'='*80}")
    log_message(f"批量生成完成！")
    log_message(f"{'='*80}")
    log_message(f"成功: {success_count} 张")
    log_message(f"失败: {fail_count} 张")
    log_message(f"{'='*80}")
    
    return success_count

def main():
    """主函数"""
    log_message("=" * 80)
    log_message("Taco Bell 食物图片 - Batch API 批量生成")
    log_message("=" * 80)
    log_message(f"优势: 成本节省 50%, 更高速率限制")
    
    # 读取 Excel 文件
    log_message(f"\n读取 Excel 文件: {EXCEL_FILE}")
    try:
        df = pd.read_excel(EXCEL_FILE)
        log_message(f"✓ 成功读取 {len(df)} 条记录")
    except Exception as e:
        log_message(f"✗ 读取 Excel 失败: {str(e)}")
        return
    
    # 获取食物名称列表
    food_names = df['name'].tolist()
    
    # 初始化 Client（使用 Gemini Developer API）
    log_message(f"\n初始化 Gemini API Client...")
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        log_message("✓ Client 初始化成功")
    except Exception as e:
        log_message(f"✗ Client 初始化失败: {str(e)}")
        return
    
    try:
        # 1. 创建 Batch 输入文件（生成 10 个）
        batch_file = create_batch_input_file(food_names, num_items=10)
        
        # 2. 上传文件
        uploaded_file = upload_batch_file(client, batch_file)
        
        # 3. 创建 Batch 作业
        batch_job = create_batch_job(client, uploaded_file)
        
        # 4. 监控作业状态
        completed_job = monitor_batch_job(client, batch_job.name, poll_interval=10)
        
        # 5. 下载并保存结果
        success_count = download_and_save_results(client, completed_job, food_names[:10])
        
        log_message(f"\n✓ 所有操作完成！共成功生成 {success_count} 张图片")
        log_message(f"输出目录: {OUTPUT_DIR}")
        log_message(f"日志文件: {BATCH_LOG_FILE}")
        
    except Exception as e:
        log_message(f"\n✗ 发生错误: {str(e)}")
        import traceback
        log_message(traceback.format_exc())

if __name__ == "__main__":
    main()
