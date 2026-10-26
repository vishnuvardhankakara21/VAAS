import { useState, useEffect, useRef } from "react";
import { loginUser, signInWithGoogle } from "../services/api";
import VaasLogo from "./VaasLogo";

function Login({ onLogin, onSwitchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const googleBtnRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const hasGoogleClientId = Boolean(googleClientId && googleClientId.trim());

  // Initialize official Google Identity Services button if Client ID is configured
  useEffect(() => {
    if (!hasGoogleClientId) return;

    let intervalId = null;

    const setupGoogle = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId.trim(),
            callback: async (response) => {
              if (!response?.credential) {
                setError("Google did not return a valid credential");
                return;
              }

              setGoogleLoading(true);
              setError("");

              try {
                const data = await signInWithGoogle(response.credential);
                localStorage.setItem("token", data.token);
                localStorage.setItem("tokenExpiry", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
                localStorage.setItem("user", JSON.stringify(data.user));
                onLogin(data.user);
              } catch (err) {
                setError(err.message || "Google authentication failed");
              } finally {
                setGoogleLoading(false);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          googleBtnRef.current.innerHTML = "";
          const btnWidth = Math.min(Math.max(googleBtnRef.current.offsetWidth || 340, 240), 400);
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "outline",
            size: "large",
            type: "standard",
            text: "signin_with",
            shape: "rectangular",
            logo_alignment: "left",
            width: btnWidth,
          });

          if (intervalId) clearInterval(intervalId);
        } catch (err) {
          console.warn("Google initialization error:", err);
        }
      }
    };

    if (window.google?.accounts?.id) {
      setupGoogle();
    } else {
      intervalId = setInterval(() => {
        if (window.google?.accounts?.id) {
          setupGoogle();
        }
      }, 250);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [hasGoogleClientId, googleClientId, onLogin]);

  async function handleGoogleSignInFallback() {
    setError("");

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
      } catch (err) {
        console.warn("Google prompt error:", err);
      }
    } else {
      setError("Google Sign-In is unavailable right now. Please try again in a moment or use email/password.");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);

    try {
      const data = await loginUser(email.trim(), password);

      localStorage.setItem("token", data.token);
      localStorage.setItem("tokenExpiry", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
      localStorage.setItem("user", JSON.stringify(data.user));

      onLogin(data.user);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      {/* Logo */}
      <div className="auth-logo">
        <div className="auth-logo-icon">
          <VaasLogo size={22} />
        </div>
        <span className="auth-logo-text">VAAS</span>
      </div>

      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-subtitle">Sign in to your VAAS account</p>

      {/* Google Sign In Button — only shown when Client ID is configured */}
      {hasGoogleClientId && (
        <>
          <div className="google-btn-wrapper">
            <div ref={googleBtnRef} className="google-btn-container" id="google-login-btn-container" />
            {googleLoading && (
              <div className="google-btn-loading">
                <span className="auth-spinner" />
                <span>Verifying Google account...</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="auth-divider">
            <span className="auth-divider-line" />
            <span className="auth-divider-text">or continue with email</span>
            <span className="auth-divider-line" />
          </div>
        </>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {/* Email */}
        <div className="auth-field">
          <label className="auth-label" htmlFor="login-email">Email Address</label>
          <div className="auth-input-wrapper">
            <span className="auth-input-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </span>
            <input
              id="login-email"
              type="email"
              className="auth-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              disabled={loading || googleLoading}
              autoComplete="email"
            />
          </div>
        </div>

        {/* Password */}
        <div className="auth-field">
          <label className="auth-label" htmlFor="login-password">Password</label>
          <div className="auth-input-wrapper">
            <span className="auth-input-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              className="auth-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              disabled={loading || googleLoading}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="auth-eye-button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="auth-error" role="alert">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="auth-submit-button"
          id="login-submit-btn"
          disabled={loading || googleLoading}
        >
          {loading ? (
            <>
              <span className="auth-spinner" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <div className="auth-switch">
        <span>Don&apos;t have an account?</span>
        <button
          type="button"
          className="auth-switch-button"
          id="switch-to-register-btn"
          onClick={onSwitchToRegister}
        >
          Create account
        </button>
      </div>
    </div>
  );
}

export default Login;
