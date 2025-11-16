import mongoose from "mongoose";

const grocerySchema = new mongoose.Schema({
    userID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    name: { 
        type: String, 
        required: true 
    },
    category: {
        type: String,
        default: "Produce"
    },
    isChecked: {
        type: Boolean,
        default: false
    },
    boughtAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("grocery", grocerySchema);
