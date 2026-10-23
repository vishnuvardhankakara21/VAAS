import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import oneLight from "react-syntax-highlighter/dist/esm/styles/prism/one-light.js";

let codeBlockCounter = 0;

function MessageContent({ content, darkMode }) {
  const [copiedId, setCopiedId] = useState(null);

  // Fallback to checking DOM theme if prop is not explicitly passed
  const isDark = darkMode !== undefined
    ? Boolean(darkMode)
    : typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") !== "light";

  async function handleCopy(text, id) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }

  return (
    <div className="message-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const code = String(children).replace(/\n$/, "");
            const id = `code-${++codeBlockCounter}`;

            if (!inline && match) {
              return (
                <div className="code-block">
                  <div className="code-header">
                    <div className="code-header-left">
                      <span className="code-lang-dot" />
                      <span className="code-lang">{match[1]}</span>
                    </div>
                    <button
                      type="button"
                      className={`copy-code-btn ${copiedId === id ? "copied" : ""}`}
                      onClick={() => handleCopy(code, id)}
                      aria-label={copiedId === id ? "Copied!" : "Copy code"}
                    >
                      {copiedId === id ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <SyntaxHighlighter
                    style={isDark ? oneDark : oneLight}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      borderRadius: 0,
                      fontSize: "13px",
                      lineHeight: "1.6",
                      background: isDark ? "rgba(10, 10, 20, 0.8)" : "#f8fafc",
                    }}
                    {...props}
                  >
                    {code}
                  </SyntaxHighlighter>
                </div>
              );
            }

            return (
              <code className={`inline-code ${className || ""}`} {...props}>
                {children}
              </code>
            );
          },

          // Links open in new tab
          a({ node, ...props }) {
            return (
              <a {...props} target="_blank" rel="noopener noreferrer" className="md-link" />
            );
          },

          // Tables
          table({ node, ...props }) {
            return (
              <div className="md-table-wrapper">
                <table {...props} className="md-table" />
              </div>
            );
          },

          // Blockquotes
          blockquote({ node, ...props }) {
            return <blockquote className="md-blockquote" {...props} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MessageContent;