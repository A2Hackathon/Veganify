// db/connect.js (Albert)
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

export default async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      // options if needed
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}
 
