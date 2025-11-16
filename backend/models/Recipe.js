// models/Recipe.js
// Recipe data structure definition (MongoDB/Mongoose removed - now using JSON storage)
// This file is kept for reference only - actual storage is handled by RecipeStorage in utils/jsonStorage.js

/**
 * Recipe data structure:
 * {
 *   _id: string,                    // Unique identifier
 *   userId: string,                  // User ID (always Albert's ID)
 *   title: string,                   // Recipe title
 *   tags: string[],                  // Recipe tags
 *   duration: string,                // Cooking duration
 *   ingredients: RecipeIngredient[], // Array of ingredients
 *   steps: string[],                 // Cooking steps
 *   previewImageUrl: string,         // Image URL
 *   originalPrompt: string,         // Original prompt used to generate recipe
 *   type: "simplified" | "veganized", // Recipe type
 *   substitutionMap: object,        // Map of ingredient substitutions (key-value pairs)
 *   createdAt: string,              // ISO date string
 *   updatedAt: string                // ISO date string
 * }
 * 
 * RecipeIngredient structure:
 * {
 *   name: string,                    // Ingredient name
 *   amount: string,                  // Amount (e.g., "1 cup")
 *   unit: string                     // Unit (e.g., "cup")
 * }
 * 
 * Note: All recipe operations should use RecipeStorage from utils/jsonStorage.js
 * Example: const recipe = await RecipeStorage.findById(recipeId);
 */

// No exports - this file is for reference only
