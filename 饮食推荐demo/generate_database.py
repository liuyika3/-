"""
生成符合筛选要求的食谱数据库
确保每个类别至少50个recipe，L1级别每个标签值都有至少5个recipe
使用真实的常见菜名
"""

import pandas as pd
import random

# L0 类别
L0_BUCKETS = ['Main Dish', 'Side Dish', 'Complete Meal', 'Breakfast', 'Snack / Dessert']

# 真实菜名列表
MAIN_DISHES = [
    # 中餐主菜
    '宫保鸡丁', '麻婆豆腐', '红烧肉', '糖醋排骨', '鱼香肉丝', '回锅肉', '水煮鱼', '酸菜鱼',
    '青椒肉丝', '蒜蓉西兰花', '干煸豆角', '地三鲜', '红烧茄子', '蚂蚁上树', '木须肉',
    '京酱肉丝', '鱼香茄子', '宫保虾球', '白切鸡', '口水鸡', '辣子鸡', '黄焖鸡',
    '红烧带鱼', '清蒸鲈鱼', '糖醋里脊', '锅包肉', '红烧狮子头', '梅菜扣肉',
    # 西餐主菜
    '烤鸡胸', '煎牛排', '意式肉酱面', '番茄意面', '奶油蘑菇意面', '烤三文鱼',
    '香煎鸡排', '烤羊排', '汉堡肉饼', '墨西哥卷饼', '烤鸡腿', '香煎鱼排',
    # 素食主菜
    '素三鲜', '麻婆豆腐', '鱼香茄子', '地三鲜', '干煸四季豆', '蒜蓉菠菜',
    '清炒时蔬', '素炒豆芽', '凉拌黄瓜', '醋溜白菜', '干锅花菜', '素炒西兰花'
]

SIDE_DISHES = [
    '凉拌黄瓜', '凉拌海带丝', '凉拌豆腐丝', '凉拌木耳', '凉拌豆芽', '凉拌菠菜',
    '蒜蓉生菜', '清炒小白菜', '清炒豆苗', '清炒时蔬', '蒜蓉菠菜', '醋溜白菜',
    '凉拌茄子', '凉拌土豆丝', '凉拌藕片', '凉拌金针菇', '凉拌豆腐', '凉拌皮蛋',
    '紫菜蛋花汤', '西红柿鸡蛋汤', '冬瓜排骨汤', '玉米排骨汤', '萝卜丝汤', '小白菜汤',
    '酸辣汤', '紫菜汤', '豆腐汤', '冬瓜汤', '萝卜汤', '白菜汤'
]

SNACKS = [
    '苹果', '香蕉', '橙子', '葡萄', '草莓', '蓝莓', '樱桃', '梨',
    '坚果混合', '杏仁', '核桃', '腰果', '花生', '瓜子', '开心果',
    '酸奶', '牛奶', '豆浆', '燕麦片', '全麦面包', '饼干', '薯片',
    '肉干', '牛肉干', '猪肉干', '鸡胸肉干', '海苔', '紫菜', '果干',
    '葡萄干', '蔓越莓干', '红枣', '桂圆', '花生米', '蚕豆', '青豆'
]

DESSERTS = [
    '水果沙拉', '酸奶水果杯', '芒果布丁', '草莓布丁', '巧克力布丁', '焦糖布丁',
    '提拉米苏', '芝士蛋糕', '巧克力蛋糕', '草莓蛋糕', '抹茶蛋糕', '纸杯蛋糕',
    '曲奇饼干', '巧克力曲奇', '燕麦饼干', '杏仁饼干', '马卡龙', '泡芙',
    '冰淇淋', '香草冰淇淋', '巧克力冰淇淋', '草莓冰淇淋', '芒果冰淇淋',
    '水果塔', '蛋挞', '葡式蛋挞', '苹果派', '蓝莓派', '草莓派',
    '红豆沙', '绿豆沙', '银耳莲子汤', '红豆汤', '绿豆汤', '冰糖雪梨'
]

DRINKS = [
    '柠檬水', '蜂蜜柠檬水', '薄荷柠檬水', '青柠水', '柠檬蜂蜜茶',
    '苹果汁', '橙汁', '葡萄汁', '西瓜汁', '芒果汁', '草莓汁', '蓝莓汁',
    '绿茶', '红茶', '乌龙茶', '茉莉花茶', '菊花茶', '玫瑰花茶',
    '咖啡', '美式咖啡', '拿铁', '卡布奇诺', '摩卡', '焦糖玛奇朵',
    '牛奶', '热牛奶', '巧克力牛奶', '草莓牛奶', '香蕉牛奶',
    '豆浆', '黑豆浆', '红豆浆', '绿豆浆', '五谷豆浆',
    '酸奶', '原味酸奶', '草莓酸奶', '蓝莓酸奶', '芒果酸奶',
    '奶昔', '香蕉奶昔', '草莓奶昔', '巧克力奶昔', '芒果奶昔',
    '蛋白粉奶昔', '蔬菜汁', '胡萝卜汁', '番茄汁', '混合果蔬汁'
]

# L1 标签值
L1_TIMING = ['Breakfast', 'Lunch', 'Dinner']
L1_DIETARY = ['Vegan', 'Vegetarian', 'Pescatarian', 'Halal', 'Kosher']
L1_ALLERGENS = ['Contains Gluten', 'Contains Dairy', 'Contains Nuts', 'Contains Shellfish']
L1_EQUIPMENT = ['没有Stove', '没有Microwave', '没有Oven', '没有Blender', '没有No-Cook']

# L2/L3/L4 标签
L2_HEALTH = ['Stable Energy', 'Coma Inducing', 'Quick Fuel', 'Volume Eater', 'Compact Fuel', 'Protein High', 'Keto Friendly']
L3_EFFORT = ['Lightning', 'Quick Fix', 'Slow Burn', 'Brainless', 'One-Pot', 'Focus Required', 'Pantry Staple', 'Fresh Run', 'Microwave-Only', 'Portable', 'On-the-Go', 'Meal Prep']
L4_FLAVOR = ['Savory', 'Sweet', 'Spicy', 'Sour', 'Crunchy', 'Creamy', 'Warm & Soupy', 'Comfort Food', 'Clean / Detox', 'Kid Friendly', 'Date Night', 'Sick Day']

def generate_recipes():
    """生成至少250道符合要求的食谱（每个类别至少50个）"""
    recipes = []
    recipe_id = 1
    
    # 为每个类别准备菜名池
    main_dishes_pool = MAIN_DISHES * 3  # 确保有足够的菜名
    side_dishes_pool = SIDE_DISHES * 3
    snacks_pool = SNACKS * 2
    desserts_pool = DESSERTS * 2
    drinks_pool = DRINKS * 2
    
    # ========== Main类别 (至少50个) ==========
    main_count = 0
    for dietary in L1_DIETARY:
        for i in range(20):  # 每个dietary类型20个
            if main_count >= 54:  # 确保至少54个（18*3）
                break
            
            name = main_dishes_pool[main_count % len(main_dishes_pool)]
            if main_count < len(MAIN_DISHES):
                name = MAIN_DISHES[main_count % len(MAIN_DISHES)]
            
            # 根据dietary和菜名调整食材和营养成分
            # 如果菜名包含肉类关键词，强制使用肉类食材
            meat_in_name = any(word in name for word in ['肉', '鸡', '鱼', '虾', '牛', '猪', '羊', '鸭', '排骨', '肉丝', '肉片'])
            
            if meat_in_name:
                # 菜名含肉，必须使用肉类食材
                if '鱼' in name or '虾' in name or '海鲜' in name:
                    ingredients = '鱼类 蔬菜 调料 油'
                    protein = 22 + i * 2
                    calories = 350 + i * 30
                elif '鸡' in name:
                    ingredients = '鸡肉 蔬菜 调料 油'
                    protein = 24 + i * 2
                    calories = 380 + i * 35
                else:
                    ingredients = '肉类 蔬菜 调料 油'
                    protein = 22 + i * 2
                    calories = 380 + i * 35
            elif dietary == 'Vegan':
                ingredients = '豆腐 蔬菜 调料 植物油'
                protein = 15 + i * 1.5
                calories = 250 + i * 25
            elif dietary == 'Vegetarian':
                ingredients = '鸡蛋 奶酪 蔬菜 面条 调料'
                protein = 18 + i * 1.5
                calories = 320 + i * 30
            else:  # Omnivore
                ingredients = '肉类 蔬菜 调料 油'
                protein = 22 + i * 2
                calories = 380 + i * 35
            
            recipes.append({
                'name': name,
                'ingredients': ingredients,
                'nutrition': f'蛋白质{protein:.1f}g 热量{calories:.0f}卡',
                'steps': '准备食材，烹饪制作',
                'meal_type': 'Lunch Dinner',
                'allergen': 'Gluten Dairy' if dietary == '' and i % 2 == 0 else '',
                'equipment_needed': 'Stove' if i % 2 == 0 else 'Oven',
                'method': '炒制' if i % 2 == 0 else '烤箱烤制',
                'protein': protein,
                'calories': calories,
                'carbs': 30 + i * 4,
                'fiber': 3 + i,
                'prep_time': 10 + i,
                'cook_time': 15 + i * 2
            })
            recipe_id += 1
            main_count += 1
    
    # ========== Side类别 (至少50个) ==========
    side_count = 0
    dietary_types = ['Vegan', 'Omnivore', '']  # 纯素、纯肉、混合（无标签）
    for dietary in dietary_types:
        for i in range(20):  # 每个类型20个，总共60个
            if side_count >= 60:
                break
            
            name = side_dishes_pool[side_count % len(side_dishes_pool)]
            if side_count < len(SIDE_DISHES):
                name = SIDE_DISHES[side_count % len(SIDE_DISHES)]
            
            # 确保Side Dish: Calories < 250 AND Protein < 10g
            if dietary == 'Vegan':
                ingredients = '蔬菜 调料 植物油'  # 纯素
                protein = 3 + (i % 10) * 0.5  # 限制在10g以下
                calories = 60 + (i % 15) * 10  # 限制在250卡以下
            elif dietary == 'Omnivore':
                ingredients = '小肉块 蔬菜 调料'  # 纯肉
                protein = 5 + (i % 8) * 0.5  # 限制在10g以下
                calories = 100 + (i % 12) * 10  # 限制在250卡以下
            else:  # 混合，不标记
                ingredients = '蔬菜 奶酪 调料'  # 混合：有奶
                protein = 4 + (i % 10) * 0.5  # 限制在10g以下
                calories = 80 + (i % 12) * 10  # 限制在250卡以下
            
            recipes.append({
                'name': name,
                'ingredients': ingredients,
                'nutrition': f'蛋白质{protein:.1f}g 热量{calories:.0f}卡',
                'steps': '准备食材，简单制作',
                'meal_type': 'Lunch Dinner',
                'allergen': 'Dairy' if dietary == '' and i % 2 == 0 else '',
                'equipment_needed': 'Stove',
                'method': '炒制' if '炒' in name or '拌' in name else '煮制',
                'protein': protein,
                'calories': calories,
                'carbs': 8 + (i % 10) * 2,
                'fiber': 3 + (i % 5),
                'prep_time': 5 + (i % 5),
                'cook_time': 5 if '拌' in name else 8
            })
            recipe_id += 1
            side_count += 1
    
    # ========== Snack类别 (至少50个) ==========
    snack_count = 0
    dietary_types = ['Vegan', 'Omnivore', '']  # 纯素、纯肉、混合（无标签）
    for dietary in dietary_types:
        for i in range(20):  # 每个类型20个
            if snack_count >= 60:
                break
            
            name = snacks_pool[snack_count % len(snacks_pool)]
            if snack_count < len(SNACKS):
                name = SNACKS[snack_count % len(SNACKS)]
            
            if dietary == 'Vegan':
                ingredients = '水果 坚果 干果'  # 纯素
                protein = 2 + i * 0.3
                calories = 80 + i * 15
            elif dietary == 'Omnivore':
                ingredients = '肉干 坚果 干果'  # 纯肉
                protein = 6 + i * 0.5
                calories = 130 + i * 25
            else:  # 混合，不标记
                ingredients = '酸奶 水果 坚果'  # 混合：有奶
                protein = 4 + i * 0.4
                calories = 100 + i * 20
            
            recipes.append({
                'name': name,
                'ingredients': ingredients,
                'nutrition': f'蛋白质{protein:.1f}g 热量{calories:.0f}卡',
                'steps': '直接食用或简单混合',
                'meal_type': 'Snack',
                'allergen': 'Nuts' if '坚果' in ingredients or 'Nuts' in name else ('Dairy' if dietary == '' else ''),
                'equipment_needed': '',
                'method': '直接食用',
                'protein': protein,
                'calories': calories,
                'carbs': 12 + i * 2,
                'fiber': 2 + i,
                'prep_time': 2 if '干' in name else 0,
                'cook_time': 0
            })
            recipe_id += 1
            snack_count += 1
    
    # ========== Dessert类别 (至少50个) ==========
    dessert_count = 0
    dietary_types = ['Vegan', 'Omnivore', '']  # 纯素、纯肉、混合（无标签）
    for dietary in dietary_types:
        for i in range(30):  # 每个类型30个，总共90个，确保分类后至少有50个
            if dessert_count >= 90:
                break
            
            name = desserts_pool[dessert_count % len(desserts_pool)]
            if dessert_count < len(DESSERTS):
                name = DESSERTS[dessert_count % len(DESSERTS)]
            
            if dietary == 'Vegan':
                ingredients = '水果 糖 蜂蜜 植物奶油'  # 纯素
                protein = 1 + i * 0.2
                calories = 150 + i * 20
            elif dietary == 'Omnivore':
                # 纯肉的甜点很少，这里用高蛋白甜点代替
                ingredients = '蛋白粉 糖 巧克力 面粉'  # 高蛋白
                protein = 2 + i * 0.3
                calories = 220 + i * 30
            else:  # 混合，不标记
                ingredients = '鸡蛋 牛奶 糖 面粉'  # 混合：有蛋有奶
                protein = 3 + i * 0.3
                calories = 190 + i * 25
            
            recipes.append({
                'name': name,
                'ingredients': ingredients,
                'nutrition': f'蛋白质{protein:.1f}g 热量{calories:.0f}卡',
                'steps': '制作甜点',
                'meal_type': 'Snack',  # 保持Snack以便recipe_tagger能正确识别为Dessert
                'allergen': 'Dairy Gluten' if dietary == '' else ('Dairy' if '奶油' in ingredients or '牛奶' in ingredients else ''),
                'equipment_needed': 'Oven' if '蛋糕' in name or '派' in name or '曲奇' in name else ('Blender' if '布丁' in name else 'Stove'),
                'method': '烤箱烤制' if '蛋糕' in name or '派' in name or '曲奇' in name else ('用搅拌机搅拌' if '布丁' in name else '制作'),
                'protein': protein,
                'calories': calories,
                'carbs': 30 + i * 4,
                'fiber': 1 + i,
                'prep_time': 10 + i,
                'cook_time': 20 + i * 2 if '蛋糕' in name or '派' in name else (0 if '布丁' in name else 10)
            })
            recipe_id += 1
            dessert_count += 1
    
    # ========== Drink类别 (至少50个) ==========
    drink_count = 0
    dietary_types = ['Vegan', 'Omnivore', '']  # 纯素、纯肉、混合（无标签）
    for dietary in dietary_types:
        for i in range(20):  # 每个类型20个
            if drink_count >= 60:
                break
            
            name = drinks_pool[drink_count % len(drinks_pool)]
            if drink_count < len(DRINKS):
                name = DRINKS[drink_count % len(DRINKS)]
            
            if dietary == 'Vegan':
                ingredients = '水果 水 糖 蜂蜜'  # 纯素
                protein = 0.5 + i * 0.1
                calories = 60 + i * 12
            elif dietary == 'Omnivore':
                ingredients = '蛋白粉 水果 水'  # 纯肉（高蛋白）
                protein = 10 + i * 1
                calories = 100 + i * 20
            else:  # 混合，不标记
                ingredients = '牛奶 水果 蜂蜜'  # 混合：有奶
                protein = 2 + i * 0.2
                calories = 80 + i * 15
            
            recipes.append({
                'name': name,
                'ingredients': ingredients,
                'nutrition': f'蛋白质{protein:.1f}g 热量{calories:.0f}卡',
                'steps': '用搅拌机搅拌混合' if '汁' in name or '奶昔' in name else '冲泡制作',
                'meal_type': 'Breakfast Snack',
                'allergen': 'Dairy' if dietary == '' or '牛奶' in ingredients else '',
                'equipment_needed': 'Blender' if '汁' in name or '奶昔' in name else '',
                'method': '用搅拌机搅拌' if '汁' in name or '奶昔' in name else '冲泡',
                'protein': protein,
                'calories': calories,
                'carbs': 15 + i * 3,
                'fiber': 1 + i,
                'prep_time': 5,
                'cook_time': 2 if '汁' in name or '奶昔' in name else 0
            })
            recipe_id += 1
            drink_count += 1
    
    # 确保有足够的equipment组合
    # 添加一些需要Oven的Main
    for i in range(6):
        recipes.append({
            'name': f'烤{MAIN_DISHES[i % len(MAIN_DISHES)]}',
            'ingredients': '肉类 蔬菜 调料',
            'nutrition': f'蛋白质{24+i*2}g 热量{380+i*35}卡',
            'steps': '腌制，烤箱烤制',
            'meal_type': 'Lunch Dinner',
            'allergen': '',
            'equipment_needed': 'Oven',
            'method': '烤箱烤制',
            'protein': 24 + i * 2,
            'calories': 380 + i * 35,
            'carbs': 25 + i * 4,
            'fiber': 3 + i,
            'prep_time': 15 + i,
            'cook_time': 30 + i * 5
        })
        recipe_id += 1
    
    # 添加一些需要Microwave的
    for i in range(6):
        recipes.append({
            'name': f'微波{MAIN_DISHES[(i+10) % len(MAIN_DISHES)]}',
            'ingredients': '预制食材 调料',
            'nutrition': f'蛋白质{12+i*2}g 热量{250+i*30}卡',
            'steps': '微波炉加热',
            'meal_type': 'Lunch Dinner',
            'allergen': 'Gluten' if i % 2 == 0 else '',
            'equipment_needed': 'Microwave',
            'method': '微波炉加热',
            'protein': 12 + i * 2,
            'calories': 250 + i * 30,
            'carbs': 35 + i * 5,
            'fiber': 2 + i,
            'prep_time': 2,
            'cook_time': 5
        })
        recipe_id += 1
    
    # 确保有Shellfish过敏原的
    for i in range(8):
        recipes.append({
            'name': f'海鲜{MAIN_DISHES[(i+5) % len(MAIN_DISHES)]}',
            'ingredients': '虾 蔬菜 调料',
            'nutrition': f'蛋白质{22+i*2}g 热量{280+i*30}卡',
            'steps': '处理海鲜，炒制',
            'meal_type': 'Lunch Dinner',
            'allergen': 'Shellfish',
            'equipment_needed': 'Stove',
            'method': '炒制',
            'protein': 22 + i * 2,
            'calories': 280 + i * 30,
            'carbs': 20 + i * 4,
            'fiber': 3 + i,
            'prep_time': 10 + i,
            'cook_time': 12 + i
        })
        recipe_id += 1
    
    # 确保有足够的Nuts过敏原
    for i in range(5):
        recipes.append({
            'name': f'坚果{MAIN_DISHES[(i+8) % len(MAIN_DISHES)]}',
            'ingredients': '坚果 蔬菜 调料',
            'nutrition': f'蛋白质{18+i*2}g 热量{320+i*35}卡',
            'steps': '炒制坚果和蔬菜',
            'meal_type': 'Lunch Dinner',
            'allergen': 'Nuts',
            'equipment_needed': 'Stove',
            'method': '炒制',
            'protein': 18 + i * 2,
            'calories': 320 + i * 35,
            'carbs': 25 + i * 4,
            'fiber': 5 + i,
            'prep_time': 10 + i,
            'cook_time': 12 + i
        })
        recipe_id += 1
    
    # 添加更多Complete Meal（确保至少50个）
    complete_meal_names = ['炒饭', '意面', '烩饭', '砂锅', '盖饭', '拌面', '炒面', '汤面', '拉面', '乌冬面']
    for i in range(50):  # 生成50个Complete Meal
        name = f'{complete_meal_names[i % len(complete_meal_names)]}{i+1}'
        # Complete Meal需要: carb > 20 AND protein > 10 AND fat > 5
        recipes.append({
            'name': name,
            'ingredients': '米饭 肉类 蔬菜 调料 油',
            'nutrition': f'蛋白质{15+i*0.5}g 热量{350+i*20}卡',
            'steps': '准备食材，炒制制作',
            'meal_type': 'Lunch Dinner',
            'allergen': 'Gluten' if i % 3 == 0 else '',
            'equipment_needed': 'Stove',
            'method': '炒制',
            'protein': 15 + i * 0.5,
            'calories': 350 + i * 20,
            'carbs': 40 + i * 3,  # 确保 > 20
            'fiber': 3 + (i % 5),
            'fat': 8 + (i % 5),  # 确保 > 5
            'prep_time': 10 + (i % 10),
            'cook_time': 15 + (i % 10)
        })
        recipe_id += 1
    
    # 添加更多Halal限制的食谱（确保至少5个）
    halal_names = ['猪肉炒饭', '培根意面', '火腿炒面', '猪肉汤', '培根三明治']
    for i in range(10):
        name = halal_names[i % len(halal_names)]
        recipes.append({
            'name': name,
            'ingredients': '猪肉 蔬菜 调料 油',
            'nutrition': f'蛋白质{20+i*2}g 热量{380+i*30}卡',
            'steps': '处理猪肉，炒制',
            'meal_type': 'Lunch Dinner',
            'allergen': '',
            'equipment_needed': 'Stove',
            'method': '炒制',
            'protein': 20 + i * 2,
            'calories': 380 + i * 30,
            'carbs': 30 + i * 4,
            'fiber': 3 + i,
            'prep_time': 10 + i,
            'cook_time': 15 + i
        })
        recipe_id += 1
    
    # 添加更多Spicy标签的食谱（确保至少5个）
    spicy_names = ['麻辣香锅', '水煮肉片', '麻婆豆腐', '宫保鸡丁', '辣子鸡', '口水鸡', '剁椒鱼头', '酸辣粉']
    for i in range(10):
        name = spicy_names[i % len(spicy_names)]
        recipes.append({
            'name': name,
            'ingredients': '辣椒 花椒 肉类 蔬菜 调料',
            'nutrition': f'蛋白质{18+i*2}g 热量{320+i*30}卡',
            'steps': '准备辣椒，炒制',
            'meal_type': 'Lunch Dinner',
            'allergen': '',
            'equipment_needed': 'Stove',
            'method': '炒制',
            'protein': 18 + i * 2,
            'calories': 320 + i * 30,
            'carbs': 25 + i * 4,
            'fiber': 3 + i,
            'prep_time': 10 + i,
            'cook_time': 15 + i
        })
        recipe_id += 1
    
    # 添加更多One-Pot标签的食谱（确保至少5个）
    one_pot_names = ['一锅炖', '砂锅菜', '火锅', '乱炖', '大杂烩']
    for i in range(10):
        name = one_pot_names[i % len(one_pot_names)]
        recipes.append({
            'name': name,
            'ingredients': '肉类 蔬菜 调料',
            'nutrition': f'蛋白质{20+i*2}g 热量{350+i*30}卡',
            'steps': '所有食材放入一锅，炖制',
            'meal_type': 'Lunch Dinner',
            'allergen': '',
            'equipment_needed': 'Stove',
            'method': '一锅炖制',
            'protein': 20 + i * 2,
            'calories': 350 + i * 30,
            'carbs': 30 + i * 4,
            'fiber': 4 + i,
            'prep_time': 10 + i,
            'cook_time': 30 + i * 5
        })
        recipe_id += 1
    
    # 添加更多Fresh Run标签的食谱（确保至少5个）
    fresh_names = ['新鲜沙拉', '生菜包', '生鱼片', '刺身', '新鲜蔬菜拼盘']
    for i in range(10):
        name = fresh_names[i % len(fresh_names)]
        recipes.append({
            'name': name,
            'ingredients': '新鲜蔬菜 新鲜香草 调料',
            'nutrition': f'蛋白质{5+i*1}g 热量{80+i*15}卡',
            'steps': '清洗新鲜食材，直接食用',
            'meal_type': 'Lunch Dinner',
            'allergen': '',
            'equipment_needed': '',
            'method': '直接食用',
            'protein': 5 + i * 1,
            'calories': 80 + i * 15,
            'carbs': 10 + i * 2,
            'fiber': 3 + i,
            'prep_time': 5 + i,
            'cook_time': 0
        })
        recipe_id += 1
    
    # 添加更多Date Night标签的食谱（确保至少5个）
    date_night_names = ['牛排', '海鲜烩饭', '红酒烩牛肉', '法式焗龙虾', '意大利烩饭']
    for i in range(10):
        name = date_night_names[i % len(date_night_names)]
        recipes.append({
            'name': name,
            'ingredients': '高级肉类 海鲜 调料 红酒',
            'nutrition': f'蛋白质{25+i*2}g 热量{450+i*40}卡',
            'steps': '精心准备，慢火烹饪',
            'meal_type': 'Dinner',
            'allergen': 'Shellfish' if '海鲜' in name or '龙虾' in name else '',
            'equipment_needed': 'Oven',
            'method': '慢火烤制',
            'protein': 25 + i * 2,
            'calories': 450 + i * 40,
            'carbs': 20 + i * 3,
            'fiber': 2 + i,
            'prep_time': 20 + i * 5,
            'cook_time': 60 + i * 10  # 确保 > 45 min (Slow Burn)
        })
        recipe_id += 1
    
    # 添加更多Coma Inducing标签的食谱（高碳水，低纤维）
    coma_names = ['白米饭', '白面包', '面条', '馒头', '包子']
    for i in range(10):
        name = coma_names[i % len(coma_names)]
        recipes.append({
            'name': name,
            'ingredients': '精制面粉 糖 调料',
            'nutrition': f'蛋白质{8+i*1}g 热量{280+i*30}卡',
            'steps': '制作主食',
            'meal_type': 'Breakfast Lunch',
            'allergen': 'Gluten',
            'equipment_needed': 'Stove',
            'method': '制作',
            'protein': 8 + i * 1,
            'calories': 280 + i * 30,
            'carbs': 60 + i * 5,  # 高碳水 > 60
            'fiber': 1 + (i % 2),  # 低纤维 < 3
            'prep_time': 10 + i,
            'cook_time': 20 + i
        })
        recipe_id += 1
    
    # 添加更多Keto Friendly标签的食谱（低碳水 < 10g，高脂肪 > 15g）
    keto_names = ['生酮蛋糕', '生酮面包', '生酮饼干', '生酮沙拉', '生酮汤']
    for i in range(10):
        name = keto_names[i % len(keto_names)]
        recipes.append({
            'name': name,
            'ingredients': '高脂肪食材 蛋白质 调料',
            'nutrition': f'蛋白质{20+i*2}g 热量{400+i*40}卡',
            'steps': '制作生酮食品',
            'meal_type': 'Lunch Dinner',
            'allergen': '',
            'equipment_needed': 'Oven' if '蛋糕' in name or '面包' in name or '饼干' in name else 'Stove',
            'method': '制作',
            'protein': 20 + i * 2,
            'calories': 400 + i * 40,
            'carbs': 5 + (i % 4),  # 低碳水 < 10
            'fiber': 2 + (i % 3),
            'fat': 20 + i * 2,  # 高脂肪 > 15
            'prep_time': 10 + i,
            'cook_time': 20 + i
        })
        recipe_id += 1
    
    return recipes

def assign_strategy_tags(recipes_df):
    """
    为食谱分配L2/L3/L4标签，确保分散覆盖
    注意：这个函数现在主要用于补充标签，recipe_tagger已经会自动生成标签
    但为了确保每个食物每个L级别都有至少一个标签，这里会检查并补充
    """
    import random
    
    # 统计每个标签的数量，确保均匀分布
    health_counts = {tag: 0 for tag in L2_HEALTH}
    effort_counts = {tag: 0 for tag in L3_EFFORT}
    flavor_counts = {tag: 0 for tag in L4_FLAVOR}
    
    # 目标：每个标签至少30个recipe
    min_count = 30
    
    for idx, row in recipes_df.iterrows():
        # 获取已有的标签（如果recipe_tagger已经生成了）
        health_tags = row.get('health_tags', [])
        if not isinstance(health_tags, list):
            health_tags = []
        
        effort_tags = row.get('effort_tags', [])
        if not isinstance(effort_tags, list):
            effort_tags = []
        
        flavor_tags = row.get('flavor_tags', [])
        if not isinstance(flavor_tags, list):
            flavor_tags = []
        
        # 如果已经有标签，直接使用并统计
        for tag in health_tags:
            if tag in health_counts:
                health_counts[tag] += 1
        
        for tag in effort_tags:
            if tag in effort_counts:
                effort_counts[tag] += 1
        
        for tag in flavor_tags:
            if tag in flavor_counts:
                flavor_counts[tag] += 1
        
        # 如果L2/L3/L4标签为空，根据营养成分补充（确保每个食物每个L级别都有至少一个标签）
        calories = float(row.get('calories', 0) or 0)
        protein = float(row.get('protein', 0) or 0)
        fiber = float(row.get('fiber', 0) or 0)
        carbs = float(row.get('carbs', 0) or 0)
        fat = float(row.get('fat', 0) or 0)
        prep_time = float(row.get('prep_time', 0) or 0)
        cook_time = float(row.get('cook_time', 0) or 0)
        total_time = prep_time + cook_time
        ingredients = str(row.get('ingredients', '') or '').lower()
        name = str(row.get('name', '') or '').lower()
        
        # L2 Health标签补充
        if not health_tags:
            # 根据营养成分添加合适的标签
            if protein > 30:
                health_tags.append('Protein High')
            elif carbs < 10 and fat > 15:
                health_tags.append('Keto Friendly')
            elif carbs > 30 and fiber < 3 and fat < 8:
                health_tags.append('Quick Fuel')
            elif fiber > 5 and 30 < carbs < 60:
                health_tags.append('Stable Energy')
            elif calories < 300:
                health_tags.append('Volume Eater')
            else:
                health_tags.append('Compact Fuel')
        
        # L3 Effort标签补充
        if not effort_tags:
            if total_time <= 15:
                effort_tags.append('Lightning')
            elif total_time <= 35:
                effort_tags.append('Quick Fix')
            else:
                effort_tags.append('Slow Burn')
        
        # L4 Flavor标签补充
        if not flavor_tags:
            combined = ingredients + ' ' + name
            if any(word in combined for word in ['sweet', 'sugar', 'honey', '甜', '糖', '蜂蜜']):
                flavor_tags.append('Sweet')
            elif any(word in combined for word in ['spicy', 'chili', 'pepper', '辣', '麻']):
                flavor_tags.append('Spicy')
            elif any(word in combined for word in ['sour', 'lemon', 'vinegar', '酸', '柠檬', '醋']):
                flavor_tags.append('Sour')
            else:
                flavor_tags.append('Savory')
        
        # 更新统计
        for tag in health_tags:
            if tag in health_counts:
                health_counts[tag] += 1
        
        for tag in effort_tags:
            if tag in effort_counts:
                effort_counts[tag] += 1
        
        for tag in flavor_tags:
            if tag in flavor_counts:
                flavor_counts[tag] += 1
        
        recipes_df.at[idx, 'health_tags'] = health_tags
        recipes_df.at[idx, 'effort_tags'] = effort_tags
        recipes_df.at[idx, 'flavor_tags'] = flavor_tags
    
    return recipes_df

if __name__ == '__main__':
    print("生成食谱数据库...")
    recipes = generate_recipes()
    df = pd.DataFrame(recipes)
    
    print(f"生成了 {len(df)} 道食谱")
    
    # 使用RecipeTagger分配L0和L1标签
    from recipe_tagger import RecipeTagger
    tagger = RecipeTagger()
    df = tagger.tag_dataframe(df)
    
    # 分配L2/L3/L4标签
    df = assign_strategy_tags(df)
    
    # 验证覆盖情况
    print("\n验证L0类别覆盖情况:")
    for bucket in L0_BUCKETS:
        count = df[df['bucket'] == bucket].shape[0]
        print(f"  {bucket}: {count} 个")
        if count < 50:
            print(f"    警告: {bucket} 只有 {count} 个，少于50个！")
    
    print("\n验证L1标签覆盖情况:")
    print(f"Timing覆盖:")
    for timing in L1_TIMING:
        count = df[df['timing'].apply(lambda x: timing in (x if isinstance(x, list) else []))].shape[0]
        print(f"  {timing}: {count} 个")
    
    print(f"\nDietary覆盖:")
    for dietary in L1_DIETARY:
        count = df[df['dietary'].apply(lambda x: dietary in (x if isinstance(x, list) else []))].shape[0]
        print(f"  {dietary}: {count} 个")
    # 统计无标签的数量
    no_dietary_count = df[df['dietary'].apply(lambda x: not x or (isinstance(x, list) and len(x) == 0))].shape[0]
    print(f"  无标签: {no_dietary_count} 个")
    
    print(f"\nAllergen覆盖:")
    for allergen in L1_ALLERGENS:
        count = df[df['allergens'].apply(lambda x: allergen in (x if isinstance(x, list) else []))].shape[0]
        print(f"  {allergen}: {count} 个")
    
    print(f"\nEquipment覆盖:")
    for equipment in L1_EQUIPMENT:
        count = df[df['equipment'].apply(lambda x: equipment in (x if isinstance(x, list) else []))].shape[0]
        print(f"  {equipment}: {count} 个")
    
    print(f"\nL2 Health标签覆盖:")
    for tag in L2_HEALTH:
        count = df[df['health_tags'].apply(lambda x: tag in (x if isinstance(x, list) else []))].shape[0]
        print(f"  {tag}: {count} 个")
    
    print(f"\nL3 Effort标签覆盖:")
    for tag in L3_EFFORT:
        count = df[df['effort_tags'].apply(lambda x: tag in (x if isinstance(x, list) else []))].shape[0]
        print(f"  {tag}: {count} 个")
    
    print(f"\nL4 Flavor标签覆盖:")
    for tag in L4_FLAVOR:
        count = df[df['flavor_tags'].apply(lambda x: tag in (x if isinstance(x, list) else []))].shape[0]
        print(f"  {tag}: {count} 个")
    
    # 保存
    df.to_csv('recipes_database.csv', index=False, encoding='utf-8-sig')
    print(f"\n数据库已保存到 recipes_database.csv")
    print(f"总共 {len(df)} 道食谱")
