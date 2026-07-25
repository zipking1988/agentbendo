"use client";

import { type CareStatus } from "@/lib/demo-frames";
import {
  normalizeBBox,
  roomMeta,
  type RoomId,
  type RoomRegion,
  type WifiPin,
} from "@/lib/home-setup";
import IconHandClick from "@tabler/icons-react/dist/esm/icons/IconHandClick.mjs";
import IconWifi from "@tabler/icons-react/dist/esm/icons/IconWifi.mjs";
import { motion, useReducedMotion } from "framer-motion";
import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

type Point = { x: number; y: number };

type HomeFloorModelProps = {
  imageUrl?: string | null;
  wifi: WifiPin | null;
  wifiPreview?: WifiPin;
  rooms?: RoomRegion[];
  roomDrawing?: {
    activeId: RoomId;
    onCommit: (region: RoomRegion) => void;
  } | null;
  presence?: {
    x: number;
    y: number;
    room: string;
    posture?: string;
  } | null;
  status?: CareStatus;
  /** monitor = dashboard neon overlays; quiet = warm muted for tipped 3D */
  tone?: "monitor" | "quiet";
  interactive?: boolean;
  onPin?: (pin: WifiPin) => void;
  label?: string;
};

const ROOM_TINT: Record<string, string> = {
  living: "rgba(184, 255, 84, 0.22)",
  kitchen: "rgba(255, 189, 105, 0.28)",
  bedroom: "rgba(130, 180, 255, 0.26)",
  bathroom: "rgba(100, 210, 200, 0.28)",
};

const ROOM_STROKE: Record<string, string> = {
  living: "#b8ff54",
  kitchen: "#ffbd69",
  bedroom: "#82b4ff",
  bathroom: "#64d2c8",
};

/** Quiet warm overlays — readable, not neon. */
const QUIET_TINT: Record<string, string> = {
  living: "rgba(168, 140, 90, 0.22)",
  kitchen: "rgba(180, 150, 110, 0.24)",
  bedroom: "rgba(140, 120, 95, 0.22)",
  bathroom: "rgba(120, 140, 140, 0.22)",
};

const QUIET_STROKE: Record<string, string> = {
  living: "#8a7355",
  kitchen: "#9a8060",
  bedroom: "#7a6650",
  bathroom: "#6a7a7a",
};

function pinFromEvent(
  el: HTMLElement,
  clientX: number,
  clientY: number,
): Point {
  const rect = el.getBoundingClientRect();
  return {
    x: Math.min(98, Math.max(2, ((clientX - rect.left) / rect.width) * 100)),
    y: Math.min(98, Math.max(2, ((clientY - rect.top) / rect.height) * 100)),
  };
}

function GrandpaFigure({ posture = "standing" }: { posture?: string }) {
  const sitting = posture === "sitting" || posture === "lying";
  const limb = sitting ? (
    <>
      <path d="M12 20c2 8 4 12 8 12s6-4 8-12" />
      <path d="M11 36h18" />
      <path d="M14 36v10M26 36v10" />
    </>
  ) : (
    <>
      <path d="M20 17v16" />
      <path d="M12 24h16" />
      <path d="M20 33l-6 16M20 33l6 16" />
    </>
  );

  return (
    <svg
      className={`grandpa-figure posture-${sitting ? "low" : "up"}`}
      viewBox="0 0 40 56"
      width="46"
      height="64"
      aria-hidden="true"
    >
      <ellipse cx="20" cy="52" rx="14" ry="4.5" fill="#071018" opacity="0.5" />
      <ellipse cx="20" cy="52" rx="9" ry="2.8" fill="currentColor" opacity="0.5" />

      {/* Dark outline pass — readable on white floor plans */}
      <g
        fill="none"
        stroke="#071018"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {limb}
      </g>
      <circle cx="20" cy="10" r="8.2" fill="#071018" />

      {/* Lime body */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {limb}
      </g>
      <circle cx="20" cy="10" r="7" fill="currentColor" stroke="#071018" strokeWidth="1.5" />
    </svg>
  );
}

/** Transparent room-model overlay aligned to the upload image. */
function RoomModelOverlay({
  rooms,
  activeId,
  presenceRoom,
  draftBox,
  draftLabel,
  quiet = false,
}: {
  rooms: RoomRegion[];
  activeId?: RoomId;
  presenceRoom?: string;
  draftBox?: { x: number; y: number; w: number; h: number } | null;
  draftLabel?: string;
  quiet?: boolean;
}) {
  const tint = quiet ? QUIET_TINT : ROOM_TINT;
  const strokeMap = quiet ? QUIET_STROKE : ROOM_STROKE;
  const presenceStroke = quiet ? "#5a4a38" : "#f0f0e5";

  return (
    <svg
      className="floor-room-overlay-svg"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {rooms.map((room) => {
        const active = activeId === room.id;
        const hasPresence = presenceRoom === room.id;
        const { x, y, w, h } = room.bbox;
        const stroke = strokeMap[room.id] ?? (quiet ? "#8a7355" : "#b8ff54");
        return (
          <g key={room.id}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill={tint[room.id] ?? (quiet ? "rgba(168,140,90,0.18)" : "rgba(184,255,84,0.18)")}
              stroke={hasPresence ? presenceStroke : stroke}
              strokeWidth={hasPresence || active ? (quiet ? 0.7 : 0.9) : quiet ? 0.4 : 0.55}
              opacity={hasPresence ? 1 : quiet ? 0.9 : 0.95}
            />
            {!quiet ? (
              <rect
                x={x + 0.8}
                y={y + 0.8}
                width={Math.max(0, w - 1.6)}
                height={Math.max(0, h - 1.6)}
                fill="none"
                stroke="rgba(7,16,24,0.35)"
                strokeWidth="0.25"
              />
            ) : null}
          </g>
        );
      })}

      {draftBox ? (
        <g>
          <rect
            x={draftBox.x}
            y={draftBox.y}
            width={draftBox.w}
            height={draftBox.h}
            fill="rgba(184,255,84,0.12)"
            stroke="#b8ff54"
            strokeWidth="0.7"
            strokeDasharray="1.4 0.7"
          />
          {draftLabel ? (
            <text
              x={draftBox.x + 1.8}
              y={draftBox.y + 3.6}
              fill="#b8ff54"
              fontSize="2.3"
              fontFamily="var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
              fontWeight="700"
            >
              {draftLabel}
            </text>
          ) : null}
        </g>
      ) : null}
    </svg>
  );
}

export function HomeFloorModel({
  imageUrl = null,
  wifi,
  wifiPreview = { x: 50, y: 42 },
  rooms = [],
  roomDrawing = null,
  presence = null,
  status = "normal",
  tone = "monitor",
  interactive = false,
  onPin,
  label = "Floor plan with room model",
}: HomeFloorModelProps) {
  const reduceMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [draftStart, setDraftStart] = useState<Point | null>(null);
  const [draftEnd, setDraftEnd] = useState<Point | null>(null);

  const labeling = roomDrawing != null;
  const quiet = tone === "quiet";
  const canInteract = interactive && (labeling || onPin != null);
  const pinned = wifi != null;
  const wifiPos = wifi ?? wifiPreview;
  const draftBox =
    draftStart && draftEnd ? normalizeBBox(draftStart, draftEnd) : null;

  const applyWifi = (clientX: number, clientY: number) => {
    if (!onPin || !stageRef.current || labeling) return;
    onPin(pinFromEvent(stageRef.current, clientX, clientY));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canInteract || !stageRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    const point = pinFromEvent(stageRef.current, event.clientX, event.clientY);
    if (labeling) {
      setDraftStart(point);
      setDraftEnd(point);
      return;
    }
    applyWifi(event.clientX, event.clientY);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging || !stageRef.current) return;
    if (labeling) {
      setDraftEnd(pinFromEvent(stageRef.current, event.clientX, event.clientY));
      return;
    }
    applyWifi(event.clientX, event.clientY);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }

    if (labeling && roomDrawing && draftStart && draftEnd) {
      const bbox = normalizeBBox(draftStart, draftEnd);
      if (bbox.w >= 4 && bbox.h >= 4) {
        const meta = roomMeta(roomDrawing.activeId);
        roomDrawing.onCommit({
          id: roomDrawing.activeId,
          label: meta.label,
          bbox,
        });
      }
    }
    setDraftStart(null);
    setDraftEnd(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive || labeling || !onPin) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPin(wifi ?? { x: 50, y: 42 });
      return;
    }
    if (!wifi) return;
    const step = event.shiftKey ? 4 : 2;
    const next = { ...wifi };
    if (event.key === "ArrowLeft") next.x -= step;
    else if (event.key === "ArrowRight") next.x += step;
    else if (event.key === "ArrowUp") next.y -= step;
    else if (event.key === "ArrowDown") next.y += step;
    else return;
    event.preventDefault();
    onPin({
      x: Math.min(96, Math.max(4, next.x)),
      y: Math.min(96, Math.max(4, next.y)),
    });
  };

  const roleDesc = labeling
    ? "Floor plan. Drag to draw the selected room."
    : interactive
      ? "Floor plan. Click or drag to place Wi‑Fi."
      : undefined;

  return (
    <div
      className={`home-floor-model status-${status}${quiet ? " tone-quiet" : ""}`}
      aria-label={label}
    >
      <div
        ref={stageRef}
        className={`floor-model-stage ${canInteract ? "is-interactive" : ""} ${dragging ? "is-dragging" : ""} ${!pinned && interactive && !labeling ? "needs-pin" : ""} ${labeling ? "is-labeling" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={canInteract ? handleKeyDown : undefined}
        role={canInteract ? "application" : undefined}
        tabIndex={canInteract ? 0 : undefined}
        aria-roledescription={roleDesc}
      >
        <div className="floor-plan-converted">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="floor-plan-converted-img"
              src={imageUrl}
              alt="Your floor plan"
              draggable={false}
            />
          ) : (
            <div className="floor-plan-converted-empty">No floor plan image</div>
          )}
          <div className="floor-plan-converted-veil" aria-hidden="true" />

          {/* Room boxes are data for presence — only draw while manually labeling */}
          {labeling ? (
            <div className="floor-room-overlay" aria-hidden="true">
              <RoomModelOverlay
                rooms={rooms}
                activeId={roomDrawing?.activeId}
                presenceRoom={presence?.room}
                draftBox={draftBox}
                draftLabel={
                  roomDrawing ? roomMeta(roomDrawing.activeId).label : undefined
                }
                quiet={quiet}
              />
            </div>
          ) : null}
        </div>

        {labeling && !draftBox && !rooms.some((room) => room.id === roomDrawing.activeId) ? (
          <div className="wifi-coach room-coach" aria-hidden="true">
            <IconHandClick size={18} stroke={1.8} />
            <strong>Drag a box</strong>
            <span>over {roomMeta(roomDrawing.activeId).label.toLowerCase()}</span>
          </div>
        ) : null}

        {interactive && !pinned && !labeling ? (
          <div className="wifi-coach" aria-hidden="true">
            <IconHandClick size={18} stroke={1.8} />
            <strong>Click or drag</strong>
            <span>to place the Wi‑Fi router on your plan</span>
          </div>
        ) : null}

        {!labeling ? (
          <div
            className={`floor-plan-wifi ${pinned ? "pinned" : "preview"} ${dragging && !labeling ? "dragging" : ""}`}
            style={{ left: `${wifiPos.x}%`, top: `${wifiPos.y}%` }}
            title={pinned ? "Wi‑Fi sensing point" : "Click or drag to place Wi‑Fi"}
          >
            <IconWifi size={16} stroke={2} />
          </div>
        ) : null}

        {presence ? (
          <motion.div
            className="floor-plan-human"
            aria-label="Grandpa"
            animate={{
              left: `${Math.min(92, Math.max(8, presence.x))}%`,
              top: `${Math.min(90, Math.max(10, presence.y))}%`,
            }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 110, damping: 20, mass: 0.8 }
            }
          >
            <GrandpaFigure posture={presence.posture} />
            <span className="floor-plan-human-label">Grandpa</span>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
