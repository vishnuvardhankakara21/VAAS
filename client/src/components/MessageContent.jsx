import { useState } from "react";

import ReactMarkdown from "react-markdown";

import remarkGfm from "remark-gfm";

import {
  Prism as SyntaxHighlighter,
} from "react-syntax-highlighter";

import {
  oneDark,
} from "react-syntax-highlighter/dist/esm/styles/prism";


function MessageContent({
  content,
  showCopy = false,
}) {

  const [copiedCode, setCopiedCode] =
    useState(null);

  const [copiedResponse, setCopiedResponse] =
    useState(false);


  // ========================================
  // COPY CODE
  // ========================================

  async function handleCopyCode(
    code,
    index
  ) {

    try {

      await navigator.clipboard.writeText(
        code
      );

      setCopiedCode(index);

      setTimeout(() => {

        setCopiedCode(null);

      }, 2000);

    } catch (error) {

      console.error(
        "Failed to copy code:",
        error
      );

    }

  }


  // ========================================
  // COPY ENTIRE RESPONSE
  // ========================================

  async function handleCopyResponse() {

    try {

      await navigator.clipboard.writeText(
        content
      );

      setCopiedResponse(true);

      setTimeout(() => {

        setCopiedResponse(false);

      }, 2000);

    } catch (error) {

      console.error(
        "Failed to copy response:",
        error
      );

    }

  }


  return (

    <div className="message-markdown">

      {/* ==================================
          MARKDOWN CONTENT
      ================================== */}

      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{

          // ==================================
          // CODE
          // ==================================

          code({
            node,
            inline,
            className,
            children,
            ...props
          }) {

            const match =
              /language-(\w+)/.exec(
                className || ""
              );

            const code =
              String(children)
                .replace(/\n$/, "");

            const codeIndex =
              node?.position?.start?.line ||
              Math.random();


            // ==================================
            // CODE BLOCK
            // ==================================

            if (
              !inline &&
              match
            ) {

              return (

                <div className="code-block">

                  <div className="code-header">

                    <span>
                      {match[1]}
                    </span>

                    <button
                      type="button"
                      className="copy-code-button"
                      onClick={() =>
                        handleCopyCode(
                          code,
                          codeIndex
                        )
                      }
                    >
                      {copiedCode === codeIndex
                        ? "Copied!"
                        : "Copy"}
                    </button>

                  </div>


                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {code}
                  </SyntaxHighlighter>

                </div>

              );

            }


            // ==================================
            // INLINE CODE
            // ==================================

            return (

              <code
                className={className}
                {...props}
              >
                {children}
              </code>

            );

          },


          // ==================================
          // LINKS
          // ==================================

          a({
            node,
            ...props
          }) {

            return (

              <a
                {...props}
                target="_blank"
                rel="noopener noreferrer"
              />

            );

          },

        }}
      >

        {content}

      </ReactMarkdown>


      {/* ==================================
          RESPONSE ACTIONS
      ================================== */}

      {showCopy && (

        <div className="message-actions">

          <button
            type="button"
            className="copy-response-button"
            onClick={
              handleCopyResponse
            }
            title="Copy response"
          >

            {copiedResponse
              ? "✓ Copied"
              : "⧉ Copy"}

          </button>

        </div>

      )}

    </div>

  );

}


export default MessageContent;