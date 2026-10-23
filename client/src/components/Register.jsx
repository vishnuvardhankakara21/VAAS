import { useState, useMemo, useEffect, useRef } from "react";
import { registerUser, signInWithGoogle } from "../services/api";

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "", color: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Very weak", color: "#ef4444" };
  if (score === 2) return { score, label: "Weak", color: "#f97316" };
  if (score === 3) return { score, label: "Fair", color: "#eab308" };
  if (score === 4) return { score, label: "Strong", color: "#22c55e" };
  return { score, label: "Very strong", color: "#10b981" };
}

function Register({ onRegister, onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const googleBtnRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const hasGoogleClientId = Boolean(googleClientId && googleClientId.trim());

  const strength = useMemo(() => getPasswordStrength(password), [password]);

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
                onRegister(data.user);
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
            text: "signup_with",
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
  }, [hasGoogleClientId, googleClientId, onRegister]);

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

    if (!name.trim() || name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }

    if (name.trim().length > 50) {
      setError("Name must be 50 characters or less");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const atIndex = cleanEmail.lastIndexOf("@");
    const emailDomain = cleanEmail.slice(atIndex + 1);

    // Allowlist of trusted email providers (must match server-side list)
    const ALLOWED_DOMAINS = new Set([
      // Google
      "gmail.com", "googlemail.com",
      // Microsoft
      "outlook.com", "hotmail.com", "hotmail.co.uk", "hotmail.fr", "hotmail.de",
      "hotmail.it", "hotmail.es", "live.com", "live.co.uk", "live.fr", "live.de",
      "live.in", "live.nl", "live.be", "live.ca", "live.com.au", "live.com.ar",
      "msn.com", "passport.com",
      // Yahoo
      "yahoo.com", "yahoo.co.uk", "yahoo.co.in", "yahoo.fr", "yahoo.de",
      "yahoo.es", "yahoo.it", "yahoo.ca", "yahoo.com.au", "yahoo.com.ar",
      "yahoo.com.br", "yahoo.gr", "yahoo.ro", "yahoo.com.mx", "yahoo.com.ph",
      "ymail.com",
      // Apple
      "icloud.com", "me.com", "mac.com",
      // ProtonMail
      "proton.me", "protonmail.com", "protonmail.ch", "pm.me",
      // Tutanota
      "tutanota.com", "tutanota.de", "tutamail.com", "tuta.io",
      // AOL
      "aol.com", "aol.co.uk", "aim.com",
      // Zoho
      "zoho.com", "zohomail.com",
      // GMX / Mail.com
      "gmx.com", "gmx.net", "gmx.de", "gmx.at", "gmx.ch", "mail.com", "web.de",
      // India
      "rediffmail.com",
      // Russia / Eastern Europe
      "mail.ru", "yandex.ru", "yandex.com", "yandex.ua", "yandex.by",
      "yandex.kz", "bk.ru", "list.ru", "inbox.ru", "rambler.ru",
      // Brazil
      "bol.com.br", "uol.com.br", "terra.com.br",
      // Germany
      "t-online.de", "freenet.de", "arcor.de",
      // France
      "laposte.net", "sfr.fr", "wanadoo.fr", "orange.fr", "free.fr",
      // Italy
      "libero.it", "virgilio.it", "tin.it",
      // Spain
      "telefonica.net",
      // China
      "qq.com", "163.com", "126.com", "sina.com", "sina.cn", "sohu.com", "aliyun.com",
      // Japan
      "docomo.ne.jp", "softbank.ne.jp", "au.com",
      // UK ISPs
      "btinternet.com", "sky.com", "virginmedia.com", "talktalk.net",
      // Other well-known
      "fastmail.com", "fastmail.fm", "hushmail.com", "disroot.org",
      "riseup.net", "posteo.de", "mailfence.com",
    ]);

    if (!cleanEmail || !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(cleanEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!ALLOWED_DOMAINS.has(emailDomain)) {
      setError(
        `Only emails from trusted providers are accepted (e.g. Gmail, Outlook, Yahoo, iCloud, ProtonMail). '@${emailDomain}' is not allowed.`
      );
      return;
    }

    // Gmail username length rule
    if ((emailDomain === "gmail.com" || emailDomain === "googlemail.com") && cleanEmail.split("@")[0].length < 6) {
      setError("Gmail usernames must be between 6 and 30 characters.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password.length > 128) {
      setError("Password must be 128 characters or less");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const data = await registerUser(name.trim(), email.trim(), password);

      localStorage.setItem("token", data.token);
      localStorage.setItem("tokenExpiry", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
      localStorage.setItem("user", JSON.stringify(data.user));

      onRegister(data.user);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      {/* Logo */}
      <div className="auth-logo">
        <div className="auth-logo-icon">✦</div>
        <span className="auth-logo-text">VAAS</span>
      </div>

      <h1 className="auth-title">Create account</h1>
      <p className="auth-subtitle">Join VAAS and start chatting with AI</p>

      {/* Google Sign In Button — only shown when Client ID is configured */}
      {hasGoogleClientId && (
        <>
          <div className="google-btn-wrapper">
            <div ref={googleBtnRef} className="google-btn-container" id="google-register-btn-container" />
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
            <span className="auth-divider-text">or register with email</span>
            <span className="auth-divider-line" />
          </div>
        </>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {/* Name */}
        <div className="auth-field">
          <label className="auth-label" htmlFor="register-name">Full name</label>
          <div className="auth-input-wrapper">
            <span className="auth-input-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
            <input
              id="register-name"
              type="text"
              className="auth-input"
              placeholder="Your full name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              disabled={loading}
              autoComplete="name"
              autoFocus
            />
          </div>
        </div>

        {/* Email */}
        <div className="auth-field">
          <label className="auth-label" htmlFor="register-email">Email address</label>
          <div className="auth-input-wrapper">
            <span className="auth-input-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </span>
            <input
              id="register-email"
              type="email"
              className="auth-input"
              placeholder="your.name@gmail.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              disabled={loading}
              autoComplete="email"
            />
          </div>
        </div>

        {/* Password */}
        <div className="auth-field">
          <label className="auth-label" htmlFor="register-password">Password</label>
          <div className="auth-input-wrapper">
            <span className="auth-input-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              className="auth-input"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              disabled={loading}
              autoComplete="new-password"
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

          {/* Password Strength Meter */}
          {password && (
            <div className="password-strength">
              <div className="strength-bars">
                {[1, 2, 3, 4, 5].map((bar) => (
                  <div
                    key={bar}
                    className="strength-bar"
                    style={{
                      background: bar <= strength.score ? strength.color : "rgba(255,255,255,0.1)",
                    }}
                  />
                ))}
              </div>
              <span className="strength-label" style={{ color: strength.color }}>
                {strength.label}
              </span>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="auth-field">
          <label className="auth-label" htmlFor="register-confirm-password">Confirm password</label>
          <div className="auth-input-wrapper">
            <span className="auth-input-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4"/>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input
              id="register-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              className={`auth-input ${confirmPassword && password !== confirmPassword ? "auth-input-error" : confirmPassword && password === confirmPassword ? "auth-input-success" : ""}`}
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
              disabled={loading}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="auth-eye-button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showConfirmPassword ? (
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
          id="register-submit-btn"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="auth-spinner" />
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <div className="auth-switch">
        <span>Already have an account?</span>
        <button
          type="button"
          className="auth-switch-button"
          id="switch-to-login-btn"
          onClick={onSwitchToLogin}
        >
          Sign in
        </button>
      </div>
    </div>
  );
}

export default Register;
