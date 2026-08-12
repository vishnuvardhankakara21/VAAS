import { useState } from "react"

function App() {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([])

  function handleChange(event) {
    setMessage(event.target.value)
  }

  function sendMessage() {
    if (message.trim() === "") {
      return
    }

    setMessages(prevMessages => [...prevMessages, message])
    setMessage("")
  }

  return (
    <div>
      <h1>VAAS</h1>

      <div>
        {messages.map((message, index) => (
          <p key={index}>You: {message}</p>
        ))}
      </div>

      <input
        value={message}
        onChange={handleChange}
        placeholder="Ask VAAS something..."
      />

      <button onClick={sendMessage}>
        Send
      </button>
    </div>
  )
}

export default App