import ReactMarkdown from "react-markdown";
function MessageList({ messages }) {
  return (
    <div>
      {messages.map((message, index) => (
        <div key={index}>
          <strong>{message.role}</strong>
          <div className="markdown-content">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
          <small>{message.timestamp}</small>
        </div>
      ))}
    </div>
  );
}

export default MessageList;
