"use client";

import { type CareStatus } from "@/lib/demo-frames";
import { type WifiPin } from "@/lib/home-setup";
import IconWifi from "@tabler/icons-react/dist/esm/icons/IconWifi.mjs";
import { motion, useReducedMotion } from "framer-motion";
import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

type HomeFloorModelProps = {
  imageUrl?: string | null;
  wifi: WifiPin | null;
  presence?: {
    x: number;
    y: number;
    room: string;
    posture?: string;
  } | null;
  status?: CareStatus;
  compactWifi?: boolean;
  interactive?: boolean;
  onPin?: (pin: WifiPin) => void;
  label?: string;
};

function pinFromEvent(el: HTMLElement, clientX: number, clientY: number): WifiPin {
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
      <g fill="none" stroke="#071018" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round">
        {limb}
      </g>
      <circle cx="20" cy="10" r="8.2" fill="#071018" />
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        {limb}
      </g>
      <circle cx="20" cy="10" r="7" fill="currentColor" stroke="#071018" strokeWidth="1.5" />
    </svg>
  );
}

export function HomeFloorModel({
  imageUrl = null,
  wifi,
  presence = null,
  status = "normal",
  compactWifi = false,
  interactive = false,
  onPin,
  label = "Floor plan",
}: HomeFloorModelProps) {
  const reduceMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const canInteract = interactive && onPin != null;

  const applyWifi = (clientX: number, clientY: number) => {
    if (!onPin || !stageRef.current) return;
    onPin(pinFromEvent(stageRef.current, clientX, clientY));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canInteract || !stageRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    applyWifi(event.clientX, event.clientY);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    applyWifi(event.clientX, event.clientY);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // The browser may release capture before pointer cancellation is delivered.
    }
  };

  return (
    <div className={`home-floor-model status-${status}`} aria-label={canInteract ? undefined : label}>
      <div
        ref={stageRef}
        className={`floor-model-stage ${canInteract ? "is-interactive" : ""} ${dragging ? "is-dragging" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role={canInteract ? "group" : undefined}
        aria-label={canInteract ? label : undefined}
        aria-description={canInteract ? "Interactive floor plan. Click or drag to move the Wi-Fi router. Keyboard position controls follow the plan." : undefined}
      >
        <div className="floor-plan-converted">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="floor-plan-converted-img"
              src={imageUrl}
              alt={`${label} background`}
              draggable={false}
            />
          ) : (
            <div className="floor-plan-converted-empty">No floor plan image</div>
          )}
          <div className="floor-plan-converted-veil" aria-hidden="true" />
        </div>

        {wifi ? (
          <div
            className={`floor-plan-wifi pinned ${compactWifi ? "compact" : ""} ${wifi.x > 72 ? "edge-right" : ""} ${dragging ? "dragging" : ""}`}
            style={{ left: `${wifi.x}%`, top: `${wifi.y}%` }}
            title="Wi-Fi sensing point"
            aria-label="Wi-Fi router location"
          >
            <IconWifi size={16} stroke={2} aria-hidden="true" />
            <span className="floor-plan-wifi-label">Wi-Fi router</span>
          </div>
        ) : null}

        {presence ? (
          <motion.div
            className={`floor-plan-human ${presence.x > 72 ? "edge-right" : ""}`}
            aria-label="Grandpa"
            animate={{
              left: `${Math.min(92, Math.max(8, presence.x))}%`,
              top: `${Math.min(90, Math.max(10, presence.y))}%`,
            }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 110, damping: 20, mass: 0.8 }}
          >
            <GrandpaFigure posture={presence.posture} />
            <span className="floor-plan-human-label">Grandpa</span>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
