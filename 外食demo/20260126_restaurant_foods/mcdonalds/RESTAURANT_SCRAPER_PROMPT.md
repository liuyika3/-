# 餐厅网站菜品数据爬取 - 通用Prompt

**用途**: 爬取餐厅官网的完整菜品信息，包括营养成分、配料、过敏原、图片等

---

## 🎯 任务目标

我需要爬取 **[餐厅名称]** 的完整菜品数据，具体要求如下：

### 目标网站
- 菜单页URL: `[填写完整菜单页URL，如: https://www.mcdonalds.com/us/en-us/full-menu.html]`
- 国家/地区: `[如: 美国/US]`

### 需要爬取的数据

#### 1. 基本信息
- `food_id`: 食物唯一标识符（从URL提取）
- `food_name`: 英文名称
- `food_name_cn`: 中文名称（如有）
- `product_url`: 详情页完整URL
- `description`: 食物描述
- `category`: 分类（早餐/汉堡/饮料等）

#### 2. 图片
- `main_image_url`: 主图片URL
- `local_image_path`: 下载到本地的图片路径
- `ingredient_images`: 每个配料的图片（如有）

#### 3. 营养成分（完整26-28项）
- `calories`: 卡路里（必须）
- `protein_g`: 蛋白质(克)
- `protein_dv`: 蛋白质每日推荐百分比
- `total_carbs_g`: 总碳水化合物(克)
- `total_carbs_dv`: 碳水DV%
- `total_fat_g`: 总脂肪(克)
- `total_fat_dv`: 脂肪DV%
- `saturated_fat_g`: 饱和脂肪(克)
- `saturated_fat_dv`: 饱和脂肪DV%
- `trans_fat_g`: 反式脂肪(克)
- `cholesterol_mg`: 胆固醇(毫克)
- `cholesterol_dv`: 胆固醇DV%
- `sodium_mg`: 钠(毫克)
- `sodium_dv`: 钠DV%
- `dietary_fiber_g`: 膳食纤维(克)
- `dietary_fiber_dv`: 膳食纤维DV%
- `total_sugars_g`: 总糖(克)
- `added_sugars_g`: 添加糖(克)
- `added_sugars_dv`: 添加糖DV%
- `vitamin_d_mcg`: 维生素D(微克)
- `vitamin_d_dv`: 维生素D DV%
- `calcium_mg`: 钙(毫克)
- `calcium_dv`: 钙DV%
- `iron_mg`: 铁(毫克)
- `iron_dv`: 铁DV%
- `potassium_mg`: 钾(毫克)
- `potassium_dv`: 钾DV%

#### 4. 配料信息 (Ingredients)
- `ingredient_order`: 配料顺序
- `ingredient_name`: 配料名称（如"Big Mac Bun"）
- `ingredient_details`: 详细成分列表（完整的ingredients文本）
- `ingredient_image_url`: 配料图片URL
- `local_image_path`: 配料图片本地路径
- `contains_allergens`: 该配料包含的过敏原列表

#### 5. 过敏原信息 (Allergens)
- `allergen_type`: 过敏原类型（Wheat, Milk, Egg, Soy, Fish, Shellfish, Peanut, Tree Nut, Sesame, Barley等）
- `allergen_source`: 来源配料
- `severity`: 严重程度（Contains/May Contain）

---

## 🛠️ 技术实现要求

### 必须使用的工具

#### 1. Playwright 浏览器自动化
```python
from playwright.sync_api import sync_playwright
```

**为什么必须用Playwright**:
- 餐厅网站通常使用JavaScript动态加载内容
- 营养信息通常隐藏在可展开的面板中
- 需要模拟点击按钮才能获取完整数据
- 静态爬虫（requests + BeautifulSoup）无法获取动态内容

#### 2. 数据处理库
```python
import pandas as pd  # Excel输出
import json          # JSON数据
import requests      # 图片下载
import re            # 正则表达式
```

---

## 📋 实现步骤（详细）

### 第1步: 环境准备

```bash
# 安装依赖
pip install playwright pandas openpyxl requests

# 安装浏览器
playwright install chromium
```

### 第2步: 获取菜单列表

```python
def get_menu_items(page):
    """
    从菜单页提取所有食物的链接
    
    返回: [
        {
            'food_id': 'big-mac',
            'food_name': 'Big Mac®',
            'product_url': 'https://...',
            'main_image_url': 'https://...'
        },
        ...
    ]
    """
    page.goto(MENU_URL, wait_until='domcontentloaded', timeout=90000)
    time.sleep(5)  # 等待JavaScript加载
    
    # 查找所有产品链接
    product_links = page.query_selector_all('a[href*="/product/"]')
    
    foods = []
    for link in product_links:
        href = link.get_attribute('href')
        name = link.text_content().strip()
        img = link.query_selector('img')
        img_url = img.get_attribute('src') if img else ''
        
        foods.append({
            'food_id': extract_id_from_url(href),
            'food_name': clean_name(name),
            'product_url': urljoin(BASE_URL, href),
            'main_image_url': img_url
        })
    
    return foods
```

### 第3步: 爬取单个食物详情（关键！）

```python
def scrape_product_detail(page, url, food_id, food_name):
    """
    爬取单个食物的完整信息
    
    ⚠️ 关键点:
    1. 必须点击"Nutrition Summary"按钮展开营养信息
    2. 营养数据解析必须精确匹配每个营养素
    3. 避免跨营养素的数值污染
    """
    
    page.goto(url, wait_until='domcontentloaded', timeout=90000)
    time.sleep(3)
    
    detail = {
        'calories': None,
        'description': '',
        'nutrition': {},
        'ingredients': [],
        'allergens': set()
    }
    
    # 1. 提取卡路里
    try:
        # 查找包含"Cal"的listitem
        cal_items = page.locator('listitem:has-text("Cal")').all()
        for item in cal_items:
            text = item.text_content()
            if 'calories' in text.lower():
                cal = extract_number(text)
                if cal and cal > 0:
                    detail['calories'] = cal
                    break
    except:
        pass
    
    # 2. 点击展开营养信息按钮
    try:
        nutrition_btn = page.locator('button:has-text("Nutrition")').first
        if nutrition_btn.is_visible():
            nutrition_btn.click()
            time.sleep(2)
    except:
        pass
    
    # 3. 提取营养成分 - ⚠️ 关键：为每个营养素单独精确匹配
    nutrition_map = {
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
    
    # ⚠️ 正确的方法：为每个营养素单独查找
    for keyword, field_name in nutrition_map.items():
        try:
            # 查找包含该营养素名称的listitem
            items = page.locator(f'listitem:has-text("{keyword}")').all()
            for item in items:
                text = item.text_content().lower()
                
                # 确认是该营养素（避免误匹配）
                if not keyword in text:
                    continue
                
                # 精确提取数值和单位
                # 例如: "Sodium: 1060mg (46 % DV)" -> 提取1060
                match = re.search(rf'{keyword}:\s*(\d+(?:\.\d+)?)', text)
                if match:
                    value = float(match.group(1))
                    detail['nutrition'][field_name] = value
                    
                    # 提取DV%
                    dv_match = re.search(r'(\d+)\s*%', text)
                    if dv_match:
                        detail['nutrition'][f"{field_name.rsplit('_', 1)[0]}_dv"] = int(dv_match.group(1))
                    
                    break
        except:
            continue
    
    # 4. 提取描述
    try:
        paras = page.query_selector_all('p')
        for p in paras:
            text = p.text_content().strip()
            if len(text) > 50 and not 'Terms and Conditions' in text:
                detail['description'] = text[:500]
                break
    except:
        pass
    
    # 5. 点击展开过敏原信息
    try:
        allergen_btn = page.locator('button:has-text("Allergen")').first
        if allergen_btn.is_visible():
            allergen_btn.click()
            time.sleep(2)
    except:
        pass
    
    # 6. 提取配料信息
    try:
        headings = page.query_selector_all('h3, h4')
        for heading in headings:
            heading_text = heading.text_content().strip()
            
            # 跳过无关标题
            if any(x in heading_text.lower() for x in ['nutrition', 'allergen', 'related', 'disclaimer']):
                continue
            
            # 获取下一个元素（配料详情）
            next_text = heading.evaluate('el => el.nextElementSibling?.textContent || ""')
            
            if 'ingredients:' in next_text.lower():
                # 清理文本
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
    except:
        pass
    
    detail['allergens'] = list(detail['allergens'])
    
    return detail
```

### 第4步: 下载图片

```python
def download_image(url, save_path):
    """下载图片到本地"""
    if os.path.exists(save_path):
        return True
    
    try:
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
        print(f"图片下载失败: {e}")
    
    return False
```

### 第5步: 生成Excel输出

```python
def create_excel(foods, output_file='Restaurant_Foods_Data.xlsx'):
    """
    生成多Sheet的Excel文件
    
    Sheet结构:
    1. 01_Foods_Master: 主表（基本信息+营养摘要）
    2. 02_Nutrition: 完整营养成分
    3. 03_Ingredients: 配料详情
    4. 04_Allergens: 过敏原追溯
    5. 05_Statistics: 数据统计
    """
    
    # Sheet 1: 主表
    master_data = []
    for food in foods:
        detail = food.get('detail', {})
        nutrition = detail.get('nutrition', {})
        
        master_data.append({
            'food_id': food['food_id'],
            'food_name': food['food_name'],
            'food_name_cn': '',
            'product_url': food['product_url'],
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
    
    # Sheet 2: 完整营养成分
    nutrition_data = []
    for food in foods:
        detail = food.get('detail', {})
        nutrition = detail.get('nutrition', {})
        if nutrition:
            row = {
                'food_id': food['food_id'],
                'food_name': food['food_name']
            }
            row.update(nutrition)
            nutrition_data.append(row)
    
    df_nutrition = pd.DataFrame(nutrition_data)
    
    # Sheet 3: 配料表
    ingredients_data = []
    for food in foods:
        detail = food.get('detail', {})
        for ing in detail.get('ingredients', []):
            ingredients_data.append({
                'food_id': food['food_id'],
                'food_name': food['food_name'],
                'ingredient_order': ing['order'],
                'ingredient_name': ing['name'],
                'ingredient_details': ing['details'][:1000],
                'contains_allergens': ', '.join(ing.get('allergens', []))
            })
    
    df_ingredients = pd.DataFrame(ingredients_data)
    
    # Sheet 4: 过敏原表
    allergen_data = []
    for food in foods:
        detail = food.get('detail', {})
        for ing in detail.get('ingredients', []):
            for allergen in ing.get('allergens', []):
                allergen_data.append({
                    'food_id': food['food_id'],
                    'food_name': food['food_name'],
                    'allergen_type': allergen,
                    'allergen_source': ing['name'],
                    'severity': 'Contains'
                })
    
    df_allergens = pd.DataFrame(allergen_data)
    
    # 保存Excel
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        df_master.to_excel(writer, sheet_name='01_Foods_Master', index=False)
        df_nutrition.to_excel(writer, sheet_name='02_Nutrition', index=False)
        df_ingredients.to_excel(writer, sheet_name='03_Ingredients', index=False)
        df_allergens.to_excel(writer, sheet_name='04_Allergens', index=False)
        
        # 统计
        stats = pd.DataFrame({
            '统计项': ['食物总数', '有营养数据', '配料总数', '过敏原记录数'],
            '数量': [len(df_master), len(df_nutrition), len(df_ingredients), len(df_allergens)]
        })
        stats.to_excel(writer, sheet_name='05_Statistics', index=False)
```

---

## ⚠️ 关键注意事项（必读）

### 1. 营养数据解析的常见错误 ❌

**错误示例**:
```python
# ❌ 错误：会导致所有营养素使用同一个值
for item in all_nutrition_items:
    text = item.text_content()
    for keyword in ['protein', 'sodium', 'calcium']:
        if keyword in text:
            value = extract_first_number(text)  # 所有都用第一个数字！
            nutrition[keyword] = value
```

**正确方法**:
```python
# ✅ 正确：为每个营养素单独查找和提取
for keyword in ['protein', 'sodium', 'calcium']:
    items = page.locator(f'listitem:has-text("{keyword}")').all()
    for item in items:
        text = item.text_content()
        # 使用精确的正则表达式匹配该营养素的值
        match = re.search(rf'{keyword}:\s*(\d+(?:\.\d+)?)', text, re.IGNORECASE)
        if match:
            nutrition[keyword] = float(match.group(1))
            break
```

### 2. 处理0值和空值的区别

```python
# 如果网页显示"0g"，应该保存为0，而不是None
if '0g' in text or '0mg' in text:
    nutrition[field] = 0
elif value is None:
    # 真正缺失时才留空
    nutrition[field] = None
```

### 3. 动态内容加载

```python
# 必须等待内容加载
page.goto(url, wait_until='domcontentloaded', timeout=90000)
time.sleep(3)  # 额外等待JavaScript

# 点击按钮后必须等待
nutrition_btn.click()
time.sleep(2)  # 等待面板展开
```

### 4. 图片下载策略

```python
# 1. 主图片：立即下载
# 2. 配料图片：可能需要点击轮播按钮
# 3. 使用唯一的文件名避免冲突
filename = f"{food_id}_{ingredient_name.replace(' ', '_')}.jpg"
```

### 5. 浏览器设置

```python
browser = p.chromium.launch(
    headless=False,  # 设为False可以看到浏览器操作，调试时有用
    slow_mo=50       # 放慢操作速度，避免请求过快
)

context = browser.new_context(
    viewport={'width': 1920, 'height': 1080},
    user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
)
```

---

## 📊 数据质量验证

### 必须进行的检查

```python
def validate_data(foods):
    """数据质量检查"""
    
    issues = []
    
    for food in foods:
        food_id = food['food_id']
        food_name = food['food_name']
        detail = food.get('detail', {})
        
        # 1. 检查卡路里
        if not detail.get('calories'):
            issues.append(f"{food_name}: 缺失卡路里")
        
        # 2. 检查关键营养素
        nutrition = detail.get('nutrition', {})
        required = ['protein_g', 'total_carbs_g', 'total_fat_g', 'sodium_mg']
        for key in required:
            if key not in nutrition:
                issues.append(f"{food_name}: 缺失{key}")
        
        # 3. 检查营养素数值合理性
        if nutrition.get('sodium_mg', 0) < 10:
            # 钠通常不会这么低，可能是解析错误
            issues.append(f"{food_name}: 钠值异常低 ({nutrition.get('sodium_mg')}mg)")
        
        # 4. 检查配料
        if not detail.get('ingredients'):
            issues.append(f"{food_name}: 无配料信息")
    
    return issues
```

### 验证样本食物

```python
# 手动验证热门食物的数据准确性
samples = ['big-mac', 'egg-mcmuffin', 'quarter-pounder']
for food_id in samples:
    food = find_food_by_id(food_id)
    print(f"\n{food['food_name']}:")
    print(f"  卡路里: {food['detail']['calories']}")
    print(f"  蛋白质: {food['detail']['nutrition'].get('protein_g')}g")
    print(f"  钠: {food['detail']['nutrition'].get('sodium_mg')}mg")
    print(f"  配料数: {len(food['detail']['ingredients'])}")
```

---

## 🎯 完整主流程

```python
def main():
    print("🍔 餐厅菜品数据爬虫")
    
    # 创建目录
    os.makedirs('images', exist_ok=True)
    
    all_foods = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})
        
        # 1. 获取菜单列表
        foods = get_menu_items(page)
        print(f"找到 {len(foods)} 个食物")
        
        # 2. 爬取每个食物的详情
        for i, food in enumerate(foods):
            print(f"\n[{i+1}/{len(foods)}] {food['food_name']}...")
            
            # 下载主图
            if food['main_image_url']:
                img_path = f"images/{food['food_id']}.jpg"
                download_image(food['main_image_url'], img_path)
                food['local_image_path'] = img_path
            
            # 获取详情
            detail = scrape_product_detail(page, food['product_url'], 
                                          food['food_id'], food['food_name'])
            food['detail'] = detail
            
            all_foods.append(food)
            time.sleep(1)  # 避免请求过快
        
        browser.close()
    
    # 3. 数据验证
    issues = validate_data(all_foods)
    if issues:
        print(f"\n⚠️ 发现 {len(issues)} 个问题:")
        for issue in issues[:10]:
            print(f"  - {issue}")
    
    # 4. 生成Excel
    create_excel(all_foods)
    
    # 5. 保存JSON
    with open('foods_data.json', 'w', encoding='utf-8') as f:
        json.dump(all_foods, f, ensure_ascii=False, indent=2)
    
    print("\n✅ 爬取完成！")

if __name__ == '__main__':
    main()
```

---

## 📦 最终输出

### 文件结构
```
restaurant_scraper/
├── Restaurant_Foods_Data.xlsx  # 主数据文件
├── foods_data.json            # 原始JSON数据
├── images/                    # 食物图片
│   ├── big-mac.jpg
│   ├── egg-mcmuffin.jpg
│   └── ...
└── scraper.py                 # 爬虫脚本
```

### Excel表格结构
- **Sheet 1 - Foods_Master**: 主表，包含基本信息和营养摘要
- **Sheet 2 - Nutrition**: 完整的营养成分数据（26-28项）
- **Sheet 3 - Ingredients**: 配料详情表
- **Sheet 4 - Allergens**: 过敏原追溯表
- **Sheet 5 - Statistics**: 数据统计

---

## 🚀 使用说明

### 对于AI助手

1. **仔细阅读"关键注意事项"部分**，特别是营养数据解析的正确方法
2. **必须使用Playwright**，不要尝试用requests+BeautifulSoup
3. **为每个营养素单独精确匹配**，避免数值污染
4. **充分等待页面加载**，包括点击按钮后的等待
5. **验证关键样本**，确保Big Mac等热门食物的数据准确

### 对于人类用户

1. 将此prompt发送给AI助手
2. 提供目标餐厅的菜单页URL
3. 确保已安装Python 3.7+
4. 运行后检查生成的Excel文件
5. 人工验证5-10个样本食物的准确性

---

## ✅ 成功标准

- [ ] 所有食物的基本信息完整
- [ ] 至少95%的食物有卡路里数据
- [ ] 营养成分数据准确（验证Big Mac等样本）
- [ ] 配料和过敏原信息完整
- [ ] 主图片全部下载到本地
- [ ] Excel文件格式规范，易于使用

---

**最后更新**: 2026-01-26  
**基于实际项目**: McDonald's US 菜单爬取经验总结
