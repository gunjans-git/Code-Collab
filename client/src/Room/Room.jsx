import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { io } from "socket.io-client";
import "./Room.css";
import logo from "/logo.png";

const EMPTY_CODES = {
  javascript: "",
  python: "",
  cpp: "",
  java: "",
};

const CURSOR_COLOR_COUNT = 8;

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const socketRef = useRef(null);
  const editorRef = useRef(null);
  const dropdownRef = useRef(null);

  const monacoRef = useRef(null);
  const decorationsRef = useRef({});
  const userColorMapRef = useRef({});
  const isRemoteUpdateRef = useRef(false);
  const languageRef = useRef("javascript");
  const codesRef = useRef({ ...EMPTY_CODES });
  const pendingRoomCodeRef = useRef(null);

  const username = localStorage.getItem("username") || "Anonymous";

  const [users, setUsers] = useState([]);
  const [showUsers, setShowUsers] = useState(false);
  const [language, setLanguage] = useState("javascript");
  const [pendingLanguage, setPendingLanguage] = useState(null);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    // const socket = io("http://localhost:3000");
    const socket = io(import.meta.env.VITE_SOCKET_URL);

    socketRef.current = socket;

    socket.emit("join-room", {
      roomId,
      userName: username,
    });

    socket.on("room-state", ({ activeLanguage, code, codes }) => {
      if (codes) {
        codesRef.current = { ...EMPTY_CODES, ...codes };
      }

      setPendingLanguage(null);
      setLanguage(activeLanguage);
      languageRef.current = activeLanguage;

      if (!editorRef.current) {
        pendingRoomCodeRef.current = code ?? "";
        return;
      }

      isRemoteUpdateRef.current = true;
      editorRef.current.setValue(code ?? "");
    });

    socket.on("code-update", ({ code, language: updateLang }) => {
      if (!editorRef.current) return;

      codesRef.current[updateLang] = code;

      if (updateLang !== languageRef.current) {
        return;
      }

      const currentCode = editorRef.current.getValue();

      if (currentCode !== code) {
        isRemoteUpdateRef.current = true;
        editorRef.current.setValue(code);
      }
    });

    socket.on("users-updated", (userList) => {
      setUsers(userList);

      userColorMapRef.current = userList.reduce((colorMap, user) => {
        colorMap[user.socketId] = user.colorIndex ?? 0;
        return colorMap;
      }, {});
    });

    socket.on("user-left", (data) => {
      const socketId = typeof data === "string" ? data : data?.socketId;

      if (!socketId) return;

      if (decorationsRef.current[socketId]) {
        editorRef.current.deltaDecorations(
          decorationsRef.current[socketId],
          []
        );

        delete decorationsRef.current[socketId];
      }

      delete userColorMapRef.current[socketId];
    });

    socket.on("room-error", (data) => {
      console.log("ROOM ERROR:", data);
      setPendingLanguage(null);
    });

    socket.on("language-update", ({ language: nextLanguage, code }) => {
      codesRef.current[nextLanguage] = code ?? "";

      setPendingLanguage(null);
      setLanguage(nextLanguage);
      languageRef.current = nextLanguage;

      if (!editorRef.current) return;

      isRemoteUpdateRef.current = true;
      editorRef.current.setValue(code ?? "");
    });

    socket.on(
      "cursor-update",
      ({ cursor, userName, senderId, colorIndex: serverColorIndex }) => {
      if (
        !editorRef.current ||
        !monacoRef.current ||
        senderId === socketRef.current?.id
      ) {
        return;
      }

        const colorIndex =
          serverColorIndex ??
          userColorMapRef.current[senderId] ??
          0;

      const decoration = {
        range: new monacoRef.current.Range(
          cursor.lineNumber,
          cursor.column,
          cursor.lineNumber,
          cursor.column
        ),

        options: {
          stickiness:
            monacoRef.current.editor.TrackedRangeStickiness
              .NeverGrowsWhenTypingAtEdges,
          className: `remote-cursor remote-cursor-color-${colorIndex}`,
          after: {
            content: " ",
            inlineClassName:
              `remote-cursor-marker remote-cursor-marker-color-${colorIndex}`,
          },
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

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    if (pendingRoomCodeRef.current !== null) {
      isRemoteUpdateRef.current = true;
      editor.setValue(pendingRoomCodeRef.current);
      pendingRoomCodeRef.current = null;
    }

    editor.onDidChangeCursorPosition((e) => {
      socketRef.current?.emit("cursor-move", {
        roomId,
        cursor: {
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        },
      });
    });

    editor.onDidChangeModelContent(() => {
      if (isRemoteUpdateRef.current) {
        isRemoteUpdateRef.current = false;
        return;
      }

      const code = editor.getValue();
      const activeLanguage = languageRef.current;

      codesRef.current[activeLanguage] = code;

      socketRef.current?.emit("code-change", {
        roomId,
        code,
        language: activeLanguage,
      });
    });
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;

    if (newLang === languageRef.current) return;

    setPendingLanguage(newLang);

    const currentCode = editorRef.current?.getValue() ?? "";

    socketRef.current?.emit("language-change", {
      roomId,
      previousLanguage: languageRef.current,
      language: newLang,
      code: currentCode,
    });
  };

  return (
    <div className="room-container">
      <header className="room-header">
        <div className="room-left">
          <h2 className="room-title">
            <img src={logo} alt="CodeCollab" className="w-14 h-14" />
          </h2>

          <span className="room-id">
            Room:
            <button
              className="room-id-btn "
              onClick={() => navigator.clipboard.writeText(roomId)}
            >
              {roomId}
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

      <div className="editor-container">
        <Editor
          height="90vh"
          language={language}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            minimap: {
              enabled: true,
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
