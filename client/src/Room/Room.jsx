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
    const socket = io("http://localhost:3000");
    socketRef.current = socket;

    socket.emit("join-room", {
      roomId,
      userName: localStorage.getItem("username") || "Anonymous",
    });

    socket.on("code-update", ({ code }) => {
      if (!editorRef.current) return;

      const currentCode = editorRef.current.getValue();

      if (currentCode !== code) {
        isRemoteUpdateRef.current = true;
        editorRef.current.setValue(code);
      }
    });

    socket.on("room-error", (data) => {
      console.log("ROOM ERROR:", data);
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

      socketRef.current?.emit("code-change", {
        roomId,
        code,
      });
    });
  };

  const handleLanguageChange = (e) => {
    const selectedLanguage = e.target.value;
    setLanguage(selectedLanguage);
    localStorage.setItem("editor-language", selectedLanguage);
  };

  return (<div className="room-container"> <header className="room-header"> <div className="room-left"> <h2>Code Collab</h2> <span>Room: {roomId}</span>
    <select
      value={language}
      onChange={handleLanguageChange}
      className="language-select"
    >
      <option value="javascript">JavaScript</option>
      <option value="python">Python</option>
      <option value="cpp">C++</option>
      <option value="java">Java</option>
    </select>
  </div>

    <button
      className="leave-btn"
      onClick={() => navigate("/")}
    >
      Leave Room
    </button>
  </header>

    <div className="editor-container">
      <Editor
        height="90vh"
        defaultLanguage={language}
        language={language}
        theme="vs-dark"
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 16,
          automaticLayout: true,
        }}
      />
    </div>
  </div>
  );
}

export default Room;