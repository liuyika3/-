"""
Data loading utilities for recipe dataset
Supports CSV and JSON formats
"""

import pandas as pd
import json
from typing import Optional


def load_recipes(file_path: str, format: str = 'auto') -> pd.DataFrame:
    """
    Load recipes from CSV or JSON file
    
    Args:
        file_path: Path to the recipe file
        format: 'csv', 'json', or 'auto' (detect from extension)
    
    Returns:
        DataFrame with recipe data
    """
    if format == 'auto':
        if file_path.endswith('.csv'):
            format = 'csv'
        elif file_path.endswith('.json'):
            format = 'json'
        else:
            raise ValueError(f"Cannot auto-detect format for {file_path}")
    
    if format == 'csv':
        df = pd.read_csv(file_path)
    elif format == 'json':
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        df = pd.DataFrame(data)
    else:
        raise ValueError(f"Unsupported format: {format}")
    
    # Normalize column names (lowercase, replace spaces with underscores)
    df.columns = df.columns.str.lower().str.replace(' ', '_')
    
    # Ensure required columns exist with defaults
    required_columns = {
        'name': '',
        'ingredients': '',
        'nutrition': '',
        'steps': '',
        'meal_type': '',
        'allergen': '',
        'equipment_needed': '',
        'method': '',
        'protein': 0,
        'calories': 0,
        'carbs': 0,
        'fiber': 0,
        'prep_time': 0,
        'cook_time': 0
    }
    
    for col, default in required_columns.items():
        if col not in df.columns:
            df[col] = default
    
    return df


def create_sample_dataset() -> pd.DataFrame:
    """
    Create a sample dataset for testing when no data file is provided
    """
    sample_recipes = [
        {
            'name': 'Chicken Teriyaki Bowl',
            'ingredients': 'chicken, rice, teriyaki sauce, vegetables',
            'nutrition': 'Protein: 25g, Calories: 450',
            'steps': 'Cook chicken. Add sauce. Serve over rice.',
            'meal_type': 'Lunch, Dinner',
            'allergen': 'Gluten',
            'equipment_needed': 'Stove',
            'method': 'Stove cooking, one-pot',
            'protein': 25,
            'calories': 450,
            'carbs': 55,
            'fiber': 3,
            'prep_time': 10,
            'cook_time': 15
        },
        {
            'name': 'Greek Salad',
            'ingredients': 'lettuce, tomatoes, cucumbers, feta cheese, olives',
            'nutrition': 'Protein: 8g, Calories: 180',
            'steps': 'Chop vegetables. Mix. Add cheese.',
            'meal_type': 'Lunch, Dinner',
            'allergen': 'Dairy',
            'equipment_needed': 'None',
            'method': 'No cooking required',
            'protein': 8,
            'calories': 180,
            'carbs': 12,
            'fiber': 4,
            'prep_time': 10,
            'cook_time': 0
        },
        {
            'name': 'Microwave Mac and Cheese',
            'ingredients': 'pasta, cheese, milk, butter',
            'nutrition': 'Protein: 15g, Calories: 320',
            'steps': 'Cook pasta in microwave. Add cheese. Mix.',
            'meal_type': 'Lunch, Dinner',
            'allergen': 'Gluten, Dairy',
            'equipment_needed': 'Microwave',
            'method': 'Microwave cooking',
            'protein': 15,
            'calories': 320,
            'carbs': 45,
            'fiber': 2,
            'prep_time': 2,
            'cook_time': 5
        },
        {
            'name': 'Scrambled Eggs',
            'ingredients': 'eggs, butter, salt, pepper',
            'nutrition': 'Protein: 12g, Calories: 200',
            'steps': 'Beat eggs. Cook in pan. Season.',
            'meal_type': 'Breakfast',
            'allergen': 'Dairy',
            'equipment_needed': 'Stove',
            'method': 'Stove cooking',
            'protein': 12,
            'calories': 200,
            'carbs': 2,
            'fiber': 0,
            'prep_time': 2,
            'cook_time': 5
        },
        {
            'name': 'Vegan Curry Bowl',
            'ingredients': 'chickpeas, coconut milk, curry spices, rice',
            'nutrition': 'Protein: 18g, Calories: 380',
            'steps': 'Cook chickpeas. Add spices. Simmer. Serve over rice.',
            'meal_type': 'Dinner',
            'allergen': '',
            'equipment_needed': 'Stove',
            'method': 'Stove cooking, one-pot',
            'protein': 18,
            'calories': 380,
            'carbs': 50,
            'fiber': 12,
            'prep_time': 10,
            'cook_time': 20
        },
        {
            'name': 'Chicken Soup',
            'ingredients': 'chicken, vegetables, broth, noodles',
            'nutrition': 'Protein: 20g, Calories: 250',
            'steps': 'Boil chicken. Add vegetables. Simmer. Add noodles.',
            'meal_type': 'Lunch, Dinner',
            'allergen': 'Gluten',
            'equipment_needed': 'Stove',
            'method': 'Stove cooking, one-pot, comfort food',
            'protein': 20,
            'calories': 250,
            'carbs': 25,
            'fiber': 3,
            'prep_time': 15,
            'cook_time': 30
        }
    ]
    
    return pd.DataFrame(sample_recipes)


