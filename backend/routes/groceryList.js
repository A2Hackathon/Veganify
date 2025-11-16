import express from "express";
import { UserStorage, GroceryItemStorage } from "../utils/jsonStorage.js";
import multer from "multer";
import Tesseract from "tesseract.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// GET /grocery-list?userId=...
router.get("/", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "userId required" });

    // ALWAYS use the single Albert user
    let user = await UserStorage.findOne({ sproutName: "Albert" });
    if (!user) {
      // Create Albert if it doesn't exist
      user = await UserStorage.create({
        name: "User",
        dietLevel: "vegan",
        extraForbiddenTags: [],
        preferredCuisines: ["Chinese"],
        cookingStylePreferences: ["Spicy"],
        sproutName: "Albert",
      });
    }

    const items = await GroceryItemStorage.find({ userId: user._id });

    const result = items.map((i) => ({
      id: i._id || i.id,
      name: i.name,
      category: i.category || "Uncategorized",
      isChecked: !!i.isChecked,
      userId: i.userId || user._id,
    }));

    res.json(result);
  } catch (err) {
    console.error("get grocery-list error:", err);
    res.status(500).json({ error: "Failed to load grocery list" });
  }
});

// POST /grocery-list
router.post("/", async (req, res) => {
  try {
    const { userId, name, category } = req.body;
    if (!userId || !name)
      return res.status(400).json({ error: "userId and name required" });

    // ALWAYS use the single Albert user
    let user = await UserStorage.findOne({ sproutName: "Albert" });
    if (!user) {
      // Create Albert if it doesn't exist
      user = await UserStorage.create({
        name: "User",
        dietLevel: "vegan",
        extraForbiddenTags: [],
        preferredCuisines: ["Chinese"],
        cookingStylePreferences: ["Spicy"],
        sproutName: "Albert",
      });
    }

    const item = await GroceryItemStorage.create({
      userId: user._id,
      name,
      category: category || "Uncategorized",
    });

    res.json({
      id: item._id || item.id,
      name: item.name,
      category: item.category,
      isChecked: item.isChecked || false,
      userId: item.userId || user._id,
    });
  } catch (err) {
    console.error("add grocery item error:", err);
    res.status(500).json({ error: "Failed to add grocery item" });
  }
});

// POST /grocery-list/scan-fridge?userId=...
router.post("/scan-fridge", upload.single("image"), async (req, res) => {
  try {
    const userId = req.query.userId || req.body.userId;
    if (!userId) return res.status(400).json({ error: "userId required" });
    if (!req.file) {
      return res.status(400).json({ error: "image required" });
    }

    // ALWAYS use the single Albert user
    let user = await UserStorage.findOne({ sproutName: "Albert" });
    if (!user) {
      // Create Albert if it doesn't exist
      user = await UserStorage.create({
        name: "User",
        dietLevel: "vegan",
        extraForbiddenTags: [],
        preferredCuisines: ["Chinese"],
        cookingStylePreferences: ["Spicy"],
        sproutName: "Albert",
      });
    }

    // OCR the image
    const result = await Tesseract.recognize(req.file.path, "eng");
    const text = result.data.text || "";

    // naive: split by newline / comma and treat each line as a grocery item
    const lines = text
      .split(/[\n,]/)
      .map((x) => x.trim())
      .filter(Boolean);

    const createdItems = [];
    for (const line of lines) {
      const item = await GroceryItemStorage.create({
        userId: user._id,
        name: line,
        category: "Uncategorized",
      });
      createdItems.push({
        id: item._id || item.id,
        name: item.name,
        category: item.category,
        isChecked: item.isChecked || false,
        userId: item.userId || user._id,
      });
    }

    res.json(createdItems);
  } catch (err) {
    console.error("scan-fridge error:", err);
    res.status(500).json({ error: "Failed to scan fridge" });
  }
});

// POST /grocery-list/scan-receipt?userId=...
router.post("/scan-receipt", upload.single("image"), async (req, res) => {
  try {
    const userId = req.query.userId || req.body.userId;
    if (!userId) return res.status(400).json({ error: "userId required" });
    if (!req.file) {
      return res.status(400).json({ error: "image required" });
    }

    // ALWAYS use the single Albert user
    let user = await UserStorage.findOne({ sproutName: "Albert" });
    if (!user) {
      // Create Albert if it doesn't exist
      user = await UserStorage.create({
        name: "User",
        dietLevel: "vegan",
        extraForbiddenTags: [],
        preferredCuisines: ["Chinese"],
        cookingStylePreferences: ["Spicy"],
        sproutName: "Albert",
      });
    }

    const result = await Tesseract.recognize(req.file.path, "eng");
    const text = result.data.text || "";

    const lines = text
      .split(/[\n,]/)
      .map((x) => x.trim())
      .filter(Boolean);

    const createdItems = [];
    for (const line of lines) {
      const item = await GroceryItemStorage.create({
        userId: user._id,
        name: line,
        category: "Uncategorized",
      });
      createdItems.push({
        id: item._id || item.id,
        name: item.name,
        category: item.category,
        isChecked: item.isChecked || false,
        userId: item.userId || user._id,
      });
    }

    res.json(createdItems);
  } catch (err) {
    console.error("scan-receipt error:", err);
    res.status(500).json({ error: "Failed to scan receipt" });
  }
});

export default router;
