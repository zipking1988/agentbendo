/** Room ids that match the simulated care story. */
export type RoomId = "living" | "kitchen" | "bedroom" | "bathroom";

/** Axis-aligned room box in percent of the floor-plan image (0–100). */
export type RoomBBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type RoomRegion = {
  id: RoomId;
  label: string;
  bbox: RoomBBox;
};

export const REQUIRED_ROOMS: ReadonlyArray<{ id: RoomId; label: string }> = [
  { id: "living", label: "Living room" },
  { id: "kitchen", label: "Kitchen" },
  { id: "bedroom", label: "Bedroom" },
  { id: "bathroom", label: "Bathroom" },
] as const;

export function hasAllRequiredRooms(rooms: RoomRegion[]): boolean {
  return REQUIRED_ROOMS.every((needed) =>
    rooms.some((room) => room.id === needed.id && room.bbox.w >= 4 && room.bbox.h >= 4),
  );
}

export function roomCentroid(bbox: RoomBBox): { x: number; y: number } {
  return { x: bbox.x + bbox.w / 2, y: bbox.y + bbox.h / 2 };
}

export type PresenceInput = {
  room: string;
  x: number;
  y: number;
  posture?: string;
};

export type MappedPresence = {
  x: number;
  y: number;
  room: string;
  posture?: string;
};

/**
 * Place Grandpa inside the detected room region for this story beat.
 * Demo frame x/y are only used as a soft offset within that room —
 * never as absolute coordinates on the uploaded plan.
 */
export function mapPresence(
  frame: PresenceInput,
  rooms: RoomRegion[],
  demoRoomCenters?: Record<string, { x: number; y: number }>,
): MappedPresence {
  const region =
    rooms.find((room) => room.id === frame.room) ??
    rooms.find((room) => room.id === "living") ??
    rooms[0];

  if (!region) {
    return { x: 50, y: 50, room: frame.room, posture: frame.posture };
  }

  const demoCenter = demoRoomCenters?.[frame.room] ?? { x: 50, y: 50 };
  // Demo rooms sit in ~25% quadrants; keep wander inside ~80% of the user box.
  const localX = clamp((frame.x - demoCenter.x) / 22, -0.4, 0.4);
  const localY = clamp((frame.y - demoCenter.y) / 22, -0.4, 0.4);
  const nx = 0.5 + localX;
  const ny = 0.5 + localY;

  return {
    x: region.bbox.x + nx * region.bbox.w,
    y: region.bbox.y + ny * region.bbox.h,
    room: region.id,
    posture: frame.posture,
  };
}

export function pointInBBox(point: { x: number; y: number }, bbox: RoomBBox): boolean {
  return (
    point.x >= bbox.x &&
    point.x <= bbox.x + bbox.w &&
    point.y >= bbox.y &&
    point.y <= bbox.y + bbox.h
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
