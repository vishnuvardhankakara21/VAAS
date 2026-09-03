function Sidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  darkMode,
  onToggleTheme,
}) {

  return (
    <aside className="sidebar">

      <div className="sidebar-header">

        <div className="brand">
          <div className="brand-logo">
            V
          </div>

          <h2>VAAS</h2>
        </div>


        <button
          className="new-chat-button"
          onClick={onNewChat}
        >
          + New Chat
        </button>

      </div>


      <div className="history-title">
        Chat History
      </div>


      <div className="conversation-list">

        {conversations.length === 0 && (

          <p className="empty-history">
            No conversations yet.
          </p>

        )}


        {conversations.map(
          (conversation) => (

            <div
              className={`conversation-item ${
                activeConversationId ===
                conversation._id
                  ? "active"
                  : ""
              }`}
              key={conversation._id}
            >

              <button
                className="conversation-select"
                onClick={() =>
                  onSelectConversation(
                    conversation._id
                  )
                }
              >

                <span>
                  {conversation.title}
                </span>

              </button>


              <button
                className="delete-button"
                onClick={() =>
                  onDeleteConversation(
                    conversation._id
                  )
                }
                title="Delete conversation"
              >
                ×
              </button>

            </div>

          )
        )}

      </div>


      <div className="sidebar-footer">

        <button
          className="theme-button"
          onClick={onToggleTheme}
        >
          {darkMode
            ? "☀ Light Mode"
            : "☾ Dark Mode"}
        </button>

      </div>

    </aside>
  );
}

export default Sidebar;