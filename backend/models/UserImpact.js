import mongoose from "mongoose";

const userImpactSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },

  total_meals_logged: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  coins: { type: Number, default: 0 },
  forest_stage: { type: String, default: "SEED" },
  streak_days: { type: Number, default: 0 },
  last_activity_date: { type: Date },
});

export default mongoose.model("UserImpact", userImpactSchema);
