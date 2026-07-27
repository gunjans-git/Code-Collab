// Points at a self-hosted Piston instance by default (see docker-compose.yml).
// Run `npm run setup:piston` once after starting the container to install runtimes.
const PISTON_URL = process.env.PISTON_API_URL || "http://localhost:2000/api/v2";
const EXECUTION_TIMEOUT_MS = 10000;

// Pinned against what the running Piston instance reports at /runtimes.
// If runs start failing with an "unknown language/version" error, re-check
// that endpoint and update these.
const RUNTIMES = {
  javascript: { language: "javascript", version: "18.15.0", filename: "main.js" },
  python: { language: "python", version: "3.10.0", filename: "main.py" },
  java: { language: "java", version: "15.0.2", filename: "Main.java" },
  cpp: { language: "c++", version: "10.2.0", filename: "main.cpp" },
};

async function runViaPiston({ runtime, code, stdin, controller }) {
  const response = await fetch(`${PISTON_URL}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({
      language: runtime.language,
      version: runtime.version,
      files: [{ name: runtime.filename, content: code }],
      stdin: stdin || "",
    }),
  });

  if (!response.ok) {
    return { ok: false, error: `Piston request failed with status ${response.status}` };
  }

  const data = await response.json();
  const run = data?.run || {};
  const compile = data?.compile || {};

  return {
    ok: true,
    stdout: run.stdout || "",
    stderr: compile.stderr || run.stderr || "",
    exitCode: run.code ?? null,
  };
}

async function runCode({ language, code, stdin }) {
  const runtime = RUNTIMES[language];

  if (!runtime) {
    return { ok: false, error: `Unsupported language: ${language}` };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS);

  try {
    return await runViaPiston({ runtime, code, stdin, controller });
  } catch (error) {
    const message = error.name === "AbortError" ? "Execution timed out" : error.message;
    return { ok: false, error: message };
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = { runCode, RUNTIMES };
