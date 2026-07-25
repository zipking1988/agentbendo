import assert from "node:assert/strict";
import test from "node:test";
import {
  extractJsonObject,
  parseFloorPlanRoomsJson,
} from "../lib/floor-plan-rooms.ts";

test("parseFloorPlanRoomsJson accepts percent bbox rooms from the model", () => {
  const rooms = parseFloorPlanRoomsJson({
    rooms: [
      { id: "living", bbox: { x: 5, y: 5, w: 40, h: 40 } },
      { id: "kitchen", bbox: { x: 55, y: 5, w: 40, h: 35 } },
      { id: "bedroom", bbox: { x: 5, y: 55, w: 40, h: 40 } },
      { id: "bathroom", bbox: { x: 55, y: 55, w: 35, h: 35 } },
    ],
  });
  assert.equal(rooms.length, 4);
  assert.equal(rooms.find((room) => room.id === "kitchen")?.bbox.x, 55);
});

test("parseFloorPlanRoomsJson maps Chinese labels and x1/y1/x2/y2 boxes", () => {
  const rooms = parseFloorPlanRoomsJson({
    rooms: [
      { label: "客厅", x1: 0, y1: 0, x2: 40, y2: 40 },
      { label: "厨房", x1: 50, y1: 0, x2: 90, y2: 30 },
      { label: "卧室", x1: 0, y1: 50, x2: 45, y2: 90 },
      { label: "卫生间", x1: 55, y1: 55, x2: 90, y2: 90 },
    ],
  });
  assert.deepEqual(
    rooms.map((room) => room.id).sort(),
    ["bathroom", "bedroom", "kitchen", "living"],
  );
});

test("extractJsonObject strips prose around JSON", () => {
  const parsed = extractJsonObject('Sure.\n{"rooms":[]}\n');
  assert.deepEqual(parsed, { rooms: [] });
});
