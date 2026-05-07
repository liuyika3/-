#!/usr/bin/env python3
"""
Taco Bell 详细营养信息自动化爬取脚本 (Playwright)
功能:
1. 自动点击所有菜品的 [more info] 按钮
2. 提取 Nutrition Facts, Allergens, Ingredients
3. 支持断点续传 - 从中断位置继续
4. 详细日志记录
"""

import json
import time
import logging
import re
from pathlib import Path
from datetime import datetime
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

# 配置日志
log_dir = Path('logs')
log_dir.mkdir(exist_ok=True)
log_file = log_dir / f'scrape_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class TacoBellDetailScraper:
    def __init__(self, output_dir='detailed_data', progress_file='scraping_progress.json'):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.progress_file = Path(progress_file)
        
        # 加载进度
        self.progress = self.load_progress()
        
        # 加载 ref 映射
        with open('more_info_refs.json', 'r', encoding='utf-8') as f:
            self.ref_map = json.load(f)
        
        # 已完成的菜品
        self.completed_items = set(self.progress.get('completed', []))
        
        logger.info(f"总菜品数: {len(self.ref_map)}")
        logger.info(f"已完成: {len(self.completed_items)}")
        logger.info(f"待爬取: {len(self.ref_map) - len(self.completed_items)}")
    
    def load_progress(self):
        """加载爬取进度"""
        if self.progress_file.exists():
            with open(self.progress_file, 'r', encoding='utf-8') as f:
                progress = json.load(f)
                logger.info(f"从进度文件恢复: {progress.get('last_completed', 'N/A')}")
                return progress
        return {
            'completed': [],
            'failed': [],
            'last_index': 0,
            'last_completed': None,
            'start_time': datetime.now().isoformat()
        }
    
    def save_progress(self):
        """保存爬取进度"""
        self.progress['last_update'] = datetime.now().isoformat()
        with open(self.progress_file, 'w', encoding='utf-8') as f:
            json.dump(self.progress, f, ensure_ascii=False, indent=2)
    
    def extract_detail_from_dialog(self, page):
        """从对话框中提取详细信息"""
        try:
            # 等待对话框出现
            dialog = page.wait_for_selector('dialog[active]', timeout=10000)
            
            # 获取完整的对话框 HTML
            dialog_html = dialog.inner_html()
            
            # 提取菜品名称
            name_elem = dialog.query_selector('generic')
            name = name_elem.inner_text() if name_elem else 'Unknown'
            
            detail = {
                'name': name,
                'nutrition_facts': {},
                'allergens': {},
                'ingredients': ''
            }
            
            # 1. 提取 Nutrition Facts
            try:
                # Serving Size
                serving_input = dialog.query_selector('textbox')
                if serving_input:
                    serving_value = serving_input.get_attribute('value') or serving_input.input_value()
                    serving_unit_elem = dialog.query_selector('generic:has-text("oz"), generic:has-text("g")')
                    serving_unit = serving_unit_elem.inner_text() if serving_unit_elem else 'oz'
                    detail['nutrition_facts']['serving_size'] = f"{serving_value} {serving_unit}"
                
                # 使用更可靠的选择器提取营养数据
                nutrition_section = dialog.query_selector('region[aria-label="nutrition label"]')
                if nutrition_section:
                    nutrition_text = nutrition_section.inner_text()
                    
                    # Calories
                    cal_match = re.search(r'Calories[^\d]*(\d+)', nutrition_text)
                    if cal_match:
                        detail['nutrition_facts']['calories'] = cal_match.group(1)
                    
                    # Total Fat
                    tf_match = re.search(r'Total Fat[^\d]*([\d.]+)g[^\d]*(\d+)%', nutrition_text)
                    if tf_match:
                        detail['nutrition_facts']['total_fat'] = {
                            'value': tf_match.group(1) + 'g',
                            'daily_value': tf_match.group(2) + '%'
                        }
                    
                    # Saturated Fat
                    sf_match = re.search(r'Saturated Fat[^\d]*([\d.]+)g[^\d]*(\d+)%', nutrition_text)
                    if sf_match:
                        detail['nutrition_facts']['saturated_fat'] = {
                            'value': sf_match.group(1) + 'g',
                            'daily_value': sf_match.group(2) + '%'
                        }
                    
                    # Trans Fat
                    trans_match = re.search(r'Trans\s+Fat[^\d]*([\d.]+)g', nutrition_text)
                    if trans_match:
                        detail['nutrition_facts']['trans_fat'] = trans_match.group(1) + 'g'
                    
                    # Cholesterol
                    chol_match = re.search(r'Cholesterol[^\d]*(\d+)mg[^\d]*(\d+)%', nutrition_text)
                    if chol_match:
                        detail['nutrition_facts']['cholesterol'] = {
                            'value': chol_match.group(1) + 'mg',
                            'daily_value': chol_match.group(2) + '%'
                        }
                    
                    # Sodium
                    sodium_match = re.search(r'Sodium[^\d]*(\d+)mg[^\d]*(\d+)%', nutrition_text)
                    if sodium_match:
                        detail['nutrition_facts']['sodium'] = {
                            'value': sodium_match.group(1) + 'mg',
                            'daily_value': sodium_match.group(2) + '%'
                        }
                    
                    # Total Carbohydrates
                    carb_match = re.search(r'Total Carbohydrates[^\d]*([\d.]+)g[^\d]*(\d+)%', nutrition_text)
                    if carb_match:
                        detail['nutrition_facts']['total_carbohydrates'] = {
                            'value': carb_match.group(1) + 'g',
                            'daily_value': carb_match.group(2) + '%'
                        }
                    
                    # Dietary Fiber
                    fiber_match = re.search(r'Dietary Fiber[^\d]*([\d.]+)g[^\d]*(\d+)%', nutrition_text)
                    if fiber_match:
                        detail['nutrition_facts']['dietary_fiber'] = {
                            'value': fiber_match.group(1) + 'g',
                            'daily_value': fiber_match.group(2) + '%'
                        }
                    
                    # Sugars
                    sugar_match = re.search(r'Sugars[^\d]*([\d.]+)g', nutrition_text)
                    if sugar_match:
                        detail['nutrition_facts']['sugars'] = sugar_match.group(1) + 'g'
                    
                    # Added Sugars
                    added_sugar_match = re.search(r'Added Sugars[^\d]*(\d+)%', nutrition_text)
                    if added_sugar_match:
                        detail['nutrition_facts']['added_sugars'] = {'daily_value': added_sugar_match.group(1) + '%'}
                    
                    # Protein
                    protein_match = re.search(r'Protein[^\d]*([<>]?\s*[\d.]+)g', nutrition_text)
                    if protein_match:
                        detail['nutrition_facts']['protein'] = protein_match.group(1).strip() + 'g'
                    
                    # Vitamins & Minerals
                    vit_d_match = re.search(r'Vitamin D[^\d]*([\d.]+)mcg[^\d]*(\d+)%', nutrition_text)
                    if vit_d_match:
                        detail['nutrition_facts']['vitamin_d'] = {
                            'value': vit_d_match.group(1) + 'mcg',
                            'daily_value': vit_d_match.group(2) + '%'
                        }
                    
                    calcium_match = re.search(r'Calcium[^\d]*(\d+)mg[^\d]*(\d+)%', nutrition_text)
                    if calcium_match:
                        detail['nutrition_facts']['calcium'] = {
                            'value': calcium_match.group(1) + 'mg',
                            'daily_value': calcium_match.group(2) + '%'
                        }
                    
                    iron_match = re.search(r'Iron[^\d]*([\d.]+)mg[^\d]*(\d+)%', nutrition_text)
                    if iron_match:
                        detail['nutrition_facts']['iron'] = {
                            'value': iron_match.group(1) + 'mg',
                            'daily_value': iron_match.group(2) + '%'
                        }
                    
                    potassium_match = re.search(r'Potassium[^\d]*(\d+)mg[^\d]*(\d+)%', nutrition_text)
                    if potassium_match:
                        detail['nutrition_facts']['potassium'] = {
                            'value': potassium_match.group(1) + 'mg',
                            'daily_value': potassium_match.group(2) + '%'
                        }
            
            except Exception as e:
                logger.warning(f"提取营养信息时出错: {e}")
            
            # 2. 提取 Allergens
            try:
                allergen_table = dialog.query_selector('table')
                if allergen_table:
                    rows = allergen_table.query_selector_all('tr')
                    for row in rows:
                        cells = row.query_selector_all('td')
                        if len(cells) >= 2:
                            allergen_name = cells[0].inner_text().strip()
                            # 检查第二个单元格是否有 emphasis 标记(红色感叹号表示包含)
                            contains_marker = cells[1].query_selector('emphasis')
                            if contains_marker:
                                # 检查文本内容
                                cell_text = cells[1].inner_text()
                                if 'contains' in cell_text.lower():
                                    detail['allergens'][allergen_name] = 'contains'
                                else:
                                    detail['allergens'][allergen_name] = 'does_not_contain'
                            else:
                                detail['allergens'][allergen_name] = 'does_not_contain'
            
            except Exception as e:
                logger.warning(f"提取过敏原信息时出错: {e}")
            
            # 3. 提取 Ingredients
            try:
                # 查找 INGREDIENTS: 标题后的段落
                ingredients_heading = dialog.query_selector('heading:has-text("INGREDIENTS")')
                if ingredients_heading:
                    # 获取下一个兄弟元素
                    next_elem = dialog.evaluate('''(heading) => {
                        let next = heading.nextElementSibling;
                        while (next && next.tagName !== 'P') {
                            next = next.nextElementSibling;
                        }
                        return next ? next.innerText : '';
                    }''', ingredients_heading)
                    
                    if next_elem:
                        detail['ingredients'] = next_elem
                    else:
                        # 尝试直接获取段落
                        para = dialog.query_selector('paragraph')
                        if para:
                            para_text = para.inner_text()
                            if ':' in para_text:
                                detail['ingredients'] = para_text
            
            except Exception as e:
                logger.warning(f"提取成分信息时出错: {e}")
            
            return detail
            
        except Exception as e:
            logger.error(f"提取对话框数据失败: {e}")
            return None
    
    def scrape_all(self):
        """执行批量爬取"""
        logger.info("="*70)
        logger.info("开始批量爬取 Taco Bell 详细营养信息")
        logger.info("="*70)
        
        with sync_playwright() as p:
            # 启动浏览器
            browser = p.chromium.launch(headless=False)  # headless=False 可以看到进度
            page = browser.new_page()
            
            try:
                # 访问 Nutritionix 页面
                logger.info("正在加载页面...")
                page.goto('https://www.nutritionix.com/taco-bell/menu/premium', wait_until='networkidle', timeout=90000)
                logger.info("页面加载完成,等待内容渲染...")
                
                # 等待页面完全加载
                time.sleep(5)
                
                # 验证页面已加载
                try:
                    page.wait_for_selector('a:has-text("more info")', timeout=10000)
                    logger.info("发现 [more info] 链接,页面已就绪")
                except:
                    logger.warning("未能找到 [more info] 链接,但继续尝试")
                
                # 遍历所有菜品
                total = len(self.ref_map)
                start_index = self.progress.get('last_index', 0)
                
                for idx in range(start_index, total):
                    item = self.ref_map[idx]
                    name = item['name']
                    ref = item['ref']
                    
                    # 跳过已完成的菜品
                    if name in self.completed_items:
                        logger.info(f"[{idx+1}/{total}] {name} - 已完成,跳过")
                        continue
                    
                    logger.info(f"[{idx+1}/{total}] 正在处理: {name}")
                    
                    try:
                        # 使用 JavaScript 直接点击
                        logger.info(f"  尝试点击 ref={ref}...")
                        
                        # 方法1: 尝试使用 aria-ref
                        clicked = page.evaluate(f'''
                            () => {{
                                const elem = document.querySelector('[aria-ref="{ref}"]');
                                if (elem) {{
                                    elem.click();
                                    return true;
                                }}
                                return false;
                            }}
                        ''')
                        
                        if not clicked:
                            logger.warning(f"  方法1失败,尝试方法2...")
                            # 方法2: 查找包含菜品名称的链接
                            try:
                                more_info_links = page.query_selector_all('a:has-text("more info")')
                                for link in more_info_links:
                                    try:
                                        # 获取父行
                                        parent = link.evaluate('(el) => el.closest("tr")')
                                        if parent:
                                            # 获取行文本
                                            row_text = link.evaluate('(el) => el.closest("tr").innerText')
                                            if row_text and name.lower() in row_text.lower():
                                                link.click()
                                                clicked = True
                                                break
                                    except:
                                        continue
                            except Exception as e:
                                logger.warning(f"  方法2出错: {e}")
                        
                        if clicked:
                            logger.info(f"  ✓ 点击成功,等待对话框...")
                            
                            # 等待对话框出现
                            try:
                                page.wait_for_selector('dialog', state='visible', timeout=10000)
                                logger.info(f"  ✓ 对话框已出现")
                                time.sleep(1)  # 确保内容完全加载
                            except:
                                logger.warning(f"  ⚠ 对话框未出现,尝试继续")
                            
                            # 提取数据
                            detail = self.extract_detail_from_dialog(page)
                            
                            if detail:
                                # 安全的文件名
                                safe_name = re.sub(r'[<>:"/\\|?*®™]', '_', name)
                                item_file = self.output_dir / f"{idx+1:03d}_{safe_name[:100]}.json"
                                
                                with open(item_file, 'w', encoding='utf-8') as f:
                                    json.dump(detail, f, ensure_ascii=False, indent=2)
                                
                                logger.info(f"  ✓ 数据已保存: {item_file.name}")
                                
                                # 更新进度
                                self.completed_items.add(name)
                                self.progress['completed'] = list(self.completed_items)
                                self.progress['last_index'] = idx
                                self.progress['last_completed'] = name
                                self.save_progress()
                            else:
                                logger.error(f"  ✗ 数据提取失败")
                                self.progress['failed'].append({'index': idx, 'name': name, 'reason': 'extraction_failed'})
                            
                            # 关闭对话框
                            try:
                                # 查找并点击关闭按钮
                                close_btns = page.query_selector_all('dialog button, button:has-text("Close"), button:has-text("close")')
                                for btn in close_btns:
                                    try:
                                        btn.click(timeout=2000)
                                        logger.info(f"  ✓ 对话框已关闭")
                                        break
                                    except:
                                        continue
                                
                                # 额外等待确保对话框关闭
                                time.sleep(0.5)
                            except Exception as e:
                                logger.warning(f"  ⚠ 关闭对话框时出错: {e}")
                            
                            # 每10个菜品保存一次汇总
                            if (idx + 1) % 10 == 0:
                                self.save_summary()
                                logger.info(f"  ✓ 已保存阶段性汇总 ({idx+1}/{total})")
                        
                        else:
                            logger.error(f"  ✗ 未能点击 [more info] 按钮")
                            self.progress['failed'].append({'index': idx, 'name': name, 'reason': 'click_failed'})
                    
                    except PlaywrightTimeout as e:
                        logger.error(f"  ✗ 超时: {e}")
                        self.progress['failed'].append({'index': idx, 'name': name, 'reason': 'timeout'})
                        # 继续下一个
                        continue
                    
                    except Exception as e:
                        logger.error(f"  ✗ 错误: {e}")
                        self.progress['failed'].append({'index': idx, 'name': name, 'reason': str(e)})
                        # 继续下一个
                        continue
                    
                    # 短暂延迟,避免请求过快
                    time.sleep(0.5)
                
                # 最终保存汇总
                self.save_summary()
                logger.info("批量爬取完成!")
                
            except Exception as e:
                logger.error(f"爬取过程中出现严重错误: {e}")
                self.save_progress()
            
            finally:
                browser.close()
        
        # 生成最终报告
        self.generate_report()
    
    def save_summary(self):
        """保存汇总数据"""
        all_details = []
        
        # 读取所有已保存的详细信息
        for json_file in sorted(self.output_dir.glob('*.json')):
            with open(json_file, 'r', encoding='utf-8') as f:
                detail = json.load(f)
                all_details.append(detail)
        
        # 保存汇总
        summary_file = self.output_dir / 'all_details_summary.json'
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(all_details, f, ensure_ascii=False, indent=2)
        
        logger.info(f"汇总已保存: {len(all_details)} 个菜品")
    
    def generate_report(self):
        """生成最终报告"""
        report = f"""# Taco Bell 详细营养信息爬取报告

## 爬取统计

- **总菜品数**: {len(self.ref_map)}
- **成功爬取**: {len(self.completed_items)}
- **失败数量**: {len(self.progress.get('failed', []))}
- **成功率**: {len(self.completed_items)/len(self.ref_map)*100:.1f}%

## 爬取时间

- **开始时间**: {self.progress.get('start_time', 'N/A')}
- **完成时间**: {datetime.now().isoformat()}

## 失败列表

"""
        
        failed = self.progress.get('failed', [])
        if failed:
            for item in failed:
                report += f"- [{item.get('index', 'N/A')}] {item.get('name', 'N/A')}: {item.get('reason', 'unknown')}\n"
        else:
            report += "无失败项\n"
        
        report += f"""

## 输出文件

- **详细数据目录**: `{self.output_dir}/`
- **汇总文件**: `{self.output_dir}/all_details_summary.json`
- **进度文件**: `{self.progress_file}`
- **日志文件**: `{log_file}`

---

**报告生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        
        report_file = self.output_dir / '爬取报告.md'
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)
        
        logger.info(f"最终报告已生成: {report_file}")


def main():
    scraper = TacoBellDetailScraper()
    scraper.scrape_all()


if __name__ == '__main__':
    main()
