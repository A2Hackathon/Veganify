// test-mongodb.js
// Simple script to test MongoDB connection
import mongoose from "mongoose";

const MONGO_URI = "mongodb+srv://foreverarmy06_db_user:hwPZoEnjUAdJc5dR@cluster0.mnr1o3e.mongodb.net/sprout?retryWrites=true&w=majority&appName=Cluster0";

console.log("🧪 Testing MongoDB Connection...\n");
console.log("📡 Connection String:", MONGO_URI.replace(/:[^:@]+@/, ":****@") + "\n");

// Connection options
const options = {
  serverSelectionTimeoutMS: 10000, // 10 seconds timeout
  socketTimeoutMS: 45000,
};

async function testConnection() {
  try {
    console.log("⏳ Attempting to connect to MongoDB...");
    const startTime = Date.now();
    
    await mongoose.connect(MONGO_URI, options);
    const connectionTime = Date.now() - startTime;
    
    console.log("✅ MongoDB connected successfully!");
    console.log(`   ⏱️  Connection time: ${connectionTime}ms`);
    console.log(`   📊 Database: ${mongoose.connection.name}`);
    console.log(`   🌐 Host: ${mongoose.connection.host}`);
    console.log(`   🔌 Port: ${mongoose.connection.port || "N/A (Atlas)"}`);
    console.log(`   📝 Ready State: ${mongoose.connection.readyState === 1 ? "Connected" : "Not Connected"}`);
    
    // Test a simple query
    console.log("\n🧪 Testing database query...");
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`   ✅ Found ${collections.length} collection(s):`);
    collections.forEach((col, index) => {
      console.log(`      ${index + 1}. ${col.name}`);
    });
    
    // Test User model
    console.log("\n🧪 Testing User model...");
    const User = (await import("./models/User.js")).default;
    const userCount = await User.countDocuments();
    console.log(`   ✅ User collection has ${userCount} document(s)`);
    
    // Check for Albert user
    const albertUser = await User.findOne({ sproutName: "Albert" }).lean();
    if (albertUser) {
      console.log(`   ✅ Found Albert user with ID: ${albertUser._id}`);
    } else {
      console.log(`   ℹ️  Albert user not found (will be created on first use)`);
    }
    
    console.log("\n✅ All tests passed! MongoDB connection is working correctly.\n");
    
    // Close connection
    await mongoose.connection.close();
    console.log("🔌 Connection closed.");
    process.exit(0);
    
  } catch (err) {
    console.error("\n❌ MongoDB connection test failed!\n");
    console.error("Error details:");
    console.error(`   Type: ${err.name}`);
    console.error(`   Message: ${err.message}\n`);
    
    // Provide helpful error messages
    if (err.message.includes("authentication failed")) {
      console.error("💡 Authentication Error:");
      console.error("   → Check your username and password in the connection string");
      console.error("   → Make sure the database user has proper permissions");
    } else if (err.message.includes("ENOTFOUND") || err.message.includes("getaddrinfo")) {
      console.error("💡 Network Error:");
      console.error("   → Check your cluster URL in the connection string");
      console.error("   → Make sure your IP address is whitelisted in MongoDB Atlas");
      console.error("   → Check your internet connection");
    } else if (err.message.includes("timeout")) {
      console.error("💡 Timeout Error:");
      console.error("   → Connection timeout - check your network or MongoDB Atlas status");
      console.error("   → Make sure your IP address is whitelisted in MongoDB Atlas");
      console.error("   → Try increasing serverSelectionTimeoutMS");
    } else if (err.message.includes("MongoServerError")) {
      console.error("💡 MongoDB Server Error:");
      console.error("   → Check MongoDB Atlas cluster status");
      console.error("   → Verify database name is correct");
    } else {
      console.error("💡 General Error:");
      console.error("   → Check the connection string format");
      console.error("   → Verify MongoDB version compatibility");
    }
    
    console.error("\n");
    process.exit(1);
  }
}

// Run the test
testConnection();

