import { useState } from "react";
import "./Terminal.css";
import CppTerminalOutput from "./CppTerminalOutput";

const MIN_HEIGHT = 160;
const MAX_HEIGHT = 600;

const Terminal = ({ output, isRunning, onRun, collapsed, onToggle, height, onResize }) => {
  const [stdin, setStdin] = useState("");

  const handleRun = () => onRun(stdin);

  const handleResizeStart = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = height;

    const handleMouseMove = (moveEvent) => {
      const delta = startY - moveEvent.clientY;
      const nextHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + delta));
      onResize(nextHeight);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  if (collapsed) {
    return (
      <div className="terminal-panel terminal-collapsed">
        <button className="terminal-toggle" onClick={onToggle}>
          <span>▶ Terminal</span>
        </button>
        <button className="terminal-run-btn" onClick={handleRun} disabled={isRunning}>
          {isRunning ? "Running..." : "Run"}
        </button>
      </div>
    );
  }

  return (
    <div className="terminal-panel" style={{ height: `${height}px` }}>
      <div className="terminal-resize-handle" onMouseDown={handleResizeStart} />

      <div className="terminal-header">
        <button className="terminal-toggle" onClick={onToggle}>
          <span>▼ Terminal</span>
        </button>

        <div className="terminal-header-actions">
          <button className="terminal-run-btn" onClick={handleRun} disabled={isRunning}>
            {isRunning ? "Running..." : "Run"}
          </button>
        </div>
      </div>

      <input
        value={stdin}
        onChange={(e) => setStdin(e.target.value)}
        placeholder="stdin (optional input for your program)"
        className="terminal-stdin"
      />

      {output?.language === "cpp" ? (
        <div className="terminal-output terminal-output-cpp">
          <CppTerminalOutput output={output} isRunning={isRunning} />
        </div>
      ) : (
        <div className="terminal-output">
          {!output && <span className="terminal-placeholder">Click Run to execute your code.</span>}

          {output?.error && <pre className="terminal-error">{output.error}</pre>}

          {output?.stdout && <pre className="terminal-stdout">{output.stdout}</pre>}

          {output?.stderr && <pre className="terminal-error">{output.stderr}</pre>}

          {output && output.ok && !output.stdout && !output.stderr && (
            <span className="terminal-placeholder">Program produced no output.</span>
          )}
        </div>
      )}
    </div>
  );
};

export default Terminal;
