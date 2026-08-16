function MessageList({ messages }) {
  return (
    <>
      {messages.length === 0 ? (
        <p>No messages yet. Start chatting with VAAS.</p>
      ) : (
        <div>
          {messages.map((message, index) => (
            <p key={index}>You: {message}</p>
          ))}
        </div>
      )}
    </>
  )
}

export default MessageList