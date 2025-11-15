// models/UserImpact.js (Albert - Updated)
import mongoose from "mongoose";

const userImpactSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true, 
    unique: true 
  },

  // Total meals the user has logged (not “Cook With This”)
  total_meals_logged: { 
    type: Number, 
    default: 0 
  },

  // XP from: meal logs, cook-with-this, streak bonuses
  xp: { 
    type: Number, 
    default: 0 
  },

  // Forest growth stages: SEED → SPROUT → SAPLING → FOREST → ANCIENT_FOREST
  forest_stage: { 
    type: String, 
    default: "SEED",
    enum: ["SEED", "SPROUT", "SAPLING", "FOREST", "ANCIENT_FOREST"]
  },

  // Daily streak system — consecutive days of logging meals
  streak_days: { 
    type: Number, 
    default: 0 
  },

  // Last date the user logged a meal (used for streak calculation)
  last_activity_date: { 
    type: Date 
  }
});

export default mongoose.model("UserImpact", userImpactSchema);
