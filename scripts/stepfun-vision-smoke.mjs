#!/usr/bin/env node
/**
 * Smoke-test StepFun vision before relying on floor-plan analyze.
 * Usage: node --env-file=.env.local scripts/stepfun-vision-smoke.mjs
 */
import { readFileSync, existsSync } from "node:fs";

function loadEnv() {
  for (const file of [".env.local", ".dev.vars"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
}

loadEnv();

const apiKey = process.env.STEPFUN_API_KEY?.trim();
const baseUrl = (process.env.STEPFUN_BASE_URL || "https://api.stepfun.com/v1").replace(/\/$/, "");
const model = process.env.STEPFUN_VISION_MODEL || "step-1o-turbo-vision";

if (!apiKey) {
  console.error("FAIL: STEPFUN_API_KEY missing");
  process.exit(1);
}

// 1x1 PNG
const image =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const response = await fetch(`${baseUrl}/chat/completions`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model,
    max_tokens: 256,
    reasoning_effort: "low",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: 'Reply JSON only: {"ok":true,"note":"vision reachable"}' },
          { type: "image_url", image_url: { url: image, detail: "low" } },
        ],
      },
    ],
  }),
});

const text = await response.text();
console.log("base:", baseUrl);
console.log("model:", model);
console.log("status:", response.status);
console.log("body:", text.slice(0, 800));

if (!response.ok) {
  process.exit(1);
}

let content = "";
try {
  const data = JSON.parse(text);
  content = data?.choices?.[0]?.message?.content?.trim() || "";
} catch {
  /* ignore */
}

if (!content) {
  console.error("FAIL: HTTP 200 but empty message content");
  process.exit(1);
}

console.log("PASS: StepFun vision reachable");
console.log("content:", content);
