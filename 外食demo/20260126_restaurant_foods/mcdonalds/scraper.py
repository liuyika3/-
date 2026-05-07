#!/usr/bin/env python3
"""
麦当劳菜单数据爬虫
使用 requests + BeautifulSoup 方式爬取
图片下载到本地
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
import os
import re
import time
import json
from datetime import datetime
from urllib.parse import urljoin

# 配置
BASE_URL = "https://www.mcdonalds.com"
MENU_URL = "https://www.mcdonalds.com/us/en-us/full-menu.html"
IMAGE_DIR = "images"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def ensure_dir(path):
    """确保目录存在"""
    if not os.path.exists(path):
        os.makedirs(path)

def download_image(url, save_path):
    """下载图片到本地"""
    try:
        # 处理URL
        if url.startswith('//'):
            url = 'https:' + url
        elif not url.startswith('http'):
            url = urljoin(BASE_URL, url)
        
        response = requests.get(url, headers=HEADERS, timeout=30)
        if response.status_code == 200:
            with open(save_path, 'wb') as f:
                f.write(response.content)
            return True
        else:
            print(f"  ⚠️ 下载失败 ({response.status_code}): {url}")
            return False
    except Exception as e:
        print(f"  ❌ 下载错误: {e}")
        return False

def get_food_id_from_url(url):
    """从URL提取食物ID"""
    match = re.search(r'/product/([^.]+)\.html', url)
    if match:
        return match.group(1)
    match = re.search(r'/meal/([^.]+)\.html', url)
    if match:
        return match.group(1)
    return None

def parse_menu_page():
    """解析菜单页面,获取所有食物信息"""
    print("📥 正在获取菜单页面...")
    response = requests.get(MENU_URL, headers=HEADERS)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    foods = []
    
    # 查找所有食物链接
    # 格式: ![](image_url) food_name](product_url)
    links = soup.find_all('a', href=re.compile(r'/us/en-us/(product|meal)/'))
    
    seen_urls = set()
    for link in links:
        href = link.get('href', '')
        if href in seen_urls:
            continue
        seen_urls.add(href)
        
        # 获取食物名称
        name = link.get_text(strip=True)
        if not name or len(name) < 2:
            continue
        
        # 清理名称
        name = re.sub(r'^\d+\s*', '', name)  # 移除开头数字
        name = re.sub(r'\s+Cal\.$', '', name)  # 移除结尾的 Cal.
        name = name.strip()
        
        if not name:
            continue
        
        # 获取图片URL
        img = link.find('img')
        img_url = ''
        if img:
            img_url = img.get('src', '') or img.get('data-src', '')
        
        # 获取完整URL
        full_url = urljoin(BASE_URL, href)
        food_id = get_food_id_from_url(href)
        
        # 判断分类
        category = 'Other'
        if 'breakfast' in href.lower() or any(x in name.lower() for x in ['mcmuffin', 'mcgriddle', 'biscuit', 'bagel', 'hotcake', 'oatmeal', 'hash brown']):
            category = 'Breakfast'
        elif 'burger' in href.lower() or any(x in name.lower() for x in ['big mac', 'quarter pounder', 'mcdouble', 'cheeseburger', 'hamburger', 'daily double']):
            category = 'Burgers'
        elif 'chicken' in href.lower() or 'fish' in href.lower() or any(x in name.lower() for x in ['mccrispy', 'mcchicken', 'filet-o-fish', 'nugget', 'strip', 'wrap']):
            category = 'Chicken & Fish'
        elif 'fries' in href.lower() or 'sides' in href.lower() or any(x in name.lower() for x in ['fries', 'apple slice']):
            category = 'Fries & Sides'
        elif 'happy-meal' in href.lower():
            category = 'Happy Meal'
        elif 'sweets' in href.lower() or any(x in name.lower() for x in ['mcflurry', 'cone', 'shake', 'sundae', 'pie', 'cookie']):
            category = 'Sweets & Treats'
        elif 'coffee' in href.lower() or 'mccafe' in href.lower() or any(x in name.lower() for x in ['latte', 'cappuccino', 'mocha', 'frappe', 'macchiato', 'americano', 'coffee']):
            category = 'McCafe Coffees'
        elif 'drink' in href.lower() or any(x in name.lower() for x in ['coca-cola', 'sprite', 'fanta', 'tea', 'juice', 'milk', 'water', 'smoothie', 'lemonade']):
            category = 'Beverages'
        elif 'sauce' in href.lower() or 'condiment' in href.lower() or any(x in name.lower() for x in ['sauce', 'ketchup', 'mustard', 'mayonnaise', 'honey']):
            category = 'Sauces & Condiments'
        
        foods.append({
            'food_id': food_id,
            'food_name': name,
            'category': category,
            'product_url': full_url,
            'main_image_url': img_url
        })
    
    print(f"✅ 找到 {len(foods)} 个食物")
    return foods

def download_food_images(foods):
    """下载所有食物图片"""
    ensure_dir(IMAGE_DIR)
    
    print(f"\n📸 开始下载 {len(foods)} 张图片...")
    
    for i, food in enumerate(foods):
        img_url = food.get('main_image_url', '')
        food_id = food.get('food_id', f'food_{i}')
        
        if not img_url:
            food['local_image_path'] = ''
            continue
        
        # 生成本地文件名
        ext = '.jpg'
        if '.png' in img_url.lower():
            ext = '.png'
        local_filename = f"{food_id}{ext}"
        local_path = os.path.join(IMAGE_DIR, local_filename)
        
        print(f"  [{i+1}/{len(foods)}] 下载: {food['food_name'][:30]}...")
        
        if download_image(img_url, local_path):
            food['local_image_path'] = local_path
        else:
            food['local_image_path'] = ''
        
        # 避免请求过快
        time.sleep(0.3)
    
    downloaded = sum(1 for f in foods if f.get('local_image_path'))
    print(f"✅ 下载完成: {downloaded}/{len(foods)} 张图片")
    
    return foods

def create_excel(foods, output_file='McDonald_Foods_Data.xlsx'):
    """创建Excel文件"""
    print(f"\n📊 生成Excel文件: {output_file}")
    
    # 准备数据
    data = []
    for food in foods:
        data.append({
            'food_id': food.get('food_id', ''),
            'food_name': food.get('food_name', ''),
            'food_name_cn': '',  # 待翻译
            'category': food.get('category', ''),
            'product_url': food.get('product_url', ''),
            'main_image_url': food.get('main_image_url', ''),
            'local_image_path': food.get('local_image_path', ''),
            'calories': '',  # 需要从详情页获取
            'description': '',  # 需要从详情页获取
            'scraped_date': datetime.now().strftime('%Y-%m-%d')
        })
    
    df = pd.DataFrame(data)
    
    # 按分类排序
    category_order = ['Breakfast', 'Burgers', 'Chicken & Fish', 'Fries & Sides', 
                      'Happy Meal', 'Sweets & Treats', 'McCafe Coffees', 'Beverages', 
                      'Sauces & Condiments', 'Other']
    df['category'] = pd.Categorical(df['category'], categories=category_order, ordered=True)
    df = df.sort_values('category')
    
    # 保存到Excel
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Foods_Master', index=False)
        
        # 添加统计信息
        stats = df.groupby('category').size().reset_index(name='count')
        stats.to_excel(writer, sheet_name='Statistics', index=False)
    
    print(f"✅ Excel已保存: {output_file}")
    print(f"   总计: {len(df)} 个食物")
    print(f"   分类统计:")
    for _, row in stats.iterrows():
        print(f"     - {row['category']}: {row['count']} 个")
    
    return df

def main():
    """主函数"""
    print("=" * 50)
    print("🍔 麦当劳菜单数据爬虫")
    print("=" * 50)
    
    # 1. 解析菜单页面
    foods = parse_menu_page()
    
    # 2. 下载图片
    foods = download_food_images(foods)
    
    # 3. 生成Excel
    df = create_excel(foods)
    
    # 4. 保存原始数据到JSON
    with open('foods_data.json', 'w', encoding='utf-8') as f:
        json.dump(foods, f, ensure_ascii=False, indent=2)
    print(f"\n💾 原始数据已保存: foods_data.json")
    
    print("\n" + "=" * 50)
    print("✅ 爬取完成!")
    print("=" * 50)

if __name__ == '__main__':
    main()
