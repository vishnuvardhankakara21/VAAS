const API_URL = import.meta.env.VITE_API_URL;

console.log("API URL:", API_URL);

export async function getBackendStatus() {
  const response = await fetch(`${API_URL}/api/status`);

  if (!response.ok) {
    throw new Error("Failed to get backend status");
  }

  return response.json();
}

export async function sendChatMessage(message, previousInteractionId) {
  const response = await fetch("http://localhost:5000/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: message,
      previousInteractionId: previousInteractionId,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to get response");
  }

  return response.json();
}