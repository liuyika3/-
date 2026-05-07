#!/usr/bin/env python3
"""
简化版 Playwright 爬虫 - 直接按索引点击
"""

import json
import time
import logging
import re
from pathlib import Path
from datetime import datetime
from playwright.sync_api import sync_playwright

# 配置日志
log_dir = Path('logs')
log_dir.mkdir(exist_ok=True)
log_file = log_dir / f'scrape_simple_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


def scrape_item(page, idx, name):
    """爬取单个菜品"""
    try:
        # 使用 JavaScript 直接按索引查找并点击 [more info] 链接
        logger.info(f"[{idx+1}] 点击: {name}")
        
        # 查找所有 [more info] 链接并点击第 idx 个
        clicked = page.evaluate(f'''
            () => {{
                const links = document.querySelectorAll('a[href="viewLabel"]');
                if (links[{idx}]) {{
                    links[{idx}].click();
                    return true;
                }}
                return false;
            }}
        ''')
        
        if not clicked:
            logger.error(f"  未能点击第 {idx} 个链接")
            return None
        
        # 等待对话框
        time.sleep(3)
        
        # 检查对话框是否出现
        dialog = page.query_selector('dialog')
        if not dialog:
            logger.error(f"  对话框未出现")
            return None
        
        # 提取数据
        logger.info(f"  提取数据...")
        dialog_text = dialog.inner_text()
        
        # 简化的数据提取
        detail = {
            'name': name,
            'dialog_text': dialog_text[:500]  # 先保存部分文本验证
        }
        
        # 提取 Nutrition Facts
        cal_match = re.search(r'Calories\s+(\d+)', dialog_text)
        if cal_match:
            detail['calories'] = cal_match.group(1)
        
        # 提取过敏原
        detail['allergens'] = {}
        for allergen in ['Eggs', 'Gluten', 'Milk', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts', 'Wheat', 'Soy', 'MSG', 'Sesame']:
            if f'{allergen}' in dialog_text:
                if 'contains' in dialog_text.lower() and allergen in dialog_text:
                    detail['allergens'][allergen] = 'check_manually'
        
        # 提取成分
        if 'INGREDIENTS:' in dialog_text:
            ing_start = dialog_text.find('INGREDIENTS:')
            ing_text = dialog_text[ing_start:ing_start+500]
            detail['ingredients_preview'] = ing_text[:200]
        
        # 关闭对话框
        try:
            page.evaluate('document.querySelector("dialog button")?.click()')
            time.sleep(1)
            logger.info(f"  ✓ 完成")
        except:
            pass
        
        return detail
        
    except Exception as e:
        logger.error(f"  错误: {e}")
        return None


def main():
    # 加载 ref 映射
    with open('more_info_refs.json', 'r', encoding='utf-8') as f:
        ref_map = json.load(f)
    
    # 加载或创建进度
    progress_file = Path('progress_simple.json')
    if progress_file.exists():
        with open(progress_file, 'r', encoding='utf-8') as f:
            progress = json.load(f)
            start_idx = progress.get('last_index', 0) + 1
    else:
        start_idx = 0
        progress = {'completed': [], 'last_index': -1}
    
    output_dir = Path('detailed_data_simple')
    output_dir.mkdir(exist_ok=True)
    
    logger.info(f"从第 {start_idx+1} 个菜品开始")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        try:
            # 加载页面
            logger.info("加载页面...")
            page.goto('https://www.nutritionix.com/taco-bell/menu/premium', wait_until='networkidle', timeout=90000)
            time.sleep(5)
            logger.info("页面加载完成")
            
            # 爬取菜品
            for idx in range(start_idx, min(start_idx + 20, len(ref_map))):  # 先爬20个测试
                item = ref_map[idx]
                name = item['name']
                
                detail = scrape_item(page, idx, name)
                
                if detail:
                    # 保存
                    safe_name = re.sub(r'[<>:"/\\|?*®™]', '_', name)[:80]
                    output_file = output_dir / f"{idx+1:03d}_{safe_name}.json"
                    with open(output_file, 'w', encoding='utf-8') as f:
                        json.dump(detail, f, ensure_ascii=False, indent=2)
                    
                    # 更新进度
                    progress['completed'].append(name)
                    progress['last_index'] = idx
                    with open(progress_file, 'w', encoding='utf-8') as f:
                        json.dump(progress, f, ensure_ascii=False, indent=2)
                
                time.sleep(1)  # 延迟
            
            logger.info("批量爬取完成!")
            
        except Exception as e:
            logger.error(f"错误: {e}")
        finally:
            browser.close()


if __name__ == '__main__':
    main()
