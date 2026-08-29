function MessageList({ messages }) {
  return (
    <div>
      {messages.map((message, index) => (
        <div key={index}>
          <strong>{message.role}</strong>
          <p>{message.content}</p>
          <small>{message.timestamp}</small>
        </div>
      ))}
    </div>
  );
}

export default MessageList;