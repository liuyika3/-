#!/usr/bin/env python3
"""
Shake Shack 完整数据爬虫 - 增强版
使用Playwright深度爬取图片、描述、价格
"""

import json
import os
import re
from datetime import datetime
import pandas as pd
import requests
from urllib.parse import urljoin
import time


# 配置
BASE_URL = "https://shakeshack.com"
IMAGE_DIR = "images"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}


def ensure_dir(path):
    """确保目录存在"""
    if not os.path.exists(path):
        os.makedirs(path)


def download_image(url, save_path):
    """下载图片到本地"""
    if os.path.exists(save_path):
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
            return True
    except Exception as e:
        print(f"    ⚠️ 下载失败: {e}")
    return False


def scrape_menu_with_playwright():
    """使用Playwright爬取完整菜单数据"""
    print("\n🌐 启动Playwright浏览器...")
    
    try:
        from playwright.sync_api import sync_playwright
        
        menu_items = []
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False)  # 改为可见模式，便于调试
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            )
            page = context.new_page()
            
            # 访问主页
            print("📡 访问 Shake Shack 主页...")
            page.goto("https://shakeshack.com/", wait_until="networkidle", timeout=60000)
            page.wait_for_timeout(5000)
            
            # 保存首页截图
            ensure_dir(IMAGE_DIR)
            page.screenshot(path=os.path.join(IMAGE_DIR, "_homepage.png"), full_page=True)
            print("   ✓ 首页截图已保存")
            
            # 尝试查找菜单链接
            print("\n🔍 查找菜单链接...")
            
            # 方法1: 查找所有链接
            links = page.query_selector_all("a")
            print(f"   找到 {len(links)} 个链接")
            
            menu_link = None
            for link in links:
                text = link.inner_text().lower()
                href = link.get_attribute('href')
                if 'menu' in text or 'menu' in (href or ''):
                    menu_link = href
                    print(f"   ✓ 找到菜单链接: {href}")
                    break
            
            # 如果找到菜单链接，访问它
            if menu_link:
                if not menu_link.startswith('http'):
                    menu_link = urljoin(BASE_URL, menu_link)
                
                print(f"\n📋 访问菜单页面: {menu_link}")
                page.goto(menu_link, wait_until="networkidle", timeout=60000)
                page.wait_for_timeout(5000)
                
                page.screenshot(path=os.path.join(IMAGE_DIR, "_menu_page.png"), full_page=True)
                print("   ✓ 菜单页截图已保存")
            
            # 获取所有图片
            print("\n📸 提取图片信息...")
            images = page.query_selector_all("img")
            print(f"   找到 {len(images)} 个图片")
            
            image_data = []
            for i, img in enumerate(images):
                try:
                    src = img.get_attribute('src')
                    srcset = img.get_attribute('srcset')
                    alt = img.get_attribute('alt') or ''
                    
                    # 优先使用srcset中的高清图
                    img_url = src
                    if srcset:
                        # 从srcset中提取最大尺寸的图片
                        srcset_parts = srcset.split(',')
                        if srcset_parts:
                            img_url = srcset_parts[-1].strip().split()[0]
                    
                    if img_url and (alt or 'food' in img_url.lower() or 'menu' in img_url.lower()):
                        image_data.append({
                            'index': i,
                            'src': img_url,
                            'alt': alt,
                            'srcset': srcset
                        })
                        print(f"   {i+1}. {alt[:50] if alt else 'No alt'}")
                
                except Exception as e:
                    print(f"   ⚠️ 图片{i}处理失败: {e}")
            
            # 尝试提取文本内容
            print("\n📝 提取文本内容...")
            try:
                # 获取页面所有文本
                body = page.query_selector('body')
                if body:
                    text_content = body.inner_text()
                    
                    # 保存HTML
                    html_content = page.content()
                    with open('page_content.html', 'w', encoding='utf-8') as f:
                        f.write(html_content)
                    print("   ✓ HTML内容已保存到 page_content.html")
                    
                    # 尝试解析价格
                    prices = re.findall(r'\$\d+\.?\d*', text_content)
                    if prices:
                        print(f"   ✓ 找到 {len(prices)} 个价格: {prices[:10]}")
            
            except Exception as e:
                print(f"   ⚠️ 文本提取失败: {e}")
            
            browser.close()
            
            return image_data
            
    except ImportError:
        print("   ✗ Playwright未安装")
        return []
    except Exception as e:
        print(f"   ✗ 爬取失败: {e}")
        import traceback
        traceback.print_exc()
        return []


def download_all_images(image_data):
    """下载所有图片"""
    if not image_data:
        print("\n⚠️ 没有图片需要下载")
        return []
    
    ensure_dir(IMAGE_DIR)
    print(f"\n📥 开始下载 {len(image_data)} 张图片...")
    
    downloaded = 0
    for i, img_info in enumerate(image_data):
        src = img_info['src']
        alt = img_info['alt'] or f"image_{i}"
        
        # 生成文件名
        filename = re.sub(r'[^\w\s-]', '', alt.lower())
        filename = re.sub(r'[-\s]+', '_', filename)[:50]
        if not filename:
            filename = f"food_{i}"
        
        # 确定扩展名
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
            print(f"       ✓ 已保存")
        
        time.sleep(0.3)
    
    print(f"\n✅ 成功下载 {downloaded}/{len(image_data)} 张图片")
    return image_data


def main():
    """主函数"""
    print("="*80)
    print("🍔 Shake Shack 完整数据爬虫 - 增强版")
    print("="*80)
    
    try:
        # 1. 爬取网页数据
        image_data = scrape_menu_with_playwright()
        
        # 2. 下载图片
        if image_data:
            image_data = download_all_images(image_data)
            
            # 保存图片信息
            with open('images_data.json', 'w', encoding='utf-8') as f:
                json.dump(image_data, f, ensure_ascii=False, indent=2)
            print(f"\n💾 图片信息已保存: images_data.json")
        
        # 3. 生成报告
        print("\n" + "="*80)
        print("📊 爬取结果")
        print("="*80)
        print(f"图片总数: {len(image_data)}")
        print(f"已下载: {len([img for img in image_data if 'local_path' in img])} 张")
        print(f"保存位置: {IMAGE_DIR}/")
        print("="*80)
        
        print("\n💡 提示：")
        print("   1. 查看 images/ 目录获取所有下载的图片")
        print("   2. 查看 images_data.json 获取图片元数据")
        print("   3. 查看 page_content.html 获取页面HTML")
        print("   4. 查看 images/_homepage.png 和 images/_menu_page.png 查看截图")
        
    except KeyboardInterrupt:
        print("\n\n⚠️ 用户中断")
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
