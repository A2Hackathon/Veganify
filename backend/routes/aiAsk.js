import express from "express";
import { getUserContext } from "../utils/userContext.js";
import { answerWithContext } from "../utils/llmClient.js";

const router = express.Router();

// POST /ai/ask
router.post("/ask", async (req, res) => {
  const { userId, user_id, question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "question required" });
  }

  try {
    const context = await getUserContext("ALBERT_SHARED_USER");
    console.log("Calling AI with question:", question);
    console.log("User context:", JSON.stringify({
      dietLevel: context?.user?.dietLevel,
      dietaryRestrictions: context?.user?.extraForbiddenTags,
      cuisines: context?.user?.preferredCuisines,
      cookingStyles: context?.user?.cookingStylePreferences
    }, null, 2));
    const answer = await answerWithContext(context, question);
    console.log("AI response received (first 200 chars):", answer.substring(0, 200));
    res.json({ answer });
  } catch (err) {
    console.error("ai/ask error:", err);
    console.error("   Error name:", err.name);
    console.error("   Error message:", err.message);
    console.error("   Error code:", err.code);
    console.error("   Error stack:", err.stack);
    if (err.response) {
      console.error("   API response:", err.response.data);
    }
    res.status(500).json({ error: "Failed to get AI answer", message: err.message });
  }
});

export default router;
