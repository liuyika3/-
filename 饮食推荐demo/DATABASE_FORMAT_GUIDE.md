# 西餐食谱数据库格式指南

## 文件格式
- **文件类型**: CSV (UTF-8编码)
- **分隔符**: 逗号 (,)
- **第一行**: 列标题（header）

## 必需列（按顺序）

### 基础信息列
1. **name** (文本) - 菜品名称（英文）
2. **ingredients** (文本) - 食材列表，用空格分隔（英文）
3. **nutrition** (文本) - 营养信息描述，格式："蛋白质XXg 热量XX卡" 或 "Protein XXg Calories XX"
4. **steps** (文本) - 制作步骤描述（英文）
5. **meal_type** (文本) - 用餐类型，可选值：`Breakfast`, `Lunch`, `Dinner`, `Snack`，可多个用空格分隔，如 `Lunch Dinner`
6. **allergen** (文本) - 原始过敏原信息（可选，可为空）
7. **equipment_needed** (文本) - 所需设备，可选值：`Stove`, `Oven`, `Microwave`, `Blender`，可多个用空格分隔，如 `Stove Oven`
8. **method** (文本) - 烹饪方法描述（英文）

### 营养成分列（数值）
9. **protein** (浮点数) - 蛋白质（克）
10. **calories** (浮点数) - 热量（卡路里）
11. **carbs** (浮点数) - 碳水化合物（克）
12. **fiber** (浮点数) - 纤维（克）
13. **prep_time** (整数) - 准备时间（分钟）
14. **cook_time** (整数) - 烹饪时间（分钟）
15. **fat** (浮点数) - 脂肪（克，可选，可为空）

### 自动生成的标签列（列表格式，用Python列表字符串表示）
16. **bucket** (文本) - L0类别，可选值：`Main Dish`, `Side Dish`, `Complete Meal`, `Breakfast`, `Snack / Dessert`
17. **timing** (列表字符串) - L1用餐时间，格式：`['Breakfast']` 或 `['Lunch', 'Dinner']`
18. **dietary** (列表字符串) - L1饮食限制（反向筛选），格式：`['Vegan']` 或 `['Halal', 'Kosher']` 或 `[]`（无限制）
19. **allergens** (列表字符串) - L1过敏原（反向筛选），格式：`['Contains Gluten']` 或 `['Contains Dairy', 'Contains Nuts']` 或 `[]`
20. **equipment** (列表字符串) - L1设备限制（反向筛选），格式：`['没有Stove']` 或 `['没有Oven', '没有Microwave']` 或 `[]`（无限制）
21. **health_tags** (列表字符串) - L2健康标签，格式：`['Protein High']` 或 `['Stable Energy', 'Volume Eater']`
22. **effort_tags** (列表字符串) - L3难度标签，格式：`['Quick Fix']` 或 `['Lightning', 'Brainless', 'One-Pot']`
23. **flavor_tags** (列表字符串) - L4口味标签，格式：`['Savory']` 或 `['Comfort Food', 'Creamy']`

## 标签系统详细说明

### L0 Buckets（类别，单选）
- **Main Dish**: Protein > 15g AND Calories > 200 AND requires side dishes
- **Side Dish**: Calories < 250 AND Protein < 10g AND named Salad / Soup / Veggie
- **Complete Meal**: Named Bowl / Fried Rice / Pasta / Casserole OR carb + protein + fat present
- **Breakfast**: meal_type contains "Breakfast" OR name contains Oat / Pancake / Egg / Waffle
- **Snack / Dessert**: meal_type contains "Snack" OR "Dessert" OR name contains dessert keywords

### L1 Hard Attributes（硬筛选）

#### Timing（用餐时间，多选）
- `Breakfast` - 早餐
- `Lunch` - 午餐
- `Dinner` - 晚餐

#### Dietary（饮食限制，反向筛选，多选）
- `Vegan` - 纯素（不含肉、蛋、奶、蜂蜜）
- `Vegetarian` - 素食（不含肉）
- `Pescatarian` - 鱼素（含鱼/海鲜，不含红肉和禽肉）
- `Halal` - 清真（不含猪肉、酒精）
- `Kosher` - 犹太（不含猪肉、贝类，不含肉奶混合）

#### Allergens（过敏原，反向筛选，多选）
- `Contains Gluten` - 含麸质（小麦、大麦、黑麦）
- `Contains Dairy` - 含乳制品（牛奶、奶酪、黄油）
- `Contains Nuts` - 含坚果（花生、树坚果）
- `Contains Shellfish` - 含贝类（虾、蟹、龙虾）

#### Equipment（设备限制，反向筛选，多选）
- `没有Stove` - 需要炉灶（炒、煮、炸）
- `没有Microwave` - 需要微波炉
- `没有Oven` - 需要烤箱（烤、烘焙）
- `没有Blender` - 需要搅拌机
- `没有No-Cook` - 需要烹饪（不能生吃）

### L2 Health Tags（健康标签，多选）
- `Stable Energy` - 稳定能量（高纤维，中等碳水 30-60g）
- `Coma Inducing` - 高升糖（高碳水 >60g，低纤维 <3g）
- `Quick Fuel` - 快速供能（碳水 >30g，纤维 <3g，脂肪 <8g）
- `Volume Eater` - 大体积（高纤维 >8g 或 重量/热量 >1.5）
- `Compact Fuel` - 高密度（热量 >500卡，小体积）
- `Protein High` - 高蛋白（蛋白质 >30g 或 蛋白质占比 >30%）
- `Keto Friendly` - 生酮友好（碳水 <10g，脂肪 >15g）

### L3 Effort Tags（难度标签，多选）
- `Lightning` - 闪电（总时间 ≤15分钟）
- `Quick Fix` - 快速（15 < 总时间 ≤35分钟）
- `Slow Burn` - 慢炖（总时间 >45分钟）
- `Brainless` - 无脑（步骤 ≤3 AND 食材 ≤6）
- `One-Pot` - 一锅（one pot / sheet pan / skillet）
- `Focus Required` - 需专注（步骤 >8 或 复杂操作）
- `Pantry Staple` - 储藏室（只用储藏室食材，无新鲜食材）
- `Fresh Run` - 新鲜食材（含新鲜香草/生菜/生肉）
- `Microwave-Only` - 仅微波炉（只需微波炉，无需其他设备）
- `Portable` - 便携（无需加热或总时间 ≤15分钟）
- `On-the-Go` - 即食（无需烹饪，步骤 ≤2，食材 ≤5）
- `Meal Prep` - 可批量准备（可提前制作，批量保存）

### L4 Flavor Tags（口味标签，多选）
- `Savory` - 咸鲜（含酱油、蘑菇、奶酪、高汤）
- `Sweet` - 甜（含水果、蜂蜜、枫糖、巧克力、糖）
- `Spicy` - 辣（含辣椒、胡椒、咖喱）
- `Sour` - 酸（含柠檬、酸橙、醋、酸奶）
- `Crunchy` - 脆（含坚果、薯片、生菜、炸物）
- `Creamy` - 奶油（含奶油、牛油果、泥状、布丁）
- `Warm & Soupy` - 温热汤类（汤、炖菜、粥）
- `Comfort Food` -  comfort food（高碳水 >40g 或 高脂肪 >20g + 温热/奶油）
- `Clean / Detox` - 清爽（配菜 或 主菜+≥3种蔬菜+无重酱）
- `Kid Friendly` - 儿童友好（含奶酪/意面/鸡块，无辣/苦/酒）
- `Date Night` - 约会夜（慢炖 + 牛排/海鲜/红酒/烩饭）
- `Sick Day` - 病号餐（软/液体 + 温和口味，无辣）

## 标签生成规则

### 重要原则
1. **每个菜品必须在每个L级别（L2/L3/L4）的每个类别中至少有一个标签**
2. **L1的dietary、allergens、equipment是反向筛选**：如果菜品包含猪肉，应标记`['Halal']`（表示Halal饮食者不能吃）
3. **列表格式**：所有标签列必须使用Python列表字符串格式，如 `['Tag1', 'Tag2']` 或 `[]`（空列表）

### L0 Bucket判断逻辑
- 优先检查meal_type和name关键词
- 然后检查营养成分（protein, calories）
- 每个菜品只能属于一个bucket

### L1标签判断逻辑
- **Timing**: 直接从meal_type提取
- **Dietary**: 根据食材判断（含猪肉→Halal，含肉→Vegan/Vegetarian等）
- **Allergens**: 根据食材判断（含小麦→Contains Gluten，含牛奶→Contains Dairy等）
- **Equipment**: 根据method和equipment_needed判断（需要烤箱→没有Oven）

### L2/L3/L4标签判断逻辑
- 根据营养成分、时间、步骤数、食材等综合判断
- 确保每个类别至少有一个标签

## 示例菜品 1: Grilled Chicken Breast

```csv
name,ingredients,nutrition,steps,meal_type,allergen,equipment_needed,method,protein,calories,carbs,fiber,prep_time,cook_time,fat,bucket,timing,dietary,allergens,equipment,health_tags,effort_tags,flavor_tags
Grilled Chicken Breast,chicken breast olive oil salt pepper garlic,Protein 31.0g Calories 220卡,Season chicken with salt pepper and garlic. Heat grill pan. Grill chicken 6-7 minutes per side until cooked through.,Lunch Dinner,,Stove,Grill,31.0,220,0,0,5,15,3.6,Main Dish,"['Lunch', 'Dinner']",[],['没有Stove'],['Protein High'],"['Quick Fix', 'Brainless', 'Fresh Run']",['Savory']
```

### 标签解释：
- **bucket**: `Main Dish` (Protein 31g > 15g, Calories 165 < 200但属于主菜类别)
- **timing**: `['Lunch', 'Dinner']` (meal_type包含Lunch和Dinner)
- **dietary**: `[]` (无特殊饮食限制，含鸡肉但不属于Vegan/Vegetarian/Pescatarian/Halal/Kosher限制)
- **allergens**: `[]` (不含常见过敏原)
- **equipment**: `['没有Stove']` (需要炉灶烤制)
- **health_tags**: `['Protein High']` (蛋白质31g > 30g)
- **effort_tags**: `['Quick Fix', 'Brainless', 'Fresh Run']` (总时间20分钟在15-35分钟范围内为Quick Fix，步骤简单为Brainless，含新鲜食材为Fresh Run)
- **flavor_tags**: `['Savory']` (含盐、胡椒、大蒜等咸鲜调料)

## 示例菜品 2: Caesar Salad

```csv
name,ingredients,nutrition,steps,meal_type,allergen,equipment_needed,method,steps,protein,calories,carbs,fiber,prep_time,cook_time,fat,bucket,timing,dietary,allergens,equipment,health_tags,effort_tags,flavor_tags
Caesar Salad,romaine lettuce parmesan cheese croutons caesar dressing anchovies,Protein 8.5g Calories 180卡,Wash and chop romaine lettuce. Toss with caesar dressing. Top with parmesan cheese croutons and anchovies.,Lunch Dinner,Gluten Dairy,,No-Cook,8.5,180,12,9,5,0,12,Side Dish,"['Lunch', 'Dinner']",[],"['Contains Gluten', 'Contains Dairy']",[],['Volume Eater'],"['Lightning', 'Brainless', 'On-the-Go']",['Savory', 'Crunchy', 'Creamy', 'Clean / Detox']
```

### 标签解释：
- **bucket**: `Side Dish` (Calories 180 < 250, Protein 8.5g < 10g, name包含Salad)
- **timing**: `['Lunch', 'Dinner']` (meal_type包含Lunch和Dinner)
- **dietary**: `[]` (无特殊饮食限制)
- **allergens**: `['Contains Gluten', 'Contains Dairy']` (含croutons→Gluten，含parmesan cheese→Dairy)
- **equipment**: `[]` (No-Cook，无需设备限制)
- **health_tags**: `['Volume Eater']` (fiber 9g > 8g符合Volume Eater)
- **flavor_tags**: `['Savory', 'Crunchy', 'Creamy', 'Clean / Detox']` (含奶酪和anchovies→Savory，含croutons→Crunchy，含dressing→Creamy，作为配菜且含多种蔬菜→Clean / Detox)
- **effort_tags**: `['Lightning', 'Brainless', 'On-the-Go']` (总时间5分钟≤15分钟，步骤简单≤3步，无需烹饪)

## 注意事项

1. **列表格式**: 所有标签列必须使用Python列表字符串格式，空列表用`[]`表示
2. **数值精度**: protein, calories, carbs, fiber, fat使用浮点数，prep_time和cook_time使用整数
3. **空值处理**: 如果某个字段为空，使用空字符串`""`或空列表`[]`
4. **fat字段**: 如果未提供，可以留空，但建议提供以支持Keto Friendly标签判断
5. **标签完整性**: 确保每个菜品在L2/L3/L4的每个类别中至少有一个标签
6. **反向筛选**: L1的dietary、allergens、equipment是反向筛选，标记的是"不能吃/不能做"的限制

## 生成要求

1. **数量要求**: 
   - 每个L0类别至少50个菜品
   - 每个L1标签值至少5个菜品
   - 每个L2/L3/L4标签至少5个菜品

2. **标签覆盖**: 确保所有标签都有足够的菜品覆盖

3. **数据质量**: 
   - 营养成分要合理
   - 时间要符合实际
   - 标签要准确匹配菜品特征

## 使用这两个示例作为基准

请使用上述两个示例菜品（Grilled Chicken Breast 和 Caesar Salad）作为格式和标签的基准，生成完整的西餐数据库。确保：
- 格式完全一致
- 标签逻辑准确
- 覆盖所有标签值
- 每个L0类别至少50个菜品

