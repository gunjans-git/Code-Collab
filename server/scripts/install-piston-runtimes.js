// One-time setup for a self-hosted Piston instance (see ../../docker-compose.yml).
// Installs the language runtimes this project's executionService.js expects.
// Usage: npm run setup:piston   (run once after `docker-compose up -d`)

require("dotenv").config();

const { RUNTIMES } = require("../src/services/executionService");

const PISTON_URL = process.env.PISTON_API_URL || "http://localhost:2000/api/v2";

// The /packages install endpoint uses the underlying package name, which for
// a couple of languages differs from the alias /execute accepts (confirmed
// against a running instance's GET /api/v2/packages).
const PACKAGE_NAME_OVERRIDES = {
  javascript: "node",
  cpp: "gcc",
};

async function installRuntime(language, version) {
  const res = await fetch(`${PISTON_URL}/packages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, version }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }

  return data;
}

async function main() {
  for (const [key, runtime] of Object.entries(RUNTIMES)) {
    const packageName = PACKAGE_NAME_OVERRIDES[key] || runtime.language;
    process.stdout.write(`Installing ${key} (${packageName} ${runtime.version})... `);
    try {
      await installRuntime(packageName, runtime.version);
      console.log("done");
    } catch (error) {
      console.log(`failed: ${error.message}`);
    }
  }
}

main();
