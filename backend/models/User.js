// models/User.js
// User data structure definition (MongoDB/Mongoose removed - now using JSON storage)
// This file is kept for reference only - actual storage is handled by UserStorage in utils/jsonStorage.js

/**
 * User data structure:
 * {
 *   _id: string,                    // Unique identifier
 *   id: string,                     // Alias for _id (for compatibility)
 *   name: string,                    // User's name
 *   dietLevel: "vegan" | "vegetarian" | "pescatarian" | "ovo" | "lacto" | "lacto_ovo" | "flexitarian",
 *   extraForbiddenTags: string[],    // Additional dietary restrictions
 *   preferredCuisines: string[],     // Preferred cuisine types
 *   cookingStylePreferences: string[], // Preferred cooking styles
 *   sproutName: string,             // Always "Albert" (single user system)
 *   createdAt: string                // ISO date string
 * }
 * 
 * Note: All user operations should use UserStorage from utils/jsonStorage.js
 * Example: const user = await UserStorage.findOne({ sproutName: "Albert" });
 */

// No exports - this file is for reference only
