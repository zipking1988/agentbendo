import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

const host = "127.0.0.1";
const port = 3400 + (process.pid % 500);
const baseUrl = `http://${host}:${port}`;

async function startProductionServer() {
  const output = [];
  const server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--hostname", host, "--port", String(port)],
    { cwd: new URL("..", import.meta.url), env: process.env, stdio: ["ignore", "pipe", "pipe"] },
  );
  server.stdout.on("data", (chunk) => output.push(chunk.toString()));
  server.stderr.on("data", (chunk) => output.push(chunk.toString()));

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js exited before startup.\n${output.join("")}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return { server, response };
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  server.kill("SIGTERM");
  throw new Error(`Timed out waiting for Next.js.\n${output.join("")}`);
}

test("server-renders the Agent Bento experience", async (t) => {
  const { server, response } = await startProductionServer();
  t.after(() => server.kill("SIGTERM"));

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Agent Bento — Ambient Care Intelligence<\/title>/i);
  assert.match(html, /AGENT BENTO/);
  assert.match(html, /A home can/);
  assert.match(html, /ask for help\./);
  assert.match(html, /Unusual silence detected/);
  assert.match(html, /Open family demo/);
  assert.match(html, /Play the story/);
  assert.match(html, /Interactive demo/);
  assert.match(html, /No cameras\. No recordings\./);
  assert.match(html, /agent-bento-mark\.png/);
  assert.match(html, /grandma-sample\.png/);
  assert.match(html, /og\.png/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/i);
});

test("keeps the finished experience accessible and self-contained", async () => {
  const [page, homeScene, layout, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/HomeScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /aria-label="Bathroom check-in story scenes"/);
  assert.match(page, /aria-pressed/);
  assert.match(page, /HomeScene/);
  assert.match(page, /grandma-sample\.png/);
  assert.doesNotMatch(homeScene, /🏠|🛀|🍱|🍵|👴|🛵|👨‍👩‍👧|✅|📡|📺|🍳/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(layout, /generateMetadata/);
  assert.match(packageJson, /"@react-three\/fiber"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
