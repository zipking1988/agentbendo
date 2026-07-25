#!/usr/bin/env node
/**
 * Regression: StepFun room model + presence mapping on the fixture floor plan.
 * Usage: node scripts/floor-plan-regression.mjs
 * Requires: npm run dev on :3000 and STEPFUN_* in .env.local / .dev.vars
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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

const fixtureCandidates = [
  "public/fixtures/test-floor-plan.png",
  resolve(
    process.env.HOME || "",
    ".cursor/projects/Users-zip-Documents-AgentBento/assets/123456-891bdd91-7c84-465e-81a1-fb94a029e777.png",
  ),
];
const fixture = fixtureCandidates.find((p) => existsSync(p));
if (!fixture) {
  console.error("FAIL: fixture floor plan not found");
  process.exit(1);
}

const bytes = readFileSync(fixture);
const imageDataUrl = `data:image/png;base64,${bytes.toString("base64")}`;
console.log("FIXTURE", fixture, "bytes", bytes.length);

const t0 = Date.now();
const response = await fetch("http://localhost:3000/api/floor-plan/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ imageDataUrl }),
});
const payload = await response.json();
console.log("ANALYZE", response.status, `${((Date.now() - t0) / 1000).toFixed(1)}s`);

if (!response.ok) {
  console.error("FAIL", payload);
  process.exit(1);
}
if ("convertedFloorPlanDataUrl" in payload) {
  console.error("FAIL: duplicate converted image should not be returned");
  process.exit(1);
}

const rooms = Object.fromEntries((payload.rooms || []).map((r) => [r.id, r]));
for (const id of ["living", "kitchen", "bedroom", "bathroom"]) {
  if (!rooms[id]) {
    console.error("FAIL missing room", id);
    process.exit(1);
  }
}
console.log(
  "ROOMS",
  Object.fromEntries(Object.entries(rooms).map(([id, r]) => [id, r.bbox])),
);

const k = rooms.kitchen.bbox;
const b = rooms.bedroom.bbox;
const l = rooms.living.bbox;
const ba = rooms.bathroom.bbox;
const layoutOk =
  k.x < 45 && k.y < 45 && b.y < 45 && l.y > 35 && ba.x > 50;
console.log(layoutOk ? "LAYOUT SANITY OK" : "WARN layout sanity soft-fail");

const demoCenters = {
  bedroom: { x: 20, y: 70 },
  bathroom: { x: 70, y: 70 },
  kitchen: { x: 70, y: 30 },
  living: { x: 20, y: 30 },
};

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function mapPresence(room, x, y) {
  const region = rooms[room];
  const demo = demoCenters[room] || { x: 50, y: 50 };
  const nx = 0.5 + clamp((x - demo.x) / 22, -0.4, 0.4);
  const ny = 0.5 + clamp((y - demo.y) / 22, -0.4, 0.4);
  return {
    room: region.id,
    x: region.bbox.x + nx * region.bbox.w,
    y: region.bbox.y + ny * region.bbox.h,
  };
}

function inBox(p, bb, pad = 0.5) {
  return (
    p.x >= bb.x - pad &&
    p.x <= bb.x + bb.w + pad &&
    p.y >= bb.y - pad &&
    p.y <= bb.y + bb.h + pad
  );
}

const cases = [
  ["cooking", "kitchen", 70, 30],
  ["sleep", "bedroom", 20, 70],
  ["living", "living", 20, 30],
  ["bath", "bathroom", 70, 70],
];

let ok = true;
for (const [label, room, x, y] of cases) {
  const p = mapPresence(room, x, y);
  const inside = inBox(p, rooms[room].bbox);
  const cookingInBath =
    room === "kitchen" && inBox(p, rooms.bathroom.bbox);
  const pass = inside && !cookingInBath;
  console.log(
    pass ? "OK" : "FAIL",
    label,
    "->",
    p.x.toFixed(1),
    p.y.toFixed(1),
    cookingInBath ? "(in bathroom!)" : "",
  );
  ok = ok && pass;
}

if (!ok) {
  console.error("REGRESSION FAIL");
  process.exit(1);
}
console.log("REGRESSION PASS");
