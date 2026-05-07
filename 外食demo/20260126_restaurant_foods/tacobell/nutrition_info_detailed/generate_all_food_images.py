#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Taco Bell 食物图片批量生成脚本（完整版）
使用 Vertex AI 的 Nano Banana (gemini-2.5-flash-image) 模型生成所有食物图片
"""

import os
import pandas as pd
from google import genai
from google.genai import types
from PIL import Image
import io
from datetime import datetime
import time
import json

# 配置
EXCEL_FILE = "/Users/maodeog/Desktop/CodeProject/business/20260126_restaurant_foods/tacobell/nutrition_info_detailed/tacobell_nutrition_info.xlsx"
PROMPT_TEMPLATE = "Real Food Picture: USA's taco bell's {food_name}\n正方形。要能放在网页食谱介绍中的图\n只有这一个食物，白色背景。\n通用说明：除非食品包装中有文字,否则不要在图片中展示不必要的文字"
OUTPUT_DIR = "/Users/maodedog/Desktop/CodeProject/business/20260126_restaurant_foods/tacobell/nutrition_info_detailed/generated_pics"
CREDENTIALS_PATH = "/Users/maodedog/Desktop/CodeProject/system_resources/vertex_ai_credentials.json"
PROJECT_ID = "innertest-471009"
LOCATION = "us-central1"

# 进度记录文件
PROGRESS_FILE = os.path.join(OUTPUT_DIR, "generation_progress.json")
LOG_FILE = os.path.join(OUTPUT_DIR, "generation_log.txt")

# 设置环境变量
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CREDENTIALS_PATH
os.environ["VERTEX_AI_PROJECT_ID"] = PROJECT_ID
os.environ["VERTEX_AI_LOCATION"] = LOCATION

# 创建输出目录
os.makedirs(OUTPUT_DIR, exist_ok=True)

def sanitize_filename(name):
    """清理文件名，移除不合法字符"""
    return "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in name).strip()

def log_message(message, print_to_console=True):
    """记录日志"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {message}\n"
    
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(log_entry)
    
    if print_to_console:
        print(message)

def load_progress():
    """加载进度"""
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"completed": [], "failed": []}

def save_progress(progress):
    """保存进度"""
    with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
        json.dump(progress, f, indent=2, ensure_ascii=False)

def generate_image(food_name, client):
    """
    为指定的食物生成图片
    
    Args:
        food_name: 食物名称
        client: Vertex AI client
    
    Returns:
        PIL.Image 对象，如果失败则返回 None
    """
    # 生成提示词
    prompt = PROMPT_TEMPLATE.format(food_name=food_name)
    
    log_message(f"\n{'='*60}")
    log_message(f"正在生成: {food_name}")
    log_message(f"提示词: {prompt}")
    log_message(f"{'='*60}")
    
    try:
        # 调用 Vertex AI 生成图片
        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_modalities=['IMAGE'],  # 只返回图片
                image_config=types.ImageConfig(
                    aspect_ratio="1:1",  # 正方形
                )
            )
        )
        
        # 提取图片
        for part in response.parts:
            if part.inline_data is not None:
                image = part.as_image()
                log_message(f"✓ 图片生成成功！")
                return image
        
        log_message(f"✗ 未找到图片数据")
        return None
        
    except Exception as e:
        log_message(f"✗ 生成失败: {str(e)}")
        return None

def save_image(image, food_name, index):
    """
    保存图片到文件
    
    Args:
        image: PIL.Image 对象
        food_name: 食物名称
        index: 序号
    
    Returns:
        保存的文件路径
    """
    if image is None:
        return None
    
    # 生成文件名
    clean_name = sanitize_filename(food_name)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{index:03d}_{clean_name}_{timestamp}.png"
    filepath = os.path.join(OUTPUT_DIR, filename)
    
    # 保存图片
    image.save(filepath)
    log_message(f"✓ 图片已保存: {filepath}")
    
    return filepath

def main():
    """主函数"""
    log_message("=" * 80)
    log_message("Taco Bell 食物图片批量生成脚本（完整版）")
    log_message("=" * 80)
    
    # 读取 Excel 文件
    log_message(f"\n读取 Excel 文件: {EXCEL_FILE}")
    try:
        df = pd.read_excel(EXCEL_FILE)
        log_message(f"✓ 成功读取 {len(df)} 条记录")
    except Exception as e:
        log_message(f"✗ 读取 Excel 失败: {str(e)}")
        return
    
    # 检查是否有食物名称列
    name_column = 'name'
    if name_column not in df.columns:
        log_message(f"✗ 未找到 'name' 列")
        return
    
    log_message(f"使用列: {name_column}")
    
    # 初始化 Vertex AI client
    log_message(f"\n初始化 Vertex AI client...")
    try:
        client = genai.Client(
            vertexai=True,
            project=PROJECT_ID,
            location=LOCATION
        )
        log_message("✓ Client 初始化成功")
    except Exception as e:
        log_message(f"✗ Client 初始化失败: {str(e)}")
        return
    
    # 加载进度
    progress = load_progress()
    completed_foods = set(progress.get("completed", []))
    failed_foods = set(progress.get("failed", []))
    
    log_message(f"\n已完成: {len(completed_foods)} 个")
    log_message(f"已失败: {len(failed_foods)} 个")
    log_message(f"剩余: {len(df) - len(completed_foods) - len(failed_foods)} 个")
    
    # 生成所有图片
    log_message(f"\n{'='*80}")
    log_message(f"开始生成图片（共 {len(df)} 个食物）")
    log_message(f"{'='*80}")
    
    success_count = 0
    fail_count = 0
    skip_count = 0
    
    for idx, row in df.iterrows():
        food_name = row[name_column]
        
        # 跳过已经处理过的
        if food_name in completed_foods:
            skip_count += 1
            log_message(f"\n[{idx+1}/{len(df)}] 跳过（已完成）: {food_name}")
            continue
        
        if food_name in failed_foods:
            skip_count += 1
            log_message(f"\n[{idx+1}/{len(df)}] 跳过（已失败）: {food_name}")
            continue
        
        log_message(f"\n[{idx+1}/{len(df)}] 处理: {food_name}")
        
        # 生成图片
        image = generate_image(food_name, client)
        
        # 保存图片
        if image:
            filepath = save_image(image, food_name, idx + 1)
            if filepath:
                success_count += 1
                completed_foods.add(food_name)
                progress["completed"] = list(completed_foods)
                save_progress(progress)
            else:
                fail_count += 1
                failed_foods.add(food_name)
                progress["failed"] = list(failed_foods)
                save_progress(progress)
        else:
            fail_count += 1
            failed_foods.add(food_name)
            progress["failed"] = list(failed_foods)
            save_progress(progress)
        
        # 避免请求过快（每 3 秒一个请求）
        if idx < len(df) - 1:  # 不是最后一个
            log_message("等待 3 秒...")
            time.sleep(3)
    
    # 输出统计信息
    log_message(f"\n{'='*80}")
    log_message("生成完成！")
    log_message(f"{'='*80}")
    log_message(f"成功: {success_count} 张")
    log_message(f"失败: {fail_count} 张")
    log_message(f"跳过: {skip_count} 张")
    log_message(f"总计: {len(completed_foods)} / {len(df)} 张")
    log_message(f"输出目录: {OUTPUT_DIR}")
    log_message(f"日志文件: {LOG_FILE}")
    log_message(f"{'='*80}")

if __name__ == "__main__":
    main()
