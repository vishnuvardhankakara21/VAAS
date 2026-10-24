import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_IMAGE_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY (or GEMINI_IMAGE_API_KEY) is not configured for image generation");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "",
});

/**
 * Candidate models supported by Gemini API for image generation via generateContent.
 */
const DEFAULT_CANDIDATE_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image",
  "gemini-3.1-flash-lite-image",
  "gemini-3-pro-image",
];

/**
 * Generate an image from a text prompt using Google's Gemini Image Generation models.
 *
 * @param {string} prompt - The user prompt describing the image to generate
 * @param {object} [options] - Optional configurations (aspectRatio, etc.)
 * @returns {Promise<{ imageBase64: string, mimeType: string, model: string, prompt: string }>}
 */
export async function generateImageFromPrompt(prompt, options = {}) {
  const currentApiKey = process.env.GEMINI_IMAGE_API_KEY || process.env.GEMINI_API_KEY;
  if (!currentApiKey) {
    const error = new Error("Gemini API key is not configured on the server.");
    error.status = 500;
    throw error;
  }

  if (typeof prompt !== "string" || !prompt.trim()) {
    const error = new Error("Please provide a valid image prompt.");
    error.status = 400;
    throw error;
  }

  const cleanPrompt = prompt.trim();
  if (cleanPrompt.length > 2000) {
    const error = new Error("Prompt is too long. Maximum length is 2,000 characters.");
    error.status = 400;
    throw error;
  }

  // Model prioritization: custom env var first, then default candidates
  const configuredModel = process.env.GEMINI_IMAGE_MODEL?.trim();
  const candidateModels = configuredModel
    ? [configuredModel, ...DEFAULT_CANDIDATE_MODELS.filter((m) => m !== configuredModel)]
    : DEFAULT_CANDIDATE_MODELS;

  let lastError = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: cleanPrompt,
      });

      const parts = response.candidates?.[0]?.content?.parts || response.parts || [];
      let imageBase64 = null;
      let mimeType = "image/png";
      let textFeedback = "";

      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          imageBase64 = part.inlineData.data;
          if (part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          break;
        } else if (part.text) {
          textFeedback += part.text + " ";
        }
      }

      if (imageBase64) {
        return {
          imageBase64,
          mimeType,
          model,
          prompt: cleanPrompt,
        };
      }

      // If no inlineData was returned, check if model refused or safety blocked
      if (textFeedback) {
        const error = new Error(textFeedback.trim());
        error.status = 400;
        throw error;
      }

      throw new Error("No image was returned by the AI model. Please try a different prompt.");
    } catch (err) {
      const message = err.message || "";
      const status = err.status || 500;

      console.warn(`[Image Generation] Attempt with model '${model}' failed:`, message.slice(0, 200));

      // Check for quota / rate limit errors
      if (status === 429 || /quota|exceeded|rate limit|resource_exhausted/i.test(message)) {
        const error = new Error(
          "AI image generation quota or rate limit has been reached. Please check your Gemini API plan or try again shortly."
        );
        error.status = 429;
        lastError = error;
        // Don't waste time hammering other models if project quota is exhausted
        break;
      }

      // Check for content safety policy violation
      if (/safety|blocked|policy|inappropriate/i.test(message)) {
        const error = new Error(
          "The prompt was flagged by content safety guidelines. Please adjust your prompt and try again."
        );
        error.status = 400;
        lastError = error;
        break;
      }

      lastError = err;
    }
  }

  // If all candidate models failed, sanitize error output
  const finalError = new Error(
    lastError?.status === 429 || lastError?.status === 400
      ? lastError.message
      : "Failed to generate image. Please try again with a different prompt."
  );
  finalError.status = lastError?.status || 500;
  throw finalError;
}
