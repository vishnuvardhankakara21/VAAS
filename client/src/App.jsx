import { useState } from "react"

function App() {
  const [messageCount, setMessageCount] = useState(0)

  function sendMessage() {
    setMessageCount(prev => prev + 1)
  }

  return (
    <div>
      <h1>VAAS</h1>

      <p>Messages: {messageCount}</p>

      <button onClick={sendMessage}>
        Send Message
      </button>
    </div>
  )
}

export default App