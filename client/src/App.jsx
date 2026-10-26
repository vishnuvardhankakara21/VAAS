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
  // CHAT MODEL SELECTOR
  // ──────────────────────────────────────────────────────────

  const CHAT_MODELS = [
    { id: "gemini-2.0-flash",         label: "Gemini 2.0 Flash",         desc: "Fast and capable multimodal" },
    { id: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash",  desc: "Latest preview, reasoning" },
    { id: "gemini-1.5-flash",         label: "Gemini 1.5 Flash",         desc: "Balanced speed & quality" },
    { id: "gemini-1.5-pro",           label: "Gemini 1.5 Pro",           desc: "Most capable, complex tasks" },
  ];

  const [selectedChatModel, setSelectedChatModel] = useState(() =>
    localStorage.getItem("chatModel") || "gemini-2.0-flash"
  );
  const [chatModelDropdownOpen, setChatModelDropdownOpen] = useState(false);
  const chatModelDropdownRef = useRef(null);


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

  // Voice speech-to-text recording state
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);
  const recognitionRef = useRef(null);
  const voiceBaseInputRef = useRef("");


  // ──────────────────────────────────────────────────────────
  // REFS
  // ──────────────────────────────────────────────────────────

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const cursorDotRef = useRef(null);
  const cursorRingRef = useRef(null);


  // ──────────────────────────────────────────────────────────
  // POINTER TRACKING & CUSTOM CURSOR PHYSICS (LUXURY AMBER)
  // ──────────────────────────────────────────────────────────

  useEffect(() => {
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let animId;

    function handlePointerMove(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      document.documentElement.style.setProperty("--mouse-x", `${mouseX}px`);
      document.documentElement.style.setProperty("--mouse-y", `${mouseY}px`);

      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      }
    }

    // Smooth physics trailing ring loop
    function updateCursorRing() {
      ringX += (mouseX - ringX) * 0.22;
      ringY += (mouseY - ringY) * 0.22;
      if (cursorRingRef.current) {
        cursorRingRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      }
      animId = requestAnimationFrame(updateCursorRing);
    }
    animId = requestAnimationFrame(updateCursorRing);

    // Hover detection for interactive elements (triggers cursor bloom)
    function handleMouseOver(e) {
      const target = e.target;
      if (
        target &&
        (target.closest("button") ||
         target.closest("a") ||
         target.closest("input") ||
         target.closest("textarea") ||
         target.closest("[role='button']") ||
         target.closest(".chat-model-trigger") ||
         target.closest(".model-dropdown-trigger"))
      ) {
        document.body.classList.add("cursor-hover");
      } else {
        document.body.classList.remove("cursor-hover");
      }
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("mouseover", handleMouseOver, { passive: true });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("mouseover", handleMouseOver);
      document.body.classList.remove("cursor-hover");
    };
  }, []);

  // Close chat model dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (chatModelDropdownRef.current && !chatModelDropdownRef.current.contains(e.target)) {
        setChatModelDropdownOpen(false);
      }
    }
    if (chatModelDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [chatModelDropdownOpen]);


  // ──────────────────────────────────────────────────────────
  // VOICE SPEECH RECOGNITION (BULLETPROOF PERSISTENT INSTANCE)
  // ──────────────────────────────────────────────────────────

  const inputRef = useRef(input);
  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  const createRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = navigator.language || "en-US";

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item && item[0]) {
            if (item.isFinal) {
              finalTranscript += item[0].transcript + " ";
            } else {
              interimTranscript += item[0].transcript;
            }
          }
        }

        const spoken = (finalTranscript + interimTranscript).trim();
        const base = voiceBaseInputRef.current ? voiceBaseInputRef.current.trim() : "";
        const combined = base ? `${base} ${spoken}` : spoken;

        setInput(combined);

        if (textareaRef.current) {
          textareaRef.current.value = combined;
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
          textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "no-speech") return; // Keep listening through pauses
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          alert("Microphone permission was denied. Please allow microphone access in your browser to speak to VAAS.");
        }
        isListeningRef.current = false;
        setIsListening(false);
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          // Attempt restart if Chrome stopped after silence
          try {
            recognition.start();
            return;
          } catch (_) {}
        }
        setIsListening(false);
        isListeningRef.current = false;
      };

      return recognition;
    } catch (err) {
      console.warn("Could not create SpeechRecognition:", err);
      return null;
    }
  }, []);

  const handleToggleVoice = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.");
      return;
    }

    if (isListeningRef.current) {
      isListeningRef.current = false;
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      return;
    }

    voiceBaseInputRef.current = inputRef.current;

    // Direct synchronous invocation to maintain user gesture activation
    try {
      if (!recognitionRef.current) {
        recognitionRef.current = createRecognition();
      }
      if (recognitionRef.current) {
        recognitionRef.current.start();
        isListeningRef.current = true;
        setIsListening(true);
      }
    } catch (err) {
      console.warn("Primary start failed, recreating instance:", err);
      try {
        recognitionRef.current = createRecognition();
        recognitionRef.current?.start();
        isListeningRef.current = true;
        setIsListening(true);
      } catch (retryErr) {
        console.error("Speech recognition could not be started:", retryErr);
        isListeningRef.current = false;
        setIsListening(false);
      }
    }
  }, [createRecognition]);

  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, []);


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

    if (isListeningRef.current) {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      setIsListening(false);
    }


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
        const data = await sendChatMessage(trimmed, null, currentConversationId, selectedChatModel);
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
      const data = await sendChatMessage(trimmed, previousInteractionId, currentConversationId, selectedChatModel);
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
  }, [input, loading, regenerating, editingMessageIndex, messages, previousInteractionId, currentConversationId, selectedChatModel]);


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
      const data = await sendChatMessage(lastUserMessage.content, previousInteractionId, currentConversationId, selectedChatModel);
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
      title: "Write code",
      text: "Build a modern responsive component with clean styling and logic",
    },
    {
      icon: "⚡",
      title: "Debug an issue",
      text: "Troubleshoot a tricky bug, race condition, or performance bottleneck",
    },
    {
      icon: "🧠",
      title: "Explain a concept",
      text: "Break down distributed systems, consensus, or algorithms simply",
    },
    {
      icon: "📊",
      title: "System architecture",
      text: "Design a high-throughput queue-based background processing service",
    },
    {
      icon: "✍️",
      title: "Draft content",
      text: "Write technical documentation, clean release notes, or an email update",
    },
    {
      icon: "🎯",
      title: "Brainstorm ideas",
      text: "Explore novel features, edge cases, and engineering trade-offs",
    },
  ];


  // ──────────────────────────────────────────────────────────
  // AUTH SCREEN
  // ──────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="auth-page">
        {/* Custom Luxury Amber Cursor */}
        <div ref={cursorRingRef} className="custom-cursor-ring" aria-hidden="true" />
        <div ref={cursorDotRef} className="custom-cursor-dot" aria-hidden="true" />

        {/* Interactive pointer ambient lighting layer */}
        <div className="cursor-spotlight-layer" aria-hidden="true" />

        {/* Clean architectural background */}
        <div className="auth-bg">
          <div className="auth-grid-pattern" />
          <div className="auth-ambient-glow" />
          <div className="auth-radial-vignette" />
        </div>

        <div className="auth-container">
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
      {/* Custom Luxury Amber Cursor */}
      <div ref={cursorRingRef} className="custom-cursor-ring" aria-hidden="true" />
      <div ref={cursorDotRef} className="custom-cursor-dot" aria-hidden="true" />

      {/* Interactive pointer ambient lighting layer */}
      <div className="cursor-spotlight-layer" aria-hidden="true" />

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
                </div>
                <p className="chat-header-subtitle">
                  {activeView === "image" ? "Image Studio" : "AI Assistant"}
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
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span>Image Studio</span>
              </button>
            </div>
          </div>

          <div className="chat-header-right">
            <div className="header-status">
              <span className="status-dot" />
              <span className="status-text">Online</span>
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
              <div className="welcome-icon-wrapper">
                <div className="welcome-icon">
                  <VaasLogo size={32} />
                </div>
              </div>

              <h2 className="welcome-title">
                Hello, <span className="welcome-name">{user.name.split(" ")[0]}</span>
              </h2>
              <p className="welcome-subtitle">
                How can I help you today?
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
                      <span className="suggestion-card-title">{s.title}</span>
                      <span className="suggestion-card-arrow">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </span>
                    </div>
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
                          {isUser ? user.name : "VAAS"}
                        </div>
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
                  <div className="msg-author">VAAS</div>
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

          {/* Voice Listening Live Banner */}
          {isListening && (
            <div className="voice-listening-indicator" role="status" aria-live="polite">
              <span className="voice-pulse-dot" />
              <span>Listening... Speak into your microphone</span>
              <button
                type="button"
                className="voice-done-btn"
                onClick={handleToggleVoice}
                title="Finish speaking"
              >
                Done ✓
              </button>
            </div>
          )}

          <form className="input-form" onSubmit={handleSendMessage}>
            <div className="input-box">
              <textarea
                ref={textareaRef}
                className="chat-textarea"
                id="chat-input"
                placeholder={editingMessageIndex !== null ? "Edit your message..." : "Ask anything or describe what you want to build..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading || regenerating}
                rows={1}
                aria-label="Message input"
              />

              <div className="input-actions-bar">
                {/* Voice / Mic Button */}
                <button
                  type="button"
                  className={`mic-btn ${isListening ? "mic-btn-active" : ""}`}
                  id="voice-input-btn"
                  onClick={handleToggleVoice}
                  disabled={loading || regenerating}
                  aria-label={isListening ? "Stop recording" : "Start voice input"}
                  title={isListening ? "Click to stop recording" : "Speak to type (Voice input)"}
                >
                  {isListening ? (
                    <>
                      <span className="mic-pulse-ring" />
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="4" y="4" width="16" height="16" rx="2"/>
                      </svg>
                    </>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                  )}
                </button>

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
              {/* Chat Model Selector */}
              <div className="chat-model-selector" ref={chatModelDropdownRef}>
                <button
                  type="button"
                  className={`chat-model-trigger ${chatModelDropdownOpen ? "open" : ""}`}
                  id="chat-model-trigger-btn"
                  onClick={() => setChatModelDropdownOpen((p) => !p)}
                  title="Select AI model"
                  aria-haspopup="listbox"
                  aria-expanded={chatModelDropdownOpen}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                  </svg>
                  <span>{CHAT_MODELS.find((m) => m.id === selectedChatModel)?.label ?? "Gemini 2.0 Flash"}</span>
                  <svg className={`chat-model-chevron ${chatModelDropdownOpen ? "open" : ""}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {chatModelDropdownOpen && (
                  <div className="chat-model-menu" role="listbox">
                    {CHAT_MODELS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        role="option"
                        aria-selected={selectedChatModel === m.id}
                        className={`chat-model-item ${selectedChatModel === m.id ? "selected" : ""}`}
                        onClick={() => {
                          setSelectedChatModel(m.id);
                          localStorage.setItem("chatModel", m.id);
                          setChatModelDropdownOpen(false);
                        }}
                      >
                        <div className="chat-model-item-name">{m.label}</div>
                        <div className="chat-model-item-desc">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <span className="input-hint">
                <kbd>Enter ↵</kbd> send &nbsp;·&nbsp; <kbd>Shift+Enter</kbd> newline
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