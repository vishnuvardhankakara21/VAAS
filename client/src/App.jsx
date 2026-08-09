import './App.css'

function Message({ sender, text }) {
  return (
    <div>
      <h3>{sender}</h3>
      <p>{text}</p>
    </div>
  )
}

function App() {
  return (
    <div>
      <h1>VAAS</h1>
      <p>Virtual AI Assistant System</p>

      <Message
        sender="Vishnu"
        text="Explain binary search"
      />

      <Message
        sender="VAAS"
        text="Binary search works on a sorted array."
      />

      <Message
        sender="Vishnu"
        text="Give me an example."
      />

      <Message
        sender="VAAS"
        text="Sure! Let's take a sorted array."
      />
    </div>
  )
}

export default App