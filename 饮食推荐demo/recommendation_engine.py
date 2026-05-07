"""
RecommendationEngine: Multi-stage filtering engine for recipe recommendations
Implements hard filtering (L0 & L1) and sequential funnel (L2/L3/L4) with rollback logic
"""

import pandas as pd
from typing import List, Dict, Optional, Tuple


class RecommendationEngine:
    """Multi-stage filtering engine for recipe recommendations"""
    
    def __init__(self, tagged_recipes: pd.DataFrame):
        """
        Initialize with tagged recipes dataframe
        
        Args:
            tagged_recipes: DataFrame with columns: bucket, timing, dietary, allergens, 
                          equipment, health_tags, effort_tags, flavor_tags
        """
        self.recipes = tagged_recipes.copy()
    
    def filter_stage_1(self, user_profile: Dict, agent_l0_selection: List[str], 
                       agent_l1_keywords: Dict) -> Tuple[pd.DataFrame, Dict]:
        """
        Step 1: Hard Filtering (L0 & L1)
        
        Args:
            user_profile: Dict with 'allergens' (list) and 'equipment' (list)
            agent_l0_selection: List of bucket names to include (e.g., ['Main', 'Side'])
            agent_l1_keywords: Dict with 'timing' (list) and 'dietary' (str)
        
        Returns:
            Tuple of (Filtered DataFrame, Statistics Dict)
        """
        stats = {
            'initial_count': len(self.recipes),
            'l0_count': 0,
            'l1_timing_count': 0,
            'l1_dietary_count': 0,
            'l1_allergen_count': 0,
            'l1_equipment_count': 0,
            'final_count': 0
        }
        
        pool = self.recipes.copy()
        initial_count = len(pool)
        stats['initial_count'] = initial_count
        
        # L0 Selection: Keep only recipes in selected buckets
        if agent_l0_selection:
            # 检查实际存在的buckets
            available_buckets = pool['bucket'].unique().tolist()
            print(f"  Available buckets in database: {available_buckets}")
            print(f"  Requested buckets: {agent_l0_selection}")
            
            # 过滤无效的buckets
            valid_selection = [b for b in agent_l0_selection if b in available_buckets]
            if not valid_selection:
                print(f"  ⚠️  所有请求的buckets都不存在，使用所有buckets")
                valid_selection = available_buckets
            
            pool = pool[pool['bucket'].isin(valid_selection)]
        else:
            print(f"  ⚠️  未指定buckets，使用所有recipes")
        l0_count = len(pool)
        stats['l0_count'] = l0_count
        print(f"  L0 Filter: {initial_count} -> {l0_count} recipes")
        
        # L1 Positive: Timing and Dietary
        if agent_l1_keywords.get('timing'):
            timing_list = agent_l1_keywords['timing']
            if isinstance(timing_list, str):
                timing_list = [timing_list]
            print(f"  Filtering by timing: {timing_list}")
            timing_filter = pool['timing'].apply(
                lambda x: any(t in (x if isinstance(x, list) else []) for t in timing_list)
            )
            pool = pool[timing_filter]
        l1_timing_count = len(pool)
        stats['l1_timing_count'] = l1_timing_count
        
        # L1 Negative: Dietary (REMOVE - 反向筛选)
        if agent_l1_keywords.get('dietary'):
            dietary_values = agent_l1_keywords['dietary']
            # 支持单个值或数组
            if isinstance(dietary_values, str):
                dietary_values = [dietary_values] if dietary_values.strip() else []
            elif not isinstance(dietary_values, list):
                dietary_values = []
            
            if dietary_values:
                print(f"  Filtering by dietary (反向筛选，排除): {dietary_values}")
                # 反向筛选：排除标记了这些dietary标签的食谱
                dietary_filter = pool['dietary'].apply(
                    lambda x: not any(dietary in (x if isinstance(x, list) else []) for dietary in dietary_values)
                )
                pool = pool[dietary_filter]
        l1_dietary_count = len(pool)
        stats['l1_dietary_count'] = l1_dietary_count
        print(f"  L1 Negative (Dietary): {l1_timing_count} -> {l1_dietary_count} recipes")
        
        # L1 Negative: Allergens (REMOVE)
        if user_profile.get('allergens'):
            user_allergens = user_profile['allergens']
            allergen_filter = pool['allergens'].apply(
                lambda x: not any(allergen in x for allergen in user_allergens)
            )
            pool = pool[allergen_filter]
        l1_allergen_count = len(pool)
        stats['l1_allergen_count'] = l1_allergen_count
        print(f"  L1 Negative (Allergens): {l1_dietary_count} -> {l1_allergen_count} recipes")
        
        # L1 Negative: Equipment (REMOVE - 反向筛选：排除标记了用户没有的设备的食谱)
        if user_profile.get('equipment'):
            user_equipment = user_profile['equipment']
            print(f"  DEBUG: user_equipment = {user_equipment}, type = {type(user_equipment)}")
            
            # 反向筛选：排除标记了用户没有的设备的食谱
            # 如果食谱标记了某个设备，但用户没有这个设备，则排除
            import ast
            def parse_equipment(x):
                """解析equipment字段，支持列表和字符串格式"""
                if isinstance(x, list):
                    return x
                elif isinstance(x, str):
                    try:
                        # 尝试解析字符串格式的列表，如 "['没有Microwave']"
                        return ast.literal_eval(x)
                    except (ValueError, SyntaxError):
                        # 如果解析失败，返回空列表
                        return []
                else:
                    return []
            
            # 调试：检查前几个食谱的equipment格式
            if len(pool) > 0:
                sample_eq = pool.iloc[0]['equipment']
                print(f"  DEBUG: sample recipe equipment = {repr(sample_eq)}, type = {type(sample_eq).__name__}")
                parsed_sample = parse_equipment(sample_eq)
                print(f"  DEBUG: parsed sample = {parsed_sample}")
            
            equipment_filter = pool['equipment'].apply(
                lambda x: not any(eq in parse_equipment(x) for eq in user_equipment)
            )
            
            # 调试：统计匹配的食谱数量
            matched_count = (~equipment_filter).sum()
            print(f"  DEBUG: 找到 {matched_count} 个需要被排除的食谱（标记了用户没有的设备）")
            
            pool = pool[equipment_filter]
        l1_equipment_count = len(pool)
        stats['l1_equipment_count'] = l1_equipment_count
        print(f"  L1 Negative (Equipment): {l1_allergen_count} -> {l1_equipment_count} recipes")
        
        # Fallback Strategy
        if len(pool) < 3:
            print(f"  ⚠️  Pool too small ({len(pool)}), relaxing timing constraint...")
            # Relax timing - allow 'Anytime'
            pool = self.recipes.copy()
            if agent_l0_selection:
                pool = pool[pool['bucket'].isin(agent_l0_selection)]
            if agent_l1_keywords.get('dietary'):
                dietary_values = agent_l1_keywords['dietary']
                if isinstance(dietary_values, str):
                    dietary_values = [dietary_values] if dietary_values.strip() else []
                if isinstance(dietary_values, list) and dietary_values:
                    # 反向筛选：排除标记了这些dietary标签的食谱
                    dietary_filter = pool['dietary'].apply(
                        lambda x: not any(dietary in (x if isinstance(x, list) else []) for dietary in dietary_values)
                    )
                    pool = pool[dietary_filter]
            if user_profile.get('allergens'):
                user_allergens = user_profile['allergens']
                allergen_filter = pool['allergens'].apply(
                    lambda x: not any(allergen in x for allergen in user_allergens)
                )
                pool = pool[allergen_filter]
            if user_profile.get('equipment'):
                user_equipment = user_profile['equipment']
                # 反向筛选：排除标记了用户没有的设备的食谱
                import ast
                def parse_equipment(x):
                    """解析equipment字段，支持列表和字符串格式"""
                    if isinstance(x, list):
                        return x
                    elif isinstance(x, str):
                        try:
                            # 尝试解析字符串格式的列表，如 "['没有Microwave']"
                            return ast.literal_eval(x)
                        except (ValueError, SyntaxError):
                            # 如果解析失败，返回空列表
                            return []
                    else:
                        return []
                
                equipment_filter = pool['equipment'].apply(
                    lambda x: not any(eq in parse_equipment(x) for eq in user_equipment)
                )
                pool = pool[equipment_filter]
            print(f"  After fallback: {len(pool)} recipes")
        
        stats['final_count'] = len(pool)
        return pool, stats
    
    def filter_stage_2(self, pool: pd.DataFrame, priority_queue: List[str], 
                      agent_tag_keywords: Dict) -> Tuple[pd.DataFrame, Dict]:
        """
        Step 2: Sequential Funnel (L2/L3/L4)
        
        Args:
            pool: Filtered recipes from Stage 1
            priority_queue: Order of tag categories to apply (e.g., ["Effort", "Health", "Flavor"])
            agent_tag_keywords: Dict with tag values (e.g., {"Effort": "Lightning", "Health": "Stable Energy"})
        
        Returns:
            Tuple of (Filtered DataFrame, Statistics Dict)
        """
        result_pools = []
        stage2_stats = {
            'buckets': {},
            'filters_applied': []
        }
        
        # Process each bucket separately
        for bucket in pool['bucket'].unique():
            bucket_pool = pool[pool['bucket'] == bucket].copy()
            print(f"\n  Processing bucket: {bucket} ({len(bucket_pool)} recipes)")
            
            bucket_stats = {
                'initial_count': len(bucket_pool),
                'filters': [],
                'final_count': 0
            }
            
            current_pool = bucket_pool.copy()
            previous_pool = None
            
            for priority_level in priority_queue:
                if len(current_pool) == 0:
                    break
                
                # Get the tag category and value
                tag_category = priority_level.lower() + '_tags'
                tag_values = agent_tag_keywords.get(priority_level)
                
                # 支持单个值或数组
                if isinstance(tag_values, str):
                    tag_values = [tag_values] if tag_values.strip() else []
                elif not isinstance(tag_values, list):
                    tag_values = []
                
                if not tag_values or tag_category not in current_pool.columns:
                    continue
                
                # 按顺序逐个筛选每个标签值，而不是一次性OR筛选
                for tag_value in tag_values:
                    if len(current_pool) == 0:
                        break
                    
                    previous_pool = current_pool.copy()
                    # 应用单个标签筛选
                    filter_mask = current_pool[tag_category].apply(
                        lambda x: tag_value in (x if isinstance(x, list) else [])
                    )
                    current_pool = current_pool[filter_mask]
                    
                    n = len(current_pool)
                    filter_info = {
                        'level': priority_level,
                        'tag': tag_value,
                        'before': len(previous_pool),
                        'after': n
                    }
                    bucket_stats['filters'].append(filter_info)
                    print(f"    Applied '{priority_level}' filter ({tag_value}): {len(previous_pool)} -> {n} recipes")
                    
                    # Check count (changed to 3-5 range)
                    if 3 <= n <= 5:
                        print(f"    ✓ Perfect range (3-5), STOPPING for {bucket}")
                        break  # 跳出tag_value循环
                    elif n > 5:
                        print(f"    → Still too many ({n}), continuing to next tag...")
                        continue  # 继续下一个tag_value
                    elif n < 3:
                        print(f"    ⚠️  Too few ({n}), ROLLBACK to previous pool ({len(previous_pool)} recipes)")
                        current_pool = previous_pool
                        # 回滚时更新最后一个filter的after值
                        if bucket_stats['filters']:
                            bucket_stats['filters'][-1]['after'] = len(current_pool)
                        break  # 跳出tag_value循环
                
                # 如果已经达到完美范围或回滚，跳出priority_level循环
                if len(current_pool) > 0:
                    n = len(current_pool)
                    if 3 <= n <= 5:
                        break  # 跳出priority_level循环
                    elif n < 3:
                        break  # 跳出priority_level循环（已经回滚）
            
            # If still > 5, take top 5
            if len(current_pool) > 5:
                current_pool = current_pool.head(5)
                print(f"    → Taking top 5 for {bucket}")
            
            bucket_stats['final_count'] = len(current_pool)
            stage2_stats['buckets'][bucket] = bucket_stats
            result_pools.append(current_pool)
        
        if result_pools:
            return pd.concat(result_pools, ignore_index=True), stage2_stats
        return pd.DataFrame(), stage2_stats
    
    def final_selection(self, shortlist: pd.DataFrame, user_specifics: Dict, top_n: int = 5) -> pd.DataFrame:
        """
        Step 3: Final Decision (Simulated)
        
        Args:
            shortlist: Filtered recipes from Stage 2
            user_specifics: Dict with 'condition' (str) and 'goal' (str)
            top_n: Number of top recipes to return per bucket (default 5, max 5)
        
        Returns:
            Top 3-5 recipes per bucket (sorted by priority)
        """
        results = []
        top_n = min(max(3, top_n), 5)  # 确保在3-5之间
        
        for bucket in shortlist['bucket'].unique():
            bucket_recipes = shortlist[shortlist['bucket'] == bucket].copy()
            
            condition = user_specifics.get('condition', '')
            goal = user_specifics.get('goal', '')
            
            print(f"\n  Final Selection for {bucket}:")
            print(f"    Analyzing {condition}... Selecting top {top_n} matches for {goal} from {len(bucket_recipes)} recipes.")
            
            if len(bucket_recipes) > 0:
                # 简单排序：根据标签匹配度（这里可以后续用LLM优化）
                # 暂时按名称排序，确保结果稳定
                bucket_recipes = bucket_recipes.sort_values('name')
                
                # 取前top_n个
                selected = bucket_recipes.head(top_n)
                
                for idx, row in selected.iterrows():
                    results.append(row)
                    print(f"    ✓ Selected: {row.get('name', 'Unknown')}")
        
        if results:
            return pd.DataFrame(results)
        return pd.DataFrame()
    
    def recommend(self, user_profile: Dict, agent_l0_selection: List[str], 
                  agent_l1_keywords: Dict, priority_queue: List[str], 
                  agent_tag_keywords: Dict, user_specifics: Dict) -> Tuple[pd.DataFrame, Dict]:
        """
        Complete recommendation pipeline
        
        Returns:
            Final recommended recipes (one per bucket)
        """
        print("\n" + "="*60)
        print("RECOMMENDATION PIPELINE")
        print("="*60)
        
        # 收集所有统计信息
        all_stats = {
            'stage1': {},
            'stage2': {},
            'stage3': {},
            'keywords_used': {
                'l0_buckets': agent_l0_selection,
                'l1_timing': agent_l1_keywords.get('timing', []),
                'l1_dietary': agent_l1_keywords.get('dietary', []),
                'l1_allergens_removed': user_profile.get('allergens', []),
                'l1_equipment_required': user_profile.get('equipment', []),
                'priority_queue': priority_queue,
                'l2_health_tag': agent_tag_keywords.get('Health', []),
                'l3_effort_tag': agent_tag_keywords.get('Effort', []),
                'l4_flavor_tag': agent_tag_keywords.get('Flavor', [])
            }
        }
        
        # Stage 1: Hard Filtering
        print("\n[Step 1] Hard Filtering (L0 & L1)")
        pool_stage1, stage1_stats = self.filter_stage_1(user_profile, agent_l0_selection, agent_l1_keywords)
        all_stats['stage1'] = stage1_stats
        print(f"  Result: {len(pool_stage1)} recipes")
        
        if len(pool_stage1) == 0:
            print("  ❌ No recipes match the criteria!")
            return pd.DataFrame(), all_stats
        
        # Stage 2: Sequential Funnel
        print("\n[Step 2] Sequential Funnel (L2/L3/L4)")
        pool_stage2, stage2_stats = self.filter_stage_2(pool_stage1, priority_queue, agent_tag_keywords)
        all_stats['stage2'] = stage2_stats
        print(f"  Result: {len(pool_stage2)} recipes")
        
        if len(pool_stage2) == 0:
            print("  ❌ No recipes after funnel filtering!")
            return pd.DataFrame(), all_stats
        
        # Stage 3: Final Selection
        print("\n[Step 3] Final Selection")
        final_results = self.final_selection(pool_stage2, user_specifics, top_n=5)
        all_stats['stage3'] = {
            'final_count': len(final_results),
            'buckets': {}
        }
        
        # 统计每个bucket的最终数量
        for bucket in final_results['bucket'].unique() if len(final_results) > 0 else []:
            bucket_count = len(final_results[final_results['bucket'] == bucket])
            all_stats['stage3']['buckets'][bucket] = bucket_count
        
        print("\n" + "="*60)
        print("FINAL RECOMMENDATIONS")
        print("="*60)
        for idx, row in final_results.iterrows():
            print(f"\n{row.get('name', 'Unknown')}")
            print(f"  Bucket: {row.get('bucket', 'Unknown')}")
            print(f"  Dietary: {row.get('dietary', 'Unknown')}")
            print(f"  Timing: {row.get('timing', [])}")
        
        return final_results, all_stats

