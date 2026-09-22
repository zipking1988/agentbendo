"use client";

import {
  demoCarePresentation,
  type DemoCareStage,
} from "@/lib/demo-frames";
import IconPlayerPause from "@tabler/icons-react/dist/esm/icons/IconPlayerPause.mjs";
import IconPlayerPlay from "@tabler/icons-react/dist/esm/icons/IconPlayerPlay.mjs";
import IconRefresh from "@tabler/icons-react/dist/esm/icons/IconRefresh.mjs";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type StatusHeroProps = {
  stage: DemoCareStage;
  currentRoom: string;
  currentActivity: string;
  playing: boolean;
  mode: "calm" | "replay";
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
};

export function StatusHero({
  stage,
  currentRoom,
  currentActivity,
  playing,
  mode,
  onPlay,
  onPause,
  onRestart,
}: StatusHeroProps) {
  const reduceMotion = useReducedMotion();
  const { title, lead, chip, tone } = demoCarePresentation(stage);

  return (
    <div className={`status-hero status-${tone}`}>
      <p className="eyebrow"><span /> FAMILY VIEW · SOFA-NAP CHECK-IN EXAMPLE</p>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {title}. {lead}
      </p>

      <AnimatePresence mode="wait">
        <motion.h1
          key={title}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
        >
          {title}
        </motion.h1>
      </AnimatePresence>

      <p className="dashboard-lead">{lead}</p>

      <motion.div
        className="dashboard-live"
        key={chip}
        initial={reduceMotion ? false : { opacity: 0.5 }}
        animate={{ opacity: 1 }}
      >
        <span className="status-pulse" />
        {chip}
      </motion.div>

      <div className="current-location" aria-label={`Current room: ${currentRoom}. ${currentActivity}`}>
        <span>CURRENT ROOM</span>
        <strong>{currentRoom}</strong>
        <small>{currentActivity}</small>
      </div>

      <div className="dashboard-cta-row">
        {mode === "calm" || !playing ? (
          <button type="button" className="play-button dashboard-play" onClick={onPlay}>
            <IconPlayerPlay size={18} stroke={2} />
            {mode === "calm" ? "Replay the sofa-nap check-in" : "Continue story"}
          </button>
        ) : (
          <button type="button" className="play-button dashboard-play" onClick={onPause}>
            <IconPlayerPause size={18} stroke={2} />
            Pause story
          </button>
        )}

        {mode === "replay" ? (
          <button type="button" className="dashboard-ghost" onClick={onRestart}>
            <IconRefresh size={16} stroke={1.8} />
            Restart
          </button>
        ) : null}
      </div>
    </div>
  );
}
