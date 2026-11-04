import { createScanMenuRouter } from "./menuScanRouter.js";
import { recognizeImage } from "../utils/ocrService.js";
import { UserStorage } from "../utils/jsonStorage.js";
import { answerWithContext } from "../utils/llmClient.js";

export default createScanMenuRouter({ users: UserStorage, recognize: recognizeImage, analyze: answerWithContext });
