"use client";

import {
  simulateCsi,
  type CareStatus,
  type CsiSimSample,
} from "@/lib/csi-sim";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Props = {
  motionLevel: number;
  stillDuration: number;
  anomalyScore: number;
  status: CareStatus;
  t: number;
  presenceX: number;
  presenceY: number;
  wifiX: number;
  wifiY: number;
};

type LiveProps = Props & {
  reduceMotion: boolean;
  onSample: (sample: CsiSimSample) => void;
};

const GRID = 24;
const MAX_PARTICLES = 140;
const LIME = "#7CFF6B";
const JOINT = "#FF4D4D";
const WAVE = "#4DE1FF";

function pctXZ(xPct: number, yPct: number): [number, number] {
  return [(xPct / 100 - 0.5) * 10, (yPct / 100 - 0.5) * 8];
}

function seededUnit(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function createParticlePositions(wifi: [number, number, number]): Float32Array {
  const positions = new Float32Array(MAX_PARTICLES * 3);
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const seedA = seededUnit(i * 3 + 1);
    const seedB = seededUnit(i * 3 + 2);
    const seedC = seededUnit(i * 3 + 3);
    positions[i * 3] = wifi[0] + (seedA - 0.5) * 4;
    positions[i * 3 + 1] = 0.2 + seedB * 2;
    positions[i * 3 + 2] = wifi[2] + (seedC - 0.5) * 4;
  }
  return positions;
}

/** Lime wireframe skeleton with red joints + soft aura */
function WireSkeleton({
  position,
  sample,
}: {
  position: [number, number, number];
  sample: CsiSimSample;
}) {
  const group = useRef<THREE.Group>(null);
  const aura = useRef<THREE.Mesh>(null);

  const joints: [number, number, number][] = [
    [0, 1.78, 0], // head
    [0, 1.52, 0], // neck
    [0, 1.2, 0], // chest
    [-0.42, 1.28, 0],
    [0.42, 1.28, 0],
    [-0.72, 0.95, 0.05],
    [0.72, 0.95, 0.05],
    [0, 0.85, 0], // hip
    [-0.18, 0.45, 0],
    [0.18, 0.45, 0],
    [-0.2, 0.08, 0.05],
    [0.2, 0.08, 0.05],
  ];

  const bones: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [2, 4],
    [3, 5],
    [4, 6],
    [2, 7],
    [7, 8],
    [7, 9],
    [8, 10],
    [9, 11],
  ];

  const linePositions = (() => {
    const arr: number[] = [];
    for (const [a, b] of bones) {
      const pa = joints[a];
      const pb = joints[b];
      arr.push(pa[0], pa[1], pa[2], pb[0], pb[1], pb[2]);
    }
    return new Float32Array(arr);
  })();

  useFrame(({ clock }) => {
    const pulse = 1 + sample.microMotion * 0.06 * Math.sin(clock.elapsedTime * 2.4);
    if (group.current) group.current.scale.setScalar(pulse);
    if (aura.current) {
      const s = 1.1 + sample.microMotion * 0.55;
      aura.current.scale.setScalar(s);
      (aura.current.material as THREE.MeshBasicMaterial).opacity =
        0.12 + sample.microMotion * 0.28;
    }
  });

  return (
    <group ref={group} position={position}>
      {/* Aura / halo */}
      <mesh ref={aura} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.85, 48]} />
        <meshBasicMaterial color={LIME} transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.7, 0.95, 48]} />
        <meshBasicMaterial color={LIME} transparent opacity={0.35} depthWrite={false} />
      </mesh>

      {/* Bones */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={LIME} linewidth={2} />
      </lineSegments>

      {/* Joints */}
      {joints.map((j, i) => (
        <mesh key={i} position={j}>
          <sphereGeometry args={[i === 0 ? 0.09 : 0.055, 12, 12]} />
          <meshBasicMaterial color={JOINT} />
        </mesh>
      ))}

      {/* Energy core (torso glow) */}
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color={WAVE} transparent opacity={0.55 + sample.microMotion * 0.35} />
      </mesh>
      <pointLight position={[0, 1.2, 0]} color={LIME} intensity={0.45 + sample.microMotion} distance={4} />
      <pointLight position={[0, 1.15, 0]} color={WAVE} intensity={0.8 + sample.microMotion} distance={2.5} />
    </group>
  );
}

/** Dimmer companion skeletons (reference multi-person look) */
function GhostSkeleton({ position }: { position: [number, number, number] }) {
  const joints: [number, number, number][] = [
    [0, 1.78, 0],
    [0, 1.52, 0],
    [0, 1.2, 0],
    [-0.42, 1.28, 0],
    [0.42, 1.28, 0],
    [-0.72, 0.95, 0.05],
    [0.72, 0.95, 0.05],
    [0, 0.85, 0],
    [-0.18, 0.45, 0],
    [0.18, 0.45, 0],
    [-0.2, 0.08, 0.05],
    [0.2, 0.08, 0.05],
  ];
  const bones: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [2, 4], [3, 5], [4, 6], [2, 7], [7, 8], [7, 9], [8, 10], [9, 11],
  ];
  const linePositions = (() => {
    const arr: number[] = [];
    for (const [a, b] of bones) {
      const pa = joints[a];
      const pb = joints[b];
      arr.push(pa[0], pa[1], pa[2], pb[0], pb[1], pb[2]);
    }
    return new Float32Array(arr);
  })();

  return (
    <group position={position} scale={0.9}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={LIME} transparent opacity={0.35} />
      </lineSegments>
      {joints.map((j, i) => (
        <mesh key={i} position={j}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color={JOINT} transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  );
}

/** Cyan concentric wireframe spheres from Wi‑Fi origin */
function WifiSpheres({
  origin,
  sample,
}: {
  origin: [number, number, number];
  sample: CsiSimSample;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime * (0.25 + sample.motionEnergy * 0.5);
    group.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const phase = (t * 0.35 + i * 0.2) % 1;
      const scale = 0.35 + phase * 2.8;
      mesh.scale.setScalar(scale);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - phase) * (0.2 + sample.amplitude * 0.45);
    });
  });

  return (
    <group>
      {/* Sensor / AP box (reference: matte cube on grid) */}
      <mesh position={[origin[0], 0.22, origin[2]]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#5c4030" metalness={0.15} roughness={0.75} />
      </mesh>
      <mesh position={[origin[0], 0.48, origin[2]]}>
        <boxGeometry args={[0.14, 0.16, 0.14]} />
        <meshStandardMaterial color={WAVE} emissive={WAVE} emissiveIntensity={0.9} />
      </mesh>

      <group ref={group} position={[origin[0], 0.35, origin[2]]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i}>
            <sphereGeometry args={[1, 24, 16]} />
            <meshBasicMaterial
              color={WAVE}
              wireframe
              transparent
              opacity={0.25}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Floor grid heatmap tiles */
function HeatGrid({
  sample,
  human,
  wifi,
}: {
  sample: CsiSimSample;
  human: [number, number];
  wifi: [number, number];
}) {
  const group = useRef<THREE.Group>(null);
  const cells = useMemo(() => {
    const list: { x: number; z: number; key: string }[] = [];
    const span = 10;
    const step = span / (GRID - 1);
    for (let iz = 0; iz < GRID; iz++) {
      for (let ix = 0; ix < GRID; ix++) {
        const x = -span / 2 + ix * step;
        const z = -span / 2 + iz * step;
        list.push({ x, z, key: `${ix}-${iz}` });
      }
    }
    return list;
  }, []);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const cell = cells[i];
      if (!cell) return;
      const dW = Math.hypot(cell.x - wifi[0], cell.z - wifi[1]);
      const dH = Math.hypot(cell.x - human[0], cell.z - human[1]);
      const energy = THREE.MathUtils.clamp(
        Math.exp(-dW * 0.28) * sample.pathCoupling * 0.55 +
          Math.exp(-dH * 0.5) * (0.35 + sample.microMotion * 0.5) +
          Math.sin(dW * 2.2 - t * (1 + sample.motionEnergy * 2)) * 0.06 * sample.amplitude +
          sample.motionEnergy * 0.1 * Math.exp(-dW * 0.15),
        0,
        1,
      );
      const y = 0.02 + energy * 0.08;
      mesh.position.y = y;
      mesh.scale.setScalar(0.55 + energy * 0.7);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.08 + energy * 0.75;
    });
  });

  return (
    <group ref={group}>
      {cells.map((c) => (
        <mesh key={c.key} position={[c.x, 0.02, c.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.28, 0.28]} />
          <meshBasicMaterial color={LIME} transparent opacity={0.2} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Motion-energy particle fog */
function ParticleFog({
  sample,
  wifi,
  human,
  reduceMotion,
}: {
  sample: CsiSimSample;
  wifi: [number, number, number];
  human: [number, number, number];
  reduceMotion: boolean;
}) {
  const ref = useRef<THREE.Points>(null);
  const positions = useRef<Float32Array | null>(null);
  if (positions.current === null) positions.current = createParticlePositions(wifi);

  useFrame(({ clock }) => {
    if (!ref.current || reduceMotion) return;
    const count = Math.floor(30 + sample.motionEnergy * (MAX_PARTICLES - 30));
    const p = positions.current;
    if (!p) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      p[ix] += Math.sin(t + i) * 0.008 * (0.3 + sample.motionEnergy);
      p[ix + 1] += Math.cos(t * 1.3 + i) * 0.004;
      p[ix + 2] += Math.cos(t * 0.9 + i) * 0.008 * (0.3 + sample.motionEnergy);
      // mild drift toward human
      p[ix] += (human[0] - p[ix]) * 0.0015 * sample.motionEnergy;
      p[ix + 2] += (human[2] - p[ix + 2]) * 0.0015 * sample.motionEnergy;
      if (p[ix + 1] > 2.8 || Math.hypot(p[ix] - wifi[0], p[ix + 2] - wifi[2]) > 5.5) {
        p[ix] = wifi[0] + (Math.random() - 0.5) * 2;
        p[ix + 1] = 0.3 + Math.random();
        p[ix + 2] = wifi[2] + (Math.random() - 0.5) * 2;
      }
    }
    const geom = ref.current.geometry;
    geom.setAttribute("position", new THREE.BufferAttribute(p.slice(0, count * 3), 3));
    geom.attributes.position.needsUpdate = true;
    geom.setDrawRange(0, count);
    (ref.current.material as THREE.PointsMaterial).opacity = 0.25 + sample.motionEnergy * 0.55;
  });

  if (reduceMotion) return null;

  return (
    <points ref={ref}>
      <bufferGeometry />
      <pointsMaterial color={LIME} size={0.06} sizeAttenuation transparent opacity={0.45} depthWrite={false} />
    </points>
  );
}

function FloorFrame() {
  return <gridHelper args={[12, 24, "#1a3a28", "#0d1a14"]} position={[0, 0, 0]} />;
}

function HudOverlay({
  sample,
  status,
  stillDuration,
  motionLevel,
  anomalyScore,
}: {
  sample: CsiSimSample;
  status: CareStatus;
  stillDuration: number;
  motionLevel: number;
  anomalyScore: number;
}) {
  // Synthetic RF-derived readouts — not clinical vitals
  const microBpm = Math.round(42 + sample.microMotion * 28);
  const breath = Math.round(8 + sample.microMotion * 10);
  const confidence = Math.round((0.35 + sample.pathCoupling * 0.4 + (1 - anomalyScore) * 0.25) * 100);
  const rssi = Math.round(-72 + sample.amplitude * 38 + sample.pathCoupling * 12);
  const variance = (2 + sample.motionEnergy * 18 + anomalyScore * 8).toFixed(2);
  const motion = (motionLevel * 20 + sample.motionEnergy * 8).toFixed(3);
  const present = status !== "critical" || stillDuration < 400;

  return (
    <div className="csi-hud" aria-hidden>
      <div className="csi-hud-panel left">
        <p className="csi-hud-title">VITAL SIGNS</p>
        <div className="csi-hud-row accent-red">
          <span>Heart rate</span>
          <strong>{microBpm} BPM</strong>
          <em>sim</em>
        </div>
        <div className="csi-hud-spark red" />
        <div className="csi-hud-row accent-cyan">
          <span>Respiration</span>
          <strong>{breath} RPM</strong>
          <em>sim</em>
        </div>
        <div className="csi-hud-spark cyan" />
        <div className="csi-hud-row accent-amber">
          <span>Confidence</span>
          <strong>{confidence}%</strong>
        </div>
        <div className="csi-hud-bar amber">
          <i style={{ width: `${confidence}%` }} />
        </div>
      </div>
      <div className="csi-hud-panel right">
        <p className="csi-hud-title">WIFI SIGNAL</p>
        <div className="csi-hud-row accent-cyan">
          <span>RSSI</span>
          <strong>{rssi} dBm</strong>
        </div>
        <div className="csi-hud-row accent-cyan">
          <span>Variance</span>
          <strong>{variance}</strong>
        </div>
        <div className="csi-hud-row accent-cyan">
          <span>Motion</span>
          <strong>{motion}</strong>
        </div>
        <div className="csi-hud-row accent-cyan">
          <span>Persons</span>
          <strong>1</strong>
          <span className="csi-hud-dots" aria-hidden>
            <i /><i /><i /><i />
          </span>
        </div>
        <div className={`csi-hud-present ${present ? "on" : "off"}`}>
          {present ? "PRESENT" : "WATCH"}
        </div>
      </div>
    </div>
  );
}

function Scene(props: LiveProps) {
  const { onSample } = props;
  const clockT = useRef(props.t);
  const propsRef = useRef(props);
  const lastUi = useRef(0);

  const [sample, setSample] = useState<CsiSimSample>(() =>
    simulateCsi({
      motionLevel: props.motionLevel,
      stillDuration: props.stillDuration,
      anomalyScore: props.anomalyScore,
      status: props.status,
      t: props.t,
      presenceX: props.presenceX,
      presenceY: props.presenceY,
      wifiX: props.wifiX,
      wifiY: props.wifiY,
    }),
  );

  useEffect(() => {
    onSample(sample);
  }, [onSample, sample]);

  useEffect(() => {
    propsRef.current = props;
  }, [props]);

  useFrame((_, dt) => {
    const p = propsRef.current;
    if (!p.reduceMotion) clockT.current += dt;
    else clockT.current = p.t;
    const next = simulateCsi({
      motionLevel: p.motionLevel,
      stillDuration: p.stillDuration,
      anomalyScore: p.anomalyScore,
      status: p.status,
      t: clockT.current,
      presenceX: p.presenceX,
      presenceY: p.presenceY,
      wifiX: p.wifiX,
      wifiY: p.wifiY,
    });
    lastUi.current += dt;
    if (lastUi.current > 0.05) {
      lastUi.current = 0;
      setSample(next);
    }
  });

  const [hx, hz] = pctXZ(props.presenceX, props.presenceY);
  const [wx, wz] = pctXZ(props.wifiX, props.wifiY);
  const human: [number, number, number] = [hx, 0, hz];
  const wifi: [number, number, number] = [wx, 0, wz];

  // Soft ghost figures near the primary skeleton (reference cluster look)
  const ghosts: [number, number, number][] = [
    [hx + 0.9, 0, hz + 0.35],
    [hx - 0.75, 0, hz + 0.55],
  ];

  return (
    <>
      <FloorFrame />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[14, 12]} />
        <meshStandardMaterial color="#050a08" roughness={1} />
      </mesh>

      <HeatGrid sample={sample} human={[hx, hz]} wifi={[wx, wz]} />
      <WifiSpheres origin={wifi} sample={sample} />
      <ParticleFog
        sample={sample}
        wifi={wifi}
        human={human}
        reduceMotion={props.reduceMotion}
      />
      <WireSkeleton position={human} sample={sample} />
      {ghosts.map((pos, i) => (
        <GhostSkeleton key={i} position={pos} />
      ))}
    </>
  );
}

/**
 * Reference-style CSI human field (Three.js):
 * wire skeleton + cyan wave spheres + lime heatmap grid + particle fog.
 * Simulated RF — not live CSI / not clinical vitals.
 */
export function CsiSignalField(props: Props) {
  const reduceMotion = useReducedMotion();
  const [hud, setHud] = useState<CsiSimSample | null>(null);

  return (
    <div className="csi-field matrix" aria-label="Simulated Wi‑Fi CSI human signal field">
      <div className="csi-field-head">
        <p className="csi-field-kicker">CSI · HUMAN FIELD</p>
        <span className="csi-sim-tag">Simulated</span>
      </div>
      <div className="csi-field-stage matrix">
        {hud ? (
          <HudOverlay
            sample={hud}
            status={props.status}
            stillDuration={props.stillDuration}
            motionLevel={props.motionLevel}
            anomalyScore={props.anomalyScore}
          />
        ) : null}
        <Canvas
          shadows="basic"
          dpr={[1, 1.75]}
          camera={{ position: [0, 5.5, 9.5], fov: 38, near: 0.1, far: 80 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        >
          <color attach="background" args={["#020605"]} />
          <fog attach="fog" args={["#020605", 12, 28]} />
          <ambientLight intensity={0.25} />
          <directionalLight position={[4, 10, 6]} intensity={0.55} color="#c8ffe0" />
          <Scene {...props} reduceMotion={!!reduceMotion} onSample={setHud} />
          <OrbitControls
            enablePan={false}
            enableDamping
            dampingFactor={0.07}
            minDistance={5}
            maxDistance={16}
            minPolarAngle={0.25}
            maxPolarAngle={Math.PI / 2.2}
            target={[0, 0.9, 0]}
          />
          {!reduceMotion ? (
            <EffectComposer>
              <Bloom intensity={0.85} luminanceThreshold={0.2} mipmapBlur />
            </EffectComposer>
          ) : null}
        </Canvas>
      </div>
      <p className="csi-field-note">
        Wire skeleton, cyan CSI spheres, lime occupancy grid, particle fog — synthetic RF from the
        demo feed. HUD numbers are simulated (not clinical vitals). Drag to orbit.
      </p>
    </div>
  );
}
