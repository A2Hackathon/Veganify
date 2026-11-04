// scanIngredients.js
import express from "express";
import { parseIngredients, scanResult } from "../utils/scanResults.js";
import { imageUpload } from "../utils/imageUpload.js";

export function createScanIngredientsRouter({ users, analyze, recognize }) {
const router = express.Router();

/*  
=========================================================
  POST /scan/ingredients  
  ??OCR image ??ingredient list ??classification
=========================================================
*/
router.post("/", imageUpload, async (req, res) => {
  try {
    if (!req.file) {
      console.error("No file uploaded");
      return res.status(400).json({ error: "image required" });
    }

    console.log("Processing ingredient image");

    // ALWAYS use the single Albert user
    let user = await users.findOne({ sproutName: "Albert" });
    if (!user) {
      console.log("Creating Albert user for scan...");
      user = await users.create({
        name: "User",
        dietLevel: "vegan",
        extraForbiddenTags: [],
        preferredCuisines: ["Chinese"],
        cookingStylePreferences: ["Spicy"],
        sproutName: "Albert",
      });
    }

    console.log("🔍 Starting OCR processing...");
    // OCR processing with error handling and timeout
    let result;
    try {
      // Add timeout wrapper to prevent hanging
      let timeoutId;
      const ocrPromise = recognize(req.file.buffer, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          } else if (m.status === "loading tesseract core") {
            console.log("Loading Tesseract core...");
          } else if (m.status === "initializing tesseract") {
            console.log("Initializing Tesseract...");
          }
        }
      });
      
      // Add 60 second timeout for OCR processing
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("OCR processing timeout after 60 seconds")), 60000);
      });
      
      try {
        result = await Promise.race([ocrPromise, timeoutPromise]);
      } finally {
        // Clean up timeout if OCR completes before timeout
        if (timeoutId) clearTimeout(timeoutId);
      }
    } catch (ocrError) {
      console.error("❌ Tesseract OCR error:", ocrError);
      console.error("OCR Error details:", {
        name: ocrError?.name,
        message: ocrError?.message,
        code: ocrError?.code,
        errno: ocrError?.errno,
        stack: ocrError?.stack
      });
      
      // Check for specific connection errors
      if (ocrError?.message?.includes("connection") || 
          ocrError?.message?.includes("ECONNREFUSED") ||
          ocrError?.code === "ECONNREFUSED") {
        console.error("⚠️ Connection error - Tesseract worker may have failed to start");
        console.error("💡 This could be due to:");
        console.error("   - Port conflicts");
        console.error("   - Insufficient system resources");
        console.error("   - Tesseract.js worker process failure");
        throw new Error("OCR worker connection failed. Please try again or restart the server.");
      }
      
      throw new Error(`OCR processing failed: ${ocrError?.message || "Unknown error"}`);
    }
    const text = result.data.text || "";
    console.log(`📝 OCR extracted text (${text.length} chars): ${text.substring(0, 200)}...`);

    let ingredients;
    try { ingredients = parseIngredients({ text }); }
    catch { return res.status(422).json({ success: false, isConsumable: false, ingredients: [], error: "No usable ingredient list was extracted" }); }

    const prefs = {
      dietLevel: user.dietLevel || "vegan",
      extraForbiddenTags: user.extraForbiddenTags || [],
    };

    console.log(`🔍 Checking ingredients against diet: ${prefs.dietLevel}`);
    let checks;
    try {
      checks = await analyze(prefs, ingredients);
      console.log(`✅ Got ${checks.length} check results`);
    } catch (llmError) {
      console.error("❌ LLM API error:", llmError);
      console.error("LLM Error details:", {
        name: llmError?.name,
        message: llmError?.message,
        stack: llmError?.stack
      });
      console.error("⚠️ isAllowedForUser should not throw - using fallback");
      // isAllowedForUser should always return a result (even fallback), so this shouldn't happen
      // But if it does, return a basic response instead of throwing
      checks = ingredients.map(ing => ({
        ingredient: ing,
        allowed: "Ambiguous",
        reason: "Analysis unavailable - please try again",
        suggestions: []
      }));
    }

    // Ensure we have valid checks
    if (!checks || !Array.isArray(checks) || checks.length === 0) {
      console.warn("⚠️ No checks returned, creating fallback response");
      checks = ingredients.map(ing => ({
        ingredient: ing,
        allowed: "Ambiguous",
        reason: "Unable to analyze",
        suggestions: []
      }));
    }

    res.json(scanResult(ingredients, checks));
  } catch (err) {
    console.error("❌ OCR ingredient scan error:", err);
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error code:", err.code);
    console.error("Error stack:", err.stack);
    
    // Check for connection-related errors
    if (err.message && err.message.includes("connection")) {
      console.error("⚠️ Connection error detected - this might be a Tesseract worker issue");
      console.error("💡 Try: Restart the server or check if port conflicts exist");
    }
    
    // Instead of returning 500, return a valid response structure with error info
    // This ensures the iOS app can always decode the response
    res.status(200).json({ 
      success: false,
      isConsumable: false,
      ingredients: [],
      error: err.message || "Failed to scan ingredients"
    });
  }
});

/*  
=========================================================
  POST /scan/ingredients/text  
  ??Manual input text ??classification
=========================================================
*/
router.post("/text", async (req, res) => {
  try {
    let ingredientsList;
    try { ingredientsList = parseIngredients(req.body); }
    catch { return res.status(400).json({ success: false, isConsumable: false, ingredients: [], error: "Provide 1 to 100 ingredient names, at most 200 characters each and 8000 characters total" }); }

    // ALWAYS use the single Albert user
    let user = await users.findOne({ sproutName: "Albert" });
    if (!user) {
      console.log("Creating Albert user for text analysis...");
      user = await users.create({
        name: "User",
        dietLevel: "vegan",
        extraForbiddenTags: [],
        preferredCuisines: ["Chinese"],
        cookingStylePreferences: ["Spicy"],
        sproutName: "Albert",
      });
    }

    const prefs = {
      dietLevel: user.dietLevel || "vegan",
      extraForbiddenTags: user.extraForbiddenTags || [],
    };

    console.log(`🔍 Checking ${ingredientsList.length} ingredients against diet: ${prefs.dietLevel}`);
    let checks;
    try {
      checks = await analyze(prefs, ingredientsList);
      console.log(`✅ Got ${checks.length} check results`);
    } catch (llmError) {
      console.error("❌ LLM API error:", llmError);
      console.error("LLM Error details:", {
        name: llmError?.name,
        message: llmError?.message,
        stack: llmError?.stack
      });
      console.error("⚠️ isAllowedForUser should not throw - this is unexpected");
      // isAllowedForUser should always return a result (even fallback), so this shouldn't happen
      // But if it does, return a basic response
      checks = ingredientsList.map(ing => ({
        ingredient: ing,
        allowed: "Ambiguous",
        reason: "Analysis unavailable",
        suggestions: []
      }));
    }

    // Ensure we have valid checks
    if (!checks || !Array.isArray(checks) || checks.length === 0) {
      console.warn("⚠️ No checks returned, creating fallback response");
      checks = ingredientsList.map(ing => ({
        ingredient: ing,
        allowed: "Ambiguous",
        reason: "Unable to analyze",
        suggestions: []
      }));
    }

    res.json(scanResult(ingredientsList, checks));
  } catch (err) {
    console.error("❌ Ingredient text analysis error:", err);
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    
    // Instead of returning 500, return a valid response structure with error info
    // This ensures the iOS app can always decode the response
    res.status(200).json({ 
      success: false,
      isConsumable: false,
      ingredients: [],
      error: err.message || "Failed to analyze ingredient text"
    });
  }
});

return router;
}

