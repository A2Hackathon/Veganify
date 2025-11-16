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

/**
 * Gets user ObjectId, handling ALBERT_SHARED_USER by finding the Albert user
 * @param {string} userId - The user ID (can be ALBERT_SHARED_USER or ObjectId string)
 * @returns {Promise<mongoose.Types.ObjectId>} - The ObjectId of the user
 * @throws {Error} - If user not found or invalid
 */
export async function getUserObjectId(userId) {
  if (userId === "ALBERT_SHARED_USER") {
    const User = (await import("../models/User.js")).default;
    const user = await User.findOne({ sproutName: "Albert" }).lean();
    if (!user) {
      throw new Error("Albert user not found. Please create a profile first.");
    }
    return user._id;
  }
  return toObjectId(userId);
}

