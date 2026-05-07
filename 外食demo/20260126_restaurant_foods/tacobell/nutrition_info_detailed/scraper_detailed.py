#!/usr/bin/env python3
"""
Taco Bell 营养信息详细爬虫
从 https://www.tacobell.com/nutrition/info 爬取所有食物的营养信息
"""

import json
import logging
import time
from pathlib import Path
from typing import Dict, List
import pandas as pd
import requests
from bs4 import BeautifulSoup

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TacoBellNutritionScraper:
    def __init__(self, output_dir: str = "output"):
        self.base_url = "https://www.tacobell.com"
        self.nutrition_url = "https://www.tacobell.com/nutrition/info"
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        
        self.session = requests.Session()
        self.session.headers.update(self.headers)
    
    def get_main_table_data(self) -> List[Dict]:
        """
        爬取主页面的表格数据
        返回所有菜品的基本营养信息列表
        """
        logger.info(f"正在爬取主页面: {self.nutrition_url}")
        
        try:
            response = self.session.get(self.nutrition_url, timeout=30)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 查找营养信息表格
            # 根据页面结构,这应该是一个 iframe 嵌入的 Nutritionix 页面
            # 我们需要找到 iframe 的 src
            iframe = soup.find('iframe', {'id': 'nutritionix'})
            
            if not iframe:
                logger.error("未找到 nutritionix iframe")
                return []
            
            iframe_url = iframe.get('src')
            if not iframe_url.startswith('http'):
                iframe_url = self.base_url + iframe_url
            
            logger.info(f"找到 Nutritionix iframe URL: {iframe_url}")
            
            # 访问 iframe 内容
            response = self.session.get(iframe_url, timeout=30)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 查找表格中的所有行
            items = []
            rows = soup.find_all('tr', class_=lambda x: x and 'item-row' in x) if soup.find_all('tr', class_=lambda x: x and 'item-row' in x) else soup.select('tbody tr')
            
            logger.info(f"找到 {len(rows)} 行数据")
            
            for row in rows:
                try:
                    # 提取菜品名称
                    name_cell = row.find('td', class_='item-name') or row.find_all('td')[0]
                    if not name_cell:
                        continue
                    
                    name_link = name_cell.find('a')
                    if not name_link:
                        continue
                    
                    name = name_link.text.strip()
                    
                    # 提取 more info 链接
                    more_info_link = row.find('a', text=lambda x: x and 'more info' in x.lower())
                    more_info_url = None
                    if more_info_link:
                        more_info_url = more_info_link.get('href')
                        if more_info_url and not more_info_url.startswith('http'):
                            more_info_url = self.base_url + more_info_url
                    
                    # 提取所有的 td 数据
                    cells = row.find_all('td')
                    
                    item_data = {
                        'name': name,
                        'more_info_url': more_info_url,
                        'calories': self._clean_number(cells[1].text) if len(cells) > 1 else '',
                        'total_fat_g': self._clean_number(cells[2].text) if len(cells) > 2 else '',
                        'saturated_fat_g': self._clean_number(cells[3].text) if len(cells) > 3 else '',
                        'trans_fat_g': self._clean_number(cells[4].text) if len(cells) > 4 else '',
                        'cholesterol_mg': self._clean_number(cells[5].text) if len(cells) > 5 else '',
                        'sodium_mg': self._clean_number(cells[6].text) if len(cells) > 6 else '',
                        'total_carbohydrates_g': self._clean_number(cells[7].text) if len(cells) > 7 else '',
                        'dietary_fiber_g': self._clean_number(cells[8].text) if len(cells) > 8 else '',
                        'sugars_g': self._clean_number(cells[9].text) if len(cells) > 9 else '',
                        'added_sugars_g': self._clean_number(cells[10].text) if len(cells) > 10 else '',
                        'protein_g': self._clean_number(cells[11].text) if len(cells) > 11 else '',
                    }
                    
                    items.append(item_data)
                    logger.info(f"提取菜品: {name}")
                    
                except Exception as e:
                    logger.warning(f"解析行数据失败: {e}")
                    continue
            
            return items
            
        except Exception as e:
            logger.error(f"爬取主页面失败: {e}")
            return []
    
    def _clean_number(self, text: str) -> str:
        """清理数字文本"""
        if not text:
            return ''
        # 移除逗号和其他非数字字符(保留小数点和 < 符号)
        text = text.strip().replace(',', '')
        return text
    
    def get_detailed_info(self, item_name: str, more_info_url: str = None) -> Dict:
        """
        获取单个菜品的详细信息
        包括完整的 Nutrition Facts, 过敏原信息, 和成分说明
        """
        logger.info(f"正在获取详细信息: {item_name}")
        
        detailed_data = {
            'name': item_name,
            'nutrition_facts': {},
            'allergens': {},
            'ingredients': ''
        }
        
        if not more_info_url:
            logger.warning(f"{item_name} 没有 more info URL")
            return detailed_data
        
        try:
            # 访问详情页面
            response = self.session.get(more_info_url, timeout=30)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 1. 提取 Nutrition Facts
            nutrition_section = soup.find('div', class_='nutrition-facts') or soup.find('div', class_='nf')
            if nutrition_section:
                # 提取所有营养素信息
                for label in nutrition_section.find_all(['div', 'p'], class_=lambda x: x and ('nf-line' in str(x) or 'nutrient' in str(x))):
                    try:
                        label_text = label.get_text(separator=' ', strip=True)
                        if ':' in label_text or 'g' in label_text or 'mg' in label_text:
                            parts = label_text.split()
                            if len(parts) >= 2:
                                key = parts[0].replace(':', '')
                                value = ' '.join(parts[1:])
                                detailed_data['nutrition_facts'][key] = value
                    except:
                        continue
            
            # 2. 提取过敏原信息
            allergen_section = soup.find('div', class_='allergen') or soup.find_all(text=lambda t: 'allergen' in t.lower() if t else False)
            if allergen_section:
                # 查找所有过敏原标识
                allergen_list = []
                # 常见过敏原
                common_allergens = ['Eggs', 'Gluten', 'Milk', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts', 'Wheat', 'Soy', 'MSG', 'Sesame']
                
                for allergen in common_allergens:
                    # 在页面中查找过敏原及其状态
                    allergen_elem = soup.find(text=lambda t: allergen in t if t else False)
                    if allergen_elem:
                        # 尝试找到相邻的指示器(红色/绿色圆点)
                        parent = allergen_elem.find_parent()
                        if parent:
                            # 查找指示器
                            indicator = parent.find('span', class_=['contains', 'does-not-contain'])
                            status = 'contains' if indicator and 'contains' in indicator.get('class', []) else 'does_not_contain'
                            detailed_data['allergens'][allergen] = status
                            allergen_list.append(f"{allergen}: {status}")
            
            # 3. 提取成分说明
            ingredients_section = soup.find('div', class_='ingredients') or soup.find('div', text=lambda t: 'INGREDIENTS:' in t.upper() if t else False)
            if ingredients_section:
                # 如果找到标题,获取其后的文本
                if ingredients_section.name in ['h2', 'h3', 'p']:
                    next_elem = ingredients_section.find_next_sibling()
                    if next_elem:
                        detailed_data['ingredients'] = next_elem.get_text(strip=True)
                else:
                    detailed_data['ingredients'] = ingredients_section.get_text(strip=True)
            
            # 如果没有找到,尝试查找包含 "Ingredients:" 的段落
            if not detailed_data['ingredients']:
                for p in soup.find_all('p'):
                    text = p.get_text(strip=True)
                    if 'ingredients:' in text.lower():
                        detailed_data['ingredients'] = text
                        break
            
            time.sleep(0.5)  # 避免请求过快
            
        except Exception as e:
            logger.error(f"获取 {item_name} 详细信息失败: {e}")
        
        return detailed_data
    
    def scrape_all(self):
        """执行完整的爬取流程"""
        logger.info("=" * 70)
        logger.info("开始爬取 Taco Bell 营养信息")
        logger.info("=" * 70)
        
        # 1. 获取主表格数据
        main_data = self.get_main_table_data()
        logger.info(f"\n成功获取 {len(main_data)} 个菜品的基本信息")
        
        if not main_data:
            logger.error("未能获取主表格数据,退出")
            return
        
        # 保存主表格数据
        df_main = pd.DataFrame(main_data)
        main_excel = self.output_dir / "nutrition_main_table.xlsx"
        df_main.to_excel(main_excel, index=False, sheet_name='Nutrition Info')
        logger.info(f"主表格数据已保存: {main_excel}")
        
        # 2. 获取每个菜品的详细信息
        detailed_data_list = []
        total = len(main_data)
        
        for idx, item in enumerate(main_data, 1):
            logger.info(f"\n[{idx}/{total}] 正在处理: {item['name']}")
            
            detailed = self.get_detailed_info(item['name'], item.get('more_info_url'))
            detailed_data_list.append(detailed)
            
            # 每10个保存一次,避免数据丢失
            if idx % 10 == 0:
                self._save_detailed_data(detailed_data_list)
                logger.info(f"已保存前 {idx} 个菜品的详细信息")
        
        # 3. 保存最终的详细数据
        self._save_detailed_data(detailed_data_list)
        
        # 4. 合并数据并导出
        self._merge_and_export(main_data, detailed_data_list)
        
        logger.info("\n" + "=" * 70)
        logger.info("爬取完成!")
        logger.info(f"输出目录: {self.output_dir.absolute()}")
        logger.info("=" * 70)
    
    def _save_detailed_data(self, detailed_data_list: List[Dict]):
        """保存详细数据到 JSON"""
        detailed_json = self.output_dir / "nutrition_detailed.json"
        with open(detailed_json, 'w', encoding='utf-8') as f:
            json.dump(detailed_data_list, f, ensure_ascii=False, indent=2)
    
    def _merge_and_export(self, main_data: List[Dict], detailed_data: List[Dict]):
        """合并数据并导出为多格式"""
        logger.info("\n正在合并数据...")
        
        # 创建字典以便快速查找
        detailed_dict = {item['name']: item for item in detailed_data}
        
        # 合并数据
        merged_data = []
        for item in main_data:
            name = item['name']
            merged_item = item.copy()
            
            if name in detailed_dict:
                detailed = detailed_dict[name]
                # 添加详细信息
                merged_item['ingredients'] = detailed.get('ingredients', '')
                
                # 添加过敏原信息
                allergens = detailed.get('allergens', {})
                for allergen, status in allergens.items():
                    merged_item[f'allergen_{allergen.lower().replace(" ", "_")}'] = status
                
                # 添加额外的营养信息
                nutrition_facts = detailed.get('nutrition_facts', {})
                for key, value in nutrition_facts.items():
                    if key not in merged_item:
                        merged_item[f'nutrition_{key.lower()}'] = value
            
            merged_data.append(merged_item)
        
        # 导出为 Excel (多个 sheet)
        excel_file = self.output_dir / "nutrition_complete.xlsx"
        with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
            # Sheet 1: 主营养数据
            df_main = pd.DataFrame(main_data)
            df_main.to_excel(writer, sheet_name='Main Nutrition', index=False)
            
            # Sheet 2: 完整合并数据
            df_merged = pd.DataFrame(merged_data)
            df_merged.to_excel(writer, sheet_name='Complete Data', index=False)
            
            # Sheet 3: 过敏原信息
            allergen_data = []
            for item in detailed_data:
                allergen_item = {'name': item['name']}
                allergen_item.update(item.get('allergens', {}))
                allergen_data.append(allergen_item)
            df_allergens = pd.DataFrame(allergen_data)
            df_allergens.to_excel(writer, sheet_name='Allergens', index=False)
            
            # Sheet 4: 成分信息
            ingredient_data = [{'name': item['name'], 'ingredients': item.get('ingredients', '')} for item in detailed_data]
            df_ingredients = pd.DataFrame(ingredient_data)
            df_ingredients.to_excel(writer, sheet_name='Ingredients', index=False)
        
        logger.info(f"Excel 文件已保存: {excel_file}")
        
        # 导出为 CSV
        csv_file = self.output_dir / "nutrition_complete.csv"
        df_merged.to_csv(csv_file, index=False, encoding='utf-8-sig')
        logger.info(f"CSV 文件已保存: {csv_file}")
        
        # 导出为 JSON
        json_file = self.output_dir / "nutrition_complete.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(merged_data, f, ensure_ascii=False, indent=2)
        logger.info(f"JSON 文件已保存: {json_file}")
        
        # 生成统计报告
        self._generate_report(len(main_data), len(detailed_data))
    
    def _generate_report(self, main_count: int, detailed_count: int):
        """生成爬取报告"""
        report_file = self.output_dir / "爬取报告.md"
        
        report_content = f"""# Taco Bell 营养信息爬取报告

## 爬取概况

- **爬取时间**: {time.strftime('%Y-%m-%d %H:%M:%S')}
- **数据源**: https://www.tacobell.com/nutrition/info
- **爬取方式**: Python + BeautifulSoup + Requests

## 数据统计

- **菜品总数**: {main_count}
- **详细信息获取数**: {detailed_count}
- **成功率**: {detailed_count/main_count*100:.1f}%

## 数据字段

### 主营养数据表格字段
- 菜品名称 (name)
- 卡路里 (calories)
- 总脂肪 (total_fat_g)
- 饱和脂肪 (saturated_fat_g)
- 反式脂肪 (trans_fat_g)
- 胆固醇 (cholesterol_mg)
- 钠 (sodium_mg)
- 总碳水化合物 (total_carbohydrates_g)
- 膳食纤维 (dietary_fiber_g)
- 糖 (sugars_g)
- 添加糖 (added_sugars_g)
- 蛋白质 (protein_g)

### 详细信息
- **Nutrition Facts**: 完整的营养成分表
- **Allergens**: 过敏原信息(Eggs, Gluten, Milk, Fish, Shellfish, Tree Nuts, Peanuts, Wheat, Soy, MSG, Sesame)
- **Ingredients**: 成分说明

## 输出文件

1. **nutrition_main_table.xlsx**: 主表格数据
2. **nutrition_detailed.json**: 详细信息 JSON
3. **nutrition_complete.xlsx**: 完整数据(多 sheet)
   - Main Nutrition: 主营养数据
   - Complete Data: 完整合并数据
   - Allergens: 过敏原信息
   - Ingredients: 成分信息
4. **nutrition_complete.csv**: 完整数据 CSV
5. **nutrition_complete.json**: 完整数据 JSON

## 数据来源说明

- 主表格数据来自 Taco Bell 官网的 Nutritionix 嵌入页面
- 详细信息通过点击每个菜品的 [more info] 按钮获取
- 包含完整的 Nutrition Facts 标签信息、过敏原标识和成分列表

## 注意事项

1. 所有数据为标准份量的营养信息
2. 实际营养成分可能因地区、制作方式等有所差异
3. 过敏原信息基于官方声明,实际可能存在交叉污染
4. 成分列表为完整配方,包含所有添加剂和防腐剂

---

**生成时间**: {time.strftime('%Y-%m-%d %H:%M:%S')}
"""
        
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        logger.info(f"爬取报告已保存: {report_file}")


def main():
    # 创建爬虫实例
    scraper = TacoBellNutritionScraper(output_dir="output")
    
    # 执行爬取
    scraper.scrape_all()


if __name__ == "__main__":
    main()
