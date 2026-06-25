import React, { useState, useEffect, useRef } from "react";
import logo from "/logo.png";

export default function RoomHeader({
  roomId,
  copied,
  onCopy,
  language,
  pendingLanguage,
  handleLanguageChange,
  username,
  users,
  navigate,
}) {
  const [showUsers, setShowUsers] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setShowUsers(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="room-header">
      <div className="room-left">
        <h2 className="room-title">
          <img src={logo} alt="CodeCollab" className="w-14 h-14" />
        </h2>

        <span className="room-id">
          Room:
          <button className="room-id-btn" onClick={onCopy}>
            {copied ? "Copied!" : roomId}
          </button>
        </span>

        <select
          value={pendingLanguage ?? language}
          onChange={handleLanguageChange}
          className="language-select"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
        </select>
      </div>

      <div ref={dropdownRef} className="user-dropdown-wrapper">
        <button
          className="user-profile-btn"
          onClick={() => setShowUsers(!showUsers)}
        >
          <div className="avatar-circle">
            {username.charAt(0).toUpperCase()}
          </div>

          <div className="user-info">
            <span className="user-name">{username}</span>
            <span className="user-status">Online</span>
          </div>

          <span className="dropdown-arrow">▼</span>
        </button>

        {showUsers && (
          <div className="user-dropdown-menu">
            <div className="dropdown-title">
              Participants ({users.length})
            </div>

            <div className="participants-list">
              {users.map((user) => (
                <div key={user.socketId} className="participant-card">
                  <div
                    className={
                      `participant-avatar user-color-${user.colorIndex ?? 0}`
                    }
                  >
                    {user.userName?.charAt(0)?.toUpperCase()}
                  </div>

                  <div className="participant-details">
                    <div className="participant-name">
                      {user.userName}
                      {user.userName === username && " (You)"}
                    </div>

                    <div className="participant-online">● Online</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="dropdown-actions">
              <button className="leave-btn" onClick={() => navigate("/")}>
                Leave Room
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
