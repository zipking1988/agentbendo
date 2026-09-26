import assert from "node:assert/strict";
import test from "node:test";
import {
  clearHomeSetup,
  createDemoHomeSetup,
  saveHomeSetup,
  type HomeSetup,
} from "../lib/home-setup.ts";

test("bundled demo setup is complete and isolated from shared defaults", () => {
  const first = createDemoHomeSetup({ x: 42, y: 51 }, "2026-09-26T00:00:00.000Z");
  const second = createDemoHomeSetup(undefined, "2026-09-26T00:00:01.000Z");

  assert.equal(first.floorPlanDataUrl, "/fixtures/test-floor-plan.png");
  assert.equal(first.fileName, "Japanese demo home");
  assert.deepEqual(first.wifi, { x: 42, y: 51 });
  assert.equal(first.rooms.length, 4);
  assert.notEqual(first.rooms, second.rooms);
  assert.notEqual(first.rooms[0].bbox, second.rooms[0].bbox);
});

const setup: HomeSetup = {
  floorPlanDataUrl: "/fixtures/test-floor-plan.png",
  fileName: "demo.png",
  wifi: { x: 58, y: 56 },
  rooms: [
    { id: "living", label: "Living room", bbox: { x: 0, y: 0, w: 25, h: 25 } },
    { id: "kitchen", label: "Kitchen", bbox: { x: 25, y: 0, w: 25, h: 25 } },
    { id: "bedroom", label: "Bedroom", bbox: { x: 0, y: 25, w: 25, h: 25 } },
    { id: "bathroom", label: "Bathroom", bbox: { x: 25, y: 25, w: 25, h: 25 } },
  ],
  savedAt: "2026-09-26T00:00:00.000Z",
};

test("setup persistence reports quota failures without throwing", () => {
  const previousWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: { setItem: () => { throw new DOMException("quota", "QuotaExceededError"); } } },
  });

  try {
    assert.equal(saveHomeSetup(setup), false);
  } finally {
    Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow });
  }
});

test("setup persistence succeeds and reset tolerates unavailable storage", () => {
  const previousWindow = globalThis.window;
  let stored = "";
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        setItem: (_key: string, value: string) => { stored = value; },
        removeItem: () => { throw new DOMException("blocked", "SecurityError"); },
      },
    },
  });

  try {
    assert.equal(saveHomeSetup(setup), true);
    assert.deepEqual(JSON.parse(stored), setup);
    assert.doesNotThrow(() => clearHomeSetup());
  } finally {
    Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow });
  }
});
