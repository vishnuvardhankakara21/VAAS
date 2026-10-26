import { useEffect, useRef, useState, useCallback } from "react";

import Login from "./components/Login";
import Register from "./components/Register";
import ConversationSidebar from "./components/ConversationSidebar";
import MessageContent from "./components/MessageContent";
import Settings from "./components/Settings";
import ImageGenerator from "./components/ImageGenerator";
import VaasLogo from "./components/VaasLogo";

import { sendChatMessage, getConversation, refreshToken } from "./services/api";

import "./App.css";


// ============================================================
// TOKEN REFRESH UTILITY
// ============================================================

function isTokenExpiringSoon() {
  const expiry = localStorage.getItem("tokenExpiry");
  if (!expiry) return false;
  const msLeft = Number(expiry) - Date.now();
  return msLeft < 30 * 60 * 1000; // refresh if < 30 min left
}

function isTokenExpired() {
  const expiry = localStorage.getItem("tokenExpiry");
  if (!expiry) return true;
  return Date.now() > Number(expiry);
}


// ============================================================
// APP
// ============================================================

function App() {

  // ──────────────────────────────────────────────────────────
  // AUTH STATE
  // ──────────────────────────────────────────────────────────

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });

  const [authView, setAuthView] = useState("login"); // "login" | "register"
  const [activeView, setActiveView] = useState("chat"); // "chat" | "image"


  // ──────────────────────────────────────────────────────────
  // CHAT STATE
  // ──────────────────────────────────────────────────────────

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [previousInteractionId, setPreviousInteractionId] = useState(null);


  // ──────────────────────────────────────────────────────────
  // EDITING
  // ──────────────────────────────────────────────────────────

  const [editingMessageIndex, setEditingMessageIndex] = useState(null);
  const [regenerating, setRegenerating] = useState(false);


  // ──────────────────────────────────────────────────────────
  // UI STATE
  // ──────────────────────────────────────────────────────────

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? saved === "true" : true;
  });
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved !== null ? saved === "dark" : true;
  });


  // ──────────────────────────────────────────────────────────
  // REFS
  // ──────────────────────────────────────────────────────────

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);


  // ──────────────────────────────────────────────────────────
  // AUTO SCROLL
  // ──────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, regenerating]);


  // ──────────────────────────────────────────────────────────
  // APPLY THEME & SIDEBAR PERSISTENCE
  // ──────────────────────────────────────────────────────────

  useEffect(() => {
    const theme = darkMode ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark-mode", darkMode);
    document.documentElement.classList.toggle("light-mode", !darkMode);
    document.body.setAttribute("data-theme", theme);
    document.body.classList.toggle("dark-theme", darkMode);
    document.body.classList.toggle("light-theme", !darkMode);
    localStorage.setItem("theme", theme);
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("sidebarOpen", String(sidebarOpen));
  }, [sidebarOpen]);


  // ──────────────────────────────────────────────────────────
  // AUTH CHECK + TOKEN EXPIRY GUARD
  // ──────────────────────────────────────────────────────────

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (!token || !savedUser) {
      setUser(null);
      return;
    }

    if (isTokenExpired()) {
      handleLogout();
      return;
    }

    // Auto-refresh token if expiring soon
    if (isTokenExpiringSoon()) {
      refreshToken().catch(() => {
        console.info("Token refresh failed – user will need to re-login when token expires");
      });
    }

    // Listen for session-expired events (dispatched by api.js on 401 TOKEN_EXPIRED)
    function handleSessionExpired() {
      handleLogout();
    }
    window.addEventListener("vaas:session-expired", handleSessionExpired);

    // Check token expiry every minute
    const interval = setInterval(() => {
      if (isTokenExpired()) {
        handleLogout();
      }
    }, 60 * 1000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("vaas:session-expired", handleSessionExpired);
    };
  }, [user]);


  // ──────────────────────────────────────────────────────────
  // AUTO-RESIZE TEXTAREA
  // ──────────────────────────────────────────────────────────

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  }, [input]);


  // ──────────────────────────────────────────────────────────
  // AUTH HANDLERS
  // ──────────────────────────────────────────────────────────

  function handleLogin(loggedInUser) {
    setUser(loggedInUser);
    resetChatState();
  }

  function handleRegister(registeredUser) {
    setUser(registeredUser);
    resetChatState();
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("tokenExpiry");
    localStorage.removeItem("user");
    setUser(null);
    resetChatState();
    setShowSettings(false);
    setMobileSidebarOpen(false);
    setAuthView("login");
  }

  function resetChatState() {
    setMessages([]);
    setInput("");
    setCurrentConversationId(null);
    setPreviousInteractionId(null);
    setEditingMessageIndex(null);
    setRegenerating(false);
    setMobileSidebarOpen(false);
  }


  // ──────────────────────────────────────────────────────────
  // NEW CHAT
  // ──────────────────────────────────────────────────────────

  function handleNewChat() {
    if (loading || regenerating) return;
    setActiveView("chat");
    resetChatState();
  }


  // ──────────────────────────────────────────────────────────
  // SELECT CONVERSATION
  // ──────────────────────────────────────────────────────────

  async function handleSelectConversation(conversationId) {
    if (loading || regenerating) return;
    setActiveView("chat");

    try {
      setLoading(true);
      const conversation = await getConversation(conversationId);
      setMessages(conversation.messages || []);
      setCurrentConversationId(conversation._id);
      setPreviousInteractionId(conversation.interactionId || null);
      setInput("");
      setEditingMessageIndex(null);
      setMobileSidebarOpen(false);
    } catch (err) {
      console.error("Failed to load conversation:", err);
    } finally {
      setLoading(false);
    }
  }


  // ──────────────────────────────────────────────────────────
  // EDIT MESSAGE
  // ──────────────────────────────────────────────────────────

  function handleEditMessage(index) {
    if (loading || regenerating) return;
    const msg = messages[index];
    if (!msg || msg.role !== "user") return;

    setInput(msg.content);
    setEditingMessageIndex(index);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleCancelEdit() {
    if (loading || regenerating) return;
    setInput("");
    setEditingMessageIndex(null);
  }


  // ──────────────────────────────────────────────────────────
  // COPY MESSAGE
  // ──────────────────────────────────────────────────────────

  async function handleCopyMessage(content, index) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(index);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }


  // ──────────────────────────────────────────────────────────
  // SEND MESSAGE
  // ──────────────────────────────────────────────────────────

  const handleSendMessage = useCallback(async (event) => {
    if (event) event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || loading || regenerating) return;


    // ── EDIT MODE ──────────────────────────────────────────
    if (editingMessageIndex !== null) {
      const editedIndex = editingMessageIndex;
      const editedMsg = messages[editedIndex];
      if (!editedMsg || editedMsg.role !== "user") {
        setEditingMessageIndex(null);
        setInput("");
        return;
      }

      const beforeEdit = messages.slice(0, editedIndex);
      setMessages([...beforeEdit, { role: "user", content: trimmed }]);
      setInput("");
      setEditingMessageIndex(null);
      setLoading(true);

      try {
        const data = await sendChatMessage(trimmed, null, currentConversationId);
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: data.response || "VAAS could not generate a response.",
        }]);
        if (data.interactionId) setPreviousInteractionId(data.interactionId);
        if (data.conversationId) setCurrentConversationId(data.conversationId);
        setRefreshTrigger((v) => v + 1);
      } catch (err) {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: err.message || "Something went wrong. Please try again.",
        }]);
      } finally {
        setLoading(false);
      }
      return;
    }


    // ── NORMAL SEND ────────────────────────────────────────
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const data = await sendChatMessage(trimmed, previousInteractionId, currentConversationId);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.response || "VAAS could not generate a response.",
      }]);
      if (data.interactionId) setPreviousInteractionId(data.interactionId);
      if (data.conversationId) setCurrentConversationId(data.conversationId);
      setRefreshTrigger((v) => v + 1);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: err.message || "Something went wrong. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, regenerating, editingMessageIndex, messages, previousInteractionId, currentConversationId]);


  // ──────────────────────────────────────────────────────────
  // REGENERATE
  // ──────────────────────────────────────────────────────────

  async function handleRegenerate() {
    if (loading || regenerating || messages.length === 0) return;

    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") { lastUserIndex = i; break; }
    }
    if (lastUserIndex === -1) return;

    const lastUserMessage = messages[lastUserIndex];

    setMessages((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].role === "assistant") {
        return prev.slice(0, prev.length - 1);
      }
      return prev;
    });

    setRegenerating(true);

    try {
      const data = await sendChatMessage(lastUserMessage.content, previousInteractionId, currentConversationId);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.response || "VAAS could not generate a response.",
      }]);
      if (data.interactionId) setPreviousInteractionId(data.interactionId);
      if (data.conversationId) setCurrentConversationId(data.conversationId);
      setRefreshTrigger((v) => v + 1);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: err.message || "Failed to regenerate response.",
      }]);
    } finally {
      setRegenerating(false);
    }
  }


  // ──────────────────────────────────────────────────────────
  // KEYBOARD HANDLER
  // ──────────────────────────────────────────────────────────

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!loading && !regenerating && input.trim()) {
        handleSendMessage(event);
      }
    }
  }


  // ──────────────────────────────────────────────────────────
  // USER INITIAL
  // ──────────────────────────────────────────────────────────

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || "U";


  // ──────────────────────────────────────────────────────────
  // SUGGESTION CHIPS
  // ──────────────────────────────────────────────────────────

  const suggestions = [
    {
      icon: "💻",
      category: "Code & Architecture",
      title: "Full-Stack REST API",
      text: "Design a production-ready Node.js REST API with rate limiting and JWT auth",
    },
    {
      icon: "⚡",
      category: "Performance",
      title: "Debug & Optimize",
      text: "Analyze this JavaScript performance bottleneck and suggest optimizations",
    },
    {
      icon: "🧠",
      category: "Deep Concepts",
      title: "Quantum Computing",
      text: "Explain quantum superposition and entanglement using intuitive physical analogies",
    },
    {
      icon: "📊",
      category: "Data & Systems",
      title: "System Design",
      text: "Architect a real-time collaborative document editing engine like Google Docs",
    },
    {
      icon: "✍️",
      category: "Technical Writing",
      title: "Executive Summary",
      text: "Draft an executive summary and architectural decision record for a cloud migration",
    },
    {
      icon: "🎯",
      category: "Strategy & Planning",
      title: "30-Day Sprint Plan",
      text: "Create a structured 30-day technical sprint roadmap with weekly milestones",
    },
  ];


  // ──────────────────────────────────────────────────────────
  // AUTH SCREEN
  // ──────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="auth-page">
        {/* Clean architectural background */}
        <div className="auth-bg">
          <div className="auth-grid-pattern" />
          <div className="auth-ambient-glow" />
          <div className="auth-radial-vignette" />
        </div>

        <div className="auth-container">
          <div className="auth-top-badge">
            <span className="auth-badge-dot" />
            <span>Next-Generation AI Workspace</span>
          </div>
          {authView === "login" ? (
            <Login
              onLogin={handleLogin}
              onSwitchToRegister={() => setAuthView("register")}
            />
          ) : (
            <Register
              onRegister={handleRegister}
              onSwitchToLogin={() => setAuthView("login")}
            />
          )}
        </div>
      </div>
    );
  }


  // ──────────────────────────────────────────────────────────
  // MAIN APP
  // ──────────────────────────────────────────────────────────

  return (
    <div className={`app ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>

      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar-wrapper ${sidebarOpen ? "expanded" : "collapsed"} ${mobileSidebarOpen ? "mobile-open" : ""}`}>
        <ConversationSidebar
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          refreshTrigger={refreshTrigger}
          user={user}
          onOpenSettings={() => setShowSettings(true)}
          onLogout={handleLogout}
          activeView={activeView}
          onSelectView={(view) => {
            setActiveView(view);
            if (window.innerWidth <= 768) {
              setMobileSidebarOpen(false);
            }
          }}
          onToggleSidebar={() => {
            if (window.innerWidth <= 768) {
              setMobileSidebarOpen(false);
            } else {
              setSidebarOpen(false);
            }
          }}
        />
      </div>

      {/* Chat Area */}
      <main className="chat-area">

        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-left">
            <button
              className="sidebar-toggle-btn"
              id="sidebar-toggle-btn"
              onClick={() => {
                if (window.innerWidth <= 768) {
                  setMobileSidebarOpen((prev) => !prev);
                } else {
                  setSidebarOpen((prev) => !prev);
                }
              }}
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
                {sidebarOpen ? (
                  <path d="M15 9l-3 3 3 3"/>
                ) : (
                  <path d="M13 9l3 3-3 3"/>
                )}
              </svg>
            </button>

            <div className="chat-header-brand">
              <div className="chat-header-logo">
                <VaasLogo size={18} />
              </div>
              <div>
                <div className="chat-header-title-row">
                  <h1 className="chat-header-title">VAAS</h1>
                  <span className="chat-header-badge">AI 2.0</span>
                </div>
                <p className="chat-header-subtitle">
                  {activeView === "image" ? "FLUX & Gemini Studio" : "Intelligence Workspace"}
                </p>
              </div>
            </div>
          </div>

          <div className="chat-header-center">
            <div className="header-nav-pill">
              <button
                type="button"
                className={`header-nav-btn ${activeView === "chat" ? "active" : ""}`}
                onClick={() => setActiveView("chat")}
                id="header-tab-chat"
                title="Switch to Chat"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span>Chat</span>
              </button>
              <button
                type="button"
                className={`header-nav-btn ${activeView === "image" ? "active" : ""}`}
                onClick={() => setActiveView("image")}
                id="header-tab-image"
                title="Switch to Image Studio"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <span>Image Studio</span>
                <span className="header-nav-sparkle" />
              </button>
            </div>
          </div>

          <div className="chat-header-right">
            <div className="header-status">
              <span className="status-dot" />
              <span className="status-text">Connected</span>
            </div>

            <div className="header-avatar" title={user.name}>
              {userInitial}
            </div>

            <button
              className="header-settings-btn"
              id="header-settings-btn"
              onClick={() => setShowSettings(true)}
              title="Settings"
              aria-label="Open settings"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>
        </header>


        {activeView === "image" ? (
          <ImageGenerator onBackToChat={() => setActiveView("chat")} />
        ) : (
          <>
            {/* Messages */}
            <div className="messages-area" id="messages-area">

          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-hero-badge">
                <span className="welcome-hero-dot" />
                <span>VAAS Intelligence Engine • Gemini Powered</span>
              </div>

              <div className="welcome-icon-wrapper">
                <div className="welcome-icon">
                  <VaasLogo size={36} />
                </div>
              </div>

              <h2 className="welcome-title">
                Hello, <span className="welcome-name">{user.name.split(" ")[0]}</span> 👋
              </h2>
              <p className="welcome-subtitle">
                Engineered for deep reasoning, full-stack programming, and creative generation.<br />
                Select a curated prompt or type below to begin.
              </p>

              <div className="suggestion-grid">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    className="suggestion-card"
                    onClick={() => setInput(s.text)}
                    type="button"
                  >
                    <div className="suggestion-card-header">
                      <span className="suggestion-card-icon">{s.icon}</span>
                      <span className="suggestion-card-category">{s.category}</span>
                      <span className="suggestion-card-arrow">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </span>
                    </div>
                    <div className="suggestion-card-title">{s.title}</div>
                    <div className="suggestion-card-text">{s.text}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message, index) => {
                const isUser = message.role === "user";
                const isLast = index === messages.length - 1;

                return (
                  <div
                    key={index}
                    className={`message-row ${isUser ? "user-row" : "ai-row"}`}
                  >
                    {/* Avatar */}
                    <div className={`msg-avatar ${isUser ? "user-avatar" : "ai-avatar"}`}>
                      {isUser ? userInitial : <VaasLogo size={16} />}
                    </div>

                    {/* Bubble */}
                    <div className={`msg-bubble ${isUser ? "user-bubble" : "ai-bubble"}`}>
                      <div className="msg-header-bar">
                        <div className="msg-author">
                          {isUser ? user.name : "VAAS Assistant"}
                        </div>
                        {!isUser && (
                          <span className="msg-model-tag">Gemini 2.5 Flash</span>
                        )}
                      </div>

                      <div className="msg-content">
                        <MessageContent content={message.content} darkMode={darkMode} />
                      </div>

                      {/* User Actions */}
                      {isUser && !loading && !regenerating && (
                        <div className="msg-actions">
                          <button
                            type="button"
                            className="msg-action-btn"
                            onClick={() => handleEditMessage(index)}
                            title="Edit message"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Edit
                          </button>
                        </div>
                      )}

                      {/* AI Actions */}
                      {!isUser && !loading && !regenerating && isLast && (
                        <div className="msg-actions">
                          <button
                            type="button"
                            className={`msg-action-btn ${copiedMessageId === index ? "copied" : ""}`}
                            onClick={() => handleCopyMessage(message.content, index)}
                            title="Copy response"
                          >
                            {copiedMessageId === index ? (
                              <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                Copied!
                              </>
                            ) : (
                              <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                                Copy
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            className="msg-action-btn"
                            onClick={handleRegenerate}
                            title="Regenerate response"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="23 4 23 10 17 10"/>
                              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                            </svg>
                            Regenerate
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Typing indicator */}
          {(loading || regenerating) && (
            <div className="message-row ai-row">
              <div className="msg-avatar ai-avatar">
                <VaasLogo size={16} />
              </div>
              <div className="msg-bubble ai-bubble">
                <div className="msg-header-bar">
                  <div className="msg-author">VAAS Assistant</div>
                  <span className="msg-model-tag">Thinking...</span>
                </div>
                <div className="typing-indicator">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>


        {/* Input */}
        <div className="input-area">

          {/* Edit bar */}
          {editingMessageIndex !== null && (
            <div className="edit-bar">
              <div className="edit-bar-left">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                <span>Editing message</span>
              </div>
              <button type="button" className="edit-bar-cancel" onClick={handleCancelEdit}>
                Cancel
              </button>
            </div>
          )}

          <form className="input-form" onSubmit={handleSendMessage}>
            <div className="input-box">
              <div className="input-box-header">
                <div className="input-model-pill">
                  <span className="input-model-dot" />
                  <span>Gemini 2.5 Flash</span>
                </div>
                {input.trim() && !loading && (
                  <button
                    type="button"
                    className="input-clear-btn"
                    onClick={() => setInput("")}
                    title="Clear input"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="input-box-main">
                <textarea
                  ref={textareaRef}
                  className="chat-textarea"
                  id="chat-input"
                  placeholder={editingMessageIndex !== null ? "Edit your message..." : "Ask VAAS anything or describe code to generate..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading || regenerating}
                  rows={1}
                  aria-label="Message input"
                />

                <button
                  type="submit"
                  className={`send-btn ${input.trim() && !loading && !regenerating ? "send-btn-active" : ""}`}
                  id="send-btn"
                  disabled={loading || regenerating || !input.trim()}
                  aria-label="Send message"
                  title="Send message (Enter)"
                >
                  {loading || regenerating ? (
                    <span className="send-spinner" />
                  ) : editingMessageIndex !== null ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="19" x2="12" y2="5"/>
                      <polyline points="5 12 12 5 19 12"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="input-footer-row">
              <span className="input-hint">
                <kbd>Enter ↵</kbd> send &nbsp;·&nbsp; <kbd>Shift + Enter</kbd> new line
              </span>
            </div>
          </form>
        </div>
          </>
        )}

      </main>


      {/* Settings Modal */}
      {showSettings && (
        <Settings
          user={user}
          darkMode={darkMode}
          onToggleTheme={() => setDarkMode((prev) => !prev)}
          onLogout={handleLogout}
          onClose={() => setShowSettings(false)}
        />
      )}

    </div>
  );
}

export default App;