import mongoose from "mongoose";

const groceryItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    category: { type: String, default: "Uncategorized" },
    isChecked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("GroceryItem", groceryItemSchema);

