import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

// C++ output is rendered here with a real terminal emulator instead of the
// plain <pre> output used for other languages.
const CppTerminalOutput = ({ output, isRunning }) => {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);

  useEffect(() => {
    const fitAddon = new FitAddon();
    const term = new XTerm({
      convertEol: true,
      disableStdin: true,
      cursorBlink: false,
      fontSize: 13,
      fontFamily: '"Consolas", "Courier New", monospace',
      theme: {
        background: "#181818",
        foreground: "#f5f1e8",
      },
    });

    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      term.dispose();
    };
  }, []);

  useEffect(() => {
    const term = termRef.current;
    if (!term) return;

    fitAddonRef.current?.fit();
    term.clear();

    if (isRunning) {
      return;
    }

    if (!output) {
      term.write("\x1b[2mClick Run to execute your code.\x1b[0m");
      return;
    }

    if (output.error) {
      term.write(`\x1b[31m${output.error}\x1b[0m`);
    }

    if (output.stdout) {
      term.write(output.stdout);
    }

    if (output.stderr) {
      if (output.stdout) term.write("\r\n");
      term.write(`\x1b[31m${output.stderr}\x1b[0m`);
    }

    if (output.ok && !output.stdout && !output.stderr && !output.error) {
      term.write("\x1b[2mProgram produced no output.\x1b[0m");
    }
  }, [output, isRunning]);

  return <div ref={containerRef} className="cpp-xterm-container" />;
};

export default CppTerminalOutput;
