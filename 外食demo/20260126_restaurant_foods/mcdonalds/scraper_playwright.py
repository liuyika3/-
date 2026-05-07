#!/usr/bin/env python3
"""
麦当劳菜单完整数据爬虫 - Playwright版本
获取所有食物的完整营养成分、配料、过敏原等信息
"""

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
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
INGREDIENT_IMAGE_DIR = "images/ingredients"

def ensure_dir(path):
    """确保目录存在"""
    if not os.path.exists(path):
        os.makedirs(path)

def download_image(page, url, save_path):
    """下载图片"""
    if os.path.exists(save_path):
        return True
    try:
        import requests
        if url.startswith('//'):
            url = 'https:' + url
        elif not url.startswith('http'):
            url = urljoin(BASE_URL, url)
        
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            with open(save_path, 'wb') as f:
                f.write(response.content)
            return True
    except Exception as e:
        print(f"    ⚠️ 图片下载失败: {e}")
    return False

def clean_text(text):
    """清理文本"""
    if not text:
        return ''
    return ' '.join(text.strip().split())

def parse_nutrition_value(text):
    """解析营养数值"""
    if not text:
        return None
    match = re.search(r'([\d.]+)', text)
    return float(match.group(1)) if match else None

def get_menu_items(page):
    """获取菜单中所有食物的链接"""
    print("\n📋 获取菜单列表...")
    
    page.goto(MENU_URL, wait_until='domcontentloaded', timeout=90000)
    time.sleep(5)  # 等待JavaScript加载
    
    foods = []
    
    # 查找所有食物链接
    product_links = page.query_selector_all('a[href*="/product/"], a[href*="/meal/"]')
    
    seen_urls = set()
    for link in product_links:
        try:
            href = link.get_attribute('href')
            if not href or href in seen_urls:
                continue
            
            # 跳过meal页面
            if '/meal/' in href:
                continue
            
            seen_urls.add(href)
            
            # 获取食物名称
            name = link.text_content().strip()
            name = re.sub(r'^\d+\s*', '', name)  # 移除开头数字
            name = re.sub(r'\s+Cal\.$', '', name)  # 移除卡路里
            name = name.strip()
            
            if not name or len(name) < 2:
                continue
            
            # 获取图片
            img = link.query_selector('img')
            img_url = ''
            if img:
                img_url = img.get_attribute('src') or ''
            
            full_url = urljoin(BASE_URL, href)
            food_id = re.search(r'/product/([^.]+)', href)
            food_id = food_id.group(1) if food_id else f'item_{len(foods)}'
            
            foods.append({
                'food_id': food_id,
                'food_name': name,
                'product_url': full_url,
                'main_image_url': img_url
            })
        except Exception as e:
            continue
    
    # 去重
    unique_foods = []
    seen_ids = set()
    for food in foods:
        if food['food_id'] not in seen_ids:
            seen_ids.add(food['food_id'])
            unique_foods.append(food)
    
    print(f"✅ 找到 {len(unique_foods)} 个食物")
    return unique_foods

def scrape_product_detail(page, url, food_id, food_name):
    """爬取单个食物的详细信息"""
    try:
        print(f"  🔍 访问: {food_name[:40]}...")
        
        page.goto(url, wait_until='domcontentloaded', timeout=90000)
        time.sleep(3)  # 等待内容加载
        
        detail = {
            'calories': None,
            'description': '',
            'nutrition': {},
            'ingredients': [],
            'allergens': set()
        }
        
        # 1. 提取卡路里
        try:
            cal_text = page.locator('text=/\\d+ calories/i').first.text_content()
            cal_match = re.search(r'(\d+)\s*calories', cal_text, re.IGNORECASE)
            if cal_match:
                detail['calories'] = int(cal_match.group(1))
        except:
            pass
        
        # 2. 提取描述
        try:
            paras = page.query_selector_all('p')
            for p in paras:
                text = p.text_content().strip()
                if '100%' in text or 'beef' in text.lower() or len(text) > 100:
                    detail['description'] = text
                    break
        except:
            pass
        
        # 3. 点击展开营养信息
        try:
            nutrition_btn = page.locator('button:has-text("Nutrition Summary")').first
            if nutrition_btn.is_visible():
                nutrition_btn.click()
                time.sleep(1)
        except:
            pass
        
        # 4. 提取营养成分
        nutrition_fields = {
            'protein': 'protein_g',
            'total carbs': 'total_carbs_g',
            'total fat': 'total_fat_g',
            'saturated fat': 'saturated_fat_g',
            'trans fat': 'trans_fat_g',
            'cholesterol': 'cholesterol_mg',
            'sodium': 'sodium_mg',
            'dietary fiber': 'dietary_fiber_g',
            'total sugars': 'total_sugars_g',
            'added sugars': 'added_sugars_g',
            'vitamin d': 'vitamin_d_mcg',
            'calcium': 'calcium_mg',
            'iron': 'iron_mg',
            'potassium': 'potassium_mg'
        }
        
        try:
            # 查找营养信息列表
            nutrition_items = page.query_selector_all('[class*="nutrition"], [class*="nutrient"]')
            for item in nutrition_items:
                text = item.text_content().lower()
                for key, field in nutrition_fields.items():
                    if key in text:
                        value = parse_nutrition_value(text)
                        if value:
                            detail['nutrition'][field] = value
                        # 提取DV%
                        dv_match = re.search(r'(\d+)\s*%', text)
                        if dv_match:
                            detail['nutrition'][f"{field.replace('_g', '').replace('_mg', '').replace('_mcg', '')}_dv"] = int(dv_match.group(1))
        except:
            pass
        
        # 5. 点击展开过敏原信息
        try:
            allergen_btn = page.locator('button:has-text("Allergen Information")').first
            if allergen_btn.is_visible():
                allergen_btn.click()
                time.sleep(1)
        except:
            pass
        
        # 6. 提取配料信息
        try:
            # 查找配料标题和详情
            headings = page.query_selector_all('h3, h4')
            for i, heading in enumerate(headings):
                heading_text = heading.text_content().strip()
                
                # 跳过营养相关标题
                if any(x in heading_text.lower() for x in ['nutrition', 'allergen', 'related', 'disclaimer']):
                    continue
                
                # 查找紧跟的段落
                next_elem = heading.evaluate('el => el.nextElementSibling')
                if next_elem:
                    next_text = heading.evaluate('el => el.nextElementSibling?.textContent || ""')
                    
                    # 检查是否是配料信息
                    if 'ingredients:' in next_text.lower():
                        ingredients_text = re.sub(r'ingredients:\s*', '', next_text, flags=re.IGNORECASE)
                        
                        # 检测过敏原
                        allergens_found = []
                        allergen_keywords = {
                            'wheat': 'Wheat',
                            'milk': 'Milk', 
                            'egg': 'Egg',
                            'soy': 'Soy',
                            'sesame': 'Sesame',
                            'fish': 'Fish',
                            'shellfish': 'Shellfish',
                            'peanut': 'Peanut',
                            'tree nut': 'Tree Nut',
                            'barley': 'Barley'
                        }
                        
                        for keyword, allergen in allergen_keywords.items():
                            if keyword in ingredients_text.lower():
                                allergens_found.append(allergen)
                                detail['allergens'].add(allergen)
                        
                        detail['ingredients'].append({
                            'order': len(detail['ingredients']) + 1,
                            'name': heading_text,
                            'details': ingredients_text.strip(),
                            'allergens': allergens_found
                        })
        except Exception as e:
            print(f"    ⚠️ 配料提取失败: {e}")
        
        # 7. 提取配料图片
        try:
            # 查找配料轮播按钮
            carousel_buttons = page.query_selector_all('button[aria-label*="ingredient"], button[class*="carousel"]')
            if carousel_buttons:
                for i, btn in enumerate(carousel_buttons[:7], 1):
                    try:
                        btn.click()
                        time.sleep(0.5)
                        
                        # 查找当前显示的配料图片
                        img = page.query_selector('[class*="ingredient"] img, [class*="carousel"] img')
                        if img:
                            img_url = img.get_attribute('src')
                            if img_url and len(detail['ingredients']) >= i:
                                detail['ingredients'][i-1]['image_url'] = img_url
                    except:
                        pass
        except:
            pass
        
        # 转换set为list
        detail['allergens'] = list(detail['allergens'])
        
        # 打印摘要
        cal = detail['calories'] or '-'
        ing_count = len(detail['ingredients'])
        allergen_count = len(detail['allergens'])
        print(f"      ✓ {cal} Cal, {ing_count} 配料, {allergen_count} 过敏原, {len(detail['nutrition'])} 营养项")
        
        return detail
        
    except Exception as e:
        print(f"      ❌ 错误: {e}")
        return None

def main():
    print("=" * 70)
    print("🍔 麦当劳菜单完整数据爬虫 - Playwright版")
    print("=" * 70)
    
    ensure_dir(IMAGE_DIR)
    ensure_dir(INGREDIENT_IMAGE_DIR)
    
    all_foods = []
    
    with sync_playwright() as p:
        # 启动浏览器
        print("\n🌐 启动浏览器...")
        browser = p.chromium.launch(headless=False)  # headless=False 可以看到浏览器操作
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = context.new_page()
        
        # 1. 获取菜单列表
        foods = get_menu_items(page)
        
        # 2. 爬取每个食物的详情
        print(f"\n🔍 开始爬取详情 (共 {len(foods)} 个)...")
        
        for i, food in enumerate(foods):
            print(f"\n[{i+1}/{len(foods)}] {food['food_name'][:50]}...")
            
            # 下载主图
            if food.get('main_image_url'):
                img_filename = f"{food['food_id']}.jpg"
                img_path = os.path.join(IMAGE_DIR, img_filename)
                if download_image(page, food['main_image_url'], img_path):
                    food['local_image_path'] = img_path
                else:
                    food['local_image_path'] = ''
            
            # 获取详情
            detail = scrape_product_detail(page, food['product_url'], food['food_id'], food['food_name'])
            food['detail'] = detail
            
            # 下载配料图片
            if detail and detail.get('ingredients'):
                for ing in detail['ingredients']:
                    img_url = ing.get('image_url', '')
                    if img_url:
                        ing_name = ing['name'].lower().replace(' ', '_').replace("'", "").replace('®', '')
                        filename = f"{food['food_id']}_{ing_name}.jpg"
                        local_path = os.path.join(INGREDIENT_IMAGE_DIR, filename)
                        if download_image(page, img_url, local_path):
                            ing['local_image_path'] = local_path
            
            all_foods.append(food)
            
            # 避免请求过快
            time.sleep(1)
        
        browser.close()
    
    # 3. 生成Excel
    print(f"\n📊 生成Excel...")
    create_complete_excel(all_foods)
    
    # 4. 保存JSON
    with open('foods_playwright_data.json', 'w', encoding='utf-8') as f:
        json.dump(all_foods, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 完整数据已保存: foods_playwright_data.json")
    print("\n" + "=" * 70)
    print("✅ 爬取完成!")
    print("=" * 70)

def create_complete_excel(foods, output_file='McDonald_Foods_Playwright.xlsx'):
    """创建完整Excel"""
    print(f"\n📊 生成Excel: {output_file}")
    
    # 主表
    master_data = []
    for food in foods:
        detail = food.get('detail') or {}
        nutrition = detail.get('nutrition', {})
        
        master_data.append({
            'food_id': food.get('food_id', ''),
            'food_name': food.get('food_name', ''),
            'food_name_cn': '',
            'product_url': food.get('product_url', ''),
            'local_image_path': food.get('local_image_path', ''),
            'calories': detail.get('calories', ''),
            'protein_g': nutrition.get('protein_g', ''),
            'total_carbs_g': nutrition.get('total_carbs_g', ''),
            'total_fat_g': nutrition.get('total_fat_g', ''),
            'sodium_mg': nutrition.get('sodium_mg', ''),
            'description': detail.get('description', '')[:500],
            'allergens': ', '.join(detail.get('allergens', [])),
            'ingredient_count': len(detail.get('ingredients', [])),
            'scraped_date': datetime.now().strftime('%Y-%m-%d')
        })
    
    df_master = pd.DataFrame(master_data)
    
    # 营养成分详细表
    nutrition_data = []
    for food in foods:
        detail = food.get('detail') or {}
        nutrition = detail.get('nutrition', {})
        if nutrition:
            row = {'food_id': food.get('food_id', ''), 'food_name': food.get('food_name', '')}
            row.update(nutrition)
            nutrition_data.append(row)
    
    df_nutrition = pd.DataFrame(nutrition_data) if nutrition_data else pd.DataFrame()
    
    # 配料表
    ingredients_data = []
    for food in foods:
        detail = food.get('detail') or {}
        for ing in detail.get('ingredients', []):
            ingredients_data.append({
                'food_id': food.get('food_id', ''),
                'food_name': food.get('food_name', ''),
                'ingredient_order': ing.get('order', ''),
                'ingredient_name': ing.get('name', ''),
                'ingredient_image_url': ing.get('image_url', ''),
                'local_image_path': ing.get('local_image_path', ''),
                'ingredient_details': ing.get('details', '')[:1000],
                'contains_allergens': ', '.join(ing.get('allergens', []))
            })
    
    df_ingredients = pd.DataFrame(ingredients_data) if ingredients_data else pd.DataFrame()
    
    # 过敏原表
    allergen_data = []
    for food in foods:
        detail = food.get('detail') or {}
        for ing in detail.get('ingredients', []):
            for allergen in ing.get('allergens', []):
                allergen_data.append({
                    'food_id': food.get('food_id', ''),
                    'food_name': food.get('food_name', ''),
                    'allergen_type': allergen,
                    'allergen_source': ing.get('name', ''),
                    'severity': 'Contains'
                })
    
    df_allergens = pd.DataFrame(allergen_data) if allergen_data else pd.DataFrame()
    
    # 保存Excel
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        df_master.to_excel(writer, sheet_name='01_Foods_Master', index=False)
        
        if not df_nutrition.empty:
            df_nutrition.to_excel(writer, sheet_name='02_Nutrition', index=False)
        
        if not df_ingredients.empty:
            df_ingredients.to_excel(writer, sheet_name='03_Ingredients', index=False)
        
        if not df_allergens.empty:
            df_allergens.to_excel(writer, sheet_name='04_Allergens', index=False)
        
        # 统计
        stats = pd.DataFrame({
            '统计项': [
                '食物总数',
                '有营养数据',
                '有配料数据',
                '配料总数',
                '过敏原记录数',
                '下载图片数'
            ],
            '数量': [
                len(df_master),
                len(df_nutrition),
                df_ingredients['food_id'].nunique() if not df_ingredients.empty else 0,
                len(df_ingredients),
                len(df_allergens),
                df_master['local_image_path'].notna().sum()
            ]
        })
        stats.to_excel(writer, sheet_name='05_Statistics', index=False)
    
    print(f"✅ Excel已保存: {output_file}")
    print(f"   - 食物总数: {len(df_master)}")
    print(f"   - 营养数据: {len(df_nutrition)} 条")
    print(f"   - 配料数据: {len(df_ingredients)} 条")
    print(f"   - 过敏原数据: {len(df_allergens)} 条")

if __name__ == '__main__':
    main()
