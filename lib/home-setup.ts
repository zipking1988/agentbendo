import {
  hasAllRequiredRooms,
  type RoomRegion,
} from "./floor-plan-rooms.ts";

export type { RoomBBox, RoomId, RoomRegion } from "./floor-plan-rooms.ts";
export {
  REQUIRED_ROOMS,
  hasAllRequiredRooms,
  mapPresence,
  pointInBBox,
} from "./floor-plan-rooms.ts";

export type WifiPin = {
  /** Percent from left edge of the floor-plan image (0–100) */
  x: number;
  /** Percent from top edge of the floor-plan image (0–100) */
  y: number;
};

export const DEMO_FLOOR_PLAN_URL = "/fixtures/test-floor-plan.png";
export const DEMO_WIFI: WifiPin = { x: 58, y: 56 };
export const DEMO_ROOMS: RoomRegion[] = [
  { id: "kitchen", label: "Kitchen", bbox: { x: 21, y: 14, w: 21, h: 29 } },
  { id: "bedroom", label: "Bedroom", bbox: { x: 48, y: 14, w: 21, h: 23 } },
  { id: "living", label: "Living room", bbox: { x: 45, y: 43, w: 24, h: 29 } },
  { id: "bathroom", label: "Bathroom", bbox: { x: 69, y: 43, w: 12, h: 24 } },
];

export type HomeSetup = {
  /** Floor-plan image URL or a legacy browser-saved data URL. */
  floorPlanDataUrl: string;
  fileName: string;
  wifi: WifiPin;
  /** 2D room model on the upload — source of truth for presence / story mapping */
  rooms: RoomRegion[];
  savedAt: string;
};

const STORAGE_KEY = "agent-bento.home-setup.v4";

export function loadHomeSetup(): HomeSetup | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomeSetup;
    if (!parsed?.floorPlanDataUrl || !parsed?.wifi) return null;
    if (!Array.isArray(parsed.rooms) || !hasAllRequiredRooms(parsed.rooms)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveHomeSetup(setup: HomeSetup): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
    return true;
  } catch {
    return false;
  }
}

export function clearHomeSetup(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem("agent-bento.home-setup.v3");
    window.localStorage.removeItem("agent-bento.home-setup.v2");
    window.localStorage.removeItem("agent-bento.home-setup.v1");
  } catch {
    // The in-memory setup can still be reset when browser storage is unavailable.
  }
}
