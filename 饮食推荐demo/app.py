"""
Flask backend for Jovida Recipe Recommendation Engine
Provides API endpoints for recipe filtering and recommendations
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
import json
import traceback
import re
from recipe_tagger import RecipeTagger
from recommendation_engine import RecommendationEngine
from data_loader import load_recipes, create_sample_dataset
from prompt_template import get_prompt, DEFAULT_PROMPT_TEMPLATE

app = Flask(__name__, static_folder='static')
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Accept"]
    }
})

# Global variables
recipes_df = None
tagger = RecipeTagger()
engine = None
vertex_client = None
vertex_configured = False


def initialize_data(file_path: str = None):
    """Initialize recipe data"""
    global recipes_df, engine
    
    # Try to load recipes_database.csv first
    if file_path is None:
        if os.path.exists('recipes_database.csv'):
            file_path = 'recipes_database.csv'
    
    if file_path and os.path.exists(file_path):
        try:
            recipes_df = load_recipes(file_path)
            print(f"Loaded {len(recipes_df)} recipes from {file_path}")
        except Exception as e:
            print(f"Error loading {file_path}: {e}")
            print("Using sample dataset instead")
            recipes_df = create_sample_dataset()
    else:
        print("No data file provided, using sample dataset")
        recipes_df = create_sample_dataset()
    
    # 处理 NaN 值：将所有字符串列的 NaN 替换为空字符串
    string_columns = ['name', 'ingredients', 'nutrition', 'steps', 'meal_type', 'allergen', 'equipment_needed', 'method']
    for col in string_columns:
        if col in recipes_df.columns:
            recipes_df[col] = recipes_df[col].fillna('')
    
    # Tag all recipes
    print("Tagging recipes...")
    recipes_df = tagger.tag_dataframe(recipes_df)
    
    # 确保列表字段被正确解析（如果CSV中存储为字符串，或者tag_dataframe返回的是字符串）
    import ast
    list_columns = ['dietary', 'allergens', 'equipment', 'health_tags', 'effort_tags', 'flavor_tags', 'timing']
    for col in list_columns:
        if col in recipes_df.columns:
            def parse_list_field(x):
                if isinstance(x, list):
                    return x
                elif isinstance(x, str) and x.strip():
                    # 处理字符串格式的列表
                    x = x.strip()
                    if x.startswith('[') and x.endswith(']'):
                        try:
                            return ast.literal_eval(x)
                        except (ValueError, SyntaxError):
                            # 如果解析失败，尝试手动解析
                            try:
                                # 移除方括号，分割元素
                                x = x[1:-1].strip()
                                if not x:
                                    return []
                                # 分割并清理引号
                                items = [item.strip().strip("'\"") for item in x.split(',')]
                                return [item for item in items if item]
                            except:
                                return []
                    else:
                        # 单个值，转换为列表
                        return [x] if x else []
                else:
                    return []
            recipes_df[col] = recipes_df[col].apply(parse_list_field)
    
    # 验证解析结果（调试用）
    if 'equipment' in recipes_df.columns and len(recipes_df) > 0:
        sample_eq = recipes_df.iloc[0]['equipment']
        print(f"DEBUG: 数据初始化后，第一个食谱的equipment = {repr(sample_eq)}, type = {type(sample_eq).__name__}")
    
    # Initialize engine
    engine = RecommendationEngine(recipes_df)
    print(f"Initialized engine with {len(recipes_df)} tagged recipes")


@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_from_directory('static', 'index.html')


@app.route('/api/recipes', methods=['GET'])
def get_all_recipes():
    """Get all recipes with their tags"""
    if recipes_df is None:
        return jsonify({'error': 'No recipes loaded'}), 500
    
    # Convert to JSON-friendly format
    recipes_list = []
    for _, row in recipes_df.iterrows():
        # 合并所有标签（不分级）
        all_tags = []
        all_tags.extend(row.get('health_tags', []) if isinstance(row.get('health_tags'), list) else [])
        all_tags.extend(row.get('effort_tags', []) if isinstance(row.get('effort_tags'), list) else [])
        all_tags.extend(row.get('flavor_tags', []) if isinstance(row.get('flavor_tags'), list) else [])
        
        # 处理 NaN 值：将所有 NaN 转换为空字符串
        def safe_get(key, default=''):
            value = row.get(key, default)
            if pd.isna(value) or (isinstance(value, float) and np.isnan(value)):
                return default
            return value
        
        recipe = {
            'name': str(safe_get('name', '')),
            'bucket': str(safe_get('bucket', '')),
            'dietary': row.get('dietary', []) if isinstance(row.get('dietary'), list) else [],
            'timing': row.get('timing', []) if isinstance(row.get('timing'), list) else [],
            'allergens': row.get('allergens', []) if isinstance(row.get('allergens'), list) else [],
            'equipment': row.get('equipment', []) if isinstance(row.get('equipment'), list) else [],
            'health_tags': row.get('health_tags', []) if isinstance(row.get('health_tags'), list) else [],
            'effort_tags': row.get('effort_tags', []) if isinstance(row.get('effort_tags'), list) else [],
            'flavor_tags': row.get('flavor_tags', []) if isinstance(row.get('flavor_tags'), list) else [],
            'all_tags': all_tags,  # 所有标签合并（不分级）
            'calories': float(safe_get('calories', 0) or 0),
            'protein': float(safe_get('protein', 0) or 0),
            'ingredients': str(safe_get('ingredients', '')),
            'steps': str(safe_get('steps', '')),
            'meal_type': str(safe_get('meal_type', ''))
        }
        recipes_list.append(recipe)
    
    return jsonify({'recipes': recipes_list})


@app.route('/api/filter', methods=['POST'])
def filter_recipes():
    """Filter recipes based on criteria"""
    if engine is None:
        return jsonify({'error': 'Engine not initialized'}), 500
    
    try:
        data = request.json
        
        # 验证和规范化buckets (根据新数据库更新：移除了 Side Dish)
        valid_buckets = ['Main Dish', 'Complete Meal', 'Breakfast', 'Snack / Dessert']
        buckets = data.get('buckets', [])
        if not buckets or not isinstance(buckets, list):
            # 如果buckets为空，使用所有buckets
            agent_l0_selection = valid_buckets
            print(f"⚠️  Buckets为空，使用所有类别: {agent_l0_selection}")
        else:
            # 过滤无效的buckets
            agent_l0_selection = [b for b in buckets if b in valid_buckets]
            if not agent_l0_selection:
                # 如果所有buckets都无效，使用所有buckets
                agent_l0_selection = valid_buckets
                print(f"⚠️  所有buckets无效，使用所有类别: {agent_l0_selection}")
            else:
                print(f"✓ 使用buckets: {agent_l0_selection}")
        
        # 验证和规范化dietary（支持多选）
        valid_dietary = ['Vegan', 'Vegetarian', 'Pescatarian', 'Halal', 'Kosher']
        dietary_input = data.get('dietary', '')
        if isinstance(dietary_input, str):
            dietary_input = dietary_input.strip()
            dietary = [dietary_input] if dietary_input else []
        elif isinstance(dietary_input, list):
            dietary = dietary_input
        else:
            dietary = []
        
        # 验证dietary数组中的每个值
        validated_dietary = []
        for d in dietary:
            if isinstance(d, str):
                d = d.strip()
                if d in valid_dietary:
                    validated_dietary.append(d)
                else:
                    # 尝试大小写不敏感匹配
                    d_lower = d.lower()
                    for vd in valid_dietary:
                        if vd.lower() == d_lower:
                            validated_dietary.append(vd)
                            break
        dietary = validated_dietary
        if not dietary:
            print(f"⚠️  Dietary值无效，将不进行dietary筛选")
        
        # 处理user_allergens：如果为空，不进行筛选
        user_allergens = data.get('user_allergens', []) or []
        if isinstance(user_allergens, str):
            user_allergens = [user_allergens] if user_allergens.strip() else []
        elif not isinstance(user_allergens, list):
            user_allergens = []
        
        # 处理user_equipment：反向筛选，如果为空表示"无preference"（什么设备都有）
        valid_equipment = ['没有Stove', '没有Microwave', '没有Oven', '没有Blender', '没有No-Cook']
        user_equipment = data.get('user_equipment', []) or []
        if isinstance(user_equipment, str):
            user_equipment = [user_equipment] if user_equipment.strip() else []
        elif not isinstance(user_equipment, list):
            user_equipment = []
        # 验证equipment值（过滤掉"无preference"和无效值）
        user_equipment = [e for e in user_equipment if e in valid_equipment]
        # 如果为空，表示"无preference"（不进行筛选），保持空数组
        
        user_profile = {
            'allergens': user_allergens,  # 如果为空数组，不进行筛选
            'equipment': user_equipment  # 如果为空，默认使用Stove
        }
        
        agent_l1_keywords = {
            'timing': data.get('timing', []) or [],
            'dietary': dietary  # 现在是数组
        }
        
        priority_queue = data.get('priority_queue', ['Effort', 'Health', 'Flavor'])
        if not priority_queue:
            priority_queue = ['Effort', 'Health', 'Flavor']
        
        # 支持多选的标签（health_tag, effort_tag, flavor_tag）
        def normalize_tag_input(tag_input):
            """将标签输入规范化为数组"""
            if isinstance(tag_input, str):
                return [tag_input] if tag_input.strip() else []
            elif isinstance(tag_input, list):
                return [t.strip() for t in tag_input if t and str(t).strip()]
            return []
        
        effort_tags = normalize_tag_input(data.get('effort_tag', ''))
        health_tags = normalize_tag_input(data.get('health_tag', ''))
        flavor_tags = normalize_tag_input(data.get('flavor_tag', ''))
        
        agent_tag_keywords = {
            'Effort': effort_tags,
            'Health': health_tags,
            'Flavor': flavor_tags
        }
        
        user_specifics = {
            'condition': data.get('condition', '') or '',
            'goal': data.get('goal', '') or ''
        }
        
        print(f"\n筛选参数:")
        print(f"  Buckets: {agent_l0_selection}")
        print(f"  Timing: {agent_l1_keywords['timing']}")
        print(f"  Dietary: {agent_l1_keywords['dietary']}")
        print(f"  Allergens: {user_profile['allergens']}")
        print(f"  Equipment: {user_profile['equipment']}")
        
        # Run recommendation
        results, stats = engine.recommend(
            user_profile=user_profile,
            agent_l0_selection=agent_l0_selection,
            agent_l1_keywords=agent_l1_keywords,
            priority_queue=priority_queue,
            agent_tag_keywords=agent_tag_keywords,
            user_specifics=user_specifics
        )
        
        # Convert results to JSON
        def safe_get(row, key, default=''):
            """安全获取值，处理 NaN"""
            value = row.get(key, default)
            if pd.isna(value) or (isinstance(value, float) and np.isnan(value)):
                return default
            return value
        
        results_list = []
        for _, row in results.iterrows():
            recipe = {
                'name': str(safe_get(row, 'name', '')),
                'bucket': str(safe_get(row, 'bucket', '')),
                'dietary': row.get('dietary', []) if isinstance(row.get('dietary'), list) else [],
                'timing': row.get('timing', []) if isinstance(row.get('timing'), list) else [],
                'allergens': row.get('allergens', []) if isinstance(row.get('allergens'), list) else [],
                'equipment': row.get('equipment', []) if isinstance(row.get('equipment'), list) else [],
                'health_tags': row.get('health_tags', []) if isinstance(row.get('health_tags'), list) else [],
                'effort_tags': row.get('effort_tags', []) if isinstance(row.get('effort_tags'), list) else [],
                'flavor_tags': row.get('flavor_tags', []) if isinstance(row.get('flavor_tags'), list) else [],
                'calories': float(safe_get(row, 'calories', 0) or 0),
                'protein': float(safe_get(row, 'protein', 0) or 0),
                'ingredients': str(safe_get(row, 'ingredients', '')),
                'steps': str(safe_get(row, 'steps', '')),
                'meal_type': str(safe_get(row, 'meal_type', ''))
            }
            results_list.append(recipe)
        
        return jsonify({
            'results': results_list,
            'stats': stats
        })
    
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"筛选错误: {error_trace}")
        return jsonify({
            'error': str(e),
            'trace': error_trace if app.debug else None
        }), 500


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics about the recipe database"""
    if recipes_df is None:
        return jsonify({'error': 'No recipes loaded'}), 500
    
    stats = {
        'total_recipes': len(recipes_df),
        'buckets': recipes_df['bucket'].value_counts().to_dict(),
        'dietary': {},  # dietary现在是数组，需要特殊处理
        'all_allergens': set(),
        'all_equipment': set()
    }
    
    for _, row in recipes_df.iterrows():
        stats['all_allergens'].update(row.get('allergens', []))
        stats['all_equipment'].update(row.get('equipment', []))
    
    stats['all_allergens'] = list(stats['all_allergens'])
    stats['all_equipment'] = list(stats['all_equipment'])
    
    return jsonify(stats)


@app.route('/api/tags/options', methods=['GET'])
def get_tag_options():
    """获取所有可用的标签选项"""
    from recipe_tagger import RecipeTagger
    tagger = RecipeTagger()
    
    return jsonify({
        'l0_buckets': tagger.buckets,
        'l1_timing': tagger.timing_options,
        'l1_dietary': tagger.dietary_options,
        'l1_allergens': tagger.allergen_options,
        'l1_equipment': tagger.equipment_options,
        'l2_health': tagger.health_tags,
        'l3_effort': tagger.effort_tags,
        'l4_flavor': tagger.flavor_tags
    })


@app.route('/api/vertex/config', methods=['POST'])
def configure_vertex():
    """配置 Vertex AI 环境变量"""
    global vertex_client, vertex_configured
    
    try:
        # 确保请求是JSON格式
        if not request.is_json:
            return jsonify({'success': False, 'error': '请求必须是JSON格式'}), 400
        
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': '请求数据为空'}), 400
        
        # 设置环境变量
        required_vars = ['GOOGLE_CLOUD_PROJECT', 'GOOGLE_CLOUD_LOCATION', 
                        'GOOGLE_GENAI_USE_VERTEXAI', 'GOOGLE_APPLICATION_CREDENTIALS']
        
        missing_vars = []
        for var in required_vars:
            if var not in data or not data[var] or not str(data[var]).strip():
                missing_vars.append(var)
        
        if missing_vars:
            return jsonify({
                'success': False, 
                'error': f'缺少必需的环境变量: {", ".join(missing_vars)}'
            }), 400
        
        # 设置环境变量
        for var in required_vars:
            os.environ[var] = str(data[var]).strip()
        
        # 验证凭证文件
        creds_path = data.get('GOOGLE_APPLICATION_CREDENTIALS').strip()
        if not os.path.exists(creds_path):
            return jsonify({
                'success': False, 
                'error': f'凭证文件不存在: {creds_path}'
            }), 400
        
        # 创建客户端
        try:
            from vertex_config import get_vertex_client
            vertex_client = get_vertex_client()
            vertex_configured = True
            
            return jsonify({
                'success': True,
                'message': 'Vertex AI 配置成功',
                'config': {
                    'project': os.getenv('GOOGLE_CLOUD_PROJECT'),
                    'location': os.getenv('GOOGLE_CLOUD_LOCATION')
                }
            })
        except Exception as client_error:
            return jsonify({
                'success': False,
                'error': f'创建Vertex客户端失败: {str(client_error)}'
            }), 500
            
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"配置错误: {error_trace}")
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 500


@app.route('/api/vertex/status', methods=['GET'])
def vertex_status():
    """检查 Vertex AI 配置状态"""
    return jsonify({
        'configured': vertex_configured,
        'has_client': vertex_client is not None
    })


@app.route('/api/vertex/env', methods=['GET'])
def get_vertex_env():
    """获取当前环境变量（用于自动填充表单）"""
    try:
        env_vars = {
            'GOOGLE_CLOUD_PROJECT': os.getenv('GOOGLE_CLOUD_PROJECT', ''),
            'GOOGLE_CLOUD_LOCATION': os.getenv('GOOGLE_CLOUD_LOCATION', ''),
            'GOOGLE_GENAI_USE_VERTEXAI': os.getenv('GOOGLE_GENAI_USE_VERTEXAI', ''),
            'GOOGLE_APPLICATION_CREDENTIALS': os.getenv('GOOGLE_APPLICATION_CREDENTIALS', '')
        }
        return jsonify(env_vars)
    except Exception as e:
        return jsonify({
            'error': str(e),
            'GOOGLE_CLOUD_PROJECT': '',
            'GOOGLE_CLOUD_LOCATION': '',
            'GOOGLE_GENAI_USE_VERTEXAI': '',
            'GOOGLE_APPLICATION_CREDENTIALS': ''
        }), 500


@app.route('/api/ai/generate-tags', methods=['POST'])
def generate_tags_with_ai():
    """使用 Vertex AI 根据用户信息生成筛选标签"""
    global vertex_client, vertex_configured
    
    if not vertex_configured or vertex_client is None:
        return jsonify({
            'success': False,
            'error': 'Vertex AI 尚未配置，请先调用 /api/vertex/config'
        }), 400
    
    try:
        data = request.json
        user_info = data.get('user_info', '')
        custom_prompt = data.get('custom_prompt', None)
        model = data.get('model', 'gemini-2.5-flash')
        
        if not user_info:
            return jsonify({'success': False, 'error': '缺少用户信息'}), 400
        
        # 生成提示词（包含当前时间）
        from datetime import datetime
        now = datetime.now()
        current_time = f"{now.hour}点{now.minute}分"
        prompt = get_prompt(user_info, custom_prompt, current_time)
        
        # 调用 Vertex AI
        # #region agent log
        import json as json_module
        import os as os_module
        log_data = {
            "model": model,
            "prompt_length": len(prompt),
            "proxy_vars": {
                "HTTP_PROXY": os_module.getenv('HTTP_PROXY'),
                "HTTPS_PROXY": os_module.getenv('HTTPS_PROXY'),
                "http_proxy": os_module.getenv('http_proxy'),
                "https_proxy": os_module.getenv('https_proxy')
            }
        }
        try:
            with open(r"c:\Users\ZhuanZ（无密码）\Desktop\dmoes\饮食推荐demo\.cursor\debug.log", "a", encoding="utf-8") as f:
                log_entry = json_module.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "E",
                    "location": "app.py:generate_tags_with_ai:before_api_call",
                    "message": "调用 Vertex AI 前",
                    "data": log_data,
                    "timestamp": int(now.timestamp() * 1000)
                }, ensure_ascii=False) + "\n"
                f.write(log_entry)
        except Exception:
            pass
        # #endregion
        
        response = vertex_client.models.generate_content(
            model=model,
            contents=prompt
        )
        
        # #region agent log
        try:
            with open(r"c:\Users\ZhuanZ（无密码）\Desktop\dmoes\饮食推荐demo\.cursor\debug.log", "a", encoding="utf-8") as f:
                log_entry = json_module.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "E",
                    "location": "app.py:generate_tags_with_ai:after_api_call",
                    "message": "调用 Vertex AI 后",
                    "data": {"response_received": True, "response_length": len(response.text) if hasattr(response, 'text') else 0},
                    "timestamp": int(datetime.now().timestamp() * 1000)
                }, ensure_ascii=False) + "\n"
                f.write(log_entry)
        except Exception:
            pass
        # #endregion
        
        # 解析JSON响应
        response_text = response.text.strip()
        print(f"原始响应: {response_text[:500]}...")  # 调试信息
        
        # 尝试提取JSON（可能包含markdown代码块）
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0].strip()
        elif '```' in response_text:
            response_text = response_text.split('```')[1].split('```')[0].strip()
        
        # 尝试找到JSON对象的开始和结束
        # 查找第一个 { 和最后一个 }
        start_idx = response_text.find('{')
        end_idx = response_text.rfind('}')
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            response_text = response_text[start_idx:end_idx+1]
        
        # 清理可能的换行和空格问题
        response_text = response_text.strip()
        
        print(f"提取的JSON: {response_text[:500]}...")  # 调试信息
        
        # 尝试解析JSON，如果失败则尝试修复
        try:
            tags = json.loads(response_text)
        except json.JSONDecodeError as e:
            # 如果解析失败，尝试修复常见问题
            print(f"JSON解析错误: {e}")
            print(f"错误位置: {e.pos if hasattr(e, 'pos') else 'unknown'}")
            
            # 方法1: 移除注释和空行
            lines = response_text.split('\n')
            cleaned_lines = []
            for line in lines:
                line = line.strip()
                # 跳过空行和注释行
                if line and not line.startswith('//') and not line.startswith('#'):
                    cleaned_lines.append(line)
            response_text_cleaned = '\n'.join(cleaned_lines)
            
            try:
                tags = json.loads(response_text_cleaned)
            except json.JSONDecodeError:
                # 方法2: 使用正则表达式提取JSON
                json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response_text, re.DOTALL)
                if json_match:
                    response_text_cleaned = json_match.group(0)
                    tags = json.loads(response_text_cleaned)
                else:
                    # 如果还是失败，抛出原始错误
                    raise e
        
        # 验证和规范化tags (根据新数据库更新)
        valid_buckets = ['Main Dish', 'Complete Meal', 'Breakfast', 'Snack / Dessert']  # 移除 Side Dish
        valid_dietary = ['Vegan', 'Vegetarian', 'Pescatarian', 'Halal', 'Kosher']
        valid_timing = ['Breakfast', 'Lunch', 'Dinner', 'Snack']  # 新增 Snack
        valid_allergens = ['Contains Gluten', 'Contains Dairy', 'Contains Shellfish']  # 移除 Contains Nuts（新数据库中没有）
        valid_equipment = ['没有Stove', '没有Microwave', '没有Oven', '没有Blender', '没有No-Cook']
        valid_health_tags = ['Stable Energy', 'Coma Inducing', 'Quick Fuel', 'Volume Eater', 'Compact Fuel', 'Protein High', 'Keto Friendly']
        valid_effort_tags = ['Lightning', 'Quick Fix', 'Slow Burn', 'Brainless', 'One-Pot', 'Focus Required', 'Fresh Run', 'Microwave-Only', 'Portable', 'Meal Prep']  # 移除 Pantry Staple 和 On-the-Go（新数据库中没有）
        valid_flavor_tags = ['Savory', 'Sweet', 'Spicy', 'Sour', 'Crunchy', 'Creamy', 'Warm & Soupy', 'Comfort Food', 'Clean / Detox', 'Kid Friendly', 'Date Night', 'Sick Day']
        
        # 验证buckets
        if 'buckets' in tags:
            if not isinstance(tags['buckets'], list):
                tags['buckets'] = []
            tags['buckets'] = [b for b in tags['buckets'] if b in valid_buckets]
            if not tags['buckets']:
                tags['buckets'] = valid_buckets  # 如果都无效，使用所有
        
        # 验证dietary（支持多选）
        if 'dietary' in tags:
            dietary_input = tags['dietary']
            if isinstance(dietary_input, str):
                dietary_input = [dietary_input.strip()] if dietary_input.strip() else []
            elif not isinstance(dietary_input, list):
                dietary_input = []
            
            validated_dietary = []
            for d in dietary_input:
                if isinstance(d, str):
                    d = d.strip()
                    # 如果为空字符串，表示无偏好，不添加到验证列表
                    if d == '':
                        continue
                    if d in valid_dietary:
                        validated_dietary.append(d)
                    else:
                        # 尝试大小写不敏感匹配
                        d_lower = d.lower()
                        for vd in valid_dietary:
                            if vd.lower() == d_lower:
                                validated_dietary.append(vd)
                                break
            tags['dietary'] = validated_dietary  # 如果为空列表，表示无偏好
        
        # 验证timing
        if 'timing' in tags:
            if not isinstance(tags['timing'], list):
                tags['timing'] = []
            tags['timing'] = [t for t in tags['timing'] if t in valid_timing]
        
        # 验证user_allergens
        if 'user_allergens' in tags:
            if not isinstance(tags['user_allergens'], list):
                tags['user_allergens'] = []
            tags['user_allergens'] = [a for a in tags['user_allergens'] if a in valid_allergens]
        else:
            tags['user_allergens'] = []
        
        # 验证user_equipment（反向筛选，空数组表示"无preference"）
        if 'user_equipment' in tags:
            if not isinstance(tags['user_equipment'], list):
                tags['user_equipment'] = []
            tags['user_equipment'] = [e for e in tags['user_equipment'] if e in valid_equipment]
            # 如果为空，表示"无preference"（不进行筛选），保持空数组
        else:
            tags['user_equipment'] = []  # 默认"无preference"
        
        tags.setdefault('priority_queue', ['Effort', 'Health', 'Flavor'])
        
        # 规范化标签字段（支持字符串或数组）
        def normalize_tag_field(field_name, valid_list):
            if field_name in tags:
                tag_value = tags[field_name]
                if isinstance(tag_value, str):
                    tags[field_name] = [tag_value] if tag_value.strip() and tag_value in valid_list else []
                elif isinstance(tag_value, list):
                    tags[field_name] = [t for t in tag_value if t in valid_list]
                else:
                    tags[field_name] = []
            else:
                tags[field_name] = []
        
        normalize_tag_field('effort_tag', valid_effort_tags)
        normalize_tag_field('health_tag', valid_health_tags)
        normalize_tag_field('flavor_tag', valid_flavor_tags)
        
        tags.setdefault('condition', '')
        tags.setdefault('goal', '')
        
        return jsonify({
            'success': True,
            'tags': tags,
            'raw_response': response.text
        })
    
    except json.JSONDecodeError as e:
        import traceback
        error_msg = f'JSON解析失败: {str(e)}'
        if hasattr(e, 'pos'):
            error_msg += f' (位置: {e.pos})'
        print(f"JSON解析错误详情: {error_msg}")
        print(f"错误响应: {response.text if 'response' in locals() else 'N/A'}")
        return jsonify({
            'success': False,
            'error': error_msg,
            'raw_response': response.text if 'response' in locals() else None,
            'trace': traceback.format_exc() if app.debug else None
        }), 500
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"生成标签错误: {str(e)}")
        print(f"错误堆栈: {error_trace}")
        
        # #region agent log
        try:
            import json as json_module
            import os as os_module
            error_log_data = {
                "error_type": type(e).__name__,
                "error_message": str(e),
                "proxy_vars": {
                    "HTTP_PROXY": os_module.getenv('HTTP_PROXY'),
                    "HTTPS_PROXY": os_module.getenv('HTTPS_PROXY'),
                    "http_proxy": os_module.getenv('http_proxy'),
                    "https_proxy": os_module.getenv('https_proxy')
                },
                "error_trace": error_trace[:1000]  # 限制长度
            }
            with open(r"c:\Users\ZhuanZ（无密码）\Desktop\dmoes\饮食推荐demo\.cursor\debug.log", "a", encoding="utf-8") as f:
                log_entry = json_module.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "E",
                    "location": "app.py:generate_tags_with_ai:exception",
                    "message": "Vertex AI 调用异常",
                    "data": error_log_data,
                    "timestamp": int(datetime.now().timestamp() * 1000)
                }, ensure_ascii=False) + "\n"
                f.write(log_entry)
        except Exception:
            pass
        # #endregion
        
        return jsonify({
            'success': False,
            'error': str(e),
            'trace': error_trace if app.debug else None,
            'raw_response': response.text if 'response' in locals() else None
        }), 500


@app.route('/api/prompt/template', methods=['GET'])
def get_prompt_template():
    """获取提示词模板"""
    return jsonify({
        'template': DEFAULT_PROMPT_TEMPLATE
    })


@app.route('/api/ai/select-recipe', methods=['POST'])
def select_recipe_with_ai():
    """使用 LLM 从筛选结果中选择一个最适合的推荐"""
    global vertex_client, vertex_configured
    
    if not vertex_configured or vertex_client is None:
        return jsonify({
            'success': False,
            'error': 'Vertex AI 尚未配置'
        }), 400
    
    try:
        data = request.json
        recipes = data.get('recipes', [])
        user_info = data.get('user_info', '')
        condition = data.get('condition', '')
        goal = data.get('goal', '')
        model = data.get('model', 'gemini-2.5-flash')
        
        if not recipes or len(recipes) == 0:
            return jsonify({
                'success': False,
                'error': '没有可选择的食谱'
            }), 400
        
        # 构建提示词
        recipes_text = "\n".join([
            f"{i+1}. {r.get('name', '')} - {r.get('bucket', '')} | "
            f"热量: {r.get('calories', 0)}卡 | 蛋白质: {r.get('protein', 0)}g | "
            f"饮食: {r.get('dietary', '')} | 时间: {', '.join(r.get('timing', []))} | "
            f"食材: {r.get('ingredients', '')[:100]}..."
            for i, r in enumerate(recipes)
        ])
        
        prompt = f"""你是一个专业的食谱推荐助手。根据用户的需求，从以下筛选出的食谱中选择一个最适合的推荐。

用户信息：{user_info}
特殊状况：{condition if condition else '无'}
饮食目标：{goal if goal else '无特殊目标'}

筛选出的食谱列表：
{recipes_text}

请根据用户的需求、特殊状况和饮食目标，从上述食谱中选择一个最适合的。只返回JSON格式，不要其他文字：

{{
    "selected_index": 选择的食谱编号（1-{len(recipes)}）,
    "reason": "选择理由（简短说明为什么这个食谱最适合）"
}}"""
        
        # 调用 Vertex AI
        response = vertex_client.models.generate_content(
            model=model,
            contents=prompt
        )
        
        # 解析JSON响应
        response_text = response.text.strip()
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0].strip()
        elif '```' in response_text:
            response_text = response_text.split('```')[1].split('```')[0].strip()
        
        selection = json.loads(response_text)
        selected_index = int(selection.get('selected_index', 1)) - 1  # 转换为0-based索引
        
        if selected_index < 0 or selected_index >= len(recipes):
            selected_index = 0  # 如果索引无效，选择第一个
        
        selected_recipe = recipes[selected_index]
        
        return jsonify({
            'success': True,
            'recipe': selected_recipe,
            'reason': selection.get('reason', ''),
            'raw_response': response.text
        })
    
    except json.JSONDecodeError as e:
        return jsonify({
            'success': False,
            'error': f'JSON解析失败: {str(e)}',
            'raw_response': response.text if 'response' in locals() else None
        }), 500
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'trace': traceback.format_exc() if app.debug else None
        }), 500


def run_server():
    """Run the server (can be imported by start_server.py)"""
    # Initialize with recipes database
    initialize_data()
    
    # Try to auto-configure Vertex AI if env vars are set
    try:
        from vertex_config import check_environment, get_vertex_client
        env_ok, missing = check_environment()
        if env_ok:
            global vertex_client, vertex_configured
            vertex_client = get_vertex_client()
            vertex_configured = True
            print("✓ Vertex AI 已自动配置")
        else:
            print(f"⚠ Vertex AI 环境变量未设置: {missing}")
            print("  可通过前端界面手动配置")
    except Exception as e:
        print(f"⚠ Vertex AI 自动配置失败: {e}")
        print("  可通过前端界面手动配置")
    
    # 获取本机局域网 IP 地址
    import socket
    def get_local_ip():
        """获取本机局域网 IP 地址"""
        try:
            # 连接到一个远程地址（不需要实际连接）
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "127.0.0.1"
    
    local_ip = get_local_ip()
    
    print("\n" + "="*60)
    print("Jovida Recipe Recommendation Engine")
    print("="*60)
    print("服务器正在启动...")
    print(f"本地访问: http://localhost:5000")
    print(f"局域网访问: http://{local_ip}:5000")
    print("="*60)
    print("提示: 确保防火墙允许端口 5000 的入站连接")
    print("="*60 + "\n")
    
    # 确保绑定到所有接口，允许局域网访问
    print(f"\n正在启动服务器，监听地址: 0.0.0.0:5000")
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)

if __name__ == '__main__':
    run_server()

