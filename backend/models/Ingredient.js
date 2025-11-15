// models/Ingredient.js (Updated for Diet Levels)
import mongoose from "mongoose";

/**
 * base_status now reflects how each ingredient aligns
 * with common dietary patterns (vegan, vegetarian, etc.).
 *
 * This allows your system to determine compatibility
 * with any user-selected diet profile.
 */

const DIET_STATUSES = [
  "vegan",
  "vegetarian",
  "pescatarian",
  "ovo",
  "lacto",
  "lacto_ovo",
  "flexitarian",
  "custom"
];

const ingredientSchema = new mongoose.Schema({
  id: { type: String, index: true, unique: true }, // Friendly ID for frontend
  name: { type: String, required: true },
  aliases: [String],

  /**
   * base_status:
   * Represents the MOST RESTRICTIVE diet that still allows this ingredient.
   *
   * Examples:
   * - Milk → "lacto"
   * - Eggs → "ovo"
   * - Fish → "pescatarian"
   * - Honey → "vegetarian"
   * - Gelatin → "flexitarian" (or "custom" if fully restricted)
   */
  base_status: { type: String, enum: DIET_STATUSES, default: "custom" },

  // e.g., MEAT / FISH / DAIRY / EGG / HONEY / SHELLFISH / GELATIN
  tags: [String],

  // Display description for user info
  description: String,

  // Recommended replacements for non-fitting diets
  default_substitutions: [String]
});

export default mongoose.model("Ingredient", ingredientSchema);
