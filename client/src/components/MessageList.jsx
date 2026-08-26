function MessageList({ messages }) {
  return (
    <>
      {messages.length === 0 ? (
        <p>No messages yet. Start chatting with VAAS.</p>
      ) : (
        <div>
          {messages.map((message, index) => (
            <p key={index}>
              {message.role === "user" ? "You" : "VAAS"}: {message.content}
            </p>
          ))}
        </div>
      )}
    </>
  );
}

export default MessageList;
