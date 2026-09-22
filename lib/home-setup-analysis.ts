import {
  hasAllRequiredRooms,
  isRoomId,
  type RoomRegion,
} from "./floor-plan-rooms.ts";

export function shouldApplyFloorPlanAnalysis(
  requestVersion: number,
  currentVersion: number,
  aborted: boolean,
): boolean {
  return !aborted && requestVersion === currentVersion;
}

export type FloorPlanAnalysisRequest = {
  version: number;
  controller: AbortController;
};

export class FloorPlanAnalysisRequestGuard {
  private version = 0;
  private current: FloorPlanAnalysisRequest | null = null;

  begin(): FloorPlanAnalysisRequest {
    this.current?.controller.abort();
    const request = {
      version: this.version + 1,
      controller: new AbortController(),
    };
    this.version = request.version;
    this.current = request;
    return request;
  }

  cancel(): void {
    this.version += 1;
    this.current?.controller.abort();
    this.current = null;
  }

  canApply(request: FloorPlanAnalysisRequest): boolean {
    return this.current === request && shouldApplyFloorPlanAnalysis(
      request.version,
      this.version,
      request.controller.signal.aborted,
    );
  }

  finish(request: FloorPlanAnalysisRequest): void {
    if (this.current === request) this.current = null;
  }
}

function isRoomRegion(value: unknown): value is RoomRegion {
  if (!value || typeof value !== "object") return false;
  const room = value as Partial<RoomRegion>;
  const bbox = room.bbox;
  return typeof room.id === "string"
    && isRoomId(room.id)
    && typeof room.label === "string"
    && !!bbox
    && [bbox.x, bbox.y, bbox.w, bbox.h].every((coordinate) => (
      typeof coordinate === "number" && Number.isFinite(coordinate)
    ));
}

export function floorPlanRoomsFromResponse(payload: unknown, responseOk: boolean): RoomRegion[] {
  const record = payload && typeof payload === "object"
    ? payload as { rooms?: unknown; error?: unknown }
    : {};
  if (!responseOk) {
    throw new Error(typeof record.error === "string"
      ? record.error
      : "Could not build a room model from that floor plan.");
  }
  if (!Array.isArray(record.rooms) || !record.rooms.every(isRoomRegion)) {
    throw new Error("Room model response was invalid.");
  }
  if (!hasAllRequiredRooms(record.rooms)) {
    throw new Error("Room model did not include all required rooms.");
  }
  return record.rooms;
}
