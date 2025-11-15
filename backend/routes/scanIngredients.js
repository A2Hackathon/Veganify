const express = require('express');
const router = express.Router();

const Tesseract = require('tesseract.js');
const fs = require('fs');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const User = require('../models/User');

async function classifyIngredients(ingredients, restrictions) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const prompt = `
You are an ingredient-dietary classifier AI.

User dietary restrictions: ${restrictions}

Classify EACH ingredient into:
- "red" (not allowed),
- "yellow" (ambiguous / may violate restrictions),
- "green" (allowed).

Return detailed JSON for each ingredient in this EXACT format:

{
  "ingredients": [
    {
      "name": "Ingredient",
      "status": "red|yellow|green",
      "what_it_is": "short explanation",
      "why_not_allowed": "reason or empty string",
      "alternatives": ["alt1", "alt2"]
    }
  ]
}

Ingredients list: ${ingredients}

ONLY return JSON. No extra text.
  `;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("JSON parse failed:", err);
    console.log("Raw Gemini output:", text);
    return null;
  }
}


// OCR ROUTE
router.post("/image", upload.single("image"), async (req, res) => {
  try {
    const restrictions = req.body.restrictions || "none provided";
    const imagePath = req.file.path;

    // OCR
    const ocrResult = await Tesseract.recognize(imagePath, 'eng');
    const ingredientText = ocrResult.data.text;

    // Clean ingredient list into array of words separated by commas
    const ingredientList = ingredientText
      .replace(/\n/g, " ")
      .split(/,|;|\./)
      .map(i => i.trim())
      .filter(i => i.length > 1);

    // Gemini classification
    const classification = await classifyIngredients(ingredientList, restrictions);

    // Cleanup
    fs.unlink(imagePath, () => {});

    return res.json({
      success: true,
      ocr_raw: ingredientText,
      parsed_ingredients: ingredientList,
      classification
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "OCR or analysis failed" });
  }
});


module.exports = router;
