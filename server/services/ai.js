import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  console.error(
    "WARNING: GEMINI_API_KEY is not configured"
  );
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function generateAIResponse(
  message,
  previousInteractionId
) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "Gemini API key is not configured"
    );
  }

  const response =
    await ai.interactions.create({
      model: "gemini-3.6-flash",

      input: message,

      ...(previousInteractionId && {
        previous_interaction_id:
          previousInteractionId,
      }),
    });

  return {
    response:
      response.output_text ||
      "I couldn't generate a response.",

    interactionId:
      response.id || null,
  };
}