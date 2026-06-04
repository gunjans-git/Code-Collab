import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { io } from "socket.io-client";
import "./Room.css";

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const socketRef = useRef(null);
  const editorRef = useRef(null);
  const dropdownRef = useRef(null);

  const monacoRef = useRef(null);
  const decorationsRef = useRef({});
  const isRemoteUpdateRef = useRef(false);

  const username =
    localStorage.getItem("username") || "Anonymous";

  const [users, setUsers] = useState([]);
  const [showUsers, setShowUsers] = useState(false);

  const [language, setLanguage] = useState(
    localStorage.getItem("editor-language") ||
    "javascript"
  );

const cursorColors = [
  "#ef4444", // red
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#a855f7", // purple
  "#ec4899", // pink
];

  useEffect(() => {
    const socket = io("http://localhost:3000");

    socketRef.current = socket;

    socket.emit("join-room", {
      roomId,
      userName: username,
    });

    socket.on("code-update", ({ code }) => {
      if (!editorRef.current) return;

      const currentCode =
        editorRef.current.getValue();

      if (currentCode !== code) {
        isRemoteUpdateRef.current = true;
        editorRef.current.setValue(code);
      }
    });

    socket.on("users-updated", (userList) => {
      setUsers(userList);
    });

    socket.on("user-left", (socketId) => {
      if (
        decorationsRef.current[socketId]
      ) {
        editorRef.current.deltaDecorations(
          decorationsRef.current[socketId],
          []
        );

        delete decorationsRef.current[
          socketId
        ];
      }
    });

    socket.on("room-error", (data) => {
      console.log("ROOM ERROR:", data);
    });

    socket.on("cursor-update",
      ({ cursor, userName, senderId }) => {
        if (!editorRef.current || !monacoRef.current || senderId === socketRef.current?.id)
          return;

        const color = cursorColors[ senderId.length % cursorColors.length];

        const styleId = `cursor-style-${senderId}`;

        if (!document.getElementById(styleId)) {
          const style =
            document.createElement("style");

          style.id = styleId;

          style.innerHTML = `
            .remote-cursor-${senderId} {
              border-left: 3px solid ${color};
            }
          `;

          document.head.appendChild(style);
        }

        const decoration = {
          range: new monacoRef.current.Range(
            cursor.lineNumber,
            cursor.column,
            cursor.lineNumber,
            cursor.column
          ),

          options: {
            className: "remote-cursor",
            afterContentClassName: "remote-cursor-label",
            hoverMessage: {
              value: userName,
            },
          },
        };

        decorationsRef.current[senderId] =
          editorRef.current.deltaDecorations(
            decorationsRef.current[senderId] || [],
            [decoration]
          );
      }
    );

    return () => {
      socket.disconnect();
    };
  }, [roomId, username]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target
        )
      ) {
        setShowUsers(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);



  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Send cursor position
    editor.onDidChangeCursorPosition((e) => {
      socketRef.current?.emit("cursor-move", {
        roomId,
        cursor: {
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        },
      });
    });

    // Send code changes
    editor.onDidChangeModelContent(() => {
      if (isRemoteUpdateRef.current) {
        isRemoteUpdateRef.current = false;
        return;
      }

      const code = editor.getValue();

      socketRef.current?.emit("code-change", {
        roomId,
        code,
      });
    });
  };

  const handleLanguageChange = (e) => {
    const selectedLanguage =
      e.target.value;

    setLanguage(selectedLanguage);

    localStorage.setItem(
      "editor-language",
      selectedLanguage
    );
  };

  return (
    <div className="room-container">
      <header className="room-header">
        <div className="room-left">
          <h2 className="room-title">CodeCollab</h2>

          <span className="room-id">
            Room: {roomId}
          </span>

          <select
            value={language}
            onChange={handleLanguageChange}
            className="language-select"
          >
            <option value="javascript">
              JavaScript
            </option>

            <option value="python">
              Python
            </option>

            <option value="cpp">
              C++
            </option>

            <option value="java">
              Java
            </option>
          </select>
        </div>

        <div
          ref={dropdownRef}
          className="user-dropdown-wrapper"
        >
          <button
            className="user-profile-btn"
            onClick={() =>
              setShowUsers(!showUsers)
            }
          >
            <div className="avatar-circle">
              {username.charAt(0).toUpperCase()}
            </div>

            <div className="user-info">
              <span className="user-name">
                {username}
              </span>

              <span className="user-status">
                Online
              </span>
            </div>

            <span className="dropdown-arrow">
              ▼
            </span>
          </button>

          {showUsers && (
            <div className="user-dropdown-menu">
              <div className="dropdown-title">
                Participants ({users.length})
              </div>

              <div className="participants-list">
                {users.map((user) => (
                  <div
                    key={user.socketId}
                    className="participant-card"
                  >
                    <div className="participant-avatar">
                      {user.userName?.charAt(0)?.toUpperCase()}
                    </div>

                    <div className="participant-details">
                      <div className="participant-name">
                        {user.userName}
                        {user.userName === username &&
                          " (You)"}
                      </div>

                      <div className="participant-online">
                        ● Online
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="dropdown-actions">
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      roomId
                    )
                  }
                >
                  Copy Room Code
                </button>

                <button
                  onClick={() =>
                    navigate("/")
                  }
                >
                  Leave Room
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="editor-container">
        <Editor
          height="90vh"
          language={language}
          theme="vs-dark"
          onMount={
            handleEditorDidMount
          }
          options={{
            minimap: {
              enabled: false,
            },
            fontSize: 16,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}

export default Room;