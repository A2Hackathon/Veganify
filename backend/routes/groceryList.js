import express from "express";
import multer from "multer";
import Tesseract from "tesseract.js";
import Grocery from "../models/grocery.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// GET /grocery-list?userId=...
router.get("/", async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const groceries = await Grocery.find({ userID: userId });

    // Map to iOS GroceryItem format
    const items = groceries.map(g => ({
      id: g._id.toString(),
      name: g.name,
      category: "Produce", // Default category, can be enhanced
      isChecked: false,
      userId: g.userID.toString()
    }));

    res.json(items);
  } catch (err) {
    console.error("Get grocery list error:", err);
    res.status(500).json({ error: "Failed to get grocery list" });
  }
});

// POST /grocery-list
router.post("/", async (req, res) => {
  try {
    const { userId, name, category } = req.body;

    if (!userId || !name) {
      return res.status(400).json({ error: "userId and name are required" });
    }

    const grocery = await Grocery.create({
      userID: userId,
      name: name
    });

    const item = {
      id: grocery._id.toString(),
      name: grocery.name,
      category: category || "Produce",
      isChecked: false,
      userId: grocery.userID.toString()
    };

    res.json(item);
  } catch (err) {
    console.error("Add grocery item error:", err);
    res.status(500).json({ error: "Failed to add grocery item" });
  }
});

// POST /grocery-list/scan-fridge?userId=...
router.post("/scan-fridge", upload.single("image"), async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Image is required" });
    }

    // OCR the image
    const ocrResult = await Tesseract.recognize(req.file.path, "eng");
    const text = ocrResult.data.text;

    // Split into lines and extract items
    const lines = text.split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const items = [];
    for (const line of lines) {
      const grocery = await Grocery.create({
        userID: userId,
        name: line
      });

      items.push({
        id: grocery._id.toString(),
        name: grocery.name,
        category: "Produce",
        isChecked: false,
        userId: grocery.userID.toString()
      });
    }

    res.json(items);
  } catch (err) {
    console.error("Scan fridge error:", err);
    res.status(500).json({ error: "Failed to scan fridge" });
  }
});

// POST /grocery-list/scan-receipt?userId=...
router.post("/scan-receipt", upload.single("image"), async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Image is required" });
    }

    // OCR the receipt
    const ocrResult = await Tesseract.recognize(req.file.path, "eng");
    const text = ocrResult.data.text;

    // Clean and extract items
    const cleaned = text.replace(/[^a-zA-Z\s]/g, " ");
    const lines = cleaned.split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 1);

    const items = [];
    for (const line of lines) {
      const grocery = await Grocery.create({
        userID: userId,
        name: line
      });

      items.push({
        id: grocery._id.toString(),
        name: grocery.name,
        category: "Produce",
        isChecked: false,
        userId: grocery.userID.toString()
      });
    }

    res.json(items);
  } catch (err) {
    console.error("Scan receipt error:", err);
    res.status(500).json({ error: "Failed to scan receipt" });
  }
});

export default router;

