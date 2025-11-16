import express from "express";
import GroceryItem from "../models/GroceryItem.js";
import User from "../models/User.js";
import multer from "multer";
import Tesseract from "tesseract.js";
import { toObjectId } from "../utils/objectIdHelper.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// GET /grocery-list?userId=...
router.get("/", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const userObjectId = toObjectId(userId);
    const items = await GroceryItem.find({ userId: userObjectId }).lean();

    const result = items.map((i) => ({
      id: i._id.toString(),
      name: i.name,
      category: i.category || "Uncategorized",
      isChecked: !!i.isChecked,
      userId: i.userId.toString(),
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

    const userObjectId = toObjectId(userId);
    const user = await User.findById(userObjectId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    const item = await GroceryItem.create({
      userId: userObjectId,
      name,
      category: category || "Uncategorized",
    });

    res.json({
      id: item._id.toString(),
      name: item.name,
      category: item.category,
      isChecked: item.isChecked,
      userId: item.userId.toString(),
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

    const userObjectId = toObjectId(userId);

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
      const item = await GroceryItem.create({
        userId: userObjectId,
        name: line,
        category: "Uncategorized",
      });
      createdItems.push({
        id: item._id.toString(),
        name: item.name,
        category: item.category,
        isChecked: item.isChecked,
        userId: item.userId.toString(),
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

    const userObjectId = toObjectId(userId);

    const result = await Tesseract.recognize(req.file.path, "eng");
    const text = result.data.text || "";

    const lines = text
      .split(/[\n,]/)
      .map((x) => x.trim())
      .filter(Boolean);

    const createdItems = [];
    for (const line of lines) {
      const item = await GroceryItem.create({
        userId: userObjectId,
        name: line,
        category: "Uncategorized",
      });
      createdItems.push({
        id: item._id.toString(),
        name: item.name,
        category: item.category,
        isChecked: item.isChecked,
        userId: item.userId.toString(),
      });
    }

    res.json(createdItems);
  } catch (err) {
    console.error("scan-receipt error:", err);
    res.status(500).json({ error: "Failed to scan receipt" });
  }
});

export default router;
