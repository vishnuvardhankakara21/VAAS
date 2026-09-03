import { useEffect, useState } from "react";

import {
  getConversations,
  deleteConversation,
} from "../services/api";


function ConversationSidebar({
  currentConversationId,
  onSelectConversation,
  onNewChat,
  refreshTrigger,
}) {

  const [conversations, setConversations] =
    useState([]);

  const [loading, setLoading] =
    useState(true);


  // ========================================
  // LOAD CONVERSATIONS
  // ========================================

  async function loadConversations() {

    try {

      setLoading(true);

      const data =
        await getConversations();

      setConversations(data);

    } catch (error) {

      console.error(
        "Failed to load conversations:",
        error
      );

    } finally {

      setLoading(false);

    }

  }


  // ========================================
  // LOAD ON START + REFRESH
  // ========================================

  useEffect(() => {

    loadConversations();

  }, [refreshTrigger]);


  // ========================================
  // DELETE CONVERSATION
  // ========================================

  async function handleDelete(
    conversationId
  ) {

    const confirmed =
      window.confirm(
        "Delete this conversation?"
      );


    if (!confirmed) {

      return;

    }


    try {

      await deleteConversation(
        conversationId
      );


      setConversations(
        (prev) =>
          prev.filter(
            (conversation) =>
              conversation._id !==
              conversationId
          )
      );


      // If deleting currently open chat

      if (
        currentConversationId ===
        conversationId
      ) {

        onNewChat();

      }

    } catch (error) {

      console.error(
        "Failed to delete conversation:",
        error
      );

    }

  }


  // ========================================
  // UI
  // ========================================

  return (

    <aside className="sidebar">


      {/* ========================================
          LOGO
      ======================================== */}

      <div className="sidebar-logo">

        <span className="logo-symbol">
          ✦
        </span>

        <span>
          VAAS
        </span>

      </div>


      {/* ========================================
          NEW CHAT
      ======================================== */}

      <button
        className="new-chat-button"
        onClick={onNewChat}
      >

        <span>
          ＋
        </span>

        New Chat

      </button>


      {/* ========================================
          CONVERSATIONS
      ======================================== */}

      <div className="conversation-section">

        <p className="conversation-heading">
          Conversations
        </p>


        {loading ? (

          <p className="sidebar-message">
            Loading...
          </p>

        ) : conversations.length === 0 ? (

          <div className="empty-conversations">

            <div className="empty-icon">
              💬
            </div>

            <p>
              No conversations yet
            </p>

            <span>
              Start a new chat
            </span>

          </div>

        ) : (

          <div className="conversation-list">

            {conversations.map(
              (conversation) => (

                <div
                  key={
                    conversation._id
                  }

                  className={`conversation-item ${
                    currentConversationId ===
                    conversation._id
                      ? "active"
                      : ""
                  }`}
                >


                  {/* CHAT BUTTON */}

                  <button
                    className="conversation-button"
                    onClick={() =>
                      onSelectConversation(
                        conversation._id
                      )
                    }
                  >

                    <span className="chat-icon">
                      💬
                    </span>


                    <span className="conversation-title">

                      {conversation.title ||

                        conversation
                          .messages?.[0]
                          ?.content ||

                        "New Conversation"}

                    </span>

                  </button>


                  {/* DELETE BUTTON */}

                  <button
                    className="delete-button"
                    onClick={() =>
                      handleDelete(
                        conversation._id
                      )
                    }

                    title="Delete conversation"
                  >

                    🗑

                  </button>


                </div>

              )
            )}

          </div>

        )}

      </div>


    </aside>

  );

}


export default ConversationSidebar;