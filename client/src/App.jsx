import { useState, useEffect } from "react";
import MessageList from "./components/MessageList";
import ChatInput from "./components/ChatInput";
import Loading from "./components/Loading";
function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [backendMessage, setBackendMessage] = useState("");
  useEffect(() => {
    document.title = `VAAS - ${messages.length} messages`;
  }, [messages]);
  useEffect(() => {
    fetch("http://localhost:5000/api/status")
      .then((response) => response.json())
      .then((data) => {
        setBackendMessage(data.message);
      });
  }, []);

  function handleChange(event) {
    setMessage(event.target.value);
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
      },
    ]);

    setMessage("");
    setIsLoading(true);
    try {
      // fetch POST request here
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
        }),
      });
      // check response.ok
      if (!response.ok) {
        throw new Error("Failed to get response");
      }
      // convert response to JSON
      const data = await response.json();
      // add assistant response
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant",
          content: data.response,
        },
      ]);
    } catch (error) {
      // add an assistant error message
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
