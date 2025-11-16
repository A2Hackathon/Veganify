// models/UserImpact.js
// UserImpact data structure definition (MongoDB/Mongoose removed - now using JSON storage)
// This file is kept for reference only - actual storage is handled by UserImpactStorage in utils/jsonStorage.js

/**
 * UserImpact data structure:
 * {
 *   _id: string,                    // Unique identifier
 *   user_id: string,                // User ID (always Albert's ID)
 *   total_meals_logged: number,     // Total meals logged (default: 0)
 *   xp: number,                     // Experience points (default: 0)
 *   coins: number,                  // Coins earned (default: 0)
 *   forest_stage: string,           // Forest stage: "SEED" | "SPROUT" | "TREE" | "FOREST" (default: "SEED")
 *   streak_days: number,            // Consecutive days streak (default: 0)
 *   last_activity_date: string      // ISO date string of last activity (nullable)
 * }
 * 
 * Note: All user impact operations should use UserImpactStorage from utils/jsonStorage.js
 * Example: const impact = await UserImpactStorage.findOne({ user_id: albertId });
 */

// No exports - this file is for reference only
