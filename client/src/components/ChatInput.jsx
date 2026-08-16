function ChatInput({
  message,
  handleChange,
  sendMessage,
  isLoading
}) {
  return (
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
  )
}

export default ChatInput