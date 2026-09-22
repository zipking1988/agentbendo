"use client";

import { CareLog } from "@/app/dashboard/CareLog";
import { HomeFloorModel } from "@/app/dashboard/HomeFloorModel";
import { ServiceStatusPanel } from "@/app/dashboard/ServiceStatusPanel";
import { StatusHero } from "@/app/dashboard/StatusHero";
import {
  activityLabel,
  buildActivityTrail,
  demoCarePresentation,
  demoCareStageAt,
  frameAt,
  loadDemoFrames,
  logsUpTo,
  roomLabel,
  translateStatusReason,
  type ActivityTrailItem,
  type DemoFramesData,
} from "@/lib/demo-frames";
import { DEMO_FLOOR_PLAN_URL, mapPresence, type HomeSetup } from "@/lib/home-setup";
import IconArrowLeft from "@tabler/icons-react/dist/esm/icons/IconArrowLeft.mjs";
import IconUpload from "@tabler/icons-react/dist/esm/icons/IconUpload.mjs";
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
  const [data, setData] = useState<DemoFramesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("calm");
  const [playing, setPlaying] = useState(false);
  const [technicalOpen, setTechnicalOpen] = useState(false);
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

    const next = tRef.current + delta;
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
    const target = start;
    tRef.current = target;
    setT(target);
    setMode("replay");
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
  const logs = logsUpTo(data.meta.bendoLog, mode === "calm" ? data.meta.duration : viewT);
  const motionPct = Math.round(Math.max(0, Math.min(1, frame.motionLevel)) * 100);
  const stillSeconds = Math.max(0, Math.round(frame.stillDuration));
  const statusReason = translateStatusReason(frame.statusReason);
  const stage = demoCareStageAt(viewT, data.meta.careTimeline);
  const presentation = demoCarePresentation(stage);
  const status = presentation.tone;
  const displayedActivity = stage === "resident_responding"
    ? "Responding to the courier"
    : stage === "check_in_complete"
      ? "Check-in confirmed"
      : activityLabel(frame.activity);
  const mapSource = homeSetup.floorPlanDataUrl === DEMO_FLOOR_PLAN_URL
    ? "Sample floor plan"
    : "Your uploaded floor plan";

  return (
    <section className={`dashboard-shell mode-${mode} status-${status}`}>
      <div className="dashboard-status">
        <Link className="dashboard-back" href="/">
          <IconArrowLeft size={16} />
          Back to the story
        </Link>

        <StatusHero
          stage={stage}
          currentRoom={roomLabel(presence.room)}
          currentActivity={displayedActivity}
          playing={playing}
          mode={mode}
          onPlay={handlePlay}
          onPause={handlePause}
          onRestart={handleRestart}
        />

      </div>

      <aside className="dashboard-map">
        <div className={`monitor-plan status-${status}`}>
          <div className="monitor-plan-toolbar">
            <p className="monitor-plan-kicker">{mapSource.toUpperCase()}</p>
            <button type="button" className="reset-floor-btn" onClick={onResetSetup}>
              <IconUpload size={15} stroke={1.9} />
              Change floor plan
            </button>
          </div>
          <HomeFloorModel
            imageUrl={homeSetup.floorPlanDataUrl}
            wifi={homeSetup.wifi}
            rooms={homeSetup.rooms}
            presence={presence}
            status={status}
            compactWifi
            label={mapSource}
          />
          <p className="home-map-caption">
            <strong>{roomLabel(presence.room)}</strong>
            <span>{displayedActivity}</span>
          </p>
          <p className="home-map-source">{mapSource}</p>
        </div>
      </aside>

      <div className="dashboard-care">
        <CareLog entries={logs} mode={mode} />
      </div>

      <div className="dashboard-story">
        <div className="dashboard-panel-head dashboard-story-head">
          <p className="dashboard-panel-kicker">{mode === "replay" ? "REPLAY" : "TODAY"}</p>
          <h2>{mode === "replay" ? "Care story scenes" : "Movement history"}</h2>
        </div>
        {mode === "replay" ? (
          <div className="scene-rail" role="group" aria-label="Sofa-nap check-in story scenes">
            {data.meta.careTimeline.map((item) => {
              const copy = demoCarePresentation(item.stage);
              const active = stage === item.stage;
              const complete = viewT >= item.end;
              return (
                <button
                  key={item.stage}
                  type="button"
                  aria-pressed={active}
                  className={`scene-rail-item ${active ? "active" : ""} ${complete && !active ? "complete" : ""}`}
                  onClick={() => jumpToScene(item.start)}
                >
                  <span className="scene-rail-id">{`${Math.floor(item.start / 60)}:${String(item.start % 60).padStart(2, "0")}`}</span>
                  <span className="scene-rail-text">
                    <strong>{copy.title}</strong>
                    <small>{copy.lead}</small>
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

      <details
        className="technical-details"
        open={technicalOpen}
        onToggle={(event) => setTechnicalOpen(event.currentTarget.open)}
      >
        <summary>
          <span>Technical demo details</span>
          <small>Simulated signal field and service status</small>
        </summary>
        <div className="technical-details-body">
          <div className="sensing-meters" aria-label="Movement sensing">
            <div className="meter">
              <div className="meter-head"><span>Motion</span><strong>{motionPct}%</strong></div>
              <div className="meter-track"><div className="meter-fill motion" style={{ width: `${motionPct}%` }} /></div>
            </div>
            <div className="meter">
              <div className="meter-head"><span>Stillness</span><strong>{stillSeconds}s</strong></div>
              <div className="meter-track">
                <div className="meter-fill still" style={{ width: `${Math.min(100, (stillSeconds / 510) * 100)}%` }} />
              </div>
            </div>
            {statusReason ? <p className="sensing-reason">{statusReason}</p> : null}
          </div>

          {technicalOpen ? (
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
          ) : null}
          <ServiceStatusPanel />
        </div>
      </details>
    </section>
  );
}
