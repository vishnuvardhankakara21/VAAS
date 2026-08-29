export async function getBackendStatus() {
  const response = await fetch("http://localhost:5000/api/status");

  if (!response.ok) {
    throw new Error("Failed to get backend status");
  }

  return response.json();
}

export async function sendChatMessage(message) {
  const response = await fetch("http://localhost:5000/api/chat", {
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