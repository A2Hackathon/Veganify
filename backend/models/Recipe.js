const mongoose = require('mongoose');

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

module.exports = mongoose.model("Recipe", recipeSchema);
