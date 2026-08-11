"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Html,
  Line,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

type Vec3 = [number, number, number];

export type CameraViewPreset = "overview" | "bathroom" | "courier" | "living";

/* ─── Camera Controller — NO auto-zoom, manual orbit only ─── */
function CameraController({
  view,
  zoomFactor,
}: {
  view: CameraViewPreset;
  zoomFactor: number;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const lastAppliedView = useRef<string>("");

  const viewConfigs: Record<CameraViewPreset, { pos: Vec3; look: Vec3 }> = useMemo(
    () => ({
      overview: {
        pos: [9.2 * zoomFactor, 6.5 * zoomFactor, 9.5 * zoomFactor],
        look: [0, 0.4, 0],
      },
      bathroom: {
        pos: [-3.4 * zoomFactor, 4.2 * zoomFactor, 5.2 * zoomFactor],
        look: [-3.4, 0.35, -0.3],
      },
      courier: {
        pos: [0 * zoomFactor, 2.4 * zoomFactor, 6.2 * zoomFactor],
        look: [0, 0.7, 2.8],
      },
      living: {
        pos: [-0.2 * zoomFactor, 3.8 * zoomFactor, 5.2 * zoomFactor],
        look: [-0.2, 0.4, -0.6],
      },
    }),
    [zoomFactor]
  );

  // Instant jump when user explicitly clicks a preset button
  const key = `${view}-${zoomFactor}`;
  useEffect(() => {
    if (key === lastAppliedView.current) return;
    lastAppliedView.current = key;

    const config = viewConfigs[view] || viewConfigs.overview;
    camera.position.set(...config.pos);
    if (controlsRef.current) {
      controlsRef.current.target.set(...config.look);
      controlsRef.current.update();
    }
  }, [key, view, viewConfigs, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableDamping
      dampingFactor={0.08}
      minDistance={1.8}
      maxDistance={24.0}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI / 2 - 0.05}
    />
  );
}

/* ─── Helper block with rounded edges and shadows ─── */
function Block({
  size,
  position,
  color,
  rotation = [0, 0, 0],
  radius = 0.04,
  emissive,
  emissiveIntensity,
  roughness = 0.65,
  metalness = 0.05,
  transparent = false,
  opacity = 1.0,
}: {
  size: Vec3;
  position: Vec3;
  color: string;
  rotation?: Vec3;
  radius?: number;
  emissive?: string;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
}) {
  return (
    <RoundedBox
      args={size}
      position={position}
      rotation={rotation}
      radius={radius}
      smoothness={3}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive ?? "#000000"}
        emissiveIntensity={emissiveIntensity ?? (emissive ? 0.6 : 0)}
        transparent={transparent}
        opacity={opacity}
      />
    </RoundedBox>
  );
}

/* ─── Traditional Single-Story Japanese Roof ─── */
function JapaneseRoof() {
  const roofColor = "#252e34";
  const ridgeColor = "#141a1e";
  const woodBeam = "#4a3324";

  return (
    <group position={[0, 2.75, 0]}>
      <mesh position={[0, 0.48, -1.9]} rotation={[0.42, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[11.2, 0.16, 2.8]} />
        <meshStandardMaterial color={roofColor} roughness={0.7} metalness={0.1} />
      </mesh>
      <Block size={[11.5, 0.22, 0.32]} position={[0, 1.02, -0.6]} color={ridgeColor} radius={0.05} />
      {[-4.8, -3.2, -1.6, 0, 1.6, 3.2, 4.8].map((x) => (
        <group key={x} position={[x, -0.1, -0.8]}>
          <Block size={[0.09, 0.1, 4.2]} position={[0, 0, 0]} color={woodBeam} radius={0.01} />
        </group>
      ))}
    </group>
  );
}

/* ─── Washroom & Bathroom (Ofuro) ─── */
function Bathroom() {
  const tileColor = "#e6ede9";
  const darkTile = "#bcd0c7";
  const hinokiWood = "#ab8158";
  const waterColor = "#4da6d9";

  return (
    <group position={[-3.4, 0, -0.4]}>
      <Block size={[2.6, 0.1, 3.2]} position={[0, 0.06, 0]} color={tileColor} radius={0.01} roughness={0.3} />
      {[-1.0, -0.3, 0.4, 1.1].map((x, i) => (
        <Block key={i} size={[0.02, 0.11, 3.18]} position={[x, 0.06, 0]} color={darkTile} radius={0.005} />
      ))}
      {[-1.2, -0.4, 0.4, 1.2].map((z, i) => (
        <Block key={`z-${i}`} size={[2.58, 0.11, 0.02]} position={[0, 0.06, z]} color={darkTile} radius={0.005} />
      ))}

      {/* Ofuro Tub */}
      <group position={[0.4, 0.1, -0.9]}>
        <Block size={[1.3, 0.68, 1.1]} position={[0, 0.34, 0]} color={hinokiWood} radius={0.04} roughness={0.5} />
        <Block size={[1.12, 0.62, 0.92]} position={[0, 0.38, 0]} color="#1b2e38" radius={0.02} />
        <mesh position={[0, 0.62, 0]}>
          <boxGeometry args={[1.08, 0.02, 0.88]} />
          <meshStandardMaterial color={waterColor} roughness={0.1} metalness={0.2} transparent opacity={0.78} emissive="#2a78a6" emissiveIntensity={0.3} />
        </mesh>
        <Block size={[1.34, 0.06, 0.08]} position={[0, 0.68, -0.53]} color="#c2986e" radius={0.01} />
        <Block size={[1.34, 0.06, 0.08]} position={[0, 0.68, 0.53]} color="#c2986e" radius={0.01} />
      </group>

      {/* Shower & Tap */}
      <group position={[-1.15, 0.1, 0.3]}>
        <Block size={[0.08, 0.4, 0.25]} position={[0, 0.9, 0]} color="#7c8a84" radius={0.01} metalness={0.7} />
        <mesh position={[0.06, 0.82, 0.06]}>
          <cylinderGeometry args={[0.03, 0.03, 0.08, 12]} />
          <meshStandardMaterial color="#d4ded9" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0.06, 1.15, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.5, 8]} />
          <meshStandardMaterial color="#2d3834" />
        </mesh>
        <mesh position={[0.1, 1.38, 0]} rotation={[0, 0, -0.6]}>
          <cylinderGeometry args={[0.05, 0.02, 0.1, 12]} />
          <meshStandardMaterial color="#d4ded9" metalness={0.8} roughness={0.2} />
        </mesh>
        <Block size={[0.34, 0.22, 0.24]} position={[0.35, 0.11, 0.3]} color="#d6b58d" radius={0.02} />
        <mesh position={[0.35, 0.26, -0.2]}>
          <cylinderGeometry args={[0.11, 0.09, 0.12, 16]} />
          <meshStandardMaterial color="#c29f76" roughness={0.6} />
        </mesh>
      </group>

      {/* Washroom Sink & Mirror */}
      <group position={[-0.4, 0.1, 1.1]}>
        <Block size={[0.65, 0.62, 0.45]} position={[0, 0.31, 0]} color="#48372b" radius={0.02} />
        <Block size={[0.52, 0.12, 0.36]} position={[0, 0.64, 0]} color="#ffffff" radius={0.03} roughness={0.2} />
        <Block size={[0.55, 0.75, 0.03]} position={[0, 1.3, 0.18]} color="#a9c2d1" radius={0.01} metalness={0.9} roughness={0.1} />
        <Block size={[0.04, 0.04, 0.35]} position={[-0.38, 1.1, -0.1]} color="#888888" radius={0.005} />
        <Block size={[0.08, 0.28, 0.28]} position={[-0.38, 0.94, -0.1]} color="#f0f5f2" radius={0.02} />
      </group>

      {/* Sliding Frosted Door */}
      <group position={[1.28, 0.1, 0]}>
        <Block size={[0.06, 2.2, 1.4]} position={[0, 1.1, -0.8]} color="#dbe5e1" radius={0.01} transparent opacity={0.65} />
        <Block size={[0.08, 2.22, 0.08]} position={[0, 1.11, -1.5]} color="#403024" radius={0.01} />
        <Block size={[0.08, 2.22, 0.08]} position={[0, 1.11, -0.1]} color="#403024" radius={0.01} />
        <Block size={[0.08, 0.08, 1.48]} position={[0, 2.21, -0.8]} color="#403024" radius={0.01} />
      </group>
    </group>
  );
}

/* ─── Fallen Old Man (Grandpa) — Scenario 2 ─── */
function FallenGrandpa({ visible }: { visible: boolean }) {
  if (!visible) return null;
  const skin = "#dcae8c";
  const whiteHair = "#f0f0f0";
  const yukataBlue = "#3a566e";

  return (
    <group position={[-3.3, 0.22, -0.2]} rotation={[0, 0.35, -Math.PI / 2]}>
      <pointLight position={[0, 0.6, 0.4]} color="#ff7650" intensity={4.5} distance={3.2} />

      <group position={[0, 0.72, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.17, 24, 24]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.04, -0.02]}>
          <sphereGeometry args={[0.175, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={whiteHair} roughness={0.9} />
        </mesh>
      </group>

      <mesh position={[0, 0.18, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.58, 8, 16]} />
        <meshStandardMaterial color={yukataBlue} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.21, 0.21, 0.12, 16]} />
        <meshStandardMaterial color="#1f2c38" />
      </mesh>

      <mesh position={[0.18, 0.32, 0.12]} rotation={[0.2, 0, 0.7]} castShadow>
        <capsuleGeometry args={[0.06, 0.42, 6, 12]} />
        <meshStandardMaterial color={yukataBlue} />
      </mesh>
      <mesh position={[0.32, 0.48, 0.26]} castShadow>
        <sphereGeometry args={[0.065, 12, 12]} />
        <meshStandardMaterial color={skin} />
      </mesh>

      <mesh position={[-0.12, -0.42, 0.08]} rotation={[0.4, 0, -0.15]} castShadow>
        <capsuleGeometry args={[0.075, 0.52, 6, 12]} />
        <meshStandardMaterial color="#2d3742" />
      </mesh>
      <mesh position={[0.12, -0.45, -0.05]} rotation={[-0.2, 0, 0.2]} castShadow>
        <capsuleGeometry args={[0.075, 0.5, 6, 12]} />
        <meshStandardMaterial color="#2d3742" />
      </mesh>

      <group position={[-0.45, 0.1, 0.35]} rotation={[0.1, 0.8, 1.4]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.85, 10]} />
          <meshStandardMaterial color="#5e412a" roughness={0.6} />
        </mesh>
      </group>

      <Html position={[0, 0.9, 0]} scale={0.45} center distanceFactor={8}>
        <div className="grandpa-label-badge">
          <span className="badge-icon">👴</span>
          <span className="badge-text">GRANDPA (FALLEN)</span>
        </div>
      </Html>
    </group>
  );
}

/* ─── Standing Resident Figure — reusable for Scenario 3 ─── */
function ResidentFigure({
  position,
  rotation = [0, 0, 0],
  label,
  highlight = false,
}: {
  position: Vec3;
  rotation?: Vec3;
  label: string;
  highlight?: boolean;
}) {
  const skin = "#dcae8c";
  const whiteHair = "#f0f0f0";
  const clothesColor = "#4a637d";

  return (
    <group position={position} rotation={rotation}>
      {highlight && (
        <pointLight position={[0, 1.7, 0.4]} color="#b8ff54" intensity={4.2} distance={2.8} />
      )}

      <group position={[0, 1.5, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.17, 24, 24]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.04, -0.02]}>
          <sphereGeometry args={[0.175, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={whiteHair} roughness={0.9} />
        </mesh>
      </group>

      <mesh position={[0, 0.95, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.58, 8, 16]} />
        <meshStandardMaterial color={clothesColor} roughness={0.8} />
      </mesh>

      {[-0.11, 0.11].map((x) => (
        <mesh key={x} position={[x, 0.35, 0]} castShadow>
          <capsuleGeometry args={[0.075, 0.55, 6, 12]} />
          <meshStandardMaterial color="#293542" />
        </mesh>
      ))}

      <mesh position={[0.28, 0.7, 0.08]} rotation={[0, 0, 0.14]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.9, 8]} />
        <meshStandardMaterial color="#5e412a" roughness={0.6} />
      </mesh>

      <Html position={[0, 2.15, 0]} center distanceFactor={7.2}>
        <div className={`grandpa-door-badge ${highlight ? "highlight" : ""}`}>
          <span className="badge-icon">👴</span>
          <span className="badge-text">{label}</span>
        </div>
      </Html>
    </group>
  );
}

/* ─── Moving Grandpa — cycles between rooms with activity labels (Scenario 01) ─── */
const GRANDPA_ACTIVITIES = [
  { pos: [-0.6, 0.1, -0.6] as Vec3, rot: [0, 0.3, 0] as Vec3, icon: "📺", label: "Watching TV", room: "Living Room" },
  { pos: [3.0, 0.1, -1.2] as Vec3, rot: [0, -0.5, 0] as Vec3, icon: "🍳", label: "Cooking", room: "Kitchen" },
  { pos: [1.5, 0.1, 2.0] as Vec3, rot: [0, 0, 0] as Vec3, icon: "🍵", label: "Drinking tea", room: "Engawa" },
];

function MovingGrandpa({ visible, onActivityChange }: { visible: boolean; onActivityChange?: (idx: number) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const activityRef = useRef(0);
  const timerRef = useRef(0);
  const currentPos = useRef(new THREE.Vector3(...GRANDPA_ACTIVITIES[0].pos));
  const currentRot = useRef(new THREE.Euler(...GRANDPA_ACTIVITIES[0].rot));
  const [activityIdx, setActivityIdx] = useState(0);

  useFrame((_, delta) => {
    if (!visible || !groupRef.current) return;

    timerRef.current += delta;

    // Switch activity every 4 seconds
    if (timerRef.current > 4.0) {
      timerRef.current = 0;
      const next = (activityRef.current + 1) % GRANDPA_ACTIVITIES.length;
      activityRef.current = next;
      setActivityIdx(next);
      onActivityChange?.(next);
    }

    const target = GRANDPA_ACTIVITIES[activityRef.current];
    const targetPos = new THREE.Vector3(...target.pos);
    const targetRot = new THREE.Euler(...target.rot);

    currentPos.current.lerp(targetPos, delta * 1.8);
    currentRot.current.x += (targetRot.x - currentRot.current.x) * delta * 1.8;
    currentRot.current.y += (targetRot.y - currentRot.current.y) * delta * 1.8;
    currentRot.current.z += (targetRot.z - currentRot.current.z) * delta * 1.8;

    groupRef.current.position.copy(currentPos.current);
    groupRef.current.rotation.copy(currentRot.current);
  });

  if (!visible) return null;

  const activity = GRANDPA_ACTIVITIES[activityIdx];
  const skin = "#dcae8c";
  const whiteHair = "#f0f0f0";
  const clothesColor = "#4a637d";

  return (
    <group ref={groupRef} position={GRANDPA_ACTIVITIES[0].pos} rotation={GRANDPA_ACTIVITIES[0].rot}>
      {/* Head & Hair */}
      <group position={[0, 1.5, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.17, 24, 24]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.04, -0.02]}>
          <sphereGeometry args={[0.175, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={whiteHair} roughness={0.9} />
        </mesh>
      </group>

      {/* Body */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.58, 8, 16]} />
        <meshStandardMaterial color={clothesColor} roughness={0.8} />
      </mesh>

      {/* Legs */}
      {[-0.11, 0.11].map((x) => (
        <mesh key={x} position={[x, 0.35, 0]} castShadow>
          <capsuleGeometry args={[0.075, 0.55, 6, 12]} />
          <meshStandardMaterial color="#293542" />
        </mesh>
      ))}

      {/* Walking cane in hand */}
      <mesh position={[0.28, 0.7, 0.12]} rotation={[0, 0, 0.12]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.9, 8]} />
        <meshStandardMaterial color="#5e412a" roughness={0.6} />
      </mesh>

      {/* Ambient Wi-Fi sensing rings that travel with grandpa */}
      {[0, 1, 2].map((i) => (
        <SignalRing key={`g-${i}`} index={i} position={[0, 0.08, 0]} color="#b8ff54" />
      ))}

      {/* Activity Label Badge */}
      <Html position={[0, 2.05, 0]} center distanceFactor={8}>
        <div className="grandpa-activity-badge">
          <span className="badge-icon">{activity.icon}</span>
          <span className="badge-text">GRANDPA · {activity.label}</span>
        </div>
      </Html>
    </group>
  );
}

/* ─── Bento Courier ─── */
function BentoCourier({
  active,
  position = [0.0, 0.1, 3.4],
  rotation = [0, Math.PI, 0],
}: {
  active: boolean;
  position?: Vec3;
  rotation?: Vec3;
}) {
  const uniformOrange = active ? "#ff6b35" : "#e05a2b";
  const darkNavy = "#1a2533";
  const skin = "#c89b7b";

  return (
    <group position={position} rotation={rotation}>
      {active && (
        <pointLight position={[0, 1.8, 0.5]} color="#ff7650" intensity={5.5} distance={3.8} />
      )}

      <group position={[0, 1.58, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.17, 24, 24]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.07, 0]} castShadow>
          <sphereGeometry args={[0.178, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={uniformOrange} />
        </mesh>
        <mesh position={[0, 0.04, 0.18]} rotation={[0.3, 0, 0]} castShadow>
          <boxGeometry args={[0.22, 0.02, 0.14]} />
          <meshStandardMaterial color={darkNavy} />
        </mesh>
      </group>

      <mesh position={[0, 1.05, 0]} castShadow>
        <capsuleGeometry args={[0.21, 0.55, 8, 16]} />
        <meshStandardMaterial color={uniformOrange} roughness={0.6} />
      </mesh>

      <group position={[0, 0.92, 0.38]}>
        <Block size={[0.38, 0.12, 0.26]} position={[0, 0, 0]} color="#d93b2b" radius={0.02} />
        <Block size={[0.39, 0.03, 0.27]} position={[0, 0.06, 0]} color="#241a18" radius={0.01} />
      </group>

      <group position={[0, 1.08, -0.34]}>
        <Block size={[0.62, 0.72, 0.38]} position={[0, 0, 0]} color="#d64527" radius={0.06} roughness={0.5} emissive={active ? "#6e1d0c" : "#000000"} />
        <Block size={[0.64, 0.1, 0.4]} position={[0, 0.36, 0]} color="#1e2730" radius={0.02} />
        <Block size={[0.63, 0.08, 0.39]} position={[0, 0.12, 0]} color="#b8ff54" radius={0.01} emissive="#588514" />

        <Html position={[0, 0, -0.21]} transform rotation={[0, Math.PI, 0]} scale={0.45} center>
          <div className="courier-bag-badge">
            <span className="badge-icon">🍱</span>
            <span className="badge-text">BENTO COURIER</span>
          </div>
        </Html>
      </group>

      {[-0.12, 0.12].map((x) => (
        <group key={x} position={[x, 0.38, 0]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.08, 0.58, 6, 12]} />
            <meshStandardMaterial color={darkNavy} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ─── Authentic Tatami Living Room ─── */
function TatamiLivingRoom() {
  const tatamiGreen = "#aaa067";
  const tatamiBorder = "#2d382b";
  const darkWood = "#483527";

  return (
    <group position={[-0.2, 0, -0.6]}>
      {[
        [-1.1, 0, -1.0, false],
        [0.4, 0, -1.0, false],
        [-1.1, 0, 0.3, true],
        [0.4, 0, 0.3, true],
        [1.8, 0, -0.35, false],
        [-2.5, 0, -0.35, false],
      ].map(([x, , z, rot], idx) => (
        <group key={idx} position={[x as number, 0.08, z as number]} rotation={[0, rot ? Math.PI / 2 : 0, 0]}>
          <Block size={[1.42, 0.06, 1.25]} position={[0, 0, 0]} color={tatamiGreen} radius={0.015} roughness={0.8} />
          <Block size={[1.44, 0.065, 0.04]} position={[0, 0.005, -0.62]} color={tatamiBorder} radius={0.005} />
          <Block size={[1.44, 0.065, 0.04]} position={[0, 0.005, 0.62]} color={tatamiBorder} radius={0.005} />
        </group>
      ))}

      {/* Chabudai Table */}
      <group position={[-0.4, 0.1, -0.4]}>
        <Block size={[1.1, 0.08, 0.8]} position={[0, 0.34, 0]} color="#6b4c35" radius={0.03} />
        {[
          [-0.46, 0.16, -0.32],
          [0.46, 0.16, -0.32],
          [-0.46, 0.16, 0.32],
          [0.46, 0.16, 0.32],
        ].map((p, i) => (
          <Block key={i} size={[0.07, 0.34, 0.07]} position={p as Vec3} color="#453020" radius={0.01} />
        ))}
      </group>

      <Block size={[0.55, 0.1, 0.55]} position={[-0.4, 0.16, -0.98]} color="#7c5443" radius={0.1} />
      <Block size={[0.55, 0.1, 0.55]} position={[-0.4, 0.16, 0.18]} color="#566e53" radius={0.1} />

      {/* Tokonoma */}
      <group position={[-1.8, 0.1, -1.8]}>
        <Block size={[1.2, 0.12, 0.6]} position={[0, 0.12, 0]} color={darkWood} radius={0.02} />
        <Block size={[0.45, 1.1, 0.02]} position={[0, 1.1, -0.26]} color="#e3dac9" radius={0.01} />
        <Block size={[0.35, 0.7, 0.025]} position={[0, 1.1, -0.25]} color="#2d3832" radius={0.005} />
      </group>
    </group>
  );
}

/* ─── Kitchen Counter & Wi-Fi Router Hub ─── */
function KitchenStation({ step }: { step: number }) {
  // Calm monitoring glow in Scenario 01; brighter when an incident is open
  const monitoring = step === 0;
  const alerting = step === 1;
  const resolved = step === 2;
  const emissive = alerting ? "#ff7650" : resolved ? "#ffbd69" : monitoring ? "#6fbf3a" : "#465940";
  const lightIntensity = alerting ? 7.5 : resolved ? 5.5 : monitoring ? 3.2 : 1.5;
  const lightColor = alerting ? "#ff7650" : resolved ? "#ffbd69" : "#b7ff4a";

  const agentStatus =
    step === 1 ? "DISPATCHING" : step === 2 ? "ALL CLEAR" : "MONITORING";

  return (
    <group position={[3.4, 0.1, -1.2]}>
      <Block size={[1.6, 0.85, 0.7]} position={[0, 0.42, 0]} color="#423024" radius={0.03} />
      <Block size={[1.65, 0.08, 0.74]} position={[0, 0.87, 0]} color="#e3e0d8" radius={0.02} roughness={0.3} />

      <group position={[0.2, 0.95, 0]}>
        <Block size={[0.45, 0.18, 0.32]} position={[0, 0, 0]} color="#16221c" radius={0.05} emissive={emissive} />
        {[-0.14, 0.14].map((x) => (
          <mesh key={x} position={[x, 0.28, -0.06]}>
            <cylinderGeometry args={[0.012, 0.012, 0.48, 8]} />
            <meshStandardMaterial color="#223328" />
          </mesh>
        ))}
        <pointLight color={lightColor} intensity={lightIntensity} distance={3.5} />

        <Html position={[0, 0.85, 0]} center distanceFactor={8}>
          <div className={`bento-agent-badge step-${step}`}>
            <span className="badge-icon" aria-hidden="true">📡</span>
            <span className="badge-copy">
              <strong>BENTO AGENT</strong>
              <small>{agentStatus}</small>
            </span>
          </div>
        </Html>
      </group>
    </group>
  );
}

/* ─── Engawa Veranda & Garden ─── */
function EngawaAndGarden() {
  const engawaWood = "#694a34";
  const stoneColor = "#828c86";

  return (
    <group position={[0, 0, 0]}>
      <Block size={[10.6, 0.12, 0.75]} position={[0, 0.12, 2.15]} color={engawaWood} radius={0.02} />
      <Block size={[0.75, 0.12, 5.4]} position={[5.15, 0.12, -0.2]} color={engawaWood} radius={0.02} />

      {[-4.8, -2.4, 0, 2.4, 4.8].map((x) => (
        <Block key={x} size={[0.12, 2.6, 0.12]} position={[x, 1.35, 2.48]} color="#422e20" radius={0.01} />
      ))}

      <group position={[0, 0, 2.8]}>
        <Block size={[2.2, 0.08, 0.8]} position={[0, 0.05, 0]} color="#4d5450" radius={0.02} />
      </group>

      {/* Stone Lantern */}
      <group position={[-4.5, 0, 3.2]}>
        <Block size={[0.4, 0.12, 0.4]} position={[0, 0.06, 0]} color={stoneColor} radius={0.02} />
        <mesh position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.08, 0.12, 0.32, 10]} />
          <meshStandardMaterial color={stoneColor} roughness={0.9} />
        </mesh>
        <Block size={[0.34, 0.3, 0.34]} position={[0, 0.54, 0]} color="#ded7c5" emissive="#ffc475" emissiveIntensity={1.5} radius={0.02} />
        <pointLight color="#ffc475" intensity={2.5} distance={2.5} />
      </group>
    </group>
  );
}

/* ─── Wi-Fi Signal Pulse Ring ─── */
function SignalRing({ index, position, color }: { index: number; position: Vec3; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const phase = (clock.elapsedTime * 0.36 + index * 0.3) % 1;
    ref.current.scale.setScalar(0.6 + phase * 2.4);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.7 * (1 - phase);
  });

  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.35, 0.42, 64]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ─── Animated chevron arrows along a path (dispatch cue) ─── */
function PathArrows({
  points,
  color,
  count = 4,
}: {
  points: THREE.Vector3[];
  color: string;
  count?: number;
}) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((mesh, i) => {
      if (!mesh || points.length < 2) return;
      const u = ((t * 0.22 + i / count) % 1);
      const idx = Math.min(points.length - 2, Math.floor(u * (points.length - 1)));
      const localT = u * (points.length - 1) - idx;
      const a = points[idx];
      const b = points[idx + 1];
      mesh.position.lerpVectors(a, b, localT);
      const dir = new THREE.Vector3().subVectors(b, a).normalize();
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.35 + 0.55 * Math.sin(u * Math.PI);
    });
  });

  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          scale={0.18}
        >
          <coneGeometry args={[0.35, 0.7, 3]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ─── Outdoor courier / combini dispatch node (Scenario 02) ─── */
function CourierDispatchNode({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <group position={[5.8, 0.05, 3.6]}>
      <pointLight color="#ffbd69" intensity={4.2} distance={3.2} />

      {/* Simple street pin / delivery hub */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.04, 24]} />
        <meshStandardMaterial color="#2a3230" roughness={0.85} />
      </mesh>
      <Block size={[0.55, 0.7, 0.42]} position={[0, 0.38, 0]} color="#1c2422" radius={0.04} />
      <Block size={[0.58, 0.08, 0.45]} position={[0, 0.76, 0]} color="#ff7650" radius={0.02} emissive="#ff7650" emissiveIntensity={0.7} />
      <Block size={[0.22, 0.28, 0.04]} position={[0, 0.42, 0.22]} color="#b8ff54" radius={0.01} emissive="#7db82e" />

      {/* Tiny scooter hint */}
      <group position={[-0.55, 0.12, 0.15]} rotation={[0, 0.6, 0]}>
        <mesh position={[0, 0.12, 0]} castShadow>
          <boxGeometry args={[0.42, 0.12, 0.18]} />
          <meshStandardMaterial color="#e8e4d8" roughness={0.5} />
        </mesh>
        <mesh position={[-0.14, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.07, 0.02, 8, 16]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        <mesh position={[0.14, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.07, 0.02, 8, 16]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      </group>

      {[0, 1, 2].map((i) => (
        <SignalRing key={i} index={i} position={[0, 0.08, 0]} color="#ffbd69" />
      ))}

      <Html position={[0, 1.35, 0]} center distanceFactor={8}>
        <div className="dispatch-node-badge">
          <span className="badge-icon">🛵</span>
          <span className="badge-copy">
            <strong>BENTO COURIER</strong>
            <small>COMBINI · DELIVERY NET</small>
          </span>
        </div>
      </Html>
    </group>
  );
}

/* ─── Family contact node outside the home (Scenarios 02–03) ─── */
function FamilyContactNode({ visible, safe = false }: { visible: boolean; safe?: boolean }) {
  if (!visible) return null;

  const accent = safe ? "#b8ff54" : "#5ecbff";

  return (
    <group position={[7.0, 0.05, 1.2]}>
      <pointLight color={accent} intensity={safe ? 4.2 : 3.8} distance={3.0} />

      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.48, 0.48, 0.04, 24]} />
        <meshStandardMaterial color="#243038" roughness={0.85} />
      </mesh>

      {/* Phone / notification slab */}
      <Block size={[0.36, 0.62, 0.08]} position={[0, 0.5, 0]} color="#101820" radius={0.04} />
      <Block
        size={[0.3, 0.48, 0.03]}
        position={[0, 0.52, 0.04]}
        color={accent}
        radius={0.02}
        emissive={accent}
        emissiveIntensity={0.85}
      />
      <Block size={[0.12, 0.04, 0.02]} position={[0, 0.28, 0.06]} color="#d8eef8" radius={0.01} />

      {[0, 1, 2].map((i) => (
        <SignalRing key={i} index={i} position={[0, 0.08, 0]} color={accent} />
      ))}

      <Html position={[0, 1.3, 0]} center distanceFactor={8}>
        <div className={`family-node-badge ${safe ? "safe" : ""}`}>
          <span className="badge-icon">{safe ? "✅" : "👨‍👩‍👧"}</span>
          <span className="badge-copy">
            <strong>{safe ? "FAMILY UPDATE" : "FAMILY ALERT"}</strong>
            <small>{safe ? "ALL CLEAR · SAFE" : "TRUSTED CONTACTS"}</small>
          </span>
        </div>
      </Html>
    </group>
  );
}

/* ─── Signal Path ─── */
function SignalPath({
  step,
  phase = 0,
  activityIdx = 0,
}: {
  step: number;
  phase?: number;
  activityIdx?: number;
}) {
  const routerPos = useMemo(() => new THREE.Vector3(3.6, 1.1, -1.2), []);
  const bathroomPos = useMemo(() => new THREE.Vector3(-3.3, 1.2, -0.2), []);
  const doorPos = useMemo(() => new THREE.Vector3(0.0, 1.15, 2.6), []);
  const courierHubPos = useMemo(() => new THREE.Vector3(5.8, 0.9, 3.6), []);
  const familyPos = useMemo(() => new THREE.Vector3(7.0, 0.9, 1.2), []);

  // 01: grandpa room → router · 02: bathroom → router · 03: door check-in → router
  const points = useMemo(() => {
    if (step === 0) {
      const room = GRANDPA_ACTIVITIES[activityIdx]?.pos ?? GRANDPA_ACTIVITIES[0].pos;
      const from = new THREE.Vector3(room[0], 1.15, room[2]);
      const mid = new THREE.Vector3(
        (from.x + routerPos.x) * 0.5,
        2.15,
        (from.z + routerPos.z) * 0.5,
      );
      return new THREE.CatmullRomCurve3([from, mid, routerPos]).getPoints(56);
    }

    if (step === 2) {
      const mid = new THREE.Vector3(
        (doorPos.x + routerPos.x) * 0.5,
        2.05,
        (doorPos.z + routerPos.z) * 0.5,
      );
      return new THREE.CatmullRomCurve3([doorPos, mid, routerPos]).getPoints(56);
    }

    return new THREE.CatmullRomCurve3([
      bathroomPos,
      new THREE.Vector3(-0.5, 2.4, -0.6),
      new THREE.Vector3(2.0, 2.2, -1.0),
      routerPos,
    ]).getPoints(70);
  }, [step, activityIdx, routerPos, bathroomPos, doorPos]);

  // Outbound dispatch: Bento Agent → outside courier / combini network
  const dispatchPoints = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      routerPos,
      new THREE.Vector3(4.6, 1.7, 0.6),
      new THREE.Vector3(5.4, 1.35, 2.2),
      courierHubPos,
    ]).getPoints(56);
  }, [routerPos, courierHubPos]);

  // Outbound family alert: Bento Agent → trusted contacts (right side)
  const familyPoints = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      routerPos,
      new THREE.Vector3(5.0, 1.75, -0.4),
      new THREE.Vector3(6.2, 1.4, 0.5),
      familyPos,
    ]).getPoints(56);
  }, [routerPos, familyPos]);

  // Scenario 01: sensing rings live on MovingGrandpa; calm router pulse + soft path
  if (step === 0) {
    return (
      <group>
        <Line
          points={points}
          color="#b8ff54"
          lineWidth={1.6}
          transparent
          opacity={0.42}
          dashed
          dashSize={0.12}
          gapSize={0.12}
        />
        {[0, 1, 2].map((i) => (
          <SignalRing key={`r-${i}`} index={i} position={[3.6, 1.05, -1.2]} color="#b8ff54" />
        ))}
      </group>
    );
  }

  // Scenario 02: reveal one path at a time — silence → courier → family
  if (step === 1) {
    return (
      <group>
        {phase >= 0 && (
          <>
            <Line
              points={points}
              color="#ff7650"
              lineWidth={2.2}
              transparent
              opacity={0.9}
              dashed
              dashSize={0.14}
              gapSize={0.1}
            />
            {[0, 1, 2].map((i) => (
              <SignalRing key={`b-${i}`} index={i} position={[-3.3, 0.28, -0.2]} color="#ff7650" />
            ))}
            {[0, 1, 2].map((i) => (
              <SignalRing key={`r-${i}`} index={i} position={[3.6, 1.05, -1.2]} color="#b8ff54" />
            ))}
          </>
        )}
        {phase >= 1 && (
          <>
            <Line
              points={dispatchPoints}
              color="#ffbd69"
              lineWidth={2.4}
              transparent
              opacity={0.95}
              dashed
              dashSize={0.16}
              gapSize={0.08}
            />
            <PathArrows points={dispatchPoints} color="#ffbd69" count={5} />
          </>
        )}
        {phase >= 2 && (
          <>
            <Line
              points={familyPoints}
              color="#5ecbff"
              lineWidth={2.2}
              transparent
              opacity={0.9}
              dashed
              dashSize={0.14}
              gapSize={0.1}
            />
            <PathArrows points={familyPoints} color="#5ecbff" count={4} />
          </>
        )}
      </group>
    );
  }

  // Scenario 03: reveal one beat at a time — door → answered → family all-clear
  return (
    <group>
      {phase >= 0 && (
        <>
          <Line
            points={points}
            color="#ffbd69"
            lineWidth={1.8}
            transparent
            opacity={0.72}
            dashed
            dashSize={0.12}
            gapSize={0.1}
          />
          {[0, 1, 2].map((i) => (
            <SignalRing key={`d-${i}`} index={i} position={[0.0, 0.12, 2.8]} color="#ffbd69" />
          ))}
          {[0, 1, 2].map((i) => (
            <SignalRing key={`r-${i}`} index={i} position={[3.6, 1.05, -1.2]} color="#b8ff54" />
          ))}
        </>
      )}
      {phase >= 2 && (
        <>
          <Line
            points={familyPoints}
            color="#b8ff54"
            lineWidth={2.2}
            transparent
            opacity={0.92}
            dashed
            dashSize={0.14}
            gapSize={0.09}
          />
          <PathArrows points={familyPoints} color="#b8ff54" count={4} />
        </>
      )}
    </group>
  );
}

/* ─── Japanese House Container ─── */
function JapaneseHouse({
  step,
  phase = 0,
  activityIdx = 0,
  onActivityChange,
}: {
  step: number;
  phase?: number;
  activityIdx?: number;
  onActivityChange?: (idx: number) => void;
}) {
  const frameColor = "#2b211a";
  const wallColor = "#ded6c5";
  const floorWood = "#6e4e37";

  const showCourierDispatch = step === 1 && phase >= 1;
  const showFamilyAlert = step === 1 && phase >= 2;
  const showFamilySafe = step === 2 && phase >= 2;
  const showDoorCheckIn = step === 2 && phase >= 0;
  const showAnswered = step === 2 && phase >= 1;

  return (
    <group position={[0, -0.6, 0]}>
      <Block size={[10.8, 0.2, 5.8]} position={[0, 0, -0.2]} color="#241e1a" radius={0.04} />
      <Block size={[10.6, 0.08, 5.6]} position={[0, 0.14, -0.2]} color={floorWood} radius={0.02} />

      {[
        [-5.2, 1.35, -2.8],
        [5.2, 1.35, -2.8],
        [-5.2, 1.35, 2.4],
        [5.2, 1.35, 2.4],
      ].map((p, i) => (
        <Block key={i} size={[0.18, 2.6, 0.18]} position={p as Vec3} color={frameColor} radius={0.01} />
      ))}

      <Block size={[10.4, 2.5, 0.14]} position={[0, 1.35, -2.8]} color={wallColor} radius={0.02} />

      <Bathroom />
      <TatamiLivingRoom />
      <KitchenStation step={step} />
      <EngawaAndGarden />

      {/* Scenario 0: Moving Grandpa cycling between rooms */}
      <MovingGrandpa visible={step === 0} onActivityChange={onActivityChange} />

      {/* Scenario 1: Bathroom Alert — Fallen Grandpa */}
      <FallenGrandpa visible={step === 1} />

      {/* Scenario 2: Human Check-In — side-by-side so grandpa is easy to spot */}
      {showDoorCheckIn && (
        <BentoCourier
          active
          position={[-0.95, 0.1, 3.55]}
          rotation={[0, Math.PI * 0.78, 0]}
        />
      )}
      {showAnswered && (
        <ResidentFigure
          position={[0.85, 0.1, 2.15]}
          rotation={[0, -0.55, 0]}
          label="GRANDPA · ANSWERED"
          highlight
        />
      )}

      <SignalPath step={step} phase={phase} activityIdx={activityIdx} />
      <CourierDispatchNode visible={showCourierDispatch} />
      <FamilyContactNode visible={showFamilyAlert || showFamilySafe} safe={showFamilySafe} />
      <JapaneseRoof />

      {/* Callouts — timed with sequence */}
      {step === 1 && phase === 0 && (
        <Html position={[-3.3, 1.8, -0.2]} center distanceFactor={7.5}>
          <div className="scene-callout alert-callout">
            <b>BATHROOM ALERT · NO MOVEMENT 8H</b>
            <span>Agent Bento confirmed unusual silence</span>
          </div>
        </Html>
      )}
      {step === 1 && phase === 1 && (
        <Html position={[5.2, 1.6, 3.0]} center distanceFactor={7.5}>
          <div className="scene-callout courier-callout">
            <b>DISPATCHING BENTO COURIER</b>
            <span>Combini / delivery network contacted</span>
          </div>
        </Html>
      )}
      {step === 1 && phase >= 2 && (
        <Html position={[6.6, 1.6, 1.0]} center distanceFactor={7.5}>
          <div className="scene-callout family-callout">
            <b>FAMILY ALERTED</b>
            <span>Trusted contacts notified of the quiet check-in</span>
          </div>
        </Html>
      )}

      {step === 2 && phase === 0 && (
        <Html position={[0, 2.2, 3.2]} center distanceFactor={7.5}>
          <div className="scene-callout courier-callout">
            <b>COURIER AT THE DOOR</b>
            <span>Friendly meal check-in arriving</span>
          </div>
        </Html>
      )}
      {step === 2 && phase === 1 && (
        <Html position={[0, 2.2, 3.2]} center distanceFactor={7.5}>
          <div className="scene-callout courier-callout">
            <b>RESIDENT ANSWERED</b>
            <span>Grandpa is at the door · check-in complete</span>
          </div>
        </Html>
      )}
      {step === 2 && phase >= 2 && (
        <Html position={[6.6, 1.6, 1.0]} center distanceFactor={7.5}>
          <div className="scene-callout family-safe-callout">
            <b>FAMILY ALL CLEAR</b>
            <span>Grandpa is safe · trusted contacts updated</span>
          </div>
        </Html>
      )}
    </group>
  );
}

const ROUTINE_BEATS = ["Living Room", "Kitchen", "Engawa"];
const ALERT_BEATS = ["Silence spotted", "Courier sent", "Family alerted"];
const CHECKIN_BEATS = ["At the door", "Answered", "Family all clear"];

/* ─── Cinematic status rail (Scenarios 01–03) ─── */
function ScenarioBar({
  step,
  phase,
  activityIdx,
}: {
  step: number;
  phase: number;
  activityIdx: number;
}) {
  if (step < 0 || step > 2) return null;

  const mode = step === 1 ? "alert" : step === 2 ? "checkin" : "routine";
  const word = step === 1 ? "SILENCE" : step === 2 ? "CLEAR" : "SAFE";
  const chapter = step === 1 ? "02" : step === 2 ? "03" : "01";
  const detail =
    step === 1
      ? phase === 0
        ? "Unusual silence confirmed in the bathroom."
        : phase === 1
          ? "Agent Bento is contacting a nearby bento courier."
          : "Trusted family contacts are being notified."
      : step === 2
        ? phase === 0
          ? "Bento courier is at the door for a friendly check-in."
          : phase === 1
            ? "Grandpa answered. Human check-in complete."
            : "Family received the all-clear — Grandpa is safe."
        : `${GRANDPA_ACTIVITIES[activityIdx].label} in the ${GRANDPA_ACTIVITIES[activityIdx].room}.`;
  const beats = step === 1 ? ALERT_BEATS : step === 2 ? CHECKIN_BEATS : ROUTINE_BEATS;
  const activeBeat = step === 0 ? activityIdx : phase;
  const meta =
    step === 1
      ? phase === 0
        ? ["8h quiet", "Detecting"]
        : phase === 1
          ? ["Courier", "Dispatch"]
          : ["Family", "Alerted"]
      : step === 2
        ? phase === 0
          ? ["At door", "Check-in"]
          : phase === 1
            ? ["Answered", "OK"]
            : ["All clear", "Safe"]
        : ["Routine", "0 alerts"];

  return (
    <aside className={`scenario-bar ${mode} phase-${activeBeat}`} aria-label="Care status">
      <div className="sb-rail" aria-hidden="true">
        <span className="sb-pulse" />
      </div>

      <div className="sb-body">
        <div className="sb-top">
          <span className="sb-chapter">STORY {chapter}</span>
          <span className="sb-live">{step === 1 ? "WATCH" : step === 2 ? "DONE" : "LIVE"}</span>
        </div>

        <p className="sb-word" aria-live="polite">{word}</p>
        <p className="sb-detail">{detail}</p>

        <ol className="sb-beats">
          {beats.map((label, i) => (
            <li
              key={label}
              className={i === activeBeat ? "on" : i < activeBeat ? "past" : ""}
            >
              <span className="sb-idx">{String(i + 1).padStart(2, "0")}</span>
              <span className="sb-label">{label}</span>
            </li>
          ))}
        </ol>

        <div className="sb-foot">
          {meta.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
    </aside>
  );
}

/* ─── Main Export ─── */
export function HomeScene({
  step,
}: {
  step: number;
  viewPreset?: CameraViewPreset;
}) {
  const [zoomFactor, setZoomFactor] = useState(1.0);
  const [currentView, setCurrentView] = useState<CameraViewPreset>("overview");
  const [activityIdx, setActivityIdx] = useState(0);
  const [phase, setPhase] = useState(0);

  // Sequence Scenario 02 / 03 beats one-by-one (not all at once)
  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase(0), 0),
    ];
    if (step !== 0) timers.push(
      window.setTimeout(() => setPhase(1), 1800),
      window.setTimeout(() => setPhase(2), 3600),
    );

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [step]);

  // No auto-view change on step change. User controls the camera.

  const handleZoomIn = () => setZoomFactor((z) => Math.max(0.4, z - 0.2));
  const handleZoomOut = () => setZoomFactor((z) => Math.min(2.2, z + 0.2));
  const handleResetZoom = () => setZoomFactor(1.0);

  const handleActivityChange = useCallback((idx: number) => {
    setActivityIdx(idx);
  }, []);

  return (
    <div className="scene-container-inner" style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Live status panel for Scenarios 01–03 */}
      <ScenarioBar step={step} phase={phase} activityIdx={activityIdx} />

      {/* View Presets & Zoom Controls */}
      <div className="scene-camera-controls" aria-label="3D View and Zoom Controls">
        <div className="view-presets-group" role="group" aria-label="Camera Presets">
          <button
            type="button"
            className={`preset-btn ${currentView === "overview" ? "active" : ""}`}
            onClick={() => setCurrentView("overview")}
            title="Overview of Single-Story Japanese House"
          >
            <span className="preset-icon">🏠</span>
            <span className="preset-label">Full House</span>
          </button>
          <button
            type="button"
            className={`preset-btn ${currentView === "bathroom" ? "active" : ""}`}
            onClick={() => setCurrentView("bathroom")}
            title="Zoom into Bathroom & Fallen Grandpa"
          >
            <span className="preset-icon">🛀</span>
            <span className="preset-label">Bathroom</span>
          </button>
          <button
            type="button"
            className={`preset-btn ${currentView === "courier" ? "active" : ""}`}
            onClick={() => setCurrentView("courier")}
            title="Zoom into Entrance & Bento Courier"
          >
            <span className="preset-icon">🍱</span>
            <span className="preset-label">Bento Courier</span>
          </button>
          <button
            type="button"
            className={`preset-btn ${currentView === "living" ? "active" : ""}`}
            onClick={() => setCurrentView("living")}
            title="Zoom into Tatami Living Room"
          >
            <span className="preset-icon">🍵</span>
            <span className="preset-label">Living Room</span>
          </button>
        </div>

        <div className="zoom-actions-group" role="group" aria-label="Zoom Controls">
          <button type="button" className="zoom-btn" onClick={handleZoomIn} title="Zoom In (+)">
            +
          </button>
          <button type="button" className="zoom-btn reset-btn" onClick={handleResetZoom} title="Reset Zoom">
            {(100 / zoomFactor).toFixed(0)}%
          </button>
          <button type="button" className="zoom-btn" onClick={handleZoomOut} title="Zoom Out (-)">
            −
          </button>
        </div>
      </div>

      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [9.2, 6.5, 9.5], fov: 38, near: 0.1, far: 90 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.shadowMap.type = THREE.PCFShadowMap;
        }}
      >
        <color attach="background" args={["#060e16"]} />
        <fog attach="fog" args={["#060e16", 18, 36]} />
        <ambientLight intensity={0.4} color="#a0b8c4" />
        <directionalLight
          position={[-6, 11, 8]}
          intensity={1.8}
          color="#b5d6eb"
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <JapaneseHouse
          step={step}
          phase={phase}
          activityIdx={activityIdx}
          onActivityChange={handleActivityChange}
        />
        <ContactShadows position={[0, -0.62, 0]} opacity={0.62} scale={18} blur={2.6} far={7} color="#000000" />
        <Environment preset="night" />

        <CameraController view={currentView} zoomFactor={zoomFactor} />

        <EffectComposer multisampling={0}>
          <Bloom intensity={0.7} luminanceThreshold={0.65} luminanceSmoothing={0.25} mipmapBlur />
          <Vignette eskil={false} offset={0.16} darkness={0.48} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
