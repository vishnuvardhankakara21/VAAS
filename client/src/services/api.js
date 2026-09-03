const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";


// ========================================
// GET BACKEND STATUS
// ========================================

export async function getBackendStatus() {

  const response =
    await fetch(
      `${API_URL}/api/status`
    );


  const data =
    await response.json();


  if (!response.ok) {

    throw new Error(
      data.error || "Backend error"
    );

  }


  return data;

}


// ========================================
// REGISTER
// ========================================

export async function registerUser(
  name,
  email,
  password
) {

  const response =
    await fetch(
      `${API_URL}/api/auth/register`,
      {

        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          name,
          email,
          password,
        }),

      }
    );


  const data =
    await response.json();


  if (!response.ok) {

    throw new Error(
      data.error ||
      "Registration failed"
    );

  }


  return data;

}


// ========================================
// LOGIN
// ========================================

export async function loginUser(
  email,
  password
) {

  const response =
    await fetch(
      `${API_URL}/api/auth/login`,
      {

        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          email,
          password,
        }),

      }
    );


  const data =
    await response.json();


  if (!response.ok) {

    throw new Error(
      data.error ||
      "Login failed"
    );

  }


  return data;

}


// ========================================
// SEND CHAT MESSAGE
// ========================================

export async function sendChatMessage(
  message,
  previousInteractionId,
  conversationId
) {

  const token =
    localStorage.getItem("token");


  const response =
    await fetch(
      `${API_URL}/api/chat`,
      {

        method: "POST",

        headers: {

          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,

        },

        body: JSON.stringify({

          message,

          previousInteractionId,

          conversationId,

        }),

      }
    );


  const data =
    await response.json();


  if (!response.ok) {

    throw new Error(
      data.error ||
      "Failed to send message"
    );

  }


  return data;

}


// ========================================
// GET CONVERSATIONS
// ========================================

export async function getConversations() {

  const token =
    localStorage.getItem("token");


  const response =
    await fetch(
      `${API_URL}/api/conversations`,
      {

        headers: {

          Authorization:
            `Bearer ${token}`,

        },

      }
    );


  const data =
    await response.json();


  if (!response.ok) {

    throw new Error(
      data.error ||
      "Failed to load conversations"
    );

  }


  return data;

}


// ========================================
// GET ONE CONVERSATION
// ========================================

export async function getConversation(
  conversationId
) {

  const token =
    localStorage.getItem("token");


  const response =
    await fetch(
      `${API_URL}/api/conversations/${conversationId}`,
      {

        headers: {

          Authorization:
            `Bearer ${token}`,

        },

      }
    );


  const data =
    await response.json();


  if (!response.ok) {

    throw new Error(
      data.error ||
      "Failed to load conversation"
    );

  }


  return data;

}


// ========================================
// DELETE CONVERSATION
// ========================================

export async function deleteConversation(
  conversationId
) {

  const token =
    localStorage.getItem("token");


  const response =
    await fetch(
      `${API_URL}/api/conversations/${conversationId}`,
      {

        method: "DELETE",

        headers: {

          Authorization:
            `Bearer ${token}`,

        },

      }
    );


  const data =
    await response.json();


  if (!response.ok) {

    throw new Error(
      data.error ||
      "Failed to delete conversation"
    );

  }


  return data;

}