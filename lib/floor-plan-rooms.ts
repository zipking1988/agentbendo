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

const ROOM_IDS = new Set<string>(REQUIRED_ROOMS.map((r) => r.id));

export function isRoomId(value: string): value is RoomId {
  return ROOM_IDS.has(value);
}

export function roomMeta(id: RoomId): { id: RoomId; label: string } {
  return REQUIRED_ROOMS.find((r) => r.id === id) ?? { id, label: id };
}

export function normalizeBBox(a: { x: number; y: number }, b: { x: number; y: number }): RoomBBox {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x, b.x);
  const y2 = Math.max(a.y, b.y);
  return {
    x: clamp(x1, 0, 100),
    y: clamp(y1, 0, 100),
    w: clamp(x2 - x1, 4, 100),
    h: clamp(y2 - y1, 4, 100),
  };
}

export function hasAllRequiredRooms(rooms: RoomRegion[]): boolean {
  return REQUIRED_ROOMS.every((needed) =>
    rooms.some((room) => room.id === needed.id && room.bbox.w >= 4 && room.bbox.h >= 4),
  );
}

export function upsertRoom(rooms: RoomRegion[], next: RoomRegion): RoomRegion[] {
  const without = rooms.filter((room) => room.id !== next.id);
  return [...without, next];
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

export type FloorPlanAnalyzeResult = {
  rooms: RoomRegion[];
  model: string;
  notes?: string;
};

type RawRoom = {
  id?: unknown;
  label?: unknown;
  bbox?: unknown;
  x?: unknown;
  y?: unknown;
  w?: unknown;
  h?: unknown;
  x1?: unknown;
  y1?: unknown;
  x2?: unknown;
  y2?: unknown;
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function clampPct(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function toBBox(raw: RawRoom): RoomBBox | null {
  const nested = raw.bbox && typeof raw.bbox === "object" ? (raw.bbox as RawRoom) : raw;

  const x = asNumber(nested.x);
  const y = asNumber(nested.y);
  const w = asNumber(nested.w);
  const h = asNumber(nested.h);
  if (x != null && y != null && w != null && h != null) {
    return {
      x: clampPct(x),
      y: clampPct(y),
      w: Math.max(4, clampPct(w)),
      h: Math.max(4, clampPct(h)),
    };
  }

  const x1 = asNumber(nested.x1);
  const y1 = asNumber(nested.y1);
  const x2 = asNumber(nested.x2);
  const y2 = asNumber(nested.y2);
  if (x1 != null && y1 != null && x2 != null && y2 != null) {
    const left = clampPct(Math.min(x1, x2));
    const top = clampPct(Math.min(y1, y2));
    const right = clampPct(Math.max(x1, x2));
    const bottom = clampPct(Math.max(y1, y2));
    return {
      x: left,
      y: top,
      w: Math.max(4, right - left),
      h: Math.max(4, bottom - top),
    };
  }

  return null;
}

function mapRoomId(raw: unknown): RoomId | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase().replace(/[\s_-]+/g, "");
  const aliases: Record<string, RoomId> = {
    kitchen: "kitchen",
    kitchenette: "kitchen",
    厨房: "kitchen",
    bedroom: "bedroom",
    bed: "bedroom",
    masterbedroom: "bedroom",
    materbedroom: "bedroom",
    卧室: "bedroom",
    bathroom: "bathroom",
    bath: "bathroom",
    toilet: "bathroom",
    toiletroom: "bathroom",
    washroom: "bathroom",
    wetroom: "bathroom",
    powderroom: "bathroom",
    浴室: "bathroom",
    卫生间: "bathroom",
    厕所: "bathroom",
    living: "living",
    livingroom: "living",
    livingroomarea: "living",
    lounge: "living",
    ima: "living",
    kyakuma: "living",
    guestroom: "living",
    客厅: "living",
    居室: "living",
  };
  const mapped = aliases[key];
  if (mapped) return mapped;
  return isRoomId(raw.trim().toLowerCase()) ? (raw.trim().toLowerCase() as RoomId) : null;
}

/** Parse and validate a Qwen Cloud JSON room layout into app RoomRegion[]. */
export function parseFloorPlanRoomsJson(payload: unknown): RoomRegion[] {
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const list = Array.isArray(root?.rooms)
    ? (root!.rooms as unknown[])
    : Array.isArray(payload)
      ? (payload as unknown[])
      : null;

  if (!list) {
    throw new Error("Model response did not include a rooms array.");
  }

  const byId = new Map<RoomId, RoomRegion>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const raw = item as RawRoom;
    const id = mapRoomId(raw.id) ?? mapRoomId(raw.label);
    if (!id) continue;
    const bbox = toBBox(raw);
    if (!bbox) continue;
    const meta = roomMeta(id);
    byId.set(id, {
      id,
      label: typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : meta.label,
      bbox,
    });
  }

  const rooms = [...byId.values()];
  if (!hasAllRequiredRooms(rooms)) {
    const missing = (["living", "kitchen", "bedroom", "bathroom"] as RoomId[]).filter(
      (id) => !rooms.some((room) => room.id === id),
    );
    throw new Error(`Could not locate all rooms on the plan (missing: ${missing.join(", ")}).`);
  }
  return rooms;
}

export function extractJsonObject(text: string): unknown {
  let trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Model did not return valid JSON.");
  }

  // Strip common markdown fences around JSON payloads.
  const fenced = trimmed.match(/^```(?:json|JSON)?\s*([\s\S]*?)\s*```$/);
  if (fenced) trimmed = fenced[1].trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new Error(
      `Model did not return valid JSON. Preview: ${trimmed.slice(0, 180).replace(/\s+/g, " ")}`,
    );
  }
}

export const FLOOR_PLAN_SYSTEM_PROMPT = `You analyze residential floor-plan images (Japanese madori photos/sketches included).
Return ONLY a single JSON object that marks the main rooms as axis-aligned boxes in percent of the full image.
Do not wrap the JSON in markdown. Do not include commentary outside JSON.

Coordinate system:
- Origin is the top-left of the image.
- x,y,w,h are percentages from 0 to 100.
- Boxes must stay inside the floor-plan drawing, not the page margins, trees, or title text.
- Prefer the largest clear region for each room type.

Required room ids (exactly these):
- living
- kitchen
- bedroom
- bathroom

Japanese / madori mapping:
- i-ma, ima, living room → living
- kyaku-ma, guest room → living if no separate living, otherwise ignore for required set
- kitchen → kitchen
- mater/master bedroom, bedroom → bedroom
- toilet room, wet room, powder room, bathroom, トイレ, 洗面所 → bathroom (one box covering the toilet/bath wet area)

If multiple bedrooms exist, pick the primary/master bedroom.

JSON schema example:
{
  "rooms": [
    { "id": "living", "label": "Living room", "bbox": { "x": 0, "y": 0, "w": 10, "h": 10 } },
    { "id": "kitchen", "label": "Kitchen", "bbox": { "x": 0, "y": 0, "w": 10, "h": 10 } },
    { "id": "bedroom", "label": "Bedroom", "bbox": { "x": 0, "y": 0, "w": 10, "h": 10 } },
    { "id": "bathroom", "label": "Bathroom", "bbox": { "x": 0, "y": 0, "w": 10, "h": 10 } }
  ],
  "notes": "optional short note"
}`;
