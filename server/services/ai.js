import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function generateAIResponse(message, previousInteractionId) {
  const response = await ai.interactions.create({
    model: "gemini-3.6-flash",
    input: message,
    ...(previousInteractionId && {
      previous_interaction_id: previousInteractionId,
    }),
  });

  return {
    response: response.output_text,
    interactionId: response.id,
  };
}