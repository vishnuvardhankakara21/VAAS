import { useState } from "react";
import MessageList from "./components/MessageList";
import ChatInput from "./components/ChatInput";
import Loading from "./components/Loading"
function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState("");

  function handleChange(event) {
    setMessage(event.target.value);
  }

  function sendMessage(event) {
    event.preventDefault();

    if (message.trim() === "" || isLoading) {
      return;
    }

    setMessages((prevMessages) => [...prevMessages, message]);
    setMessage("");
    setIsLoading(true);

    setTimeout(() => {
      setResponse("Hello! I am VAAS. How can I help you?");
      setIsLoading(false);
    }, 1500);
  }

  return (
    <div>
      <h1>VAAS</h1>
      <MessageList messages={messages} />
      {isLoading && <Loading />}
      {response && <p>VAAS: {response}</p>}
      <ChatInput
        message={message}
        handleChange={handleChange}
        sendMessage={sendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}

export default App;
