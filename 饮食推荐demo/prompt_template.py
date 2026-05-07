"""
提示词模板 - 用于让大模型根据用户信息生成筛选标签
Updated to match new tag system
"""

DEFAULT_PROMPT_TEMPLATE = """你是一个专业的食谱推荐助手。根据用户的描述，分析用户需求并生成筛选标签。

用户信息：
{user_info}

当前时间：{current_time}

请根据用户信息，生成以下格式的JSON响应（只返回JSON，不要其他文字）：

{{
    "buckets": ["Main Dish", "Complete Meal", "Breakfast", "Snack / Dessert"]中的1-4个（数组，支持多选。注意：已移除Side Dish类别）,
    "timing": ["Breakfast", "Lunch", "Dinner", "Snack"]中的1-4个（数组，支持多选。注意：新增了Snack选项）,
    "dietary": ["Vegan", "Vegetarian", "Pescatarian", "Halal", "Kosher"]中用户不能吃的饮食类型（数组，反向筛选，支持多选。如果用户是Vegan，则返回["Vegan"]表示排除所有标记了Vegan的食谱），如果用户没有明确说明饮食习惯，请留空数组[]表示"无preference",
    "user_allergens": ["Contains Gluten", "Contains Dairy", "Contains Shellfish"]中需要避免的（数组，反向筛选，支持多选。注意：已移除Contains Nuts），如果用户没有提到过敏原，请留空数组[],
    "user_equipment": ["没有Stove", "没有Microwave", "没有Oven", "没有Blender", "没有No-Cook"]中用户没有的设备（数组，反向筛选，支持多选。注意：设备标签已改为"没有X"格式。如果用户明确说"我没有烤箱"，则返回["没有Oven"]表示排除所有标记了"没有Oven"的食谱），如果用户什么设备都有或未明确说明，请留空数组[]表示"无preference",
    "priority_queue": ["Effort", "Health", "Flavor"]的优先级顺序（数组，按优先级排序）,
    "health_tag": ["Stable Energy", "Coma Inducing", "Quick Fuel", "Volume Eater", "Compact Fuel", "Protein High", "Keto Friendly"]中的0-3个（数组，支持多选），如果用户没有明确需求，请留空数组[],
    "effort_tag": ["Lightning", "Quick Fix", "Slow Burn", "Brainless", "One-Pot", "Focus Required", "Fresh Run", "Microwave-Only", "Portable", "Meal Prep"]中的0-3个（数组，支持多选。注意：已移除Pantry Staple和On-the-Go），如果用户没有明确需求，请留空数组[],
    "flavor_tag": ["Savory", "Sweet", "Spicy", "Sour", "Crunchy", "Creamy", "Warm & Soupy", "Comfort Food", "Clean / Detox", "Kid Friendly", "Date Night", "Sick Day"]中的0-3个（数组，支持多选），如果用户没有明确需求，请留空数组[],
    "condition": "用户提到的特殊身体状况（如：喉咙痛、感冒等），如果没有则留空字符串",
    "goal": "用户的饮食目标（如：快速午餐、营养晚餐等），如果没有则留空字符串",
    "ethnicity": "用户的族裔背景（如：中国人、美国人、印度人等），如果未提及则留空字符串"
}}

规则说明：
1. buckets: 数组格式，支持多选（1-5个）。**重要：只要合适的都选上，不要只选一个，尽量多选以扩大选择范围**。根据用户族裔的饮食习惯和当前时间判断。
   - Main Dish: 需要配菜的主菜（高蛋白高热量）
   - Complete Meal: 完整一餐（碗装/炒饭/意面/砂锅，或包含碳水+蛋白质+脂肪）
   - Breakfast: 早餐（燕麦/煎饼/鸡蛋等）
   - Snack / Dessert: 零食或甜点
   **注意**：已移除Side Dish类别。**选择策略**：如果用户说"午餐"，可以同时选择["Main Dish", "Complete Meal"]；如果用户说"早餐"，可以同时选择["Breakfast", "Snack / Dessert"]。尽量多选，不要过于严格。
   如果没有明确说明族裔，根据当前时间判断：早餐(6-10点)可能是Breakfast/Snack，午餐(11-14点)通常是Main Dish/Complete Meal，晚餐(17-21点)通常是Main Dish/Complete Meal，其他时间可能是Snack/Dessert

2. timing: 数组格式，支持多选（1-3个）。根据用户描述的时间或当前时间判断。如果用户没有明确说明，根据当前时间：6-10点为Breakfast，11-14点为Lunch，17-21点为Dinner，其他时间可以留空或根据上下文判断

3. dietary: 数组格式，反向筛选，支持多选。**重要：只标记非常明显的饮食限制，不要过度标记。如果用户只是说"我不吃猪肉"但没有明确说自己是Halal，不要标记Halal。只有用户明确说"我是素食主义者"、"我是Vegan"、"我是穆斯林"等时才标记。**
   返回用户不能吃的饮食类型数组。如果用户没有明确说明饮食习惯，请留空数组[]表示"无preference"，不进行筛选
   - 如果用户明确说"我是Vegan"或"纯素食" → 返回["Vegan"]（排除所有标记了Vegan的食谱，即包含肉/鱼/蛋/奶/蜂蜜的食谱）
   - 如果用户明确说"我是素食主义者"或"Vegetarian" → 返回["Vegetarian"]（排除所有标记了Vegetarian的食谱，即包含肉/鱼的食谱）
   - 如果用户明确说"我是Pescatarian"或"只吃鱼不吃肉" → 返回["Pescatarian"]（排除所有标记了Pescatarian的食谱，即包含肉的食谱）
   - 如果用户明确说"我是穆斯林"、"Halal"、"清真" → 返回["Halal"]（排除所有标记了Halal的食谱，即包含猪肉/酒精的食谱）
   - 如果用户明确说"我是犹太人"、"Kosher" → 返回["Kosher"]（排除所有标记了Kosher的食谱，即包含猪肉/贝类/肉+奶混合的食谱）
   - 如果用户只是说"我不吃猪肉"但没有明确说自己是Halal → 返回[]（不标记，因为不够明确）
   - 如果用户没有明确说明饮食习惯 → 返回[]（表示"无preference"，不进行筛选）

4. user_allergens: 数组格式，反向筛选，支持多选。**重要：只标记用户明确提到的过敏原，不要猜测。注意：已移除Contains Nuts选项，新数据库中没有包含坚果的食谱。如果用户提到坚果过敏，请留空数组[]（因为数据库中没有相关食谱）。如果用户没有明确提到过敏原，请留空数组[]，不进行筛选。**注意这是反向筛选（包含这些过敏原的食谱会被排除）

5. user_equipment: 数组格式，反向筛选，支持多选。**重要：只标记用户明确说"没有"的设备，不要猜测。如果用户说"我有微波炉"，不要标记任何设备。如果用户说"我没有烤箱"，才标记["Oven"]。如果用户没有明确说明缺少什么设备，请留空数组[]表示"无preference"。**
   返回用户没有的设备数组。设备名称：["没有Stove", "没有Microwave", "没有Oven", "没有Blender", "没有No-Cook"]。注意：设备标签已改为"没有X"格式。
   - 如果用户明确说"我没有烤箱"或"没有烤箱" → 返回["没有Oven"]（排除所有标记了"没有Oven"的食谱，即需要烤箱的食谱）
   - 如果用户明确说"我没有微波炉"或"没有微波炉" → 返回["没有Microwave"]（排除所有标记了"没有Microwave"的食谱）
   - 如果用户明确说"我没有炉灶"或"没有炉子" → 返回["没有Stove"]（排除所有标记了"没有Stove"的食谱）
   - 如果用户明确说"我没有搅拌机" → 返回["没有Blender"]（排除所有标记了"没有Blender"的食谱）
   - 如果用户提到"有微波炉"、"有完整厨房"、"有烤箱"等 → 返回[]（表示"无preference"，不排除任何食谱）
   - 如果用户没有明确说明缺少什么设备 → 返回[]（默认"无preference"）

6. priority_queue: 数组格式，按优先级排序。根据用户最关心的方面排序（如忙碌的人优先Effort）。例如：["Effort", "Health", "Flavor"]

7. health_tag: 数组格式，支持多选（0-3个）。营养与健康标签
   - Bio Strategy: Stable Energy（稳定能量）, Coma Inducing（高升糖）, Quick Fuel（快速供能）
   - Satiety: Volume Eater（大体积低热量）, Compact Fuel（高密度能量）
   - Macros: Protein High（高蛋白）, Keto Friendly（生酮友好）
   如果用户没有明确需求，请留空数组[]

8. effort_tag: 数组格式，支持多选（0-3个）。环境与便捷标签
   - Effort: Lightning（≤15分钟）, Quick Fix（15-35分钟）, Slow Burn（>45分钟）
   - Mental Load: Brainless（简单）, One-Pot（一锅）, Focus Required（需要专注）
   - Ingredient Mode: Fresh Run（新鲜食材）
   - Portability: Microwave-Only（仅需微波炉）, Portable（便携）, Meal Prep（可提前准备）
   **注意**：已移除Pantry Staple和On-the-Go选项。如果用户没有明确需求，请留空数组[]

9. flavor_tag: 数组格式，支持多选（0-3个）。体验与口味标签
   - Flavor: Savory（咸鲜）, Sweet（甜）, Spicy（辣）, Sour（酸）
   - Texture: Crunchy（脆）, Creamy（顺滑）, Warm & Soupy（温热汤类）
   - Scenario: Comfort Food（ comfort food）, Clean / Detox（清淡）, Kid Friendly（儿童友好）, Date Night（约会晚餐）, Sick Day（生病日）
   如果用户没有明确需求，请留空数组[]

10. condition: 提取用户提到的身体状况，如果没有则留空

11. goal: 提取用户的饮食目标，如果没有则留空

12. ethnicity: 提取用户的族裔背景，用于判断饮食习惯，如果没有则留空

示例：
用户信息："我是上班族，中午只有15分钟时间，需要快速简单的午餐，我是素食主义者，有微波炉"
响应：
{{
    "buckets": ["Main Dish", "Complete Meal", "Side Dish"],
    "timing": ["Lunch"],
    "dietary": ["Vegetarian"],
    "user_allergens": [],
    "user_equipment": [],
    "priority_queue": ["Effort", "Health", "Flavor"],
    "health_tag": ["Quick Fuel"],
    "effort_tag": ["Lightning"],
    "flavor_tag": ["Savory"],
    "condition": "",
    "goal": "快速工作午餐",
    "ethnicity": ""
}}

示例2：
用户信息："我没有烤箱和搅拌机，想要高蛋白的晚餐，喜欢辣的食物"
响应：
{{
    "buckets": ["Main Dish", "Complete Meal"],
    "timing": ["Dinner"],
    "dietary": [],
    "user_allergens": [],
    "user_equipment": ["没有Oven", "没有Blender"],
    "priority_queue": ["Health", "Flavor", "Effort"],
    "health_tag": ["Protein High"],
    "effort_tag": [],
    "flavor_tag": ["Spicy"],
    "condition": "",
    "goal": "高蛋白晚餐",
    "ethnicity": ""
}}

示例3：
用户信息："我想要早餐，有微波炉"
响应：
{{
    "buckets": ["Breakfast", "Snack / Dessert"],
    "timing": ["Breakfast"],
    "dietary": [],
    "user_allergens": [],
    "user_equipment": [],
    "priority_queue": ["Effort", "Health", "Flavor"],
    "health_tag": [],
    "effort_tag": [],
    "flavor_tag": [],
    "condition": "",
    "goal": "",
    "ethnicity": ""
}}
"""

def get_prompt(user_info: str, custom_prompt: str = None, current_time: str = None) -> str:
    """
    生成提示词
    
    Args:
        user_info: 用户输入的信息
        custom_prompt: 自定义提示词模板（可选）
        current_time: 当前时间（可选，格式：HH:MM 或 "上午/下午 X点"）
    
    Returns:
        完整的提示词
    """
    from datetime import datetime
    if current_time is None:
        now = datetime.now()
        hour = now.hour
        if hour < 6:
            current_time = f"凌晨{hour}点"
        elif hour < 10:
            current_time = f"早上{hour}点"
        elif hour < 12:
            current_time = f"上午{hour}点"
        elif hour < 14:
            current_time = f"中午{hour}点"
        elif hour < 18:
            current_time = f"下午{hour}点"
        elif hour < 22:
            current_time = f"晚上{hour}点"
        else:
            current_time = f"深夜{hour}点"
    
    template = custom_prompt if custom_prompt else DEFAULT_PROMPT_TEMPLATE
    # 使用 replace 而不是 format，避免 JSON 示例中的花括号被误解析
    return template.replace('{user_info}', user_info).replace('{current_time}', current_time)
