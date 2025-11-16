import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String },
  dietLevel: {
    type: String,
    enum: [
      "vegan",
      "vegetarian",
      "pescatarian",
      "ovo",
      "lacto",
      "lacto_ovo",
      "flexitarian",
    ],
    default: "flexitarian",
  },
  extraForbiddenTags: {
    type: [String],
    default: [],
  },
  preferredCuisines: {
    type: [String],
    default: [],
  },
  cookingStylePreferences: {
    type: [String],
    default: [],
  },
  sproutName: {
    type: String,
    default: "Albert",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("User", userSchema);
