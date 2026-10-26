import { useEffect, useState } from "react";
import { getConversations, deleteConversation } from "../services/api";
import VaasLogo from "./VaasLogo";

function ConversationSidebar({
  currentConversationId,
  onSelectConversation,
  onNewChat,
  refreshTrigger,
  user,
  onOpenSettings,
  onLogout,
  onToggleSidebar,
  activeView = "chat",
  onSelectView,
}) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || "U";

  // Load conversations
  async function loadConversations() {
    try {
      setLoading(true);
      const data = await getConversations();
      setConversations(data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, [refreshTrigger]);

  // Filter by search
  const filtered = conversations.filter((c) =>
    (c.title || "New Conversation").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by date
  function groupByDate(list) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    const groups = { Today: [], Yesterday: [], "Last 7 days": [], Older: [] };

    list.forEach((c) => {
      const d = new Date(c.updatedAt || c.createdAt);
      if (d.toDateString() === today.toDateString()) {
        groups["Today"].push(c);
      } else if (d.toDateString() === yesterday.toDateString()) {
        groups["Yesterday"].push(c);
      } else if (d > weekAgo) {
        groups["Last 7 days"].push(c);
      } else {
        groups["Older"].push(c);
      }
    });

    return groups;
  }

  async function handleDelete(conversationId) {
    if (confirmDeleteId !== conversationId) {
      setConfirmDeleteId(conversationId);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }

    setConfirmDeleteId(null);
    setDeletingId(conversationId);

    try {
      await deleteConversation(conversationId);
      setConversations((prev) => prev.filter((c) => c._id !== conversationId));

      if (currentConversationId === conversationId) {
        onNewChat();
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    } finally {
      setDeletingId(null);
    }
  }

  const groups = groupByDate(filtered);

  return (
    <aside className="sidebar" id="main-sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <VaasLogo size={18} />
          </div>
          <span className="sidebar-logo-text">VAAS</span>
        </div>

        <div className="sidebar-header-actions">
          <button
            className="sidebar-new-btn"
            id="new-chat-btn"
            onClick={onNewChat}
            title="New chat"
            aria-label="Start new chat"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>

          {onToggleSidebar && (
            <button
              className="sidebar-collapse-btn"
              id="sidebar-collapse-btn"
              onClick={onToggleSidebar}
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
                <path d="M15 9l-3 3 3 3"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Switcher */}
      <div className="sidebar-nav-section">
        <button
          type="button"
          className={`sidebar-nav-tab ${activeView !== "image" ? "active" : ""}`}
          onClick={() => onSelectView?.("chat")}
          id="nav-chat-btn"
          title="AI Chat"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>Chat</span>
        </button>

        <button
          type="button"
          className={`sidebar-nav-tab ${activeView === "image" ? "active" : ""}`}
          onClick={() => onSelectView?.("image")}
          id="nav-image-btn"
          title="AI Image Generator"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span>Image Studio</span>
        </button>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <svg className="sidebar-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          className="sidebar-search-input"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          id="search-conversations-input"
        />
        {searchQuery && (
          <button
            className="sidebar-search-clear"
            onClick={() => setSearchQuery("")}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {/* Conversations */}
      <div className="sidebar-conversations">
        {loading ? (
          <div className="sidebar-loading">
            <div className="sidebar-loading-dots">
              <span /><span /><span />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="sidebar-empty">
            <div className="sidebar-empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p>{searchQuery ? "No results found" : "No conversations yet"}</p>
            <span>{searchQuery ? "Try a different search" : "Start your first chat below"}</span>
          </div>
        ) : (
          Object.entries(groups).map(([group, items]) =>
            items.length > 0 ? (
              <div key={group} className="sidebar-group">
                <div className="sidebar-group-label">{group}</div>
                {items.map((conversation) => (
                  <div
                    key={conversation._id}
                    className={`sidebar-item ${currentConversationId === conversation._id ? "sidebar-item-active" : ""}`}
                  >
                    <button
                      className="sidebar-item-btn"
                      onClick={() => onSelectConversation(conversation._id)}
                      title={conversation.title || "New Conversation"}
                    >
                      <svg className="sidebar-item-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      <span className="sidebar-item-title">
                        {conversation.title || "New Conversation"}
                      </span>
                    </button>

                    <button
                      className={`sidebar-delete-btn ${confirmDeleteId === conversation._id ? "sidebar-delete-confirm" : ""}`}
                      onClick={() => handleDelete(conversation._id)}
                      disabled={deletingId === conversation._id}
                      title={confirmDeleteId === conversation._id ? "Click again to confirm" : "Delete conversation"}
                      aria-label="Delete conversation"
                    >
                      {deletingId === conversation._id ? (
                        <span className="sidebar-mini-spinner" />
                      ) : confirmDeleteId === conversation._id ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : null
          )
        )}
      </div>

      {/* User Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{userInitial}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name || "User"}</span>
            <span className="sidebar-user-email">{user?.email || ""}</span>
          </div>
        </div>

        <div className="sidebar-footer-actions">
          <button
            className="sidebar-icon-btn"
            id="open-settings-btn"
            onClick={onOpenSettings}
            title="Settings"
            aria-label="Open settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>

          <button
            className="sidebar-icon-btn sidebar-logout-btn"
            id="logout-btn"
            onClick={onLogout}
            title="Sign out"
            aria-label="Sign out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default ConversationSidebar;