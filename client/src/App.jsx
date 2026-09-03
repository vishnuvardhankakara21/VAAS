import { useEffect, useRef, useState } from "react";

import Login from "./components/Login";
import Register from "./components/Register";
import ConversationSidebar from "./components/ConversationSidebar";
import MessageContent from "./components/MessageContent";

import {
  sendChatMessage,
  getConversation,
} from "./services/api";

import "./App.css";


function App() {

  // ========================================
  // AUTH STATE
  // ========================================

  const [user, setUser] = useState(() => {

    const savedUser = localStorage.getItem("user");

    try {

      return savedUser
        ? JSON.parse(savedUser)
        : null;

    } catch {

      localStorage.removeItem("user");

      return null;

    }

  });


  const [showRegister, setShowRegister] =
    useState(false);


  // ========================================
  // CHAT STATE
  // ========================================

  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(false);

  const [
    currentConversationId,
    setCurrentConversationId,
  ] = useState(null);

  const [
    previousInteractionId,
    setPreviousInteractionId,
  ] = useState(null);


  // ========================================
  // EDIT MESSAGE
  // ========================================

  const [
    editingMessageIndex,
    setEditingMessageIndex,
  ] = useState(null);


  // ========================================
  // REGENERATE
  // ========================================

  const [regenerating, setRegenerating] =
    useState(false);


  // ========================================
  // SIDEBAR REFRESH
  // ========================================

  const [refreshTrigger, setRefreshTrigger] =
    useState(0);


  // ========================================
  // SETTINGS
  // ========================================

  const [showSettings, setShowSettings] =
    useState(false);


  // ========================================
  // DARK MODE
  // ========================================

  const [darkMode, setDarkMode] =
    useState(() => {

      const savedTheme =
        localStorage.getItem("theme");

      return savedTheme === "dark";

    });


  // ========================================
  // MOBILE SIDEBAR
  // ========================================

  const [mobileSidebarOpen, setMobileSidebarOpen] =
    useState(false);


  // ========================================
  // AUTO SCROLL
  // ========================================

  const messagesEndRef = useRef(null);


  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });

  }, [
    messages,
    loading,
    regenerating,
  ]);


  // ========================================
  // APPLY THEME
  // ========================================

  useEffect(() => {

    if (darkMode) {

      document.body.classList.add("dark-mode");

      localStorage.setItem(
        "theme",
        "dark"
      );

    } else {

      document.body.classList.remove("dark-mode");

      localStorage.setItem(
        "theme",
        "light"
      );

    }

  }, [darkMode]);


  // ========================================
  // AUTH CHECK
  // ========================================

  useEffect(() => {

    const token =
      localStorage.getItem("token");

    const savedUser =
      localStorage.getItem("user");

    if (!token || !savedUser) {

      setUser(null);

    }

  }, []);


  // ========================================
  // LOGIN
  // ========================================

  function handleLogin(loggedInUser) {

    setUser(loggedInUser);

    setMessages([]);

    setInput("");

    setCurrentConversationId(null);

    setPreviousInteractionId(null);

    setEditingMessageIndex(null);

    setRegenerating(false);

    setShowSettings(false);

    setMobileSidebarOpen(false);

  }


  // ========================================
  // REGISTER
  // ========================================

  function handleRegister(registeredUser) {

    setUser(registeredUser);

    setMessages([]);

    setInput("");

    setCurrentConversationId(null);

    setPreviousInteractionId(null);

    setEditingMessageIndex(null);

    setRegenerating(false);

    setShowSettings(false);

    setMobileSidebarOpen(false);

  }


  // ========================================
  // LOGOUT
  // ========================================

  function handleLogout() {

    if (loading || regenerating) {
      return;
    }

    localStorage.removeItem("token");

    localStorage.removeItem("user");

    setUser(null);

    setMessages([]);

    setInput("");

    setCurrentConversationId(null);

    setPreviousInteractionId(null);

    setEditingMessageIndex(null);

    setRegenerating(false);

    setShowSettings(false);

    setMobileSidebarOpen(false);

    setShowRegister(false);

  }


  // ========================================
  // NEW CHAT
  // ========================================

  function handleNewChat() {

    if (loading || regenerating) {
      return;
    }

    setMessages([]);

    setInput("");

    setCurrentConversationId(null);

    setPreviousInteractionId(null);

    setEditingMessageIndex(null);

    setMobileSidebarOpen(false);

  }


  // ========================================
  // SELECT CONVERSATION
  // ========================================

  async function handleSelectConversation(
    conversationId
  ) {

    if (loading || regenerating) {
      return;
    }

    try {

      setLoading(true);

      const conversation =
        await getConversation(
          conversationId
        );

      setMessages(
        conversation.messages || []
      );

      setCurrentConversationId(
        conversation._id
      );

      setPreviousInteractionId(
        conversation.interactionId || null
      );

      setInput("");

      setEditingMessageIndex(null);

      // Close mobile sidebar
      setMobileSidebarOpen(false);

    } catch (error) {

      console.error(
        "Failed to load conversation:",
        error
      );

    } finally {

      setLoading(false);

    }

  }


  // ========================================
  // EDIT MESSAGE
  // ========================================

  function handleEditMessage(index) {

    if (loading || regenerating) {
      return;
    }

    const message = messages[index];

    if (
      !message ||
      message.role !== "user"
    ) {
      return;
    }

    setInput(message.content);

    setEditingMessageIndex(index);

    setTimeout(() => {

      const textarea =
        document.querySelector(
          ".chat-textarea"
        );

      textarea?.focus();

    }, 0);

  }


  // ========================================
  // CANCEL EDIT
  // ========================================

  function handleCancelEdit() {

    if (loading || regenerating) {
      return;
    }

    setInput("");

    setEditingMessageIndex(null);

  }


  // ========================================
  // SEND MESSAGE
  // ========================================

  async function handleSendMessage(event) {

    if (event) {
      event.preventDefault();
    }

    const trimmedMessage =
      input.trim();

    if (!trimmedMessage) {
      return;
    }

    if (loading || regenerating) {
      return;
    }


    // ======================================
    // EDIT MODE
    // ======================================

    if (
      editingMessageIndex !== null
    ) {

      const editedIndex =
        editingMessageIndex;

      const editedMessage =
        messages[editedIndex];

      if (
        !editedMessage ||
        editedMessage.role !== "user"
      ) {

        setEditingMessageIndex(null);

        setInput("");

        return;

      }

      const messagesBeforeEdit =
        messages.slice(
          0,
          editedIndex
        );

      setMessages([
        ...messagesBeforeEdit,
        {
          role: "user",
          content: trimmedMessage,
        },
      ]);

      setInput("");

      setEditingMessageIndex(null);

      setLoading(true);

      try {

        const data =
          await sendChatMessage(
            trimmedMessage,
            null,
            currentConversationId
          );

        setMessages(
          (previousMessages) => [
            ...previousMessages,
            {
              role: "assistant",
              content:
                data.response ||
                "VAAS could not generate a response.",
            },
          ]
        );

        if (data.interactionId) {

          setPreviousInteractionId(
            data.interactionId
          );

        }

        if (data.conversationId) {

          setCurrentConversationId(
            data.conversationId
          );

        }

        setRefreshTrigger(
          (value) => value + 1
        );

      } catch (error) {

        console.error(
          "Edit message error:",
          error
        );

        setMessages(
          (previousMessages) => [
            ...previousMessages,
            {
              role: "assistant",
              content:
                error.message ||
                "Something went wrong. Please try again.",
            },
          ]
        );

      } finally {

        setLoading(false);

      }

      return;

    }


    // ======================================
    // NORMAL MESSAGE
    // ======================================

    setMessages(
      (previousMessages) => [
        ...previousMessages,
        {
          role: "user",
          content: trimmedMessage,
        },
      ]
    );

    setInput("");

    setLoading(true);

    try {

      const data =
        await sendChatMessage(
          trimmedMessage,
          previousInteractionId,
          currentConversationId
        );

      setMessages(
        (previousMessages) => [
          ...previousMessages,
          {
            role: "assistant",
            content:
              data.response ||
              "VAAS could not generate a response.",
          },
        ]
      );

      if (data.interactionId) {

        setPreviousInteractionId(
          data.interactionId
        );

      }

      if (data.conversationId) {

        setCurrentConversationId(
          data.conversationId
        );

      }

      setRefreshTrigger(
        (value) => value + 1
      );

    } catch (error) {

      console.error(
        "Chat error:",
        error
      );

      setMessages(
        (previousMessages) => [
          ...previousMessages,
          {
            role: "assistant",
            content:
              error.message ||
              "Something went wrong. Please try again.",
          },
        ]
      );

    } finally {

      setLoading(false);

    }

  }


  // ========================================
  // REGENERATE RESPONSE
  // ========================================

  async function handleRegenerate() {

    if (loading || regenerating) {
      return;
    }

    if (messages.length === 0) {
      return;
    }

    let lastUserIndex = -1;

    for (
      let i = messages.length - 1;
      i >= 0;
      i--
    ) {

      if (
        messages[i].role === "user"
      ) {

        lastUserIndex = i;

        break;

      }

    }

    if (lastUserIndex === -1) {
      return;
    }

    const lastUserMessage =
      messages[lastUserIndex];

    setMessages(
      (previousMessages) => {

        if (
          previousMessages.length > 0 &&
          previousMessages[
            previousMessages.length - 1
          ].role === "assistant"
        ) {

          return previousMessages.slice(
            0,
            previousMessages.length - 1
          );

        }

        return previousMessages;

      }
    );

    setRegenerating(true);

    try {

      const data =
        await sendChatMessage(
          lastUserMessage.content,
          previousInteractionId,
          currentConversationId
        );

      setMessages(
        (previousMessages) => [
          ...previousMessages,
          {
            role: "assistant",
            content:
              data.response ||
              "VAAS could not generate a response.",
          },
        ]
      );

      if (data.interactionId) {

        setPreviousInteractionId(
          data.interactionId
        );

      }

      if (data.conversationId) {

        setCurrentConversationId(
          data.conversationId
        );

      }

      setRefreshTrigger(
        (value) => value + 1
      );

    } catch (error) {

      console.error(
        "Regenerate error:",
        error
      );

      setMessages(
        (previousMessages) => [
          ...previousMessages,
          {
            role: "assistant",
            content:
              error.message ||
              "Failed to regenerate response.",
          },
        ]
      );

    } finally {

      setRegenerating(false);

    }

  }


  // ========================================
  // COPY MESSAGE
  // ========================================

  async function handleCopyMessage(content) {

    try {

      await navigator.clipboard.writeText(
        content
      );

    } catch (error) {

      console.error(
        "Failed to copy message:",
        error
      );

    }

  }


  // ========================================
  // KEYBOARD HANDLER
  // ========================================

  function handleKeyDown(event) {

    if (
      event.key === "Enter" &&
      event.shiftKey
    ) {

      return;

    }

    if (event.key === "Enter") {

      event.preventDefault();

      if (
        !loading &&
        !regenerating &&
        input.trim()
      ) {

        handleSendMessage(event);

      }

    }

  }


  // ========================================
  // SETTINGS
  // ========================================

  function handleOpenSettings() {

    if (loading || regenerating) {
      return;
    }

    setShowSettings(true);

  }


  function handleCloseSettings() {

    setShowSettings(false);

  }


  // ========================================
  // THEME
  // ========================================

  function handleToggleTheme() {

    setDarkMode(
      (previous) => !previous
    );

  }


  // ========================================
  // MOBILE SIDEBAR
  // ========================================

  function handleOpenMobileSidebar() {

    if (loading || regenerating) {
      return;
    }

    setMobileSidebarOpen(true);

  }


  function handleCloseMobileSidebar() {

    setMobileSidebarOpen(false);

  }


  // ========================================
  // USER INITIAL
  // ========================================

  const userInitial =
    user?.name
      ?.charAt(0)
      ?.toUpperCase() || "U";


  // ========================================
  // NOT LOGGED IN
  // ========================================

  if (!user) {

    return (

      <div className="auth-page">

        <div className="auth-container">

          {showRegister ? (

            <>

              <Register
                onRegister={
                  handleRegister
                }
              />

              <button
                type="button"
                onClick={() =>
                  setShowRegister(false)
                }
              >
                Already have an account?
                Login
              </button>

            </>

          ) : (

            <>

              <Login
                onLogin={
                  handleLogin
                }
              />

              <button
                type="button"
                onClick={() =>
                  setShowRegister(true)
                }
              >
                Don't have an account?
                Register
              </button>

            </>

          )}

        </div>

      </div>

    );

  }


  // ========================================
  // MAIN APPLICATION
  // ========================================

  return (

    <div
      className={`app ${
        darkMode
          ? "app-dark"
          : ""
      }`}
    >

      {/* ====================================
          MOBILE SIDEBAR OVERLAY
      ==================================== */}

      {mobileSidebarOpen && (

        <div
          className="mobile-sidebar-overlay"
          onClick={
            handleCloseMobileSidebar
          }
        />

      )}


      {/* ====================================
          SIDEBAR
      ==================================== */}

      <div
        className={`sidebar-wrapper ${
          mobileSidebarOpen
            ? "mobile-sidebar-open"
            : ""
        }`}
      >

        <ConversationSidebar

          currentConversationId={
            currentConversationId
          }

          onSelectConversation={
            handleSelectConversation
          }

          onNewChat={
            handleNewChat
          }

          refreshTrigger={
            refreshTrigger
          }

        />

      </div>


      {/* ====================================
          CHAT AREA
      ==================================== */}

      <main className="chat-area">


        {/* ==================================
            HEADER
        ================================== */}

        <header className="chat-header">


          {/* MOBILE MENU BUTTON */}

          <button
            type="button"
            className="mobile-menu-button"
            onClick={
              handleOpenMobileSidebar
            }
            disabled={
              loading ||
              regenerating
            }
            aria-label="Open conversations"
          >
            ☰
          </button>


          {/* HEADER BRAND */}

          <div className="header-title">

            <h1>
              VAAS
            </h1>

            <p>
              AI Assistant
            </p>

          </div>


          {/* USER SECTION */}

          <div className="user-section">

            <div className="header-avatar">

              {userInitial}

            </div>

            <span>
              {user.name}
            </span>


            <button
              type="button"
              className="settings-button"
              onClick={
                handleOpenSettings
              }
              disabled={
                loading ||
                regenerating
              }
            >
              Settings
            </button>


            <button
              type="button"
              onClick={
                handleLogout
              }
              disabled={
                loading ||
                regenerating
              }
            >
              Logout
            </button>

          </div>

        </header>


        {/* ==================================
            MESSAGES
        ================================== */}

        <div className="messages-container">


          {/* WELCOME */}

          {messages.length === 0 ? (

            <div className="welcome-message">

              <div className="welcome-icon">
                ✦
              </div>

              <h2>
                Welcome to VAAS
              </h2>

              <p>
                Your intelligent AI
                assistant.
                How can I help you
                today?
              </p>


              <div className="welcome-suggestions">

                <button
                  type="button"
                  onClick={() =>
                    setInput(
                      "Explain artificial intelligence in simple terms"
                    )
                  }
                >
                  Explain AI
                </button>


                <button
                  type="button"
                  onClick={() =>
                    setInput(
                      "Give me a Java coding problem"
                    )
                  }
                >
                  Give me a coding problem
                </button>


                <button
                  type="button"
                  onClick={() =>
                    setInput(
                      "Help me create a study plan"
                    )
                  }
                >
                  Create a study plan
                </button>

              </div>

            </div>

          ) : (

            <div className="message-list">

              {messages.map(
                (message, index) => {

                  const isUser =
                    message.role === "user";

                  const isLastMessage =
                    index ===
                    messages.length - 1;


                  return (

                    <div
                      key={index}
                      className={`message-row ${
                        isUser
                          ? "user-row"
                          : "assistant-row"
                      }`}
                    >

                      <div
                        className={`message-avatar ${
                          isUser
                            ? "user-avatar"
                            : "assistant-avatar"
                        }`}
                      >

                        {isUser
                          ? userInitial
                          : "✦"}

                      </div>


                      <div
                        className={`message ${
                          isUser
                            ? "user-message"
                            : "assistant-message"
                        }`}
                      >

                        <div className="message-author">

                          {isUser
                            ? user.name
                            : "VAAS"}

                        </div>


                        <div className="message-content">

                          <MessageContent
                            content={
                              message.content
                            }
                          />


                          {/* USER ACTIONS */}

                          {isUser &&
                            !loading &&
                            !regenerating && (

                              <div className="message-actions">

                                <button
                                  type="button"
                                  className="message-action-button"
                                  onClick={() =>
                                    handleEditMessage(
                                      index
                                    )
                                  }
                                >
                                  Edit
                                </button>

                              </div>

                          )}


                          {/* ASSISTANT ACTIONS */}

                          {!isUser &&
                            !loading &&
                            !regenerating &&
                            isLastMessage && (

                              <div className="message-actions">

                                <button
                                  type="button"
                                  className="message-action-button"
                                  onClick={() =>
                                    handleCopyMessage(
                                      message.content
                                    )
                                  }
                                >
                                  Copy
                                </button>


                                <button
                                  type="button"
                                  className="message-action-button"
                                  onClick={
                                    handleRegenerate
                                  }
                                >
                                  Regenerate
                                </button>

                              </div>

                          )}

                        </div>

                      </div>

                    </div>

                  );

                }
              )}

            </div>

          )}


          {/* TYPING */}

          {(loading ||
            regenerating) && (

            <div className="message-row assistant-row">

              <div className="message-avatar assistant-avatar">
                ✦
              </div>

              <div className="message assistant-message">

                <div className="message-author">
                  VAAS
                </div>

                <div className="message-content">

                  <div className="typing-dots">

                    <span>•</span>
                    <span>•</span>
                    <span>•</span>

                  </div>

                </div>

              </div>

            </div>

          )}


          <div
            ref={messagesEndRef}
          />

        </div>


        {/* ====================================
            CHAT INPUT
        ==================================== */}

        <form
          className="chat-input-container"
          onSubmit={
            handleSendMessage
          }
        >


          {/* EDIT BAR */}

          {editingMessageIndex !== null && (

            <div className="edit-mode-bar">

              <span>
                Editing message
              </span>

              <button
                type="button"
                onClick={
                  handleCancelEdit
                }
              >
                Cancel
              </button>

            </div>

          )}


          <div className="chat-input-form">

            <textarea
              className="chat-textarea"

              placeholder={
                editingMessageIndex !==
                null
                  ? "Edit your message..."
                  : "Message VAAS..."
              }

              value={input}

              onChange={(event) =>
                setInput(
                  event.target.value
                )
              }

              onKeyDown={
                handleKeyDown
              }

              disabled={
                loading ||
                regenerating
              }

              rows={1}
            />


            <button
              type="submit"
              className="send-button"

              disabled={
                loading ||
                regenerating ||
                !input.trim()
              }
            >

              {loading
                ? "..."
                : editingMessageIndex !==
                    null
                  ? "✓"
                  : "↑"}

            </button>

          </div>


          <p className="input-hint">

            Enter to send • Shift +
            Enter for new line

          </p>

        </form>


        {/* ====================================
            SETTINGS
        ==================================== */}

        {showSettings && (

          <div
            className="settings-overlay"
            onClick={(event) => {

              if (
                event.target ===
                event.currentTarget
              ) {

                handleCloseSettings();

              }

            }}
          >

            <div className="settings-panel">


              {/* SETTINGS HEADER */}

              <div className="settings-header">

                <div>

                  <h2>
                    Settings
                  </h2>

                  <p>
                    Manage your VAAS preferences
                  </p>

                </div>


                <button
                  type="button"
                  className="settings-close-button"
                  onClick={
                    handleCloseSettings
                  }
                >
                  ×
                </button>

              </div>


              {/* PROFILE */}

              <div className="settings-section">

                <h3>
                  Profile
                </h3>

                <div className="profile-card">

                  <div className="profile-avatar">
                    {userInitial}
                  </div>

                  <div className="profile-info">

                    <strong>
                      {user.name}
                    </strong>

                    <span>
                      {user.email ||
                        "No email available"}
                    </span>

                  </div>

                </div>

              </div>


              {/* APPEARANCE */}

              <div className="settings-section">

                <h3>
                  Appearance
                </h3>

                <div className="settings-option">

                  <div>

                    <strong>
                      Dark Mode
                    </strong>

                    <span>
                      Switch between light
                      and dark appearance
                    </span>

                  </div>


                  <button
                    type="button"
                    className={`theme-toggle ${
                      darkMode
                        ? "active"
                        : ""
                    }`}
                    onClick={
                      handleToggleTheme
                    }
                    aria-label="Toggle dark mode"
                  >

                    <span />

                  </button>

                </div>

              </div>


              {/* ACCOUNT */}

              <div className="settings-section">

                <h3>
                  Account
                </h3>

                <button
                  type="button"
                  className="settings-logout-button"
                  onClick={
                    handleLogout
                  }
                  disabled={
                    loading ||
                    regenerating
                  }
                >
                  Logout from VAAS
                </button>

              </div>

            </div>

          </div>

        )}

      </main>

    </div>

  );

}


export default App;