import { useState, useEffect } from "react";
import { getBackendStatus, sendChatMessage } from "./services/api";
import MessageList from "./components/MessageList";
import ChatInput from "./components/ChatInput";
import Loading from "./components/Loading";

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [previousInteractionId, setPreviousInteractionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backendMessage, setBackendMessage] = useState("");

  useEffect(() => {
    document.title = `VAAS - ${messages.length} messages`;
  }, [messages]);

  useEffect(() => {
    getBackendStatus()
      .then((data) => {
        setBackendMessage(data.message);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  function handleChange(event) {
    setMessage(event.target.value);
  }

  function clearChat() {
    setMessages([]);
    setPreviousInteractionId(null);
  }

  async function sendMessage(event) {
    event.preventDefault();

    if (message.trim() === "" || isLoading) {
      return;
    }

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        role: "user",
        content: message,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    setMessage("");
    setIsLoading(true);

    try {
      const data = await sendChatMessage(message, previousInteractionId);

      setPreviousInteractionId(data.interactionId);

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant",
          content: data.response,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (error) {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <h1>VAAS</h1>

      <MessageList messages={messages} />

      <button onClick={clearChat}>
        Clear Chat
      </button>

      {isLoading && <Loading />}

      <ChatInput
        message={message}
        handleChange={handleChange}
        sendMessage={sendMessage}
        isLoading={isLoading}
      />

      <p>{backendMessage}</p>
    </div>
  );
}

export default App;

