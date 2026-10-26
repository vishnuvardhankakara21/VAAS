import { useState, useRef, useEffect } from "react";
import { generateImage } from "../services/api";
import VaasLogo from "./VaasLogo";

const AVAILABLE_MODELS = [
  {
    id: "flux",
    name: "FLUX.1 Schnell",
    badge: "Midjourney Quality",
    desc: "State-of-the-art open model with photorealistic fidelity and prompt adherence.",
    icon: "🌟",
  },
  {
    id: "flux-realism",
    name: "FLUX Photorealism",
    badge: "Hyperrealism",
    desc: "Engineered for photographic textures, cinematic lighting, and realistic portraits.",
    icon: "📸",
  },
  {
    id: "flux-3d",
    name: "FLUX 3D & CGI",
    badge: "3D Render",
    desc: "Specialized for isometric assets, 3D characters, and stylized CGI environments.",
    icon: "🔮",
  },
  {
    id: "flux-anime",
    name: "FLUX Anime & Art",
    badge: "Illustration",
    desc: "Vibrant anime art, digital painting, and dynamic stylized character illustrations.",
    icon: "🎨",
  },
  {
    id: "turbo",
    name: "FLUX Turbo",
    badge: "Fastest",
    desc: "Ultra-fast generation optimized for rapid concept iterations and quick previews.",
    icon: "⚡",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    badge: "Multimodal AI",
    desc: "Google AI Studio multimodal image generation with automatic FLUX fallback.",
    icon: "💎",
  },
];

const PROMPT_SUGGESTIONS = [
  {
    icon: "🌌",
    label: "Cosmic Odyssey",
    prompt: "An astronaut floating in deep space reaching towards a swirling nebula of liquid crystal and purple starlight, hyperrealistic cinematic lighting.",
  },
  {
    icon: "🏙️",
    label: "Cyberpunk Tokyo",
    prompt: "A rainy neon-lit alleyway in futuristic Tokyo, glowing holographic signs reflecting on wet asphalt, volumetric mist and cinematic depth of field.",
  },
  {
    icon: "🌿",
    label: "Solarpunk Haven",
    prompt: "A lush solarpunk greenhouse tower overlooking a serene azure ocean, sleek white architecture integrated with blooming tropical flora, soft morning sunlight.",
  },
  {
    icon: "🔮",
    label: "Crystal Artifact",
    prompt: "An ancient glowing arcane crystal hovering above an ornate stone pedestal, emitting intricate violet fractal runes, ethereal studio render.",
  },
  {
    icon: "🦊",
    label: "Origami Spirit",
    prompt: "A majestic geometric origami fox standing in a misty bamboo forest at twilight, glowing pastel edges, whimsical modern digital art.",
  },
  {
    icon: "☕",
    label: "Cozy Loft",
    prompt: "A warm aesthetic loft apartment during a heavy snowfall outside, steaming mug of coffee on a wooden desk, fairy lights, warm ambient glow.",
  },
];

export default function ImageGenerator({ onBackToChat }) {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("flux");
  const [loading, setLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [error, setError] = useState(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const textareaRef = useRef(null);
  const previewRef = useRef(null);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [prompt]);

  async function handleGenerate(e) {
    if (e) e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || loading) return;

    setLoading(true);
    setError(null);
    setDownloadSuccess(false);

    try {
      // 1. Attempt backend generation
      try {
        const data = await generateImage(cleanPrompt, selectedModel);
        if (data && data.image) {
          setGeneratedResult({
            image: data.image,
            mimeType: data.mimeType || "image/jpeg",
            prompt: cleanPrompt,
            model: data.model || selectedModel,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          });

          setTimeout(() => {
            previewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }, 100);
          return;
        }
      } catch (backendErr) {
        // 2. If backend is rate-limited (e.g. 429), attempt client-side generation via Puter.js if available
        if (window.puter?.ai?.txt2img) {
          console.warn("Backend rate limit encountered. Falling back to in-browser generation via Puter.js...");
          const imgElem = await window.puter.ai.txt2img(cleanPrompt);
          if (imgElem && imgElem.src) {
            let base64 = "";
            let mimeType = "image/png";

            if (imgElem.src.startsWith("data:")) {
              const [header, data] = imgElem.src.split(",");
              base64 = data;
              mimeType = header.match(/:(.*?);/)?.[1] || "image/png";
            } else {
              const res = await fetch(imgElem.src);
              const blob = await res.blob();
              const reader = new FileReader();
              base64 = await new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result.split(",")[1]);
                reader.readAsDataURL(blob);
              });
              mimeType = blob.type || "image/png";
            }

            setGeneratedResult({
              image: base64,
              mimeType,
              prompt: cleanPrompt,
              model: "FLUX.1 (Direct Client)",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            });

            setTimeout(() => {
              previewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }, 100);
            return;
          }
        }
        throw backendErr;
      }
    } catch (err) {
      console.error("Image generation failed:", err);
      setError(err.message || "Failed to generate image. Please try again in a few moments.");
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!generatedResult || !generatedResult.image) return;

    try {
      const byteCharacters = atob(generatedResult.image);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: generatedResult.mimeType });
      const objectUrl = URL.createObjectURL(blob);

      const ext = generatedResult.mimeType.includes("jpeg") || generatedResult.mimeType.includes("jpg") ? "jpg" : "png";
      const sanitizedFilename = `vaas-${Date.now()}.${ext}`;

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = sanitizedFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up object URL
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error("Download failed:", err);
      setError("Failed to download image. You can right-click the image and select 'Save Image As...'.");
    }
  }

  function handleCopyPrompt() {
    const textToCopy = generatedResult?.prompt || prompt;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    });
  }

  function handleSelectSuggestion(suggestionPrompt) {
    setPrompt(suggestionPrompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (prompt.trim() && !loading) {
        handleGenerate();
      }
    }
  }

  const isPromptEmpty = !prompt.trim();

  return (
    <div className="image-studio-container" id="image-generator-page">
      {/* Top Banner */}
      <div className="image-studio-header">
        <div className="image-studio-title-block">
          <div className="image-studio-badge">
            <span className="badge-sparkle">
              <VaasLogo size={12} />
            </span>
            <span>AI Image Studio</span>
          </div>
          <h2 className="image-studio-heading">Transform Words into Visuals</h2>
          <p className="image-studio-subheading">
            Powered by <strong>FLUX.1</strong> and <strong>Google Gemini</strong>. Choose your model, describe your vision, and generate studio-grade art.
          </p>
        </div>

        {onBackToChat && (
          <button
            type="button"
            className="image-studio-back-btn"
            onClick={onBackToChat}
            title="Return to Chat"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Back to Chat</span>
          </button>
        )}
      </div>

      {/* Main Studio Grid */}
      <div className="image-studio-content">
        {/* Left Column: Creator Controls */}
        <div className="image-studio-controls">
          <form className="image-prompt-form" onSubmit={handleGenerate}>

            {/* Model & Style Selector */}
            <div className="model-selector-panel">
              <div className="model-selector-header">
                <span className="model-selector-title">AI Engine & Style</span>
                <span className="model-selector-indicator">
                  Active: {AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name}
                </span>
              </div>

              <div className="model-chips-row">
                {AVAILABLE_MODELS.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    className={`model-chip ${selectedModel === model.id ? "active" : ""}`}
                    onClick={() => setSelectedModel(model.id)}
                    disabled={loading}
                    title={model.desc}
                  >
                    <span className="model-chip-icon">{model.icon}</span>
                    <div className="model-chip-info">
                      <span className="model-chip-name">{model.name}</span>
                      <span className="model-chip-badge">{model.badge}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Textarea Panel */}
            <div className="image-input-panel">
              <div className="image-input-header">
                <label htmlFor="image-prompt-input" className="image-input-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9"/>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                  <span>Prompt Description</span>
                </label>
                <span className={`image-char-counter ${prompt.length > 1800 ? "warn" : ""}`}>
                  {prompt.length} / 2000
                </span>
              </div>

              <textarea
                id="image-prompt-input"
                ref={textareaRef}
                className="image-prompt-textarea"
                placeholder="Describe your scene in detail (e.g. lighting, perspective, colors, atmosphere, art style)..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
                onKeyDown={handleKeyDown}
                rows={4}
                disabled={loading}
                aria-label="Image prompt input"
              />

              <div className="image-input-footer">
                <span className="image-input-hint">
                  Press <kbd>Enter</kbd> to generate &nbsp;·&nbsp; <kbd>Shift+Enter</kbd> for new line
                </span>

                {prompt && (
                  <button
                    type="button"
                    className="image-clear-btn"
                    onClick={() => setPrompt("")}
                    disabled={loading}
                    title="Clear prompt"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="image-studio-error" role="alert">
                <div className="error-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <div className="error-body">
                  <span className="error-title">Notice</span>
                  <p className="error-text">{error}</p>
                </div>
                <button
                  type="button"
                  className="error-dismiss"
                  onClick={() => setError(null)}
                  aria-label="Dismiss error"
                >
                  ×
                </button>
              </div>
            )}

            {/* Submit Action Button */}
            <button
              type="submit"
              className={`image-generate-btn ${!isPromptEmpty && !loading ? "ready" : ""}`}
              id="generate-image-btn"
              disabled={isPromptEmpty || loading}
            >
              {loading ? (
                <>
                  <span className="image-spinner" />
                  <span>Synthesizing Image...</span>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <span>Generate with {AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name}</span>
                </>
              )}
            </button>
          </form>

          {/* Prompt Suggestions */}
          <div className="image-suggestions-section">
            <div className="suggestions-header">
              <span className="suggestions-icon">✨</span>
              <span className="suggestions-title">Inspiration & Examples</span>
            </div>
            <div className="image-suggestions-list">
              {PROMPT_SUGGESTIONS.map((s, index) => (
                <button
                  key={index}
                  type="button"
                  className="image-suggestion-card"
                  onClick={() => handleSelectSuggestion(s.prompt)}
                  disabled={loading}
                >
                  <div className="suggestion-card-top">
                    <span className="suggestion-card-icon">{s.icon}</span>
                    <span className="suggestion-card-label">{s.label}</span>
                  </div>
                  <p className="suggestion-card-text">{s.prompt}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Preview Area */}
        <div className="image-studio-preview-wrapper" ref={previewRef}>
          <div className="preview-card">
            <div className="preview-card-header">
              <div className="preview-card-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span>Canvas Preview</span>
              </div>

              {generatedResult && (
                <div className="preview-card-meta">
                  <span className="meta-tag">{generatedResult.model}</span>
                  <span className="meta-time">{generatedResult.timestamp}</span>
                </div>
              )}
            </div>

            <div className="preview-canvas-area">
              {/* State 1: Loading */}
              {loading && (
                <div className="preview-loading-state" id="image-loading-indicator">
                  <div className="loading-animation-wrapper">
                    <div className="pulsing-portal">
                      <div className="portal-ring ring-1" />
                      <div className="portal-ring ring-2" />
                      <div className="portal-ring ring-3" />
                      <div className="portal-core">
                        <VaasLogo size={18} />
                      </div>
                    </div>
                  </div>
                  <div className="loading-text-group">
                    <h3 className="loading-title">Generating your visual</h3>
                    <p className="loading-desc">
                      Synthesizing details with {AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name}... Rendering pixels and optimizing composition.
                    </p>
                  </div>
                </div>
              )}

              {/* State 2: Generated Image */}
              {!loading && generatedResult && (
                <div className="preview-result-container">
                  <div className="image-frame">
                    <img
                      src={`data:${generatedResult.mimeType};base64,${generatedResult.image}`}
                      alt={generatedResult.prompt}
                      className="generated-image"
                      id="generated-preview-image"
                    />
                  </div>

                  <div className="preview-footer-bar">
                    <div className="preview-prompt-display" title={generatedResult.prompt}>
                      <span className="prompt-label">Prompt:</span>
                      <span className="prompt-text">{generatedResult.prompt}</span>
                    </div>

                    <div className="preview-actions-group">
                      <button
                        type="button"
                        className={`preview-action-btn ${copiedPrompt ? "success" : ""}`}
                        onClick={handleCopyPrompt}
                        title="Copy prompt text"
                      >
                        {copiedPrompt ? (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                            <span>Copy Prompt</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className={`preview-action-btn download-btn ${downloadSuccess ? "success" : ""}`}
                        id="download-image-btn"
                        onClick={handleDownload}
                        title="Download high-resolution image"
                      >
                        {downloadSuccess ? (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            <span>Saved!</span>
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                              <polyline points="7 10 12 15 17 10"/>
                              <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            <span>Download Image</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* State 3: Empty Placeholder */}
              {!loading && !generatedResult && (
                <div className="preview-empty-state">
                  <div className="empty-icon-shield">
                    <div className="empty-sparkle">
                      <VaasLogo size={12} />
                    </div>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <rect x="3" y="3" width="18" height="18" rx="3" ry="3"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                  <h3 className="empty-title">Your Canvas Awaits</h3>
                  <p className="empty-description">
                    Select a model style, enter a prompt, or click an inspiration chip to generate Midjourney-grade imagery.
                  </p>
                  <div className="empty-features">
                    <span className="feature-pill">🌟 FLUX.1 (Midjourney Quality)</span>
                    <span className="feature-pill">📸 Photorealism</span>
                    <span className="feature-pill">🎨 Anime & 3D</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
