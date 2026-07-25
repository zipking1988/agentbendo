"use client";

import { CareLog } from "@/app/dashboard/CareLog";
import { HomeFloorModel } from "@/app/dashboard/HomeFloorModel";
import { ServiceStatusPanel } from "@/app/dashboard/ServiceStatusPanel";
import { StatusHero } from "@/app/dashboard/StatusHero";
import {
  activityLabel,
  buildActivityTrail,
  frameAt,
  loadDemoFrames,
  logsUpTo,
  roomLabel,
  sceneCopy,
  sceneFor,
  translateStatusReason,
  type ActivityTrailItem,
  type DemoFramesData,
} from "@/lib/demo-frames";
import { mapPresence, type HomeSetup } from "@/lib/home-setup";
import IconArrowLeft from "@tabler/icons-react/dist/esm/icons/IconArrowLeft.mjs";
import IconUpload from "@tabler/icons-react/dist/esm/icons/IconUpload.mjs";
import { useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";

const CsiSignalField = dynamic(
  () => import("./CsiSignalField").then((m) => m.CsiSignalField),
  {
    ssr: false,
    loading: () => (
      <div className="csi-field-loading" aria-hidden>
        Loading CSI field…
      </div>
    ),
  },
);

type Mode = "calm" | "replay";

const IDLE_T = 149.9;

type FamilyBoardProps = {
  homeSetup: HomeSetup;
  onResetSetup: () => void;
};

export function FamilyBoard({ homeSetup, onResetSetup }: FamilyBoardProps) {
  const reduceMotion = useReducedMotion();
  const [data, setData] = useState<DemoFramesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("calm");
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(IDLE_T);
  const [trail, setTrail] = useState<ActivityTrailItem[]>([]);

  const tRef = useRef(IDLE_T);
  const lastStampRef = useRef<number | null>(null);
  const lastUiRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    loadDemoFrames()
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        setTrail(buildActivityTrail(payload.frames, 5));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load simulation");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onFrame = useEffectEvent((now: number): boolean => {
    if (!data) return false;

    const last = lastStampRef.current ?? now;
    const delta = Math.min(0.08, (now - last) / 1000);
    lastStampRef.current = now;

    const speed = reduceMotion ? 4 : 1;
    const next = tRef.current + delta * speed;
    const end = data.meta.duration;

    if (next >= end) {
      setPlaying(false);
      setMode("calm");
      tRef.current = IDLE_T;
      setT(IDLE_T);
      return false;
    }

    tRef.current = next;
    if (now - lastUiRef.current >= 80) {
      lastUiRef.current = now;
      setT(next);
    }
    return true;
  });

  useEffect(() => {
    if (!playing) {
      lastStampRef.current = null;
      return;
    }

    let raf = 0;
    const loop = (now: number) => {
      if (onFrame(now)) {
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const handlePlay = () => {
    if (!data) return;
    if (mode === "calm") {
      tRef.current = 0;
      setT(0);
      setMode("replay");
    }
    setPlaying(true);
  };

  const handlePause = () => {
    setPlaying(false);
  };

  const handleRestart = () => {
    tRef.current = 0;
    setT(0);
    setMode("replay");
    setPlaying(true);
  };

  const jumpToScene = (start: number) => {
    if (!data) return;
    const target = reduceMotion
      ? Math.max(start, Math.min(start + 0.01, data.meta.duration - 0.05))
      : start;
    tRef.current = target;
    setT(target);
    setMode("replay");
    if (!playing) setPlaying(true);
  };

  if (error) {
    return (
      <section className="dashboard-shell">
        <p className="dashboard-lead">Could not load the care story. {error}</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="dashboard-shell dashboard-loading">
        <p className="dashboard-lead">Loading simulated care feed…</p>
      </section>
    );
  }

  const viewT = mode === "calm" ? IDLE_T : t;
  const frame = frameAt(data.frames, viewT);
  const presence = mapPresence(
    {
      room: frame.room,
      x: frame.x,
      y: frame.y,
      posture: frame.posture,
    },
    homeSetup.rooms,
    data.meta.rooms,
  );
  const scene = sceneFor(data.meta.scenes, viewT);
  const logs = logsUpTo(data.meta.bendoLog, mode === "calm" ? data.meta.duration : viewT);
  const motionPct = Math.round(Math.max(0, Math.min(1, frame.motionLevel)) * 100);
  const stillSeconds = Math.max(0, Math.round(frame.stillDuration));
  const statusReason = translateStatusReason(frame.statusReason);
  const status = mode === "calm" ? "normal" : frame.status;

  return (
    <section className={`dashboard-shell mode-${mode} status-${status}`}>
      <div className="dashboard-copy">
        <Link className="dashboard-back" href="/">
          <IconArrowLeft size={16} />
          Back to the story
        </Link>

        <StatusHero
          status={frame.status}
          sceneId={scene.id}
          playing={playing}
          mode={mode}
          onPlay={handlePlay}
          onPause={handlePause}
          onRestart={handleRestart}
        />

        {mode === "replay" ? (
          <div className="scene-rail" role="tablist" aria-label="Care story scenes">
            {data.meta.scenes.map((item) => {
              const copy = sceneCopy(item);
              const active = scene.id === item.id;
              const complete = viewT >= item.end;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`scene-rail-item ${active ? "active" : ""} ${complete && !active ? "complete" : ""}`}
                  onClick={() => jumpToScene(item.start)}
                >
                  <span className="scene-rail-id">{item.id}</span>
                  <span className="scene-rail-text">
                    <strong>{copy.label}</strong>
                    <small>{copy.desc}</small>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <ol className="dashboard-trail calm-trail" aria-label="Today’s movement trail">
            {trail.map((item, index) => (
              <li key={`${item.t}-${item.room}`} className={index === 0 ? "on" : ""}>
                <span className="act-time">{item.timeLabel}</span>
                <div className="act-copy">
                  <strong>{item.room}</strong>
                  <span>{item.note}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <aside className="dashboard-side">
        <div className={`monitor-plan status-${status}`}>
          <div className="monitor-plan-toolbar">
            <p className="monitor-plan-kicker">YOUR FLOOR PLAN</p>
            <button
              type="button"
              className="reset-floor-btn"
              onClick={onResetSetup}
            >
              <IconUpload size={15} stroke={1.9} />
              Re-upload floor plan
            </button>
          </div>
          <HomeFloorModel
            imageUrl={homeSetup.floorPlanDataUrl}
            wifi={homeSetup.wifi}
            rooms={homeSetup.rooms}
            presence={presence}
            status={status}
            label="Your floor plan"
          />
          <p className="home-map-caption">
            <strong>{roomLabel(presence.room)}</strong>
            <span>{activityLabel(frame.activity)}</span>
          </p>
          <p className="home-map-source">
            Your uploaded floor plan
          </p>
        </div>

        <div className="sensing-meters" aria-label="Movement sensing">
          <div className="meter">
            <div className="meter-head">
              <span>Motion</span>
              <strong>{motionPct}%</strong>
            </div>
            <div className="meter-track">
              <div className="meter-fill motion" style={{ width: `${motionPct}%` }} />
            </div>
          </div>
          <div className="meter">
            <div className="meter-head">
              <span>Stillness</span>
              <strong>{stillSeconds}s</strong>
            </div>
            <div className="meter-track">
              <div
                className="meter-fill still"
                style={{ width: `${Math.min(100, (stillSeconds / 510) * 100)}%` }}
              />
            </div>
          </div>
          {statusReason ? <p className="sensing-reason">{statusReason}</p> : null}
        </div>

        <CsiSignalField
          motionLevel={frame.motionLevel}
          stillDuration={frame.stillDuration}
          anomalyScore={frame.anomalyScore}
          status={status}
          t={viewT}
          presenceX={presence.x}
          presenceY={presence.y}
          wifiX={homeSetup.wifi.x}
          wifiY={homeSetup.wifi.y}
        />


        <ServiceStatusPanel />
        <CareLog entries={logs} mode={mode} />
      </aside>
    </section>
  );
}
