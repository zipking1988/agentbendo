"use client";

import { translateLogText, type DemoLogEntry } from "@/lib/demo-frames";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type CareLogProps = {
  entries: DemoLogEntry[];
  mode: "calm" | "replay";
};

function formatClock(t: number): string {
  const minutes = Math.floor(t / 60);
  const seconds = Math.floor(t % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function CareLog({ entries, mode }: CareLogProps) {
  const reduceMotion = useReducedMotion();
  const visible = mode === "calm" ? entries.slice(-4) : entries.slice(-8);

  return (
    <div className="care-log" aria-live="polite">
      <div className="dashboard-panel-head">
        <p className="dashboard-panel-kicker">{mode === "calm" ? "TODAY" : "CARE LOG"}</p>
        <h2>{mode === "calm" ? "Recent care notes" : "What Agent Bento did"}</h2>
        <p>
          {mode === "calm"
            ? "Simulated notes from the quiet check-in story."
            : "Events appear as the story unfolds."}
        </p>
        <p className="care-log-time-label">Times below are replay time.</p>
      </div>

      <ol className="care-log-list">
        <AnimatePresence initial={false}>
          {visible.map((entry) => (
            <motion.li
              key={`${entry.t}-${entry.text}`}
              className={`care-log-item level-${entry.level}`}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.28 }}
            >
              <span className="act-time">{formatClock(entry.t)}</span>
              <div className="act-copy">
                <span>{translateLogText(entry.text)}</span>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </div>
  );
}
