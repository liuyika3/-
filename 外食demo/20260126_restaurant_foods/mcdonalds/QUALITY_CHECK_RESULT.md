# 麦当劳数据质量检查报告

**检查日期**: 2026-01-26  
**数据文件**: McDonald_Foods_Playwright.xlsx

---

## 📊 检查结果

### ✅ 已完成且正确的数据

| 数据类型 | 记录数 | 完整度 | 状态 |
|---------|--------|--------|------|
| 食物列表 | 102 | 100% | ✅ 完整 |
| 主图片 | 114 | 100% | ✅ 已下载 |
| 配料信息 | 354 | 100% | ✅ 完整 |
| 过敏原记录 | 332 | 100% | ✅ 完整 |

### ⚠️ 存在问题的数据

| 数据类型 | 问题描述 | 影响范围 |
|---------|---------|---------|
| 卡路里 | 4个食物缺失 | 4% |
| 营养数据 | **解析错误** | 所有食物 |

---

## 🐛 营养数据解析错误详情

### 问题示例 (Big Mac)

**实际正确值** (来自网站):
```
卡路里: 580 Cal
蛋白质: 25g
碳水: 45g  
脂肪: 34g
饱和脂肪: 11g ✅
反式脂肪: 1g
胆固醇: 85mg
钠: 1060mg
膳食纤维: 3g
总糖: 7g
添加糖: 5g
维生素D: 0mcg
钙: 120mg
铁: 4mg
钾: 370mg
```

**当前数据库中的值**:
```
卡路里: 580 ✅
蛋白质: 25g ✅
碳水: 45g ✅
脂肪: 34g ✅
饱和脂肪: 11g ✅
反式脂肪: 11g ❌ (应该是1g)
胆固醇: 11mg ❌ (应该是85mg)
钠: 11mg ❌ (应该是1060mg)  
膳食纤维: 11g ❌ (应该是3g)
总糖: 11g ❌ (应该是7g)
添加糖: 11g ❌ (应该是5g)
维生素D: 11mcg ❌ (应该是0mcg)
钙: 11mg ❌ (应该是120mg)
铁: 11mg ❌ (应该是4mg)
钾: 11mg ❌ (应该是370mg)
```

### 错误模式

从饱和脂肪(11g)之后的所有营养素都被错误地赋值为`11`。

---

## 🔍 问题根本原因

### 网页数据格式

浏览器快照显示数据格式为:

```yaml
- role: listitem
  name: "Saturated Fat: 11g (56 % DV) 11grams (56 Percent Daily Values )"
- role: listitem  
  name: "Trans Fat: 1g 1grams"
- role: listitem
  name: "Sodium: 1060mg (46 % DV) 1060milligrams (46 Percent Daily Values )"
```

### 代码缺陷

原爬虫代码的问题:

```python
# ❌ 错误的逻辑
for item in nutrition_items:
    text = item.text_content().lower()
    for keyword, field in nutrition_map.items():
        if keyword in text:
            value = parse_nutrition_value(text)  # 提取第一个数字
            detail['nutrition'][field] = value
            break  # ❌ 跳出内层循环,继续外层,但已经赋值了错误的值
```

**问题**: 
1. 先匹配到"Saturated Fat: 11g",提取11
2. 然后处理下一个listitem时,由于某种原因,继续使用11作为默认值
3. 或者,在同一个文本中匹配多个关键词时,都使用了第一个数字11

---

## 💡 正确的解析策略

### 方案: 针对每个营养素单独搜索

```python
# ✅ 正确的逻辑
nutrition_map = {
    'saturated fat': 'saturated_fat_g',
    'trans fat': 'trans_fat_g',
    'sodium': 'sodium_mg',
    # ...
}

for keyword, field_name in nutrition_map.items():
    # 为每个营养素单独查找对应的listitem
    items = page.locator(f'listitem:has-text("{keyword}")').all()
    for item in items:
        text = item.text_content().lower()
        # 精确提取该营养素的数值
        match = re.search(rf'{keyword}:\s*(\d+(?:\.\d+)?)', text)
        if match:
            value = float(match.group(1))
            detail['nutrition'][field_name] = value
            break
```

---

## 📋 修复清单

### 必须修复 (P0)

- [ ] **重写营养数据解析逻辑**
  - 为每个营养素类型单独查找listitem
  - 使用精确的正则表达式: `"Sodium:\s*(\d+)mg"`
  - 避免跨营养素的数值污染

- [ ] **重新爬取所有102个食物的营养数据**
  - 使用修复后的解析逻辑
  - 验证至少10个样本食物

- [ ] **生成完整的验证报告**
  - 对比修复前后的数据
  - 标记所有修改的值

### 建议修复 (P1)

- [ ] **补充4个缺失的卡路里数据**
  - Bagel (plain)
  - Hot Caramel Sundae
  - Diet Coke (Small)
  - Unsweetened Iced Tea (Small)

---

## 🎯 推荐下一步

1. **立即行动**: 编写正确的解析脚本
2. **测试验证**: 先在1-2个食物上测试
3. **全量修复**: 对所有102个食物重新提取营养数据
4. **质量检查**: 人工抽查10-20个热门食物

---

**预计修复时间**: 2-3小时  
**预计完成时间**: 今天

**当前数据可用性**:
- 基础信息: ✅ 可用
- 配料过敏原: ✅ 可用
- 营养分析: ❌ 不可用 (需修复)
