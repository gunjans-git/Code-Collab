import { useState, useEffect, useRef } from "react";

const COLORS = [
  "#7a8b5a", // Sage green (user-color-0)
  "#c56a3d", // Terracotta (user-color-1)
  "#d6a93b", // Gold (user-color-2)
  "#5f6f46", // Olive green (user-color-3)
  "#8a8376", // Taupe (user-color-4)
  "#a3b18a", // Light sage (user-color-5)
  "#9f5f3b", // Rust (user-color-6)
  "#6f7f55", // Forest green (user-color-7)
];

// Keeps the floating chat clear of the terminal's Run/toggle buttons, which
// sit in the same bottom-right corner: collapsed terminal is a slim bar,
// expanded terminal height is user-resizable (see Terminal.jsx).
const TERMINAL_COLLAPSED_HEIGHT = 56;
const CHAT_GAP = 20;

const MIN_WIDTH = 280;
const MAX_WIDTH = 520;
const MIN_HEIGHT = 320;
const MAX_HEIGHT = 720;

const ChatBox = ({ socket, roomId, username, terminalCollapsed, terminalHeight }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [size, setSize] = useState({ width: 320, height: 480 });

  const bottomOffset =
    (terminalCollapsed ? TERMINAL_COLLAPSED_HEIGHT : terminalHeight) + CHAT_GAP;

  const handleResizeStart = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;

    const handleMouseMove = (moveEvent) => {
      const nextWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, startWidth + (startX - moveEvent.clientX))
      );
      const nextHeight = Math.min(
        MAX_HEIGHT,
        Math.max(MIN_HEIGHT, startHeight + (startY - moveEvent.clientY))
      );
      setSize({ width: nextWidth, height: nextHeight });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const bottomRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("chat-history", (messages) => {
      setMessages(messages);
    });

    return () => {
      socket.off("receive-message");
    };
  }, [socket]);

  useEffect(() => {
    if (!isCollapsed) {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages, isCollapsed]);

  const sendMessage = () => {
    if (!message.trim()) return;

    socket.emit("send-message", {
      roomId,
      username,
      message,
    });

    setMessage("");
  };

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        style={{ bottom: `${bottomOffset}px` }}
        className="fixed right-6 bg-[#18181b]/80 hover:bg-[#18181b] backdrop-blur-xl
                   border border-white/10 rounded-full px-5 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.4)]
                   text-white font-medium flex items-center gap-2 z-50 transition-[bottom,transform,background-color] duration-300 ease-out hover:scale-[1.04] active:scale-[0.98] cursor-pointer"
      >
        <span>💬</span> Live Chat
      </button>
    );
  }

  return (
    <div
      style={{ bottom: `${bottomOffset}px`, width: `${size.width}px`, height: `${size.height}px` }}
      className="fixed right-6
                    bg-[#1c1c1e]/75 backdrop-blur-2xl
                    border border-white/10
                    rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]
                    flex flex-col z-50 transition-[bottom] duration-300 ease-out"
    >
      <div
        onMouseDown={handleResizeStart}
        className="absolute -top-1 -left-1 w-4 h-4 cursor-nwse-resize rounded-full
                   bg-white/10 hover:bg-[#7a8b5a]/60 border border-white/10 z-10 transition-colors"
      />

      <div className="p-4 border-b border-white/5 text-white/90 font-semibold flex justify-between items-center text-sm">
        <span>🟢 Live Chat</span>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-white/60 hover:text-white font-bold p-1 rounded transition-colors cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, index) => (
          <div key={index} className="hover:bg-white/5 p-2 rounded-xl transition-all duration-150">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-xs font-bold tracking-wide"
                  style={{ color: COLORS[Number(msg.color)] || "#ffffff" }}>
                {msg.username}
              </span>
              <span className="text-[9px] text-white/30 font-medium">
                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
              </span>
            </div>
            <p className="text-white/85 text-[13px] leading-relaxed break-words font-medium pl-0.5">
              {msg.message}
            </p>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-white/5 flex gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && sendMessage()
          }
          placeholder="Type a message..."
          className="flex-1 bg-white/5 text-white placeholder-white/30 border border-white/5
                     rounded-xl px-3.5 py-2.5 outline-none text-sm transition-all focus:border-[#7a8b5a]/40 focus:bg-white/10"
        />

        <button
          onClick={sendMessage}
          className="px-4 py-2.5 rounded-xl bg-[#7a8b5a]/15 text-[#a3b18a] border border-[#7a8b5a]/30
                     hover:bg-[#7a8b5a] hover:text-white font-semibold text-sm transition-all cursor-pointer active:scale-95"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;