"""
Main script with simulation scenarios for Jovida Recipe Recommendation Engine
Demonstrates the multi-stage filtering approach with three scenarios
"""

import pandas as pd
from recipe_tagger import RecipeTagger
from recommendation_engine import RecommendationEngine
from data_loader import load_recipes, create_sample_dataset
import sys
import os


def run_scenario(name: str, user_profile: dict, agent_l0_selection: list, 
                agent_l1_keywords: dict, priority_queue: list, 
                agent_tag_keywords: dict, user_specifics: dict, engine: RecommendationEngine):
    """Run a single scenario"""
    print("\n" + "="*80)
    print(f"SCENARIO: {name}")
    print("="*80)
    
    print(f"\nUser Profile:")
    print(f"  Allergens: {user_profile.get('allergens', [])}")
    print(f"  Equipment: {user_profile.get('equipment', [])}")
    
    print(f"\nAgent Decisions:")
    print(f"  L0 Buckets: {agent_l0_selection}")
    print(f"  L1 Keywords: {agent_l1_keywords}")
    print(f"  Priority Queue: {priority_queue}")
    print(f"  Tag Keywords: {agent_tag_keywords}")
    print(f"  User Specifics: {user_specifics}")
    
    results = engine.recommend(
        user_profile=user_profile,
        agent_l0_selection=agent_l0_selection,
        agent_l1_keywords=agent_l1_keywords,
        priority_queue=priority_queue,
        agent_tag_keywords=agent_tag_keywords,
        user_specifics=user_specifics
    )
    
    return results


def main():
    """Main function to run all scenarios"""
    print("\n" + "="*80)
    print("Jovida Context-Aware Recipe Engine - Simulation Scenarios")
    print("="*80)
    
    # Load data
    data_file = None
    if len(sys.argv) > 1:
        data_file = sys.argv[1]
        if not os.path.exists(data_file):
            print(f"Warning: File {data_file} not found. Using sample dataset.")
            data_file = None
    
    if data_file:
        print(f"\nLoading recipes from {data_file}...")
        recipes_df = load_recipes(data_file)
    else:
        print("\nUsing sample dataset...")
        recipes_df = create_sample_dataset()
    
    print(f"Loaded {len(recipes_df)} recipes")
    
    # Tag recipes
    print("\nTagging recipes...")
    tagger = RecipeTagger()
    tagged_recipes = tagger.tag_dataframe(recipes_df)
    
    # Initialize engine
    engine = RecommendationEngine(tagged_recipes)
    
    # Scenario A: "Busy & Tired" (Workday Lunch)
    scenario_a_results = run_scenario(
        name="A: Busy & Tired (Workday Lunch)",
        user_profile={
            'allergens': [],
            'equipment': ['Microwave']
        },
        agent_l0_selection=['Complete Meal'],
        agent_l1_keywords={
            'timing': ['Lunch'],
            'dietary': 'Omnivore'
        },
        priority_queue=['Effort', 'Health', 'Flavor'],
        agent_tag_keywords={
            'Effort': 'Lightning',
            'Health': 'Stable Energy',
            'Flavor': 'Savory'
        },
        user_specifics={
            'condition': 'Busy workday',
            'goal': 'Quick, satisfying lunch'
        },
        engine=engine
    )
    
    # Scenario B: "Weekend Dinner" (Relaxed)
    scenario_b_results = run_scenario(
        name="B: Weekend Dinner (Relaxed)",
        user_profile={
            'allergens': ['Nuts'],
            'equipment': ['Stove', 'Oven', 'Microwave', 'Blender']
        },
        agent_l0_selection=['Main Dish', 'Side Dish'],
        agent_l1_keywords={
            'timing': ['Dinner'],
            'dietary': 'Vegan'
        },
        priority_queue=['Health', 'Flavor', 'Effort'],
        agent_tag_keywords={
            'Health': 'High Protein',
            'Flavor': 'Spicy',
            'Effort': 'Brainless'  # Changed from 'Slow Burn' to existing tag
        },
        user_specifics={
            'condition': 'Weekend relaxation',
            'goal': 'Nutritious, flavorful meal'
        },
        engine=engine
    )
    
    # Scenario C: "Sick Day" (Specific Condition)
    scenario_c_results = run_scenario(
        name="C: Sick Day (Sore Throat)",
        user_profile={
            'allergens': [],
            'equipment': ['Stove', 'Microwave']
        },
        agent_l0_selection=['Complete Meal', 'Side Dish'],
        agent_l1_keywords={
            'timing': ['Dinner'],
            'dietary': 'Omnivore'
        },
        priority_queue=['Flavor', 'Effort'],
        agent_tag_keywords={
            'Flavor': 'Comfort Food',
            'Effort': 'One-Pot'
        },
        user_specifics={
            'condition': 'Sore Throat',
            'goal': 'Soft, soothing food'
        },
        engine=engine
    )
    
    # Summary
    print("\n" + "="*80)
    print("SCENARIO SUMMARY")
    print("="*80)
    print(f"\nScenario A Results: {len(scenario_a_results)} recipe(s)")
    print(f"Scenario B Results: {len(scenario_b_results)} recipe(s)")
    print(f"Scenario C Results: {len(scenario_c_results)} recipe(s)")
    print("\n" + "="*80)


if __name__ == '__main__':
    main()


