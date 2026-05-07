#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
重试生成第一张图片
"""

import os
from google import genai
from google.genai import types
from datetime import datetime

# 配置
CREDENTIALS_PATH = "/Users/maodedog/Desktop/CodeProject/system_resources/vertex_ai_credentials.json"
PROJECT_ID = "innertest-471009"
LOCATION = "us-central1"
OUTPUT_DIR = "/Users/maodedog/Desktop/CodeProject/business/20260126_restaurant_foods/tacobell/nutrition_info_detailed/generated_pics"

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CREDENTIALS_PATH
os.environ["VERTEX_AI_PROJECT_ID"] = PROJECT_ID
os.environ["VERTEX_AI_LOCATION"] = LOCATION

# 初始化 client
client = genai.Client(
    vertexai=True,
    project=PROJECT_ID,
    location=LOCATION
)

# 生成第一张图片
food_name = "Bell Sauce Dipping Sauce"
prompt = f"Real Food Picture: USA's taco bell's {food_name}\n正方形。要能放在网页食谱介绍中的图\n只有这一个食物，白色背景。\n通用说明：不要在图片中生成文字"

print(f"正在生成: {food_name}")
print(f"提示词: {prompt}\n")

try:
    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=[prompt],
        config=types.GenerateContentConfig(
            response_modalities=['IMAGE'],
            image_config=types.ImageConfig(
                aspect_ratio="1:1",
            )
        )
    )
    
    for part in response.parts:
        if part.inline_data is not None:
            image = part.as_image()
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"001_Bell_Sauce_Dipping_Sauce_{timestamp}.png"
            filepath = os.path.join(OUTPUT_DIR, filename)
            image.save(filepath)
            print(f"✓ 图片已保存: {filepath}")
            break
    else:
        print("✗ 未找到图片数据")
        
except Exception as e:
    print(f"✗ 生成失败: {str(e)}")
