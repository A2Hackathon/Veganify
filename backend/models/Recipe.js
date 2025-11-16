import mongoose from "mongoose";

const recipeSchema = new mongoose.Schema({
    userID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    recipe: [String],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("Recipe", recipeSchema);
