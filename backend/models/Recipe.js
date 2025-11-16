import mongoose from "mongoose";

const recipeIngredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    amount: { type: String },
    unit: { type: String },
  },
  { _id: false }
);

const recipeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    title: { type: String, required: true },
    tags: { type: [String], default: [] },
    duration: { type: String, default: "" },
    ingredients: { type: [recipeIngredientSchema], default: [] },
    steps: { type: [String], default: [] },
    previewImageUrl: { type: String, default: "" },
    originalPrompt: { type: String },
    type: {
      type: String,
      enum: ["simplified", "veganized"],
      default: "simplified",
    },
    substitutionMap: {
      type: Map,
      of: String,
      default: undefined,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Recipe", recipeSchema);
