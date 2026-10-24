import { GoogleGenAI } from "@google/genai";

const geminiApiKey = process.env.GEMINI_IMAGE_API_KEY || process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({
  apiKey: geminiApiKey || "",
});

const DEFAULT_GEMINI_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image",
  "gemini-3.1-flash-lite-image",
  "gemini-3-pro-image",
];

/**
 * Generate an image using the high-performance FLUX.1 / Ideogram engine (free, Midjourney-grade).
 */
async function generateWithFluxEngine(prompt, modelStyle = "flux") {
  const seed = Math.floor(Math.random() * 1000000);
  const pollinationsModel =
    modelStyle === "flux-realism" || modelStyle === "photorealistic"
      ? "flux-realism"
      : modelStyle === "flux-anime" || modelStyle === "anime"
      ? "flux-anime"
      : modelStyle === "flux-3d" || modelStyle === "3d"
      ? "flux-3d"
      : modelStyle === "turbo"
      ? "turbo"
      : "flux";

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt
  )}?model=${pollinationsModel}&width=1024&height=1024&nologo=true&seed=${seed}`;

  const headers = {};
  if (process.env.POLLINATIONS_API_KEY) {
    headers["Authorization"] = `Bearer ${process.env.POLLINATIONS_API_KEY}`;
  }

  const response = await fetch(url, { headers, redirect: "follow" });

  if (!response.ok) {
    if (response.status === 402 || response.status === 429) {
      const errText = await response.text();
      let retrySeconds = 25;
      try {
        const parsed = JSON.parse(errText);
        if (parsed?.error?.message?.includes("Retry after")) {
          const match = parsed.error.message.match(/after\s+(\d+)s/i);
          if (match && match[1]) retrySeconds = match[1];
        }
      } catch {
        // ignore JSON parse
      }

      const error = new Error(
        `Free generation limit reached (1 image per 45s). Please wait ${retrySeconds} seconds or try again shortly.`
      );
      error.status = 429;
      throw error;
    }

    throw new Error(`FLUX engine returned status ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length < 1000) {
    // If the returned body is suspiciously small, check if it's an error message
    const textPreview = buffer.toString("utf-8");
    if (textPreview.includes("error") || textPreview.includes("limit")) {
      throw new Error("Generation rate limit reached. Please wait a few seconds and try again.");
    }
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const imageBase64 = buffer.toString("base64");

  const displayNameMap = {
    flux: "FLUX.1 (Midjourney Quality)",
    "flux-realism": "FLUX Realism (Photorealistic)",
    "flux-anime": "FLUX Anime (Stylized Art)",
    "flux-3d": "FLUX 3D (CGI & Render)",
    turbo: "FLUX Turbo (Ultra Fast)",
  };

  return {
    imageBase64,
    mimeType: contentType.includes("png") ? "image/png" : "image/jpeg",
    model: displayNameMap[pollinationsModel] || "FLUX.1",
    prompt,
  };
}

/**
 * Generate an image using Google's Gemini multimodal image generation API.
 */
async function generateWithGeminiEngine(prompt) {
  const currentApiKey = process.env.GEMINI_IMAGE_API_KEY || process.env.GEMINI_API_KEY;
  if (!currentApiKey) {
    throw new Error("Gemini API key is not configured on the server.");
  }

  const configuredModel = process.env.GEMINI_IMAGE_MODEL?.trim();
  const candidateModels = configuredModel
    ? [configuredModel, ...DEFAULT_GEMINI_MODELS.filter((m) => m !== configuredModel)]
    : DEFAULT_GEMINI_MODELS;

  let lastError = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      const parts = response.candidates?.[0]?.content?.parts || response.parts || [];
      let imageBase64 = null;
      let mimeType = "image/png";

      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          imageBase64 = part.inlineData.data;
          if (part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          break;
        }
      }

      if (imageBase64) {
        return {
          imageBase64,
          mimeType,
          model: `Gemini (${model})`,
          prompt,
        };
      }
    } catch (err) {
      lastError = err;
      const msg = err.message || "";
      if (err.status === 429 || /quota|limit: 0/i.test(msg)) {
        break; // Don't hammer other Gemini models if free tier quota is 0
      }
    }
  }

  throw lastError || new Error("Gemini image generation unavailable");
}

/**
 * Main entry point: Generates an image using the selected engine/model with seamless automatic fallback.
 *
 * @param {string} prompt - User prompt description
 * @param {object} [options] - Options: { model: 'flux' | 'flux-realism' | 'flux-anime' | 'flux-3d' | 'turbo' | 'gemini' }
 */
export async function generateImageFromPrompt(prompt, options = {}) {
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

  const requestedModel = (options.model || "flux").toLowerCase();

  // If user explicitly selected Gemini, try Gemini first
  if (requestedModel === "gemini") {
    try {
      return await generateWithGeminiEngine(cleanPrompt);
    } catch (geminiError) {
      console.warn(
        "[Image Generation] Gemini engine unavailable (quota/billing limit), falling back to FLUX.1:",
        geminiError.message
      );
      // Seamlessly fall back to FLUX.1
      const result = await generateWithFluxEngine(cleanPrompt, "flux");
      result.model += " (Auto-fallback from Gemini)";
      return result;
    }
  }

  // Otherwise, use the FLUX.1 engine (Midjourney / Ideogram tier)
  try {
    return await generateWithFluxEngine(cleanPrompt, requestedModel);
  } catch (fluxError) {
    // If FLUX rate limits and Gemini is configured, attempt Gemini as secondary fallback
    if (geminiApiKey) {
      try {
        console.warn("[Image Generation] FLUX limit reached, attempting Gemini secondary fallback...");
        return await generateWithGeminiEngine(cleanPrompt);
      } catch {
        // Fallback also failed, rethrow original error
      }
    }

    const error = new Error(
      fluxError.message || "Failed to generate image. Please wait a few seconds and try again."
    );
    error.status = fluxError.status || 500;
    throw error;
  }
}
