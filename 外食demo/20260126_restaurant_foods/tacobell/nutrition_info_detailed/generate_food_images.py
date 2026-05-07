#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Taco Bell 食物图片批量生成脚本
使用 Vertex AI 的 Nano Banana (gemini-2.5-flash-image) 模型生成食物图片
"""

import os
import pandas as pd
from google import genai
from google.genai import types
from PIL import Image
import io
from datetime import datetime
import time

# 配置
EXCEL_FILE = "/Users/maodedog/Desktop/CodeProject/business/20260126_restaurant_foods/tacobell/nutrition_info_detailed/tacobell_nutrition_info.xlsx"
PROMPT_TEMPLATE = "Real Food Picture: USA's taco bell's {food_name}\n正方形。要能放在网页食谱介绍中的图\n只有这一个食物，白色背景。\n通用说明：不要在图片中生成文字"
OUTPUT_DIR = "/Users/maodedog/Desktop/CodeProject/business/20260126_restaurant_foods/tacobell/nutrition_info_detailed/generated_pics"
CREDENTIALS_PATH = "/Users/maodedog/Desktop/CodeProject/system_resources/vertex_ai_credentials.json"
PROJECT_ID = "innertest-471009"
LOCATION = "us-central1"

# 设置环境变量
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CREDENTIALS_PATH
os.environ["VERTEX_AI_PROJECT_ID"] = PROJECT_ID
os.environ["VERTEX_AI_LOCATION"] = LOCATION

# 创建输出目录
os.makedirs(OUTPUT_DIR, exist_ok=True)

def sanitize_filename(name):
    """清理文件名，移除不合法字符"""
    return "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in name).strip()

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
    
    print(f"\n{'='*60}")
    print(f"正在生成: {food_name}")
    print(f"提示词: {prompt}")
    print(f"{'='*60}")
    
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
                print(f"✓ 图片生成成功！")
                return image
        
        print(f"✗ 未找到图片数据")
        return None
        
    except Exception as e:
        print(f"✗ 生成失败: {str(e)}")
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
    print(f"✓ 图片已保存: {filepath}")
    
    return filepath

def main():
    """主函数"""
    print("=" * 80)
    print("Taco Bell 食物图片批量生成脚本")
    print("=" * 80)
    
    # 读取 Excel 文件
    print(f"\n读取 Excel 文件: {EXCEL_FILE}")
    try:
        df = pd.read_excel(EXCEL_FILE)
        print(f"✓ 成功读取 {len(df)} 条记录")
        print(f"\n列名: {df.columns.tolist()}")
        print(f"\n前 3 行数据:")
        print(df.head(3))
    except Exception as e:
        print(f"✗ 读取 Excel 失败: {str(e)}")
        return
    
    # 检查是否有食物名称列
    name_column = None
    possible_names = ['food_name', 'name', 'Name', 'Food Name', '食物名称', 'Item']
    for col in possible_names:
        if col in df.columns:
            name_column = col
            break
    
    if name_column is None:
        print(f"\n✗ 未找到食物名称列，请从以下列中选择:")
        for i, col in enumerate(df.columns, 1):
            print(f"  {i}. {col}")
        choice = input("\n请输入列序号: ").strip()
        try:
            name_column = df.columns[int(choice) - 1]
        except:
            print("✗ 无效的选择")
            return
    
    print(f"\n使用列: {name_column}")
    
    # 初始化 Vertex AI client
    print(f"\n初始化 Vertex AI client...")
    try:
        client = genai.Client(
            vertexai=True,
            project=PROJECT_ID,
            location=LOCATION
        )
        print("✓ Client 初始化成功")
    except Exception as e:
        print(f"✗ Client 初始化失败: {str(e)}")
        return
    
    # 测试生成前 3 张图片
    print(f"\n{'='*80}")
    print("开始生成图片（测试模式：前 3 个食物）")
    print(f"{'='*80}")
    
    success_count = 0
    fail_count = 0
    
    for idx in range(min(3, len(df))):
        food_name = df.iloc[idx][name_column]
        
        # 生成图片
        image = generate_image(food_name, client)
        
        # 保存图片
        if image:
            filepath = save_image(image, food_name, idx + 1)
            if filepath:
                success_count += 1
        else:
            fail_count += 1
        
        # 避免请求过快
        if idx < 2:  # 不是最后一个
            print("\n等待 2 秒...")
            time.sleep(2)
    
    # 输出统计信息
    print(f"\n{'='*80}")
    print("生成完成！")
    print(f"{'='*80}")
    print(f"成功: {success_count} 张")
    print(f"失败: {fail_count} 张")
    print(f"输出目录: {OUTPUT_DIR}")
    print(f"{'='*80}")

if __name__ == "__main__":
    main()
