# VAAS — Virtual AI Assistant System

An intelligent, full-stack AI assistant powered by Google Gemini. Features persistent cross-chat memory, Google OAuth, conversation history, and a polished dark-mode UI.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite |
| Backend | Node.js, Express 5 |
| Database | MongoDB (Mongoose) |
| AI | Google Gemini (via `@google/genai`) |
| Auth | JWT + Google OAuth 2.0 (Google Identity Services) |
| Styling | Vanilla CSS (dark/light theme) |

---

## Features

- **AI Chat** — Powered by Gemini with multi-turn conversation history
- **Cross-chat Memory** — Remembers personal facts about you across sessions
- **Conversation Sidebar** — Browse, load, and delete past conversations
- **Auth** — Email/password registration + Google Sign-In
- **Email Validation** — Only trusted providers accepted (Gmail, Outlook, Yahoo, iCloud, etc.)
- **Token Refresh** — Automatic JWT refresh before expiry, session-expired handling
- **Edit & Regenerate** — Edit any sent message or regenerate the last AI response
- **Markdown Rendering** — AI responses render with full Markdown support
- **Dark / Light Theme** — Persisted per user in localStorage
- **Rate Limiting** — Per-route rate limits on auth and chat endpoints
- **Security** — Helmet, CORS allowlist, bcrypt password hashing, JWT

---

## Project Structure

```
VAAS/
├── client/                      # React frontend (Vite)
│   ├── public/
│   │   └── favicon.svg          # App icon
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConversationSidebar.jsx  # Sidebar with chat history
│   │   │   ├── Login.jsx                # Login form + Google Sign-In
│   │   │   ├── MessageContent.jsx       # Markdown message renderer
│   │   │   ├── Register.jsx             # Registration form + Google Sign-In
│   │   │   └── Settings.jsx             # Settings modal (theme, logout)
│   │   ├── services/
│   │   │   └── api.js           # All API calls (auth, chat, conversations)
│   │   ├── App.jsx              # Root component — all chat logic & state
│   │   ├── App.css              # All styles (design system + components)
│   │   └── main.jsx             # React entry point
│   ├── .env                     # VITE_API_URL, VITE_GOOGLE_CLIENT_ID
│   ├── index.html               # HTML shell
│   ├── package.json
│   └── vite.config.js
│
├── server/                      # Express backend
│   ├── config/
│   │   └── db.js                # MongoDB connection
│   ├── middleware/
│   │   └── authMiddleware.js    # JWT protect middleware
│   ├── models/
│   │   ├── Conversation.js      # Conversation + messages schema
│   │   └── User.js              # User schema (name, email, memories, etc.)
│   ├── services/
│   │   ├── ai.js                # Gemini AI calls + cross-chat memory extraction
│   │   └── auth.js              # Register, login, Google OAuth, email validation
│   ├── server.js                # Express app — all routes
│   ├── .env                     # MONGODB_URI, JWT_SECRET, GEMINI_API_KEY, etc.
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Google Gemini API key
- (Optional) Google OAuth Client ID

### 1. Clone & install

```bash
git clone https://github.com/vishnuvardhankakara21/VAAS.git
cd VAAS

cd server && npm install
cd ../client && npm install
```

### 2. Configure environment variables

**`server/.env`**
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_strong_secret_key
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id   # optional
CLIENT_URL=http://localhost:5173
PORT=5000
NODE_ENV=development
```

**`client/.env`**
```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id   # optional
```

### 3. Run

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Open **http://localhost:5173**

---

## API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/status` | — | Health check |
| POST | `/api/auth/register` | — | Register with email/password |
| POST | `/api/auth/login` | — | Login with email/password |
| POST | `/api/auth/google` | — | Google OAuth login/register |
| GET | `/api/auth/me` | ✅ | Get current user |
| POST | `/api/auth/refresh` | ✅ | Refresh JWT token |
| POST | `/api/chat` | ✅ | Send a message, get AI response |
| GET | `/api/conversations` | ✅ | List all conversations |
| GET | `/api/conversations/:id` | ✅ | Load a single conversation |
| DELETE | `/api/conversations/:id` | ✅ | Delete a conversation |