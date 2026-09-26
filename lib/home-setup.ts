import {
  hasAllRequiredRooms,
  type RoomRegion,
} from "./floor-plan-rooms.ts";

export type { RoomBBox, RoomId, RoomRegion } from "./floor-plan-rooms.ts";
export {
  REQUIRED_ROOMS,
  hasAllRequiredRooms,
  mapPresence,
  normalizeBBox,
  pointInBBox,
  roomMeta,
  upsertRoom,
} from "./floor-plan-rooms.ts";

export type WifiPin = {
  /** Percent from left edge of the floor-plan image (0–100) */
  x: number;
  /** Percent from top edge of the floor-plan image (0–100) */
  y: number;
};

export const DEMO_FLOOR_PLAN_URL = "/fixtures/test-floor-plan.png";

export type HomeSetup = {
  /** User upload as a data URL — sent to the analysis route during setup, then retained as the browser-side visual map. */
  floorPlanDataUrl: string;
  fileName: string;
  wifi: WifiPin;
  /** 2D room model on the upload — source of truth for presence / story mapping */
  rooms: RoomRegion[];
  savedAt: string;
};

const STORAGE_KEY = "agent-bento.home-setup.v4";
export const MAX_FLOOR_PLAN_FILE_BYTES = 3_000_000;

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

export function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read image"));
    };
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

export function isAllowedFloorPlanFile(file: File): boolean {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return false;
  // Base64 adds roughly one third; keep the stored data URL below common 5 MB quotas.
  return file.size <= MAX_FLOOR_PLAN_FILE_BYTES;
}
