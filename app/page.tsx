"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Environment, Html, OrbitControls, RoundedBox } from "@react-three/drei";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Box,
  Check,
  ChevronRight,
  CircleAlert,
  EyeOff,
  HeartPulse,
  Pause,
  Play,
  Radio,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
  Wifi,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Stage = {
  id: string;
  chapter: string;
  title: string;
  subtitle: string;
  risk: "NORMAL" | "CHECK" | "CRITICAL";
  score: number;
  hours: string;
  color: string;
  signal: number;
  motion: number;
  body: string;
};

const STAGES: Stage[] = [
  {
    id: "ambient",
    chapter: "01 · SENSE",
    title: "A quiet home is still speaking.",
    subtitle: "Wi‑Fi reflections reveal motion without cameras or wearables.",
    risk: "NORMAL",
    score: 12,
    hours: "0.2h",
    color: "#b8ff54",
    signal: 92,
    motion: 84,
    body: "Routine movement detected across the living room and kitchen. Pattern matches Tanaka-san’s morning baseline.",
  },
  {
    id: "anomaly",
    chapter: "02 · REASON",
    title: "The pattern breaks.",
    subtitle: "Eight hours of silence becomes a question—not a conclusion.",
    risk: "CHECK",
    score: 74,
    hours: "8.0h",
    color: "#ffb020",
    signal: 18,
    motion: 6,
    body: "No room transitions since 08:12. Signal quality is stable, ruling out router failure with 94% confidence.",
  },
  {
    id: "order",
    chapter: "03 · ACT",
    title: "Care arrives as dinner.",
    subtitle: "The agent chooses the least intrusive next action.",
    risk: "CHECK",
    score: 78,
    hours: "8.1h",
    color: "#ffb020",
    signal: 16,
    motion: 4,
    body: "A hand-delivered bento is ordered through 7NOW. It is both a warm meal and a human welfare check.",
  },
  {
    id: "visit",
    chapter: "04 · VERIFY",
    title: "A human closes the loop.",
    subtitle: "The delivery partner checks for a response at the door.",
    risk: "CHECK",
    score: 82,
    hours: "8.6h",
    color: "#ff7a3d",
    signal: 12,
    motion: 2,
    body: "Courier arrived at 16:44. Two knocks, doorbell, and a voice call produced no response.",
  },
  {
    id: "escalate",
    chapter: "05 · PROTECT",
    title: "Now the right people know.",
    subtitle: "Evidence—not panic—is escalated to the family.",
    risk: "CRITICAL",
    score: 96,
    hours: "8.8h",
    color: "#ff5c44",
    signal: 9,
    motion: 0,
    body: "High-confidence anomaly confirmed by an unanswered delivery. Family and care coordinator notified with full context.",
  },
];

const ROOMS = [
  { id: "living", label: "LIVING", x: -2.1, z: 0.9, w: 3.9, d: 3.25, tone: "#d9ddcc" },
  { id: "kitchen", label: "KITCHEN", x: 1.85, z: 1.15, w: 2.7, d: 2.75, tone: "#ced4c6" },
  { id: "bedroom", label: "BEDROOM", x: -1.8, z: -2.0, w: 4.5, d: 2.35, tone: "#e4e0d1" },
  { id: "bath", label: "BATH", x: 2.1, z: -1.8, w: 2.2, d: 2.7, tone: "#c9d6d4" },
];

function SignalRing({ index, color }: { index: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const phase = (clock.elapsedTime * 0.35 + index * 0.27) % 1;
    const scale = 0.45 + phase * 4.8;
    ref.current.scale.setScalar(scale);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, 0.36 * (1 - phase));
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.11, 0]}>
      <ringGeometry args={[0.48, 0.5, 64]} />
      <meshBasicMaterial color={color} transparent depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function PersonSignal({ stage }: { stage: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = 0.43 + Math.sin(clock.elapsedTime * 2.2) * 0.055;
  });
  const active = stage === 0;
  return (
    <group ref={ref} position={stage === 0 ? [-1.55, 0.43, 0.45] : [-1.8, 0.43, -2.0]}>
      <pointLight color={active ? "#b8ff54" : "#ffb020"} intensity={active ? 4 : 1.4} distance={2.8} />
      <mesh>
        <sphereGeometry args={[0.16, 28, 28]} />
        <meshStandardMaterial
          color={active ? "#b8ff54" : "#ffb020"}
          emissive={active ? "#b8ff54" : "#ffb020"}
          emissiveIntensity={2.8}
          transparent
          opacity={stage >= 2 ? 0.16 : 1}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.29, 0]}>
        <ringGeometry args={[0.25, 0.31, 32]} />
        <meshBasicMaterial color={active ? "#b8ff54" : "#ffb020"} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function Room({ room, highlighted, alert }: { room: (typeof ROOMS)[number]; highlighted: boolean; alert: boolean }) {
  const glow = alert ? "#ff5c44" : "#ffb020";
  return (
    <group position={[room.x, 0, room.z]}>
      <RoundedBox args={[room.w, 0.15, room.d]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color={highlighted ? glow : room.tone} roughness={0.78} metalness={0.04} />
        <Edges color={highlighted ? glow : "#223129"} threshold={15} />
      </RoundedBox>
      {highlighted && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.095, 0]}>
          <planeGeometry args={[room.w * 0.94, room.d * 0.9]} />
          <meshBasicMaterial color={glow} transparent opacity={alert ? 0.19 : 0.11} />
        </mesh>
      )}
      <Html center position={[0, 0.22, room.d * 0.32]} transform distanceFactor={7}>
        <span className="room-label">{room.label}</span>
      </Html>
    </group>
  );
}

function HouseModel({ stage }: { stage: number }) {
  const warning = stage >= 1;
  const critical = stage === 4;
  return (
    <group rotation={[0, -0.08, 0]}>
      {ROOMS.map((room) => (
        <Room key={room.id} room={room} highlighted={warning && room.id === "bedroom"} alert={critical} />
      ))}

      <RoundedBox args={[3.2, 0.65, 0.78]} radius={0.09} position={[-2.2, 0.48, 1.7]}>
        <meshStandardMaterial color="#59655c" roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[1.15, 0.26, 2.1]} radius={0.06} position={[1.7, 0.26, 1.25]}>
        <meshStandardMaterial color="#718078" roughness={0.74} />
      </RoundedBox>
      <RoundedBox args={[2.6, 0.34, 1.25]} radius={0.09} position={[-1.95, 0.33, -2]}>
        <meshStandardMaterial color="#a89f8e" roughness={0.82} />
      </RoundedBox>
      <mesh position={[0.05, 0.45, 0.7]}>
        <cylinderGeometry args={[0.38, 0.46, 0.12, 36]} />
        <meshStandardMaterial color="#1d2923" roughness={0.5} metalness={0.3} />
      </mesh>

      <group position={[-0.15, 0.24, 1.25]}>
        <RoundedBox args={[0.44, 0.32, 0.18]} radius={0.05}>
          <meshStandardMaterial color="#101813" metalness={0.5} roughness={0.35} />
        </RoundedBox>
        <pointLight color={warning ? "#ffb020" : "#b8ff54"} intensity={2.8} distance={1.8} />
        {[0, 1, 2, 3].map((index) => (
          <SignalRing key={index} index={index} color={warning ? "#ffb020" : "#b8ff54"} />
        ))}
      </group>
      <PersonSignal stage={stage} />
    </group>
  );
}

function DigitalTwin({ stage }: { stage: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="twin-loading" aria-label="Loading 3D home model">
        <span><Box size={18} /> ASSEMBLING DIGITAL TWIN</span>
      </div>
    );
  }

  return (
    <Canvas camera={{ position: [7.4, 7.6, 8.2], fov: 37 }} dpr={[1, 1.65]} gl={{ antialias: true }}>
      <color attach="background" args={["#101914"]} />
      <fog attach="fog" args={["#101914", 11, 22]} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[4, 9, 5]} intensity={3.6} color="#fff4df" castShadow />
      <Suspense fallback={null}>
        <HouseModel stage={stage} />
        <Environment preset="warehouse" />
      </Suspense>
      <OrbitControls
        makeDefault
        enablePan={false}
        minPolarAngle={0.7}
        maxPolarAngle={1.18}
        minDistance={8}
        maxDistance={15}
        target={[0, 0, -0.3]}
        autoRotate={stage === 0}
        autoRotateSpeed={0.35}
      />
    </Canvas>
  );
}

function MiniWave({ stage, color }: { stage: number; color: string }) {
  const points = useMemo(() => {
    const count = 88;
    return Array.from({ length: count }, (_, i) => {
      const activity = stage === 0 ? 1 : Math.max(0.08, 0.38 - stage * 0.075);
      return 30 + Math.sin(i * 0.48) * 12 * activity + Math.sin(i * 1.61) * 7 * activity;
    });
  }, [stage]);
  const path = points.map((y, i) => `${i === 0 ? "M" : "L"}${(i / (points.length - 1)) * 800},${y}`).join(" ");
  return (
    <svg viewBox="0 0 800 60" preserveAspectRatio="none" className="wave-svg" aria-label="Live CSI signal waveform">
      <defs>
        <linearGradient id="waveFade" x1="0" x2="1">
          <stop offset="0" stopColor={color} stopOpacity="0" />
          <stop offset=".14" stopColor={color} />
          <stop offset=".86" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[10, 30, 50].map((y) => <line key={y} x1="0" x2="800" y1={y} y2={y} stroke="#33443a" strokeWidth=".55" />)}
      <motion.path
        d={path}
        fill="none"
        stroke="url(#waveFade)"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9 }}
      />
    </svg>
  );
}

function StageIcon({ index }: { index: number }) {
  const Icon = [Radio, CircleAlert, Box, Truck, HeartPulse][index];
  return <Icon size={15} strokeWidth={1.8} />;
}

export default function Home() {
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [details, setDetails] = useState(false);
  const current = STAGES[stage];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStage((value) => {
        if (value >= STAGES.length - 1) {
          setPlaying(false);
          return value;
        }
        return value + 1;
      });
    }, 4300);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setStage((value) => Math.min(STAGES.length - 1, value + 1));
      if (event.key === "ArrowLeft") setStage((value) => Math.max(0, value - 1));
      if (event.key === " ") {
        event.preventDefault();
        setPlaying((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const reset = () => {
    setStage(0);
    setPlaying(false);
  };

  return (
    <main className="app-shell" style={{ "--stage-color": current.color } as React.CSSProperties}>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Agent Bento home">
          <span className="brand-mark"><span /><span /><span /></span>
          <span>AGENT BENTO</span>
        </a>
        <div className="topbar-center">
          <span className="live-dot" /> LIVE DIGITAL TWIN
          <span className="divider" /> SETAGAYA · HOME 04
        </div>
        <div className="topbar-actions">
          <button className="icon-btn" onClick={reset} aria-label="Reset demo" title="Reset demo"><RotateCcw size={16} /></button>
          <button className="run-button" onClick={() => setPlaying((value) => !value)}>
            {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
            {playing ? "PAUSE STORY" : stage === 0 ? "RUN THE STORY" : "RESUME STORY"}
          </button>
        </div>
      </header>

      <section className="stage-strip" aria-label="Demo stages">
        {STAGES.map((item, index) => (
          <button
            key={item.id}
            className={`stage-tab ${index === stage ? "active" : ""} ${index < stage ? "passed" : ""}`}
            onClick={() => { setStage(index); setPlaying(false); }}
          >
            <span className="stage-index">{index < stage ? <Check size={12} /> : `0${index + 1}`}</span>
            <StageIcon index={index} />
            <span>{item.id.toUpperCase()}</span>
          </button>
        ))}
      </section>

      <section className="dashboard" id="top">
        <div className="visual-panel">
          <div className="panel-heading">
            <div>
              <p>{current.chapter}</p>
              <h1>{current.title}</h1>
              <span>{current.subtitle}</span>
            </div>
            <div className={`risk-badge ${current.risk.toLowerCase()}`}>
              <i /> {current.risk}
            </div>
          </div>

          <div className="twin-stage">
            <DigitalTwin stage={stage} />
            <div className="model-grid" />
            <div className="model-caption left-caption">
              <span><Wifi size={13} /> ESP32-S3 · CSI</span>
              <b>5.18 GHz</b>
            </div>
            <div className="model-caption right-caption">
              <span><EyeOff size={13} /> PRIVACY MODE</span>
              <b>NO IMAGE DATA</b>
            </div>
            <div className="drag-hint">DRAG TO ORBIT · SCROLL TO ZOOM</div>
          </div>

          <div className="signal-dock">
            <div className="signal-name">
              <span className="pulse-icon"><Activity size={16} /></span>
              <div><b>CHANNEL STATE</b><small>LIVE · 20 Hz</small></div>
            </div>
            <MiniWave stage={stage} color={current.color} />
            <div className="signal-metric"><span>VARIANCE</span><b>{(current.signal / 8.2).toFixed(2)}</b></div>
          </div>
        </div>

        <aside className="analysis-panel">
          <div className="analysis-topline">
            <span>AGENT ANALYSIS</span>
            <span className="model-chip"><Sparkles size={11} /> QWEN · LIVE</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
              className="analysis-content"
            >
              <div className="score-row">
                <div className="score-ring" style={{ background: `conic-gradient(${current.color} ${current.score * 3.6}deg, #263229 0deg)` }}>
                  <div><b>{current.score}</b><span>/100</span></div>
                </div>
                <div className="score-copy">
                  <span>CARE RISK INDEX</span>
                  <strong>{current.risk === "NORMAL" ? "Within routine" : current.risk === "CHECK" ? "Check recommended" : "Response required"}</strong>
                  <small>Updated just now</small>
                </div>
              </div>

              <p className="agent-narrative">“{current.body}”</p>

              <div className="evidence-block">
                <div className="section-label"><span>EVIDENCE</span><span>{current.hours} OBSERVED</span></div>
                <div className="metric-row">
                  <div><span>Motion variance</span><b>{current.motion}%</b></div>
                  <div className="bar"><motion.i animate={{ width: `${current.motion}%` }} style={{ backgroundColor: current.color }} /></div>
                </div>
                <div className="metric-row">
                  <div><span>Signal integrity</span><b>94%</b></div>
                  <div className="bar"><i style={{ width: "94%", backgroundColor: "#8ca99a" }} /></div>
                </div>
                <div className="metric-row">
                  <div><span>Routine deviation</span><b>{Math.max(8, current.score - 6)}%</b></div>
                  <div className="bar"><motion.i animate={{ width: `${Math.max(8, current.score - 6)}%` }} style={{ backgroundColor: current.color }} /></div>
                </div>
              </div>

              <button className="reasoning-toggle" onClick={() => setDetails((value) => !value)} aria-expanded={details}>
                <span><ShieldCheck size={16} /> WHY THIS DECISION</span>
                <ChevronRight size={16} className={details ? "rotate" : ""} />
              </button>
              <AnimatePresence>
                {details && (
                  <motion.div className="reasoning" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <span>01</span><p>Passive signal anomaly detected</p>
                    <span>02</span><p>Hardware and network health verified</p>
                    <span>03</span><p>Lowest-risk human intervention selected</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={`agent-action stage-${stage}`}>
                <div className="action-icon">{stage < 2 ? <Radio /> : stage === 2 ? <Box /> : stage === 3 ? <Truck /> : <HeartPulse />}</div>
                <div>
                  <span>AGENT ACTION</span>
                  <b>{stage === 0 ? "Continue passive monitoring" : stage === 1 ? "Prepare low-friction check" : stage === 2 ? "Bento dispatched · #7N-2048" : stage === 3 ? "Courier verification in progress" : "Family & care team notified"}</b>
                </div>
                {stage >= 2 && <Check className="action-check" size={18} />}
              </div>
            </motion.div>
          </AnimatePresence>
        </aside>
      </section>

      <footer className="story-footer">
        <div><span>THE IDEA</span><b>Care that watches over you—without watching you.</b></div>
        <button onClick={() => setStage((value) => Math.min(STAGES.length - 1, value + 1))} disabled={stage === STAGES.length - 1}>
          NEXT CHAPTER <ArrowRight size={15} />
        </button>
      </footer>
    </main>
  );
}
