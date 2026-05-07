#!/usr/bin/env python3
"""
Shake Shack 完整数据爬虫
爬取官网的图片、描述、价格等完整信息
"""

import json
import os
import re
from datetime import datetime
import pandas as pd
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import time

# 配置
BASE_URL = "https://shakeshack.com"
IMAGE_DIR = "images"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
}


def ensure_dir(path):
    """确保目录存在"""
    if not os.path.exists(path):
        os.makedirs(path)


def download_image(url, save_path):
    """下载图片到本地"""
    if os.path.exists(save_path):
        print(f"    ✓ 图片已存在: {os.path.basename(save_path)}")
        return True
    
    try:
        if url.startswith('//'):
            url = 'https:' + url
        elif not url.startswith('http'):
            url = urljoin(BASE_URL, url)
        
        response = requests.get(url, headers=HEADERS, timeout=30)
        if response.status_code == 200:
            with open(save_path, 'wb') as f:
                f.write(response.content)
            print(f"    ✓ 下载成功: {os.path.basename(save_path)}")
            return True
    except Exception as e:
        print(f"    ✗ 下载失败: {e}")
    return False


def fetch_menu_page():
    """获取菜单页面HTML"""
    try:
        url = "https://shakeshack.com/location/madison-square-park/"
        print(f"\n📡 正在访问: {url}")
        response = requests.get(url, headers=HEADERS, timeout=30)
        if response.status_code == 200:
            print("   ✓ 页面获取成功")
            return response.text
        else:
            print(f"   ✗ 页面获取失败: {response.status_code}")
            return None
    except Exception as e:
        print(f"   ✗ 请求错误: {e}")
        return None


def parse_menu_items(html):
    """解析菜单项"""
    soup = BeautifulSoup(html, 'html.parser')
    menu_items = []
    
    # 尝试找到菜单项（这需要根据实际HTML结构调整）
    # 由于网站可能使用React等动态加载，这里提供一个基础框架
    
    print("\n🔍 正在解析页面结构...")
    
    # 查找可能的菜单项容器
    items = soup.find_all(['div', 'article', 'section'], class_=re.compile(r'menu|item|product', re.I))
    
    print(f"   找到 {len(items)} 个可能的菜单元素")
    
    return menu_items


def load_nutrition_data():
    """加载已有的营养数据"""
    try:
        with open('shakeshack_foods_data.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []


def merge_with_nutrition(web_data, nutrition_data):
    """合并网页数据和营养数据"""
    # 创建营养数据字典，便于查找
    nutrition_dict = {item['food_name']: item for item in nutrition_data}
    
    merged_data = []
    for item in web_data:
        food_name = item.get('food_name', '')
        # 尝试匹配营养数据
        nutrition = nutrition_dict.get(food_name, {})
        
        merged_item = {**nutrition, **item}  # 合并数据，web_data优先
        merged_data.append(merged_item)
    
    return merged_data


def scrape_with_playwright():
    """使用Playwright爬取动态页面"""
    print("\n🌐 使用Playwright爬取动态内容...")
    
    try:
        from playwright.sync_api import sync_playwright
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            # 访问菜单页面
            print("   访问主页...")
            page.goto("https://shakeshack.com/#/", wait_until="networkidle", timeout=30000)
            
            # 等待内容加载
            print("   等待内容加载...")
            page.wait_for_timeout(5000)
            
            # 截图保存
            screenshot_path = os.path.join(IMAGE_DIR, "homepage.png")
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"   ✓ 页面截图已保存: {screenshot_path}")
            
            # 获取页面HTML
            html = page.content()
            
            # 查找所有图片
            images = page.query_selector_all("img")
            print(f"\n📸 找到 {len(images)} 个图片元素")
            
            image_data = []
            for i, img in enumerate(images[:20]):  # 限制前20个
                src = img.get_attribute('src')
                alt = img.get_attribute('alt')
                if src and ('menu' in src.lower() or 'product' in src.lower() or alt):
                    image_data.append({
                        'src': src,
                        'alt': alt or f'image_{i}',
                        'index': i
                    })
                    print(f"   {i+1}. {alt or 'No alt'}: {src[:80]}...")
            
            browser.close()
            
            return html, image_data
            
    except ImportError:
        print("   ✗ Playwright未安装，请运行: pip install playwright && playwright install")
        return None, []
    except Exception as e:
        print(f"   ✗ 爬取失败: {e}")
        return None, []


def download_menu_images(image_data):
    """下载菜单图片"""
    ensure_dir(IMAGE_DIR)
    
    print(f"\n📥 开始下载图片（共{len(image_data)}张）...")
    
    downloaded = 0
    for i, img_info in enumerate(image_data):
        src = img_info['src']
        alt = img_info['alt']
        
        # 生成文件名
        filename = re.sub(r'[^\w\s-]', '', alt.lower())
        filename = re.sub(r'[-\s]+', '_', filename)
        filename = filename[:50]  # 限制长度
        
        if not filename:
            filename = f"image_{i}"
        
        # 确定文件扩展名
        ext = '.jpg'
        if '.png' in src.lower():
            ext = '.png'
        elif '.webp' in src.lower():
            ext = '.webp'
        
        save_path = os.path.join(IMAGE_DIR, f"{filename}{ext}")
        
        print(f"  [{i+1}/{len(image_data)}] {alt[:40]}...")
        
        if download_image(src, save_path):
            img_info['local_path'] = save_path
            downloaded += 1
        
        time.sleep(0.5)  # 避免请求过快
    
    print(f"\n✅ 成功下载 {downloaded}/{len(image_data)} 张图片")
    return image_data


def create_complete_data():
    """创建完整数据"""
    print("\n" + "="*80)
    print("🍔 Shake Shack 完整数据爬虫")
    print("="*80)
    
    # 1. 加载已有的营养数据
    print("\n📊 加载营养数据...")
    nutrition_data = load_nutrition_data()
    print(f"   已加载 {len(nutrition_data)} 个食物的营养数据")
    
    # 2. 使用Playwright爬取网页
    html, image_data = scrape_with_playwright()
    
    # 3. 下载图片
    if image_data:
        image_data = download_menu_images(image_data)
    
    # 4. 保存图片信息
    if image_data:
        with open('images_data.json', 'w', encoding='utf-8') as f:
            json.dump(image_data, f, ensure_ascii=False, indent=2)
        print(f"\n💾 图片信息已保存: images_data.json")
    
    # 5. 生成报告
    print("\n" + "="*80)
    print("📈 数据采集总结")
    print("="*80)
    print(f"营养数据: {len(nutrition_data)} 个食物")
    print(f"图片数据: {len(image_data)} 张")
    print(f"本地图片: {len([img for img in image_data if 'local_path' in img])} 张")
    print("="*80)


def main():
    """主函数"""
    try:
        # 确保必要的目录存在
        ensure_dir(IMAGE_DIR)
        
        # 创建完整数据
        create_complete_data()
        
        print("\n✅ 爬取完成！")
        print("\n💡 提示：")
        print("   - 图片保存在 images/ 目录")
        print("   - 图片信息保存在 images_data.json")
        print("   - 营养数据保存在 shakeshack_foods_data.json")
        
    except KeyboardInterrupt:
        print("\n\n⚠️ 用户中断")
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
