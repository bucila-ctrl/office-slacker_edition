import { GoogleGenAI } from "@google/genai";
import { CatchResult } from "../types";
import { apiKeyManager } from "../utils/apiKeyManager";

// Initialize Gemini - API key is retrieved at runtime
const getAI = () => {
  const apiKey = apiKeyManager.get();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const generateCatchDescription = async (item: CatchResult): Promise<string> => {
  try {
    const ai = getAI();
    if (!ai || !apiKeyManager.has()) return "A mysterious item from the office depths.";

    const prompt = `
      I am playing a game where I slack off at work and "fish" for items in the office air.
      I just caught: ${item.name} (${item.emoji}).
      Write a witty, short (max 15 words) description of this item in the context of office life.
      Be funny or sarcastic.
    `;

    // Get the generative model and generate content
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return text.trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "The item leaves you speechless (API Error).";
  }
};

export const generateBossLecture = async (): Promise<string> => {
  try {
    const ai = getAI();
    if (!ai || !apiKeyManager.has()) return "GET BACK TO WORK!";

    const prompt = `
      You are an angry office manager catching an employee slacking off.
      Give me a short (max 10 words) angry shout at them.
    `;

    // Get the generative model and generate content
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return text.trim();
  } catch (error) {
    console.error("Boss lecture error:", error);
    return "I AM WATCHING YOU!";
  }
};