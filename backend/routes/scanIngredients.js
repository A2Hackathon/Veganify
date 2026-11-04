import { recognizeImage } from "../utils/ocrService.js";
import { UserStorage } from "../utils/jsonStorage.js";
import { isAllowedForUser } from "../utils/llmClient.js";
import { createScanIngredientsRouter } from "./ingredientScanRouter.js";

export default createScanIngredientsRouter({
  users: UserStorage,
  analyze: isAllowedForUser,
  recognize: recognizeImage,
});
