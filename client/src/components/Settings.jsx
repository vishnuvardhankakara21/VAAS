import { useState } from "react";

function Settings({ user, onLogout, onClose }) {
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

  function handleThemeChange() {
    const newTheme = darkMode ? "light" : "dark";

    setDarkMode(!darkMode);

    localStorage.setItem("theme", newTheme);

    document.body.classList.toggle(
      "dark-theme",
      newTheme === "dark"
    );
  }

  return (
    <div className="settings-overlay">

      <div className="settings-panel">

        {/* HEADER */}

        <div className="settings-header">

          <div>
            <h2>Settings</h2>
            <p>Manage your VAAS preferences</p>
          </div>

          <button
            type="button"
            className="settings-close-button"
            onClick={onClose}
          >
            ×
          </button>

        </div>

        {/* PROFILE */}

        <div className="settings-section">

          <h3>Profile</h3>

          <div className="profile-card">

            <div className="profile-avatar">
              {user?.name
                ?.charAt(0)
                ?.toUpperCase() || "U"}
            </div>

            <div className="profile-info">

              <strong>
                {user?.name || "User"}
              </strong>

              <span>
                {user?.email || "No email available"}
              </span>

            </div>

          </div>

        </div>

        {/* APPEARANCE */}

        <div className="settings-section">

          <h3>Appearance</h3>

          <div className="settings-option">

            <div>

              <strong>Dark Mode</strong>

              <span>
                Use a darker appearance for VAAS
              </span>

            </div>

            <button
              type="button"
              className={`theme-toggle ${
                darkMode ? "active" : ""
              }`}
              onClick={handleThemeChange}
              aria-label="Toggle dark mode"
            >
              <span />
            </button>

          </div>

        </div>

        {/* ACCOUNT */}

        <div className="settings-section">

          <h3>Account</h3>

          <button
            type="button"
            className="settings-logout-button"
            onClick={onLogout}
          >
            Logout
          </button>

        </div>

      </div>

    </div>
  );
}

export default Settings;