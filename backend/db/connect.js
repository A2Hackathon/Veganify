// db/connect.js (Albert)
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = "mongodb+srv://foreverarmy06_db_user:hwPZoEnjUAdJc5dR@cluster0.mnr1o3e.mongodb.net/sprout?retryWrites=true&w=majority&appName=Cluster0";

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is not defined in .env file");
  console.error("   Please create a .env file with your MongoDB connection string");
  process.exit(1);
}

export default async function connectDB() {
  try {
    // MongoDB Atlas connection options
    const options = {
      // Remove deprecated options - mongoose 8.x handles these automatically
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    };

    await mongoose.connect(MONGO_URI, options);
    console.log("✅ MongoDB connected successfully");
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Host: ${mongoose.connection.host}`);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    
    // Provide helpful error messages
    if (err.message.includes("authentication failed")) {
      console.error("   → Check your username and password in the connection string");
    } else if (err.message.includes("ENOTFOUND") || err.message.includes("getaddrinfo")) {
      console.error("   → Check your cluster URL in the connection string");
      console.error("   → Make sure your IP address is whitelisted in MongoDB Atlas");
    } else if (err.message.includes("timeout")) {
      console.error("   → Connection timeout - check your network or MongoDB Atlas status");
      console.error("   → Make sure your IP address is whitelisted in MongoDB Atlas");
    } else if (!MONGO_URI.includes("mongodb+srv://") && !MONGO_URI.includes("mongodb://")) {
      console.error("   → Invalid connection string format");
      console.error("   → For Atlas, use: mongodb+srv://username:password@cluster.mongodb.net/database");
    }
    
    process.exit(1);
  }
}
 
