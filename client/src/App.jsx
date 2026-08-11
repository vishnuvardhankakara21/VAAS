import { useState } from "react"

function App() {
  const [message, setMessage] = useState("")
  const [sentMessage, setSentMessage] = useState("")

  function handleChange(event) {
    setMessage(event.target.value)
  }

  function sendMessage() {
    setSentMessage(message)
    setMessage("")
  }

  return (
    <div>
      <h1>VAAS</h1>

      <input
        value={message}
        onChange={handleChange}
        placeholder="Ask VAAS something..."
      />

      <button onClick={sendMessage}>
        Send
      </button>

      <p>Currently typing: {message}</p>
      <p>Sent message: {sentMessage}</p>
    </div>
  )
}

export default App