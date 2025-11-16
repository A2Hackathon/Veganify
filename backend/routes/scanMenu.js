import express from "express";
import multer from "multer";
import Tesseract from "tesseract.js";
import { UserStorage } from "../utils/jsonStorage.js";
import { answerWithContext } from "../utils/llmClient.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// POST /scan/menu (image, returns MenuDish[])
router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "image required" });

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

    const dishes = text
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    if (!dishes.length) return res.json({ dishes: [] });

    const prompt = `
You will classify menu dishes for a ${user.dietLevel} eater.

DISHES:
${dishes.join("\n")}

For each dish, respond as JSON array:
[
  { "name": "", "status": "suitable|modifiable|not_suitable", "modificationSuggestion": "" }
]
`;

    const ctx = {};
    const answer = await answerWithContext(ctx, prompt);

    let parsed;
    try {
      const cleaned = answer.replace(/```json/gi, "").replace(/```/g, "");
      const match = cleaned.match(/\[[\s\S]*\]/);
      parsed = JSON.parse(match ? match[0] : cleaned);
    } catch (err) {
      console.error("menu JSON parse error:", err);
      // fallback: mark all as ambiguous/modifiable
      parsed = dishes.map((name) => ({
        name,
        status: "modifiable",
        modificationSuggestion: "Ask to remove any meat or dairy.",
      }));
    }

    const resultDishes = parsed.map((d) => ({
      name: d.name,
      status: d.status,
      modificationSuggestion: d.modificationSuggestion || null,
    }));

    res.json({ dishes: resultDishes });
  } catch (err) {
    console.error("scan menu error:", err);
    res.status(500).json({ error: "Failed to scan menu" });
  }
});

export default router;
