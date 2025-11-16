// models/GroceryItem.js
// GroceryItem data structure definition (MongoDB/Mongoose removed - now using JSON storage)
// This file is kept for reference only - actual storage is handled by GroceryItemStorage in utils/jsonStorage.js

/**
 * GroceryItem data structure:
 * {
 *   _id: string,                    // Unique identifier
 *   userId: string,                  // User ID (always Albert's ID)
 *   name: string,                    // Item name
 *   category: string,                // Item category (default: "Uncategorized")
 *   isChecked: boolean,              // Whether item is checked off (default: false)
 *   createdAt: string,               // ISO date string
 *   updatedAt: string                // ISO date string
 * }
 * 
 * Note: All grocery item operations should use GroceryItemStorage from utils/jsonStorage.js
 * Example: const items = await GroceryItemStorage.find({ userId: albertId });
 */

// No exports - this file is for reference only

