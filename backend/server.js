// server.js  (Albert)
// Main Express server and route registration
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./db/connect.js";

// route imports
import scanIngredientsRoutes from "./routes/scanIngredients.js";
import scanMenuRoutes from "./routes/scanMenu.js";
import veganizeRoutes from "./routes/veganize.js";
import cookRoutes from "./routes/cookWithThis.js";
import impactRoutes from "./routes/impact.js";
import aiAskRoutes from "./routes/aiAsk.js";
import profileRoutes from "./routes/profile.js";
import onboardingRoutes from "./routes/onboarding.js";
import homeRoutes from "./routes/home.js";
import progressRoutes from "./routes/progress.js";
import groceryListRoutes from "./routes/groceryList.js";
import recipesRoutes from "./routes/recipes.js";

dotenv.config();

// Connect to MongoDB
try {
  await connectDB(); // connect to MongoDB
} catch (err) {
  console.error("❌ Failed to connect to MongoDB:", err.message);
  console.error("   Make sure MongoDB is running and MONGO_URI is correct in .env file");
  process.exit(1);
}

const app = express();

// CORS configuration - allow all origins for development
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Add request logging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// Health check
app.get("/", (req, res) => res.json({ ok: true, msg: "Veganify backend (Albert focus) running" }));

// Register routes
// Note: More specific routes should be registered before general ones
app.use("/scan/ingredients", scanIngredientsRoutes);
app.use("/scan/menu", scanMenuRoutes);
app.use("/recipes/veganize", veganizeRoutes); // Must come before /recipes
app.use("/recipes/from-ingredients", cookRoutes);
app.use("/recipes", recipesRoutes); // General recipes routes
app.use("/impact", impactRoutes);
app.use("/ai", aiAskRoutes); // <-- This enables POST /ai/ask
app.use("/profile", profileRoutes);
app.use("/onboarding", onboardingRoutes);
app.use("/home", homeRoutes);
app.use("/progress", progressRoutes);
app.use("/grocery-list", groceryListRoutes);

// Basic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 4000;

// Start server with keep-alive settings
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
  console.log(`✅ Server also accessible on http://127.0.0.1:${PORT}`);
});

// Configure server to keep connections alive
server.keepAliveTimeout = 65000; // 65 seconds
server.headersTimeout = 66000; // 66 seconds (must be > keepAliveTimeout)

// Handle connection events
server.on('connection', (socket) => {
  socket.setKeepAlive(true, 60000); // Enable keep-alive, probe every 60 seconds
});

// Handle uncaught exceptions to prevent server crashes
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // Don't exit - log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - log and continue
});

// Handle server errors
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Try a different port.`);
  } else {
    console.error("❌ Server error:", err);
  }
  process.exit(1);
});
