import { useState } from "react"

function App() {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState("")

  function handleChange(event) {
    setMessage(event.target.value)
  }

  function sendMessage(event) {
    event.preventDefault()

    if (message.trim() === "" || isLoading) {
      return
    }

    setMessages(prevMessages => [...prevMessages, message])
    setMessage("")
    setIsLoading(true)

    setTimeout(() => {
      setResponse("Hello! I am VAAS. How can I help you?")
      setIsLoading(false)
    }, 1500)
  }

  return (
    <div>
      <h1>VAAS</h1>

      {messages.length === 0 ? (
        <p>No messages yet. Start chatting with VAAS.</p>
      ) : (
        <div>
          {messages.map((message, index) => (
            <p key={index}>You: {message}</p>
          ))}
        </div>
      )}

      {isLoading && <p>VAAS is thinking...</p>}

      {response && <p>VAAS: {response}</p>}

      <form onSubmit={sendMessage}>
        <input
          value={message}
          onChange={handleChange}
          placeholder="Ask VAAS something..."
        />

        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  )
}

export default App