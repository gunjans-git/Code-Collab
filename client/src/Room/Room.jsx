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
  const isRemoteUpdateRef = useRef(false);

  const [language, setLanguage] = useState(
    localStorage.getItem("editor-language") || "javascript"
  );

  useEffect(() => {
    const socket = io("http://localhost:5000");
    socketRef.current = socket;

    socket.emit("join-room", roomId);

    socket.on("current-code", (code) => {
      if (editorRef.current) {
        isRemoteUpdateRef.current = true;
        editorRef.current.setValue(code || "");
      }
    });

    socket.on("code-change", (code) => {
      if (editorRef.current) {
        const current = editorRef.current.getValue();
        if (current !== code) {
          isRemoteUpdateRef.current = true;
          editorRef.current.setValue(code);
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;

    editor.onDidChangeModelContent(() => {
      if (isRemoteUpdateRef.current) {
        isRemoteUpdateRef.current = false;
        return;
      }

      const code = editor.getValue();
      socketRef.current?.emit("code-change", { roomId, code });
    });
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    localStorage.setItem("editor-language", newLang);
  };

  return (
    <div className="room-container">
      <header className="room-header">
        <div className="room-left">
          <span className="room-title">🚀 CodeCollab</span>
          <span className="room-id">Room: {roomId}</span>

          <select
            className="language-select"
            value={language}
            onChange={handleLanguageChange}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>
        </div>

        <div className="room-right">
          <button className="leave-btn" onClick={() => navigate("/")}>
            Leave
          </button>
        </div>
      </header>

      <div className="editor-container">
        <Editor
          height="100%"
          width="100%"
          language={language}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            fontSize: 16,
            minimap: { enabled: false },
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}

export default Room;