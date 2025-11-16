// models/grocery.js
// Grocery data structure definition (MongoDB/Mongoose removed - now using JSON storage)
// This file is kept for reference only - actual storage is handled by GroceryItemStorage in utils/jsonStorage.js
// Note: This appears to be a duplicate/alternative to GroceryItem.js

/**
 * Grocery data structure (legacy/alternative format):
 * {
 *   _id: string,                    // Unique identifier
 *   userID: string,                  // User ID (always Albert's ID)
 *   name: string,                    // Item name
 *   category: string,                // Item category (default: "Produce")
 *   isChecked: boolean,              // Whether item is checked off (default: false)
 *   boughtAt: string                 // ISO date string when item was bought
 * }
 * 
 * Note: This model appears to be a legacy/duplicate of GroceryItem.
 * All grocery operations should use GroceryItemStorage from utils/jsonStorage.js
 * Example: const items = await GroceryItemStorage.find({ userId: albertId });
 */

// No exports - this file is for reference only
