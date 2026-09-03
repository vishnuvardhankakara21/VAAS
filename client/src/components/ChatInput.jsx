import { useEffect, useRef } from "react";


function ChatInput({
  message,
  handleChange,
  sendMessage,
  isLoading,
}) {

  const textareaRef =
    useRef(null);


  // ========================================
  // AUTO RESIZE TEXTAREA
  // ========================================

  useEffect(() => {

    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";

    textarea.style.height =
      Math.min(
        textarea.scrollHeight,
        180
      ) + "px";

  }, [message]);


  // ========================================
  // KEYBOARD HANDLER
  // ========================================

  function handleKeyDown(event) {

    // Enter without Shift = Send

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      if (
        message.trim() !== "" &&
        !isLoading
      ) {

        sendMessage(event);

      }

    }

    // Shift + Enter = normal newline

  }


  return (

    <div className="chat-input-container">

      <form
        className="chat-input-form"
        onSubmit={sendMessage}
      >

        <textarea
          ref={textareaRef}

          className="chat-textarea"

          value={message}

          onChange={handleChange}

          onKeyDown={handleKeyDown}

          placeholder={
            isLoading
              ? "VAAS is thinking..."
              : "Message VAAS..."
          }

          disabled={isLoading}

          rows={1}
        />


        <button
          type="submit"

          className="send-button"

          disabled={
            isLoading ||
            message.trim() === ""
          }

          title="Send message"
        >

          {isLoading ? (
            <span className="send-loading">
              ...
            </span>
          ) : (
            <span>
              ↑
            </span>
          )}

        </button>

      </form>


      <p className="input-hint">

        Enter to send • Shift + Enter for new line

      </p>

    </div>

  );

}


export default ChatInput;