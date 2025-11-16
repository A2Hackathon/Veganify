# Backend Rewrite Summary

## Overview
All backend routes have been rewritten to exactly match the Swift iOS models. The API now returns data in the exact format expected by the Swift app.

## Key Changes

### 1. LLM Client (`utils/llmClient.js`)
- ✅ Removed duplicate exports (functions are exported directly)
- ✅ Improved error handling with safe content access
- ✅ All functions use `gemini-2.5-flash` model
- ✅ API key kept as-is (as requested)

### 2. EatingStyle Mapper (`utils/eatingStyleMapper.js`)
- ✅ New utility to convert between Swift EatingStyle and backend dietLevel
- ✅ `swiftToBackendDietLevel()` - converts "Vegan" → "vegan"
- ✅ `backendToSwiftDietLevel()` - converts "vegan" → "Vegan"
- ✅ `mapIngredientStatus()` - maps LLM status to Swift IngredientStatus

### 3. Profile Routes (`routes/profile.js`)
- ✅ GET `/profile?userId=...` - Returns UserProfile matching Swift model
- ✅ PATCH `/profile` - Updates profile with EatingStyle conversion
- ✅ POST `/profile/parse-restrictions` - Parses dietary restrictions from text
- ✅ All responses include: id, userName, eatingStyle (Swift format), dietaryRestrictions, cuisinePreferences, cookingStylePreferences, sproutName, level, xp, xpToNextLevel, coins, streakDays

### 4. Onboarding Route (`routes/onboarding.js`)
- ✅ POST `/onboarding/profile` - Creates new user profile
- ✅ Converts Swift EatingStyle to backend dietLevel on save
- ✅ Returns UserProfile in Swift format
- ✅ Creates UserImpact record with initial values

### 5. Home Route (`routes/home.js`)
- ✅ GET `/home/summary?userId=...` - Returns profile + missions
- ✅ Response format:
  ```json
  {
    "profile": { /* UserProfile */ },
    "missions": [
      {
        "id": "log_meal",
        "title": "Log a vegan meal",
        "xpReward": 20,
        "coinReward": 5,
        "isCompleted": false
      }
    ]
  }
  ```

### 6. Recipe Routes (`routes/recipes.js`)
- ✅ POST `/recipes/generate` - Generates recipe from groceries
- ✅ POST `/recipes/veganize` - Veganizes a recipe
- ✅ GET `/recipes/saved?userId=...` - Gets saved recipes
- ✅ POST `/recipes/save` - Saves a recipe
- ✅ All responses match Swift Recipe model:
  ```json
  {
    "id": "...",
    "userId": "...",
    "title": "...",
    "tags": [],
    "duration": "...",
    "ingredients": [
      {
        "name": "...",
        "amount": null,
        "unit": null
      }
    ],
    "steps": [],
    "previewImageUrl": "",
    "originalPrompt": null,
    "type": "simplified" | "veganized",
    "substitutionMap": null | {}
  }
  ```

### 7. Scan Routes

#### `routes/scanIngredients.js`
- ✅ POST `/scan/ingredients` - Scans image for ingredients
- ✅ POST `/scan/ingredients/text` - Analyzes text ingredients
- ✅ Returns IngredientClassification[] matching Swift model:
  ```json
  {
    "ingredients": [
      {
        "name": "...",
        "status": "allowed" | "ambiguous" | "not_allowed",
        "reason": "...",
        "suggestions": []
      }
    ]
  }
  ```

#### `routes/scanMenu.js`
- ✅ POST `/scan/menu` - Scans menu image
- ✅ Returns MenuDish[] matching Swift model:
  ```json
  {
    "dishes": [
      {
        "name": "...",
        "status": "suitable" | "modifiable" | "not_suitable",
        "modificationSuggestion": null | "..."
      }
    ]
  }
  ```

### 8. Grocery List Routes (`routes/groceryList.js`)
- ✅ GET `/grocery-list?userId=...` - Gets all items
- ✅ POST `/grocery-list` - Adds new item
- ✅ PATCH `/grocery-list/:id` - Updates item (e.g., toggle checked)
- ✅ DELETE `/grocery-list/:id` - Deletes item
- ✅ POST `/grocery-list/scan-fridge` - Scans fridge image
- ✅ POST `/grocery-list/scan-receipt` - Scans receipt image
- ✅ All responses match Swift GroceryItem model:
  ```json
  {
    "id": "...",
    "name": "...",
    "category": "...",
    "isChecked": false,
    "userId": "..."
  }
  ```

### 9. Progress Route (`routes/progress.js`)
- ✅ POST `/progress/complete-mission` - Completes a mission
- ✅ Awards XP and updates UserImpact
- ✅ Returns updated UserProfile in Swift format

### 10. AI Chat Route (`routes/aiAsk.js`)
- ✅ POST `/ai/ask` - Chatbot endpoint
- ✅ Uses `getUserContext()` and `answerWithContext()`
- ✅ Returns: `{ "answer": "..." }`

### 11. Updated Models

#### `models/Recipe.js`
- ✅ Added fields: title, tags, duration, ingredients[], previewImageUrl, originalPrompt, type, substitutionMap
- ✅ `recipe` field stores steps array

#### `models/grocery.js`
- ✅ Added fields: category, isChecked
- ✅ Matches Swift GroceryItem model

## Data Flow

### EatingStyle Conversion
1. **iOS → Backend**: Swift sends "Vegan" → Backend stores "vegan"
2. **Backend → iOS**: Backend returns "vegan" → Swift receives "Vegan"

### Recipe Flow
1. **Generate**: LLM generates recipe → Converted to Swift Recipe format → Saved to DB
2. **Veganize**: Extract ingredients → Find substitutions → Rewrite recipe → Return Swift Recipe format
3. **Save/Get**: All recipes stored and returned in Swift Recipe format

### Ingredient Status Mapping
- LLM returns: "Allowed" | "NotAllowed" | "Ambiguous"
- Backend maps to: "allowed" | "not_allowed" | "ambiguous"
- Swift receives: IngredientStatus enum values

## Testing Checklist

- [ ] Onboarding creates profile correctly
- [ ] Profile GET returns correct format
- [ ] Profile PATCH updates correctly
- [ ] Home summary returns profile + missions
- [ ] Recipe generation works
- [ ] Recipe veganization works
- [ ] Recipe save/get works
- [ ] Ingredient scanning (image + text) works
- [ ] Menu scanning works
- [ ] Grocery list CRUD works
- [ ] Grocery scanning (fridge + receipt) works
- [ ] Mission completion awards XP
- [ ] Chatbot responds correctly

## Notes

- All routes use proper error handling
- All responses match Swift model structures exactly
- EatingStyle conversion happens automatically
- LLM responses are safely parsed and validated
- Database models updated to support all Swift fields

