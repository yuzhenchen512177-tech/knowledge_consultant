import OpenAI from "openai";

export function getKimiClient() {
  if (!process.env.MOONSHOT_API_KEY) {
    throw new Error("Missing MOONSHOT_API_KEY");
  }

  return new OpenAI({
    apiKey: process.env.MOONSHOT_API_KEY,
    baseURL: "https://api.moonshot.cn/v1",
  });
}

export const KIMI_MODEL = process.env.KIMI_MODEL ?? "moonshot-v1-32k";
