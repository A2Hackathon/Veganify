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
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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

// Start server
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
  console.log(`✅ Server also accessible on http://127.0.0.1:${PORT}`);
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
