const API_URL = import.meta.env.VITE_API_URL;

console.log("API URL:", API_URL);

export async function getBackendStatus() {
  const response = await fetch(`${API_URL}/api/status`);

  if (!response.ok) {
    throw new Error("Failed to get backend status");
  }

  return response.json();
}

export async function sendChatMessage(message) {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: message,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to get response");
  }

  return response.json();
}