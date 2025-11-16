import mongoose from "mongoose";

const recipeSchema = new mongoose.Schema({
    userID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    title: {
        type: String,
        default: "Recipe"
    },
    tags: {
        type: [String],
        default: []
    },
    duration: {
        type: String,
        default: ""
    },
    ingredients: [{
        name: String,
        amount: String,
        unit: String
    }],
    recipe: { // This stores the steps array
        type: [String],
        default: []
    },
    previewImageUrl: {
        type: String,
        default: ""
    },
    originalPrompt: {
        type: String,
        default: null
    },
    type: {
        type: String,
        enum: ["simplified", "veganized"],
        default: "simplified"
    },
    substitutionMap: {
        type: Map,
        of: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("Recipe", recipeSchema);
