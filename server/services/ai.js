import { GoogleGenAI } from "@google/genai";
import User from "../models/User.js";

if (!process.env.GEMINI_API_KEY) {
  console.error("WARNING: GEMINI_API_KEY is not configured");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

function getSystemInstruction(user) {
  const now = new Date();
  const currentDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const currentTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  let userSection = "";
  if (user) {
    userSection += `\n\nCURRENT USER PROFILE:`;
    if (user.name) userSection += `\n- Name: ${user.name}`;
    if (user.email) userSection += `\n- Email: ${user.email}`;

    if (Array.isArray(user.memories) && user.memories.length > 0) {
      userSection += `\n\nSAVED MEMORIES ABOUT THIS USER (LEARNED ACROSS PREVIOUS CHATS):`;
      user.memories.forEach((mem) => {
        userSection += `\n- ${mem}`;
      });
    }
  }

  return `You are VAAS, an advanced, highly intelligent, fast, and helpful AI assistant created by Vishnu Vardhan Kakara.
Today's current real-world date is ${currentDate}.
The current local time is ${currentTime} (${timeZone}).
Current year: ${now.getFullYear()}.${userSection}

CROSS-CHAT MEMORY & CONTINUITY INSTRUCTIONS:
- You have persistent memory across conversations. Even if this is a brand new chat session, you already know the user's name (${user?.name || "the user"}) and all saved memories listed above.
- If the user asks "what is my name?", "who am I?", "what do you remember about me?", or refers to previous preferences, immediately and warmly use the user's profile and memories.
- Never state that you don't know their name or that you forgot them just because they started a new conversation.`;
}

export async function generateAIResponse(message, historyOrInteractionId, user) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key is not configured");
  }

  const systemInstruction = getSystemInstruction(user);

  let contents = [];
  if (Array.isArray(historyOrInteractionId) && historyOrInteractionId.length > 0) {
    contents = historyOrInteractionId
      .filter((m) => m && m.content)
      .slice(-8)
      .map((m) => ({
        role: m.role === "assistant" || m.role === "model" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
  }

  contents.push({
    role: "user",
    parts: [{ text: message }],
  });

  // Fast, low-latency models with automatic fallback
  const candidateModels = [
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
  ];

  let lastError;
  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      return {
        response: response.text || "I couldn't generate a response.",
        interactionId: `gen_${Date.now()}`,
      };
    } catch (err) {
      console.warn(`Model ${model} failed, falling back:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to generate AI response");
}

/**
 * Automatically extracts personal facts, preferences, or name updates from user messages
 * and saves them permanently to the User document for cross-chat memory.
 * Runs asynchronously in the background.
 */
export async function extractAndSaveUserMemories(userId, message) {
  if (!userId || !message || typeof message !== "string") return;

  // Quick heuristic filter to only analyze messages that share personal information
  const personalCueRegex = /\b(my name|i am|i'm|call me|i work|i live|i like|i love|my job|my favorite|i prefer|remember that|my profession|my hobby|my birthday)\b/i;
  if (!personalCueRegex.test(message)) return;

  try {
    const prompt = `Extract any key factual statements, identity info, or preferences about the user from this message: "${message}".
Return each fact on a new line starting with "- " (e.g. "- User's name is Alex", "- User is a student in Toronto").
If no personal facts or preferences are shared, output "NONE".
Output ONLY the bullet points or "NONE".`;

    const res = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.1 },
    });

    const text = (res.text || "").trim();
    if (!text || text.includes("NONE")) return;

    const facts = text
      .split("\n")
      .map((line) => line.replace(/^[-*•]\s*/, "").trim())
      .filter((line) => line.length > 3 && !line.toUpperCase().includes("NONE"));

    if (facts.length === 0) return;

    // Check if the user specified a name change (e.g., "my name is Alex")
    const nameMatch = message.match(/\b(?:my name is|call me)\s+([A-Za-z\s]+?)(?:[.!,]|$)/i);
    const updateQuery = {
      $addToSet: { memories: { $each: facts } },
    };

    if (nameMatch && nameMatch[1]) {
      const cleanName = nameMatch[1].trim();
      if (cleanName.length >= 2 && cleanName.length <= 40) {
        updateQuery.$set = { name: cleanName };
      }
    }

    await User.findByIdAndUpdate(userId, updateQuery);
    console.log(`[Memory] Saved ${facts.length} cross-chat memories for user ${userId}`);
  } catch (err) {
    console.warn("[Memory] Failed to extract cross-chat memories:", err.message);
  }
}