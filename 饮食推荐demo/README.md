# Jovida Context-Aware Recipe Engine

A Python-based demo using `pandas` for a multi-stage filtering recipe recommendation system.

## Features

- **Multi-Stage Filtering**: Implements Level 0 (Buckets), Level 1 (Hard Attributes), and Level 2/3/4 (Strategy Tags)
- **Auto-Tagging**: Automatically tags recipes based on nutrition, ingredients, and cooking methods
- **Rollback Logic**: Intelligent filtering with rollback when results are too few
- **Web Interface**: Beautiful HTML interface for interactive filtering
- **RESTful API**: Flask backend for recipe recommendations

## Project Structure

```
.
├── recipe_tagger.py          # RecipeTagger class for auto-tagging
├── recommendation_engine.py  # RecommendationEngine with multi-stage filtering
├── data_loader.py            # Data loading utilities (CSV/JSON)
├── app.py                    # Flask backend server
├── main.py                   # Simulation scenarios
├── static/
│   └── index.html           # Web interface
├── requirements.txt         # Python dependencies
└── README.md                # This file
```

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Option 1: Web Interface (Recommended)

1. Start the Flask server:
```bash
python app.py
```

2. Open your browser and navigate to:
```
http://localhost:5000
```

3. Use the interface to:
   - Set user profile (dietary, allergens, equipment)
   - Select meal types and timing
   - Choose strategy tags (Effort, Health, Flavor)
   - Get personalized recommendations

### Option 2: Command Line Scenarios

Run the simulation scenarios:
```bash
python main.py
```

Or with your own dataset:
```bash
python main.py recipes.csv
```

## Data Format

Your recipe dataset should include the following columns:

- `name`: Recipe name
- `ingredients`: Ingredients list
- `nutrition`: Nutrition information (optional)
- `steps`: Cooking steps
- `meal_type`: Meal type (Breakfast, Lunch, Dinner, Snack)
- `allergen`: Allergen information
- `equipment_needed`: Required equipment
- `method`: Cooking method
- `protein`: Protein in grams
- `calories`: Calories
- `carbs`: Carbohydrates in grams
- `fiber`: Fiber in grams
- `prep_time`: Preparation time in minutes
- `cook_time`: Cooking time in minutes

## Multi-Stage Filtering Logic

### Level 0: Buckets (Categories)
- **Main Dish**: Protein > 15g & Calories > 200
- **Side Dish**: Calories < 250 or name contains "Salad/Soup/Veggie"
- **Complete Meal**: Name contains "Bowl/Pasta/Fried Rice"
- **Breakfast**: meal_type contains 'Breakfast'
- **Snack**: meal_type contains 'Snack'

### Level 1: Hard Attributes
- **Timing**: Breakfast, Lunch, Dinner
- **Dietary**: Vegan, Vegetarian, Omnivore
- **Allergens**: Gluten, Dairy, Nuts, Shellfish
- **Equipment**: Stove, Oven, Microwave, Blender

### Level 2/3/4: Strategy Tags
- **Health**: Stable Energy, High Protein, Low Cal
- **Effort**: Lightning (<15m), Brainless (Few steps), One-Pot
- **Flavor**: Spicy, Sweet, Comfort Food, Savory

## API Endpoints

- `GET /api/recipes` - Get all recipes
- `POST /api/filter` - Get filtered recommendations
- `GET /api/stats` - Get database statistics

## Example Scenarios

The system includes three pre-configured scenarios:

1. **Busy & Tired**: Quick workday lunch with minimal equipment
2. **Weekend Dinner**: Relaxed vegan meal with full kitchen
3. **Sick Day**: Comfort food for sore throat

## License

This is a demo project for educational purposes.


