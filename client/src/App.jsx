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
  function sendMessage(event) {
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
    setTimeout(() => {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant",
          content: "Hello! I am VAAS. How can I help you?",
        },
      ]);
      setIsLoading(false);
    }, 1500);
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
