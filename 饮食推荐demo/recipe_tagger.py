"""
RecipeTagger: Auto-tagging recipes based on Master Dictionary
Handles Level 0 (Buckets), Level 1 (Hard Attributes), and Level 2/3/4 (Strategy Tags)
Updated to match new tag system
"""

import pandas as pd
import re
from typing import List, Dict, Optional


class RecipeTagger:
    """Generates tags for recipes based on the Master Dictionary"""
    
    def __init__(self):
        # L0 Buckets (根据新数据库更新：移除了 Side Dish 和 Drink)
        self.buckets = ['Main Dish', 'Complete Meal', 'Breakfast', 'Snack / Dessert']
        
        # L1 Hard Attributes
        self.timing_options = ['Breakfast', 'Lunch', 'Dinner', 'Snack']  # 新增 Snack
        self.dietary_options = ['Vegan', 'Vegetarian', 'Pescatarian', 'Halal', 'Kosher']
        self.allergen_options = ['Contains Gluten', 'Contains Dairy', 'Contains Shellfish']  # 移除 Contains Nuts（新数据库中没有）
        self.equipment_options = ['没有Stove', '没有Microwave', '没有Oven', '没有Blender', '没有No-Cook']
        
        # L2 Health Tags
        self.health_tags = [
            'Stable Energy', 'Coma Inducing', 'Quick Fuel',  # Bio Strategy
            'Volume Eater', 'Compact Fuel',  # Satiety
            'Protein High', 'Keto Friendly'  # Macros
        ]
        
        # L3 Effort Tags (根据新数据库更新：保留所有标签，但新数据库中主要使用以下标签)
        self.effort_tags = [
            'Lightning', 'Quick Fix', 'Slow Burn',  # Effort
            'Brainless', 'One-Pot', 'Focus Required',  # Mental Load
            'Fresh Run',  # Ingredient Mode (新数据库中没有 Pantry Staple)
            'Microwave-Only', 'Portable', 'Meal Prep'  # Portability (新数据库中没有 On-the-Go)
        ]
        
        # L4 Flavor Tags
        self.flavor_tags = [
            'Savory', 'Sweet', 'Spicy', 'Sour',  # Flavor
            'Crunchy', 'Creamy', 'Warm & Soupy',  # Texture
            'Comfort Food', 'Clean / Detox', 'Kid Friendly', 'Date Night', 'Sick Day'  # Scenario
        ]
    
    def tag_level_0_bucket(self, row: pd.Series) -> str:
        """
        Level 0: Assign ONE bucket to the recipe
        Priority: Breakfast > Snack/Dessert > Complete Meal > Side Dish > Main Dish
        """
        name = str(row.get('name', '')).lower()
        meal_type = str(row.get('meal_type', '')).lower()
        protein = float(row.get('protein', 0) or 0)
        calories = float(row.get('calories', 0) or 0)
        ingredients = str(row.get('ingredients', '')).lower()
        carbs = float(row.get('carbs', 0) or 0)
        fat = float(row.get('fat', 0) or 0)
        
        # Breakfast: meal_type contains "Breakfast" OR name contains Oat / Pancake / Egg
        if 'breakfast' in meal_type:
            return 'Breakfast'
        if any(word in name for word in ['oat', 'pancake', 'egg', 'waffle', 'cereal', 'porridge',
                                         '燕麦', '煎饼', '鸡蛋', '华夫饼', '麦片', '粥']):
            return 'Breakfast'
        
        # Snack / Dessert: meal_type contains "Snack" OR "Dessert"
        if 'snack' in meal_type or 'dessert' in meal_type:
            return 'Snack / Dessert'
        if any(word in name for word in ['dessert', 'cake', 'cookie', 'pie', 'pudding', 'ice cream', 'snack',
                                         '甜点', '蛋糕', '饼干', '派', '布丁', '冰淇淋', '零食']):
            return 'Snack / Dessert'
        
        # Complete Meal: Named Bowl / Fried Rice / Pasta / Casserole OR carb + protein + fat present
        if any(word in name for word in ['bowl', 'fried rice', 'pasta', 'casserole', 'risotto', 'paella',
                                         '碗', '炒饭', '意面', '砂锅', '烩饭']):
            return 'Complete Meal'
        # Check if has carb + protein + fat (balanced meal)
        if carbs > 20 and protein > 10 and fat > 5:
            return 'Complete Meal'
        
        # Side Dish: Calories < 250 AND Protein < 10g AND named Salad / Soup / Veggie
        if calories < 250 and protein < 10:
            if any(word in name for word in ['salad', 'soup', 'veggie', 'vegetable', 'side',
                                            '沙拉', '汤', '蔬菜', '配菜']):
                return 'Side Dish'
        
        # Main Dish: Protein > 15g AND Calories > 200 AND requires side dishes (default)
        if protein > 15 and calories > 200:
            return 'Main Dish'
        
        # Default fallback
        if calories > 200:
            return 'Main Dish'
        elif calories < 250:
            return 'Side Dish'
        else:
            return 'Complete Meal'
    
    def tag_level_1_hard_attributes(self, row: pd.Series) -> Dict:
        """
        Level 1: Hard Attributes (The Iron Gate)
        Returns: timing, dietary, allergens, equipment
        """
        result = {
            'timing': [],
            'dietary': [],  # 改为列表，反向筛选：标记"不能吃这个饮食类型的人不能吃"
            'allergens': [],
            'equipment': []
        }
        
        # Timing: Directly read from meal_type
        meal_type = str(row.get('meal_type', '')).lower()
        if 'breakfast' in meal_type:
            result['timing'].append('Breakfast')
        if 'lunch' in meal_type:
            result['timing'].append('Lunch')
        if 'dinner' in meal_type:
            result['timing'].append('Dinner')
        if not result['timing']:
            result['timing'] = ['Breakfast', 'Lunch', 'Dinner']  # Anytime
        
        # Dietary: 反向筛选 - 标记"不能吃这个饮食类型的人不能吃"
        ingredients = str(row.get('ingredients', '')).lower()
        name = str(row.get('name', '')).lower()
        
        # Check for meat, fish, dairy, eggs, honey
        # 扩展肉类关键词，包括常见菜品名称中的肉类词汇
        meat_keywords = ['chicken', 'beef', 'pork', 'turkey', 'lamb', 'duck', 'meat',
                        '肉类', '鸡肉', '牛肉', '猪肉', '火鸡', '羊肉', '鸭肉', '肉',
                        '鸡', '牛', '猪', '羊', '鸭', '排骨', '肉丝', '肉片', '肉丁', 
                        '肉末', '肉丸', '肉饼', '肉排', '肉块', '肉馅', '肉松', '肉干',
                        '鸡丁', '鸡丝', '鸡块', '鸡翅', '鸡腿', '鸡胸', '鸡排',
                        '牛肉丝', '牛肉片', '牛肉粒', '牛排', '牛腩', '牛筋',
                        '猪肉丝', '猪肉片', '五花肉', '里脊', '排骨', '肘子']
        has_meat = any(word in ingredients or word in name for word in meat_keywords)
        
        # 扩展鱼类关键词
        fish_keywords = ['fish', 'salmon', 'tuna', 'seafood', 'shrimp', 'crab', 'lobster',
                        '鱼', '三文鱼', '金枪鱼', '海鲜', '虾', '蟹', '龙虾', '鲈鱼',
                        '带鱼', '黄鱼', '鲫鱼', '草鱼', '鲳鱼', '鳕鱼', '鳗鱼',
                        '鱼片', '鱼块', '鱼丝', '鱼丸', '鱼饼', '鱼排',
                        '虾仁', '虾球', '虾片', '蟹肉', '蟹黄', '龙虾', '扇贝', '蛤蜊']
        has_fish = any(word in ingredients or word in name for word in fish_keywords)
        has_dairy = any(word in ingredients for word in 
                       ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'dairy',
                        '牛奶', '奶酪', '黄油', '酸奶', '奶油', '乳制品', '芝士'])
        has_eggs = any(word in ingredients for word in ['egg', 'eggs', '鸡蛋', '蛋'])
        has_honey = any(word in ingredients for word in ['honey', '蜂蜜'])
        has_pork = any(word in ingredients or word in name for word in 
                      ['pork', 'ham', 'bacon', 'lard', '培根', '猪肉', '火腿'])
        has_alcohol = any(word in ingredients for word in ['alcohol', 'wine', 'beer', '酒', '葡萄酒'])
        has_shellfish = any(word in ingredients or word in name for word in 
                           ['shrimp', 'crab', 'lobster', 'clam', 'oyster', '虾', '蟹', '龙虾', '蛤', '牡蛎'])
        
        # 反向筛选逻辑：标记"不能吃这个饮食类型的人不能吃"
        # Vegan不能吃：有肉、有鱼、有蛋、有奶、有蜂蜜
        if has_meat or has_fish or has_eggs or has_dairy or has_honey:
            result['dietary'].append('Vegan')
        
        # Vegetarian不能吃：有肉、有鱼
        if has_meat or has_fish:
            result['dietary'].append('Vegetarian')
        
        # Pescatarian不能吃：有肉（非鱼）
        if has_meat:
            result['dietary'].append('Pescatarian')
        
        # Halal不能吃：有猪肉、有酒精
        if has_pork or has_alcohol:
            result['dietary'].append('Halal')
        
        # Kosher不能吃：有猪肉、有贝类、有肉+奶混合
        if has_pork or has_shellfish or (has_meat and has_dairy):
            result['dietary'].append('Kosher')
        
        # Allergens (反向筛选 - Contains)
        if any(word in ingredients for word in ['wheat', 'flour', 'bread', 'pasta', 'noodle', 'rye', 'barley',
                                                '面粉', '面包', '面条', '小麦']):
            result['allergens'].append('Contains Gluten')
        if has_dairy:
            result['allergens'].append('Contains Dairy')
        if any(word in ingredients for word in ['peanut', 'almond', 'walnut', 'cashew', 'nut', 'hazelnut',
                                               '花生', '杏仁', '核桃', '腰果', '坚果']):
            result['allergens'].append('Contains Nuts')
        if has_shellfish:
            result['allergens'].append('Contains Shellfish')
        
        # Equipment
        method = str(row.get('method', '') or '').lower()
        steps = str(row.get('steps', '') or '').lower()
        equipment_needed = str(row.get('equipment_needed', '') or '').lower()
        combined = (method + ' ' + steps + ' ' + equipment_needed).lower()
        
        # 设备标签改为"没有X"格式（反向筛选）
        # 如果菜品需要某个设备，就标记"没有这个设备的人不能吃"
        
        # 检查需要的设备
        has_cook_keywords = any(word in combined for word in 
                               ['cook', 'heat', 'bake', 'roast', 'fry', 'boil', 'simmer', 'sauté',
                                '烹饪', '加热', '烤', '炸', '煮', '炒'])
        has_microwave = 'microwave' in combined or '微波' in combined
        has_oven = 'oven' in combined or 'bake' in combined or 'roast' in combined or '烤箱' in combined
        has_stove = 'stove' in combined or 'pan' in combined or 'pot' in combined or 'fry' in combined or 'boil' in combined or '炒' in combined or '煮' in combined
        has_blender = 'blend' in combined or 'puree' in combined or 'mixer' in combined or '搅拌' in combined or '搅拌机' in combined
        
        # 如果不需要任何烹饪（No-Cook），标记"没有No-Cook的人不能吃"
        if not has_cook_keywords:
            result['equipment'].append('没有No-Cook')
        
        # 如果只需要微波炉，标记"没有Microwave的人不能吃"
        if has_microwave and not has_oven and not has_stove:
            result['equipment'].append('没有Microwave')
        
        # 如果需要炉灶，标记"没有Stove的人不能吃"
        if has_stove:
            result['equipment'].append('没有Stove')
        
        # 如果需要烤箱，标记"没有Oven的人不能吃"
        if has_oven:
            result['equipment'].append('没有Oven')
        
        # 如果需要搅拌机，标记"没有Blender的人不能吃"
        if has_blender:
            result['equipment'].append('没有Blender')
        
        # 默认需要炉灶
        if not result['equipment']:
            result['equipment'] = ['没有Stove']
        
        return result
    
    def tag_level_2_health(self, row: pd.Series) -> List[str]:
        """
        Level 2: Health tags
        Bio Strategy: Stable Energy, Coma Inducing, Quick Fuel
        Satiety: Volume Eater, Compact Fuel
        Macros: Protein High, Keto Friendly
        """
        tags = []
        calories = float(row.get('calories', 0) or 0)
        protein = float(row.get('protein', 0) or 0)
        carbs = float(row.get('carbs', 0) or 0)
        fiber = float(row.get('fiber', 0) or 0)
        fat = float(row.get('fat', 0) or 0)
        food_weight = float(row.get('food_weight', 0) or 0)  # 假设有食物重量字段，如果没有则估算
        
        # Bio Strategy
        # Stable Energy: Post-prandial BG pressure < 140 (高纤维，中等碳水)
        if fiber > 5 and 30 < carbs < 60:
            tags.append('Stable Energy')
        
        # Coma Inducing: Post-prandial BG pressure > 160 (高碳水，低纤维)
        if carbs > 60 and fiber < 3:
            tags.append('Coma Inducing')
        
        # Quick Fuel: Carbs > 30g AND Fiber < 3g AND Fat < 8g
        if carbs > 30 and fiber < 3 and fat < 8:
            tags.append('Quick Fuel')
        
        # Satiety
        # Volume Eater: (Food weight / calories) > 1.5 OR Fiber > 8g
        if food_weight > 0:
            if (food_weight / calories) > 1.5:
                tags.append('Volume Eater')
        if fiber > 8:
            tags.append('Volume Eater')
        
        # Compact Fuel: Calories > 500 AND small volume (低重量高热量)
        if calories > 500 and (food_weight == 0 or food_weight < 200):
            tags.append('Compact Fuel')
        
        # Macros
        # Protein High: Protein > 30g OR protein > 30% calories
        protein_percent = (protein * 4 / calories * 100) if calories > 0 else 0
        if protein > 30 or protein_percent > 30:
            tags.append('Protein High')
        
        # Keto Friendly: Carbs < 10g AND Fat > 15g
        if carbs < 10 and fat > 15:
            tags.append('Keto Friendly')
        
        # 确保至少有一个标签
        if not tags:
            # 根据营养成分添加默认标签
            if protein > 20:
                tags.append('Protein High')
            elif carbs > 40:
                tags.append('Quick Fuel')
            else:
                tags.append('Stable Energy')
        
        return tags
    
    def tag_level_3_effort(self, row: pd.Series) -> List[str]:
        """
        Level 3: Effort tags
        Effort: Lightning, Quick Fix, Slow Burn
        Mental Load: Brainless, One-Pot, Focus Required
        Ingredient Mode: Pantry Staple, Fresh Run
        """
        tags = []
        prep_time = float(row.get('prep_time', 999) or 999)
        cook_time = float(row.get('cook_time', 999) or 999)
        total_time = prep_time + cook_time
        steps = str(row.get('steps', '') or '')
        step_count = len([s for s in steps.split('.') if s.strip()]) if steps else 10
        ingredients = str(row.get('ingredients', '') or '').lower()
        ingredient_count = len([i for i in ingredients.split() if i.strip()]) if ingredients else 10
        method = str(row.get('method', '') or '').lower()
        equipment_needed = str(row.get('equipment_needed', '') or '').lower()
        name = str(row.get('name', '') or '').lower()
        combined_equipment = (method + ' ' + steps + ' ' + equipment_needed).lower()
        
        # 检查设备需求（用于可携带性标签）
        has_cook_keywords = any(word in combined_equipment for word in 
                               ['cook', 'heat', 'bake', 'roast', 'fry', 'boil', 'simmer', 'sauté',
                                '烹饪', '加热', '烤', '炸', '煮', '炒'])
        has_microwave = 'microwave' in combined_equipment or '微波' in combined_equipment
        has_oven = 'oven' in combined_equipment or 'bake' in combined_equipment or 'roast' in combined_equipment or '烤箱' in combined_equipment
        has_stove = 'stove' in combined_equipment or 'pan' in combined_equipment or 'pot' in combined_equipment or 'fry' in combined_equipment or 'boil' in combined_equipment or '炒' in combined_equipment or '煮' in combined_equipment
        
        # Effort
        # Lightning: Prep + cook ≤ 15 min
        if total_time <= 15:
            tags.append('Lightning')
        # Quick Fix: 15 < total time ≤ 35 min
        elif 15 < total_time <= 35:
            tags.append('Quick Fix')
        # Slow Burn: Total time > 45 min
        elif total_time > 45:
            tags.append('Slow Burn')
        
        # Mental Load
        # Brainless: Steps ≤ 3 AND ingredients ≤ 6
        if step_count <= 3 and ingredient_count <= 6:
            tags.append('Brainless')
        
        # One-Pot: "one pot" / "sheet pan" / "skillet" present
        if any(word in method for word in ['one pot', 'one-pot', 'sheet pan', 'skillet', '一锅', '平底锅']):
            tags.append('One-Pot')
        
        # Focus Required: Steps > 8 OR complex verbs (mince, knead)
        complex_verbs = ['mince', 'knead', 'whisk', 'fold', 'temper', '切碎', '揉', '搅拌', '折叠']
        if step_count > 8 or any(verb in steps.lower() for verb in complex_verbs):
            tags.append('Focus Required')
        
        # Ingredient Mode
        # Pantry Staple: Ingredients only from pantry whitelist
        pantry_items = ['flour', 'rice', 'pasta', 'canned', 'dried', 'oil', 'salt', 'pepper', 'spice',
                       '面粉', '米', '面条', '罐头', '干', '油', '盐', '胡椒', '香料']
        if any(item in ingredients for item in pantry_items) and not any(word in ingredients for word in ['fresh', 'raw', 'herb', '新鲜', '生', '香草']):
            tags.append('Pantry Staple')
        
        # Fresh Run: Fresh herbs / salad greens / raw meat present
        fresh_items = ['fresh', 'herb', 'salad', 'greens', 'raw', '新鲜', '香草', '沙拉', '生菜', '生']
        if any(item in ingredients for item in fresh_items):
            tags.append('Fresh Run')
        
        # Portability (可携带性)
        # Microwave-Only: 只需要微波炉加热
        if has_microwave and not has_oven and not has_stove:
            tags.append('Microwave-Only')
        
        # Portable: 便携，无需加热或简单准备（No-Cook或Lightning）
        if (not has_cook_keywords or total_time <= 15) and step_count <= 3:
            tags.append('Portable')
        
        # On-the-Go: 边走边吃，无需餐具（No-Cook + 简单）
        if not has_cook_keywords and step_count <= 2 and ingredient_count <= 5:
            tags.append('On-the-Go')
        
        # Meal Prep: 可提前准备，适合批量制作（可以批量制作，保存时间长）
        # 通常是可以在冰箱保存的，或者可以批量制作的
        meal_prep_keywords = ['batch', 'prep', 'meal prep', 'make ahead', 'store', '保存', '批量', '提前']
        if any(word in method or word in name.lower() for word in meal_prep_keywords):
            tags.append('Meal Prep')
        # 或者如果是Lightning/Brainless且可以冷食，也可能是Meal Prep
        elif (total_time <= 15 or not has_cook_keywords) and step_count <= 4:
            tags.append('Meal Prep')
        
        # 确保至少有一个标签
        if not tags:
            if total_time <= 15:
                tags.append('Lightning')
            elif total_time <= 35:
                tags.append('Quick Fix')
            else:
                tags.append('Slow Burn')
        
        return tags
    
    def tag_level_4_flavor(self, row: pd.Series) -> List[str]:
        """
        Level 4: Flavor tags
        Flavor: Savory, Sweet, Spicy, Sour
        Texture: Crunchy, Creamy, Warm & Soupy
        Scenario: Comfort Food, Clean / Detox, Kid Friendly, Date Night, Sick Day
        """
        tags = []
        name = str(row.get('name', '')).lower()
        ingredients = str(row.get('ingredients', '')).lower()
        combined = name + ' ' + ingredients
        calories = float(row.get('calories', 0) or 0)
        carbs = float(row.get('carbs', 0) or 0)
        fat = float(row.get('fat', 0) or 0)
        method = str(row.get('method', '') or '').lower()
        
        # Flavor
        # Savory: Soy, mushroom, cheese, stock present
        if any(word in combined for word in ['soy', 'mushroom', 'cheese', 'stock', 'broth', 'umami',
                                            '酱油', '蘑菇', '奶酪', '高汤', '鲜味']):
            tags.append('Savory')
        
        # Sweet: Fruit, honey, maple, chocolate, sugar present
        if any(word in combined for word in ['fruit', 'honey', 'maple', 'chocolate', 'sugar', 'sweet',
                                            '水果', '蜂蜜', '枫糖', '巧克力', '糖', '甜']):
            tags.append('Sweet')
        
        # Spicy: Chili, pepper, sriracha, curry present
        if any(word in combined for word in ['chili', 'pepper', 'sriracha', 'curry', 'hot', 'spicy',
                                            '辣椒', '胡椒', '咖喱', '辣']):
            tags.append('Spicy')
        
        # Sour: Lemon, lime, vinegar, yogurt present
        if any(word in combined for word in ['lemon', 'lime', 'vinegar', 'yogurt', 'sour',
                                            '柠檬', '酸橙', '醋', '酸奶', '酸']):
            tags.append('Sour')
        
        # Texture
        # Crunchy: Nuts, chips, raw veggies, fried items
        if any(word in combined for word in ['nut', 'chip', 'raw', 'fried', 'crispy', 'crunchy',
                                            '坚果', '薯片', '生', '炸', '脆']):
            tags.append('Crunchy')
        
        # Creamy: Cream, avocado, mashed, pudding
        if any(word in combined for word in ['cream', 'avocado', 'mashed', 'pudding', 'smooth',
                                            '奶油', '牛油果', '泥', '布丁', '顺滑']):
            tags.append('Creamy')
        
        # Warm & Soupy: Soup, stew, porridge
        if any(word in combined for word in ['soup', 'stew', 'porridge', 'broth', '汤', '炖', '粥', '高汤']):
            tags.append('Warm & Soupy')
        
        # Scenario
        # Comfort Food: (Carbs > 40g OR Fat > 20g) + warm + creamy
        if (carbs > 40 or fat > 20) and ('Warm & Soupy' in tags or 'Creamy' in tags):
            tags.append('Comfort Food')
        
        # Clean / Detox: Side dish OR main + ≥3 veggies + no heavy sauce
        veggie_count = sum(1 for word in ['vegetable', 'veggie', 'greens', 'salad', '蔬菜', '青菜', '沙拉'] if word in ingredients)
        if veggie_count >= 3 and 'heavy' not in method and 'sauce' not in method:
            tags.append('Clean / Detox')
        elif 'Side Dish' in str(row.get('bucket', '')):
            tags.append('Clean / Detox')
        
        # Kid Friendly: No spicy/bitter/alcohol; cheese/pasta/nuggets
        has_kid_friendly = any(word in combined for word in ['cheese', 'pasta', 'nugget', '奶酪', '面条', '鸡块'])
        has_kid_unfriendly = any(word in combined for word in ['spicy', 'bitter', 'alcohol', 'wine', '辣', '苦', '酒'])
        if has_kid_friendly and not has_kid_unfriendly:
            tags.append('Kid Friendly')
        
        # Date Night: Slow Burn + steak/seafood/wine/risotto
        if 'Slow Burn' in str(row.get('effort_tags', [])) or float(row.get('cook_time', 0) or 0) > 45:
            if any(word in combined for word in ['steak', 'seafood', 'wine', 'risotto', '牛排', '海鲜', '葡萄酒', '烩饭']):
                tags.append('Date Night')
        
        # Sick Day: Soft/liquid + mild flavor (soup, toast, porridge)
        if any(word in combined for word in ['soup', 'toast', 'porridge', 'soft', 'liquid', 'mild',
                                            '汤', '吐司', '粥', '软', '液体', '温和']):
            if 'Spicy' not in tags:
                tags.append('Sick Day')
        
        # 确保至少有一个标签
        if not tags:
            # 根据食材添加默认标签
            if 'sweet' in combined or 'sugar' in combined:
                tags.append('Sweet')
            elif 'spicy' in combined or 'chili' in combined:
                tags.append('Spicy')
            else:
                tags.append('Savory')
        
        return tags
    
    def tag_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Tag all recipes in the dataframe"""
        # L0: Bucket
        df['bucket'] = df.apply(self.tag_level_0_bucket, axis=1)
        
        # L1: Hard Attributes
        l1_tags = df.apply(self.tag_level_1_hard_attributes, axis=1)
        df['timing'] = l1_tags.apply(lambda x: x['timing'])
        df['dietary'] = l1_tags.apply(lambda x: x['dietary'] if isinstance(x['dietary'], list) else [])
        df['allergens'] = l1_tags.apply(lambda x: x['allergens'])
        df['equipment'] = l1_tags.apply(lambda x: x['equipment'])
        
        # L2: Health
        df['health_tags'] = df.apply(self.tag_level_2_health, axis=1)
        
        # L3: Effort
        df['effort_tags'] = df.apply(self.tag_level_3_effort, axis=1)
        
        # L4: Flavor
        df['flavor_tags'] = df.apply(self.tag_level_4_flavor, axis=1)
        
        return df
