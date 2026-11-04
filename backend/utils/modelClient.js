export function createModelClient(Client, environment = process.env) {
  const apiKey = environment.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is required for model requests");
  return new Client({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    timeout: 60000,
    maxRetries: 2,
  });
}
