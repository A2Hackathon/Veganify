import mongoose from "mongoose";

const grocerySchema = new mongoose.Schema({
    userID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    name: { type: String, required: true },
    boughtAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("grocery", grocerySchema);
 
