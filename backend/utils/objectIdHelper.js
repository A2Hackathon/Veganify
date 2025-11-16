// utils/objectIdHelper.js
// Helper functions to ensure userId is always MongoDB ObjectId

import mongoose from "mongoose";

/**
 * Converts a userId (string or ObjectId) to MongoDB ObjectId
 * @param {string|mongoose.Types.ObjectId} userId - The user ID to convert
 * @returns {mongoose.Types.ObjectId} - The ObjectId instance
 * @throws {Error} - If userId is invalid
 */
export function toObjectId(userId) {
  if (!userId) {
    throw new Error("userId is required");
  }
  
  // If it's already an ObjectId, return it
  if (userId instanceof mongoose.Types.ObjectId) {
    return userId;
  }
  
  // If it's a string, convert it
  if (typeof userId === "string") {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error(`Invalid userId format: ${userId}`);
    }
    return new mongoose.Types.ObjectId(userId);
  }
  
  throw new Error(`Invalid userId type: ${typeof userId}`);
}

/**
 * Safely converts userId to ObjectId, returns null if invalid
 * @param {string|mongoose.Types.ObjectId} userId - The user ID to convert
 * @returns {mongoose.Types.ObjectId|null} - The ObjectId instance or null
 */
export function toObjectIdSafe(userId) {
  try {
    return toObjectId(userId);
  } catch (err) {
    return null;
  }
}

