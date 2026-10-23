function Settings({ user, darkMode, onToggleTheme, onLogout, onClose }) {
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div className="settings-modal">
        {/* HEADER */}
        <div className="settings-modal-header">
          <div>
            <h2>Settings</h2>
            <p>Customize your VAAS experience</p>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            id="close-settings-btn"
            onClick={onClose}
            aria-label="Close settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* PROFILE */}
        <div className="settings-section">
          <h3 className="settings-section-title">Profile</h3>
          <div className="settings-profile-card">
            <div className="settings-avatar">{userInitial}</div>
            <div className="settings-profile-info">
              <strong>{user?.name || "User"}</strong>
              <span>{user?.email || "No email available"}</span>
            </div>
          </div>
        </div>

        {/* APPEARANCE */}
        <div className="settings-section">
          <h3 className="settings-section-title">Appearance</h3>
          <div className="settings-option-row">
            <div className="settings-option-info">
              <strong>Dark Mode</strong>
              <span>{darkMode ? "Dark theme active" : "Light theme active"}</span>
            </div>

            <button
              type="button"
              className={`toggle-btn ${darkMode ? "toggle-on" : ""}`}
              id="theme-toggle-btn"
              onClick={onToggleTheme}
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              <span className="toggle-thumb" />
            </button>
          </div>
        </div>

        {/* ABOUT */}
        <div className="settings-section">
          <h3 className="settings-section-title">About</h3>
          <div className="settings-about-card">
            <div className="settings-about-logo">✦</div>
            <div>
              <strong>VAAS AI Assistant</strong>
              <span>Powered by Google Gemini</span>
            </div>
          </div>
        </div>

        {/* ACCOUNT */}
        <div className="settings-section">
          <h3 className="settings-section-title">Account</h3>
          <button
            type="button"
            className="settings-logout-btn"
            id="settings-logout-btn"
            onClick={() => {
              onClose();
              onLogout();
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out of VAAS
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;