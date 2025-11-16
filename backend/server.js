import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import os from "os";
import "./utils/jsonStorage.js";

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

const app = express();
console.log("Express app created");
console.log("Using JSON file storage (MongoDB removed)");

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get("/", (req, res) => res.json({ ok: true, msg: "Veganify backend (Albert focus) running" }));

try {
  console.log("Registering routes...");
  app.use("/scan/ingredients", scanIngredientsRoutes);
  app.use("/scan/menu", scanMenuRoutes);
  app.use("/recipes/veganize", veganizeRoutes);
  app.use("/recipes/from-ingredients", cookRoutes);
  app.use("/recipes", recipesRoutes);
  app.use("/impact", impactRoutes);
  app.use("/ai", aiAskRoutes);
  app.use("/profile", profileRoutes);
  app.use("/onboarding", onboardingRoutes);
  app.use("/home", homeRoutes);
  app.use("/progress", progressRoutes);
  app.use("/grocery-list", groceryListRoutes);
  console.log("All routes registered successfully");
} catch (err) {
  console.error("Error registering routes:", err);
  console.error(err.stack);
  process.exit(1);
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 4000;

let server;
try {
  server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log(`Server also accessible on http://127.0.0.1:${PORT}`);
    
    const networkInterfaces = os.networkInterfaces();
    let networkIP = null;
    for (const interfaceName in networkInterfaces) {
      const interfaces = networkInterfaces[interfaceName];
      for (const iface of interfaces) {
        if (iface.family === "IPv4" && !iface.internal) {
          networkIP = iface.address;
          break;
        }
      }
      if (networkIP) break;
    }
    
    if (networkIP) {
      console.log(`Server accessible from other devices on network: http://${networkIP}:${PORT}`);
      console.log(`   Use this IP in your iOS app's APIClient.swift`);
    }
    
    console.log(`Server ready to accept connections!`);
    console.log(`Test in browser: http://localhost:${PORT}`);
  });
} catch (err) {
  console.error("Failed to start server:", err);
  console.error(err.stack);
  process.exit(1);
}

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

server.on('connection', (socket) => {
  socket.setKeepAlive(true, 60000);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Try a different port.`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});
