import express from "express";
import { parseMenuAnalysis } from "../utils/menuResults.js";
import { imageUpload } from "../utils/imageUpload.js";

export function createScanMenuRouter({ users, recognize, analyze }) {
  const router = express.Router();

  // POST /scan/menu (image, returns MenuDish[])
  router.post("/", imageUpload, async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "image required" });

      // Existing single-profile demo; this is not multi-user isolation.
      let user = await users.findOne({ sproutName: "Albert" });
      if (!user) {
        user = await users.create({
          name: "User",
          dietLevel: "vegan",
          extraForbiddenTags: [],
          preferredCuisines: ["Chinese"],
          cookingStylePreferences: ["Spicy"],
          sproutName: "Albert",
        });
      }

      const result = await recognize(req.file.buffer, { req, res });
      const text = result.data.text || "";

      const dishes = [...new Set(text.split("\n").map(x => x.trim()).filter(Boolean))];

      if (!dishes.length || dishes.length > 100 || text.length > 8000 || dishes.some(name => name.length > 200)) {
        return res.status(422).json({ error: "No usable menu text; enter or scan a smaller menu" });
      }

      const prompt = `
  You will classify menu dishes for a ${user.dietLevel} eater.

  DISHES:
  ${dishes.join("\n")}

  Use each exact dish name once; do not omit or add dishes. Modifiable dishes require a specific modificationSuggestion.
  For each dish, respond as JSON array:
  [
    { "name": "", "status": "suitable|modifiable|not_suitable", "modificationSuggestion": "" }
  ]
  `;

      const ctx = {};
      const answer = await analyze(ctx, prompt);

      const resultDishes = parseMenuAnalysis(dishes, answer);
      if (!resultDishes) {
        return res.status(502).json({ error: "Menu analysis unavailable; verify dishes independently" });
      }

      res.json({ dishes: resultDishes });
    } catch (err) {
      console.error("scan menu error:", err);
      res.status(err.status || 500).json({ error: "Failed to scan menu" });
    }
  });

  return router;
}
