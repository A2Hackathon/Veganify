// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./db/connect.js";

// route modules
import onboardingRoutes from "./routes/onboarding.js";
import profileRoutes from "./routes/profile.js";
import homeRoutes from "./routes/home.js";
import progressRoutes from "./routes/progress.js";
import groceryListRoutes from "./routes/groceryList.js";
import recipesRoutes from "./routes/recipes.js";
import scanIngredientsRoutes from "./routes/scanIngredients.js";
import scanMenuRoutes from "./routes/scanMenu.js";
import veganizeRoutes from "./routes/veganize.js";
import aiAskRoutes from "./routes/aiAsk.js";
import impactRoutes from "./routes/impact.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Sprout backend running" });
});

// routes
app.use("/onboarding", onboardingRoutes);
app.use("/profile", profileRoutes);
app.use("/home", homeRoutes);
app.use("/progress", progressRoutes);
app.use("/grocery-list", groceryListRoutes);
app.use("/recipes", recipesRoutes);

// FIXED: scan routes
app.use("/scan/ingredients", scanIngredientsRoutes);
app.use("/scan/menu", scanMenuRoutes);

app.use("/veganize", veganizeRoutes);
app.use("/ai", aiAskRoutes);
app.use("/impact", impactRoutes);

// start server
async function start() {
  await connectDB();

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server listening on http://localhost:${PORT}`);
  });

  server.on("error", (err) => {
    console.error("Server error:", err);
    process.exit(1);
  });
}

start();
