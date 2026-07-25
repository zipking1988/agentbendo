import assert from "node:assert/strict";
import test from "node:test";
import {
  hasAllRequiredRooms,
  mapPresence,
  normalizeBBox,
  pointInBBox,
  upsertRoom,
  type RoomRegion,
} from "../lib/floor-plan-rooms.ts";

const labeledRooms: RoomRegion[] = [
  { id: "living", label: "Living room", bbox: { x: 5, y: 5, w: 40, h: 40 } },
  { id: "kitchen", label: "Kitchen", bbox: { x: 55, y: 5, w: 40, h: 35 } },
  { id: "bedroom", label: "Bedroom", bbox: { x: 5, y: 55, w: 40, h: 40 } },
  { id: "bathroom", label: "Bathroom", bbox: { x: 55, y: 55, w: 35, h: 35 } },
];

const demoCenters = {
  bedroom: { x: 20, y: 70 },
  bathroom: { x: 70, y: 70 },
  kitchen: { x: 70, y: 30 },
  living: { x: 20, y: 30 },
};

test("normalizeBBox orders drag corners and enforces a minimum size", () => {
  const box = normalizeBBox({ x: 80, y: 60 }, { x: 10, y: 20 });
  assert.equal(box.x, 10);
  assert.equal(box.y, 20);
  assert.equal(box.w, 70);
  assert.equal(box.h, 40);
});

test("hasAllRequiredRooms requires the four story rooms", () => {
  assert.equal(hasAllRequiredRooms([]), false);
  assert.equal(hasAllRequiredRooms(labeledRooms.slice(0, 2)), false);
  assert.equal(hasAllRequiredRooms(labeledRooms), true);
});

test("mapPresence keeps cooking inside the user kitchen, not demo coordinates", () => {
  const presence = mapPresence(
    { room: "kitchen", x: 70, y: 30, posture: "standing" },
    labeledRooms,
    demoCenters,
  );

  assert.equal(presence.room, "kitchen");
  assert.equal(pointInBBox(presence, labeledRooms[1].bbox), true);
  // Demo kitchen is around 70/30; user kitchen is top-right — presence must not stay on the dummy grid.
  assert.ok(presence.x > 55);
  assert.ok(presence.y < 45);
});

test("mapPresence keeps bathroom beats inside the bathroom box", () => {
  const presence = mapPresence(
    { room: "bathroom", x: 72, y: 68 },
    labeledRooms,
    demoCenters,
  );
  assert.equal(presence.room, "bathroom");
  assert.equal(pointInBBox(presence, labeledRooms[3].bbox), true);
});

test("upsertRoom replaces an existing room label", () => {
  const next = upsertRoom(labeledRooms, {
    id: "kitchen",
    label: "Kitchen",
    bbox: { x: 60, y: 10, w: 30, h: 25 },
  });
  assert.equal(next.length, 4);
  const kitchen = next.find((room) => room.id === "kitchen");
  assert.deepEqual(kitchen?.bbox, { x: 60, y: 10, w: 30, h: 25 });
});
