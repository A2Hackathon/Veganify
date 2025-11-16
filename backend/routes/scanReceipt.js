// routes/scanReceipt.js
import express from "express";
import multer from "multer";
import fs from "fs";
import Tesseract from "tesseract.js";

import Grocery from "../models/Grocery.js"; // <-- Use Grocery model

const router = express.Router();
const upload = multer({ dest: "uploads/" });

/**
 * POST /scan-receipt
 * body: { user_id? }
 * file: receipt image (field: image)
 *
 * Extracts grocery names from a receipt and stores them in MongoDB (Grocery.js)
 */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const user_id = req.body.user_id || null;
    const imagePath = req.file.path;

    // Run OCR
    const ocrResult = await Tesseract.recognize(imagePath, "eng");
    const rawText = ocrResult.data.text;

    // Clean into letters only
    const cleaned = rawText.replace(/[^a-zA-Z\s]/g, " ");

    // Turn into lines
    const lines = cleaned
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 1);

    let savedItems = [];

    for (let line of lines) {
      const name = line.trim();

      if (!name) continue;

      // Save grocery item into database
      const grocery = await Grocery.create({
        userID: user_id,
        name: name
      });

      savedItems.push(grocery.name);
    }

    // Cleanup file
    fs.unlink(imagePath, () => {});

    res.json({
      success: true,
      ocr_raw: rawText,
      cleaned_items: lines,
      saved_items: savedItems
    });

  } catch (err) {
    console.error("scanReceipt error:", err);
    res.status(500).json({ error: "Failed to scan receipt" });
  }
});

export default router;
