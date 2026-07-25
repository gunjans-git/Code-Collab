import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useBlocker } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { io } from "socket.io-client";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import "./Room.css";
import ChatBox from "./ChatBox";
import RoomHeader from "./RoomHeader";

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

  const monacoRef = useRef(null);
  const decorationsRef = useRef({});
  const userColorMapRef = useRef({});
  const languageRef = useRef("javascript");
  const codesRef = useRef({ ...EMPTY_CODES });
  const pendingRoomCodeRef = useRef(null);

  // Yjs references
  const ydocRef = useRef(null);
  const bindingRef = useRef(null);
  const ytextRef = useRef(null);
  const emitTimeoutRef = useRef(null);

  const username = localStorage.getItem("username") || "Anonymous";

  const [users, setUsers] = useState([]);
  const [language, setLanguage] = useState("javascript");
  const [pendingLanguage, setPendingLanguage] = useState(null);
  const [copied, setCopied] = useState(false);
  const [socketInstance, setSocketInstance] = useState(null);
  const [isLeaving, setIsLeaving] = useState(false);

  const blocker = useBlocker(
    ({ nextLocation }) => {
      return !isLeaving && nextLocation.pathname !== window.location.pathname;
    }
  );

  useEffect(() => {
    if (blocker.state === "blocked") {
      alert("To leave the room, please click the 'Leave Room' button in the menu.");
      blocker.reset();
    }
  }, [blocker]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isLeaving) {
        e.preventDefault();
        e.returnValue = "Are you sure you want to leave the room?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isLeaving]);

  const handleLeaveRoom = () => {
    setIsLeaving(true);
    setTimeout(() => {
      navigate("/");
    }, 0);
  };

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const debouncedEmitCodeChange = (code, lang) => {
    if (emitTimeoutRef.current) {
      clearTimeout(emitTimeoutRef.current);
    }

    emitTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("code-change", {
        roomId,
        code,
        language: lang,
      });
    }, 1500);
  };

  const handleYtextChange = () => {
    if (!ytextRef.current) return;
    const currentCode = ytextRef.current.toString();
    debouncedEmitCodeChange(currentCode, languageRef.current);
  };

  const bindYjsToMonaco = (lang) => {
    if (!editorRef.current || !ydocRef.current) return;

    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }

    if (ytextRef.current) {
      ytextRef.current.unobserve(handleYtextChange);
    }

    const model = editorRef.current.getModel();
    if (model) {
      model.updateOptions({
        tabSize: 4,
        insertSpaces: true,
      });
    }

    const ytext = ydocRef.current.getText(lang);
    ytextRef.current = ytext;

    // Update model value to match Yjs text BEFORE binding to avoid cross-language merges.
    // Seeding from the DB/cache snapshot is handled once, exclusively, by the isFirstUser
    // branch in the room-state handler — doing it here too would race with a real peer's
    // Yjs sync and duplicate the code (two independent inserts merge instead of dedupe).
    if (model) {
      model.setValue(ytext.toString());
    }

    const binding = new MonacoBinding(
      ytext,
      model,
      new Set([editorRef.current])
    );
    bindingRef.current = binding;

    ytext.observe(handleYtextChange);
  };

  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const handleYdocUpdate = (update, origin) => {
      if (origin !== "socket") {
        socketRef.current?.emit("yjs-update", {
          roomId,
          update: Array.from(update),
        });
      }
    };
    ydoc.on("update", handleYdocUpdate);

    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
      }
      if (ytextRef.current) {
        ytextRef.current.unobserve(handleYtextChange);
      }
      ydoc.off("update", handleYdocUpdate);
      ydoc.destroy();
    };
  }, [roomId]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL);
    socketRef.current = socket;
    setTimeout(() => {
      setSocketInstance(socket);
    }, 0);

    const handleConnect = () => {
      socket.emit("join-room", {
        roomId,
        userName: username,
      });
    };

    socket.on("connect", handleConnect);
    if (socket.connected) {
      handleConnect();
    }

    socket.on("room-state", ({ activeLanguage, code, codes, isFirstUser }) => {
      if (codes) {
        codesRef.current = { ...EMPTY_CODES, ...codes };
      }

      setPendingLanguage(null);
      setLanguage(activeLanguage);
      languageRef.current = activeLanguage;

      const ydoc = ydocRef.current;
      if (ydoc && isFirstUser) {
        const codesToUse = codes || { ...EMPTY_CODES, [activeLanguage]: code };
        for (const lang of Object.keys(EMPTY_CODES)) {
          const ytextForLang = ydoc.getText(lang);
          if (ytextForLang.toString() === "" && codesToUse[lang]) {
            ytextForLang.insert(0, codesToUse[lang]);
          }
        }
      }

      if (!editorRef.current) {
        pendingRoomCodeRef.current = code ?? "";
        return;
      }

      bindYjsToMonaco(activeLanguage);
    });

    socket.on("yjs-update", ({ update }) => {
      if (ydocRef.current) {
        const uint8 = new Uint8Array(update);
        Y.applyUpdate(ydocRef.current, uint8, "socket");
      }
    });

    socket.on("yjs-sync-from-peer", ({ update }) => {
      if (ydocRef.current) {
        const uint8 = new Uint8Array(update);
        Y.applyUpdate(ydocRef.current, uint8, "socket");
      }
    });

    socket.on("user-joined", ({ socketId }) => {
      if (ydocRef.current) {
        const fullUpdate = Y.encodeStateAsUpdate(ydocRef.current);
        socket.emit("yjs-sync-to-peer", {
          roomId,
          targetSocketId: socketId,
          update: Array.from(fullUpdate),
        });
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
        if (editorRef.current) {
          editorRef.current.deltaDecorations(
            decorationsRef.current[socketId],
            []
          );
        }

        delete decorationsRef.current[socketId];
      }

      delete userColorMapRef.current[socketId];
    });

    socket.on("room-error", (data) => {
      setPendingLanguage(null);
      alert(data?.message || "Something went wrong with this room");
      setIsLeaving(true);
      navigate("/");
    });

    socket.on("language-update", ({ language: nextLanguage }) => {
      setPendingLanguage(null);
      setLanguage(nextLanguage);
      languageRef.current = nextLanguage;

      bindYjsToMonaco(nextLanguage);
    });

    socket.on("cursor-update",
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
      setSocketInstance(null);
    };
  }, [roomId, username]);

  // Dropdown click-outside listener moved to RoomHeader

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Bind Yjs to Monaco
    bindYjsToMonaco(languageRef.current);

    const ytext = ydocRef.current?.getText(languageRef.current);
    if (ytext && ytext.toString() === "" && pendingRoomCodeRef.current !== null) {
      ytext.insert(0, pendingRoomCodeRef.current);
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
      <RoomHeader
        roomId={roomId}
        copied={copied}
        onCopy={() => {
          navigator.clipboard.writeText(roomId);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        language={language}
        pendingLanguage={pendingLanguage}
        handleLanguageChange={handleLanguageChange}
        username={username}
        users={users}
        onLeave={handleLeaveRoom}
      />

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
            tabSize: 4,
            insertSpaces: true,
            detectIndentation: false,
          }}
        />
      </div>
      {socketInstance && (
        <ChatBox
          socket={socketInstance}
          roomId={roomId}
          username={username}
        />
      )}
    </div>
  );
}

export default Room;
