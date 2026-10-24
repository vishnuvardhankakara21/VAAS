const API_URL = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : "";


// ============================================================
// INTERNAL: Authenticated fetch with automatic 401 handling
// ============================================================

async function authFetch(url, options = {}) {
  const token = localStorage.getItem("token");

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    // If token is expired, emit a custom event so App can logout
    if (response.status === 401 && data.code === "TOKEN_EXPIRED") {
      window.dispatchEvent(new CustomEvent("vaas:session-expired"));
    }
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}


// ============================================================
// STATUS
// ============================================================

export async function getBackendStatus() {
  const response = await fetch(`${API_URL}/api/status`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Backend error");
  return data;
}


// ============================================================
// REGISTER
// ============================================================

export async function registerUser(name, email, password) {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Registration failed");
  return data;
}


// ============================================================
// LOGIN
// ============================================================

export async function loginUser(email, password) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Login failed");
  return data;
}


// ============================================================
// GOOGLE SIGN-IN
// ============================================================

export async function signInWithGoogle(credentialOrPayload) {
  const payload =
    typeof credentialOrPayload === "string"
      ? { credential: credentialOrPayload }
      : credentialOrPayload;

  const response = await fetch(`${API_URL}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Google sign-in failed");
  return data;
}


// ============================================================
// GET CURRENT USER (verify session)
// ============================================================

export async function getCurrentUser() {
  return authFetch(`${API_URL}/api/auth/me`);
}


// ============================================================
// REFRESH TOKEN
// ============================================================

export async function refreshToken() {
  const data = await authFetch(`${API_URL}/api/auth/refresh`, { method: "POST" });

  if (data.token) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("tokenExpiry", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  }

  return data;
}


// ============================================================
// SEND CHAT MESSAGE
// ============================================================

export async function sendChatMessage(message, previousInteractionId, conversationId) {
  return authFetch(`${API_URL}/api/chat`, {
    method: "POST",
    body: JSON.stringify({ message, previousInteractionId, conversationId }),
  });
}


// ============================================================
// GET ALL CONVERSATIONS
// ============================================================

export async function getConversations() {
  return authFetch(`${API_URL}/api/conversations`);
}


// ============================================================
// GET ONE CONVERSATION
// ============================================================

export async function getConversation(conversationId) {
  return authFetch(`${API_URL}/api/conversations/${conversationId}`);
}


// ============================================================
// DELETE CONVERSATION
// ============================================================

export async function deleteConversation(conversationId) {
  return authFetch(`${API_URL}/api/conversations/${conversationId}`, {
    method: "DELETE",
  });
}


// ============================================================
// GENERATE AI IMAGE
// ============================================================

export async function generateImage(prompt) {
  return authFetch(`${API_URL}/api/image/generate`, {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}