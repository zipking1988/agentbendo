"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Html,
  Line,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type Vec3 = [number, number, number];

function Block({
  size,
  position,
  color,
  rotation = [0, 0, 0],
  radius = 0.05,
  emissive,
}: {
  size: Vec3;
  position: Vec3;
  color: string;
  rotation?: Vec3;
  radius?: number;
  emissive?: string;
}) {
  return (
    <RoundedBox args={size} position={position} rotation={rotation} radius={radius} smoothness={3} castShadow receiveShadow>
      <meshStandardMaterial
        color={color}
        roughness={0.72}
        metalness={0.04}
        emissive={emissive ?? "#000000"}
        emissiveIntensity={emissive ? 0.55 : 0}
      />
    </RoundedBox>
  );
}

function WarmLamp({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <sphereGeometry args={[0.12, 20, 20]} />
        <meshStandardMaterial color="#ffd892" emissive="#ffbd62" emissiveIntensity={5} />
      </mesh>
      <pointLight color="#ffb55d" intensity={10} distance={4.2} decay={2.1} castShadow />
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.85, 8]} />
        <meshStandardMaterial color="#39352f" />
      </mesh>
    </group>
  );
}

function Plant({ position, scale = 1 }: { position: Vec3; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow>
        <cylinderGeometry args={[0.16, 0.12, 0.28, 18]} />
        <meshStandardMaterial color="#8d6547" roughness={0.9} />
      </mesh>
      {([[-0.12, 0.38, 0], [0.08, 0.5, 0.02], [0.18, 0.34, -0.05], [-0.02, 0.62, 0]] as Vec3[]).map((leaf, index) => (
        <mesh key={index} position={leaf} rotation={[0.2, index * 1.2, index % 2 ? 0.6 : -0.6]} castShadow>
          <sphereGeometry args={[0.16, 10, 8]} />
          <meshStandardMaterial color={index % 2 ? "#587348" : "#6f8959"} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Sofa({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <Block size={[2.2, 0.42, 0.82]} position={[0, 0.34, 0]} color="#9e917b" radius={0.13} />
      <Block size={[2.2, 0.68, 0.2]} position={[0, 0.72, -0.36]} color="#867b69" radius={0.1} />
      <Block size={[0.18, 0.46, 0.82]} position={[-1.08, 0.46, 0]} color="#807461" radius={0.08} />
      <Block size={[0.18, 0.46, 0.82]} position={[1.08, 0.46, 0]} color="#807461" radius={0.08} />
      <Block size={[0.56, 0.16, 0.54]} position={[-0.45, 0.6, 0.02]} color="#b2a48d" radius={0.1} />
      <Block size={[0.56, 0.16, 0.54]} position={[0.25, 0.6, 0.02]} color="#8b9b74" radius={0.1} />
    </group>
  );
}

function LowTable({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <Block size={[1.35, 0.12, 0.72]} position={[0, 0.38, 0]} color="#72523a" radius={0.06} />
      {([[-0.52, 0.18, -0.23], [0.52, 0.18, -0.23], [-0.52, 0.18, 0.23], [0.52, 0.18, 0.23]] as Vec3[]).map((p, i) => (
        <Block key={i} size={[0.08, 0.38, 0.08]} position={p} color="#543a29" radius={0.02} />
      ))}
      <mesh position={[0.18, 0.47, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.06, 20]} />
        <meshStandardMaterial color="#d9d1bb" />
      </mesh>
    </group>
  );
}

function DiningSet({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <Block size={[1.75, 0.12, 0.9]} position={[0, 0.78, 0]} color="#7a583c" radius={0.04} />
      {([[-0.65, 0.38, -0.31], [0.65, 0.38, -0.31], [-0.65, 0.38, 0.31], [0.65, 0.38, 0.31]] as Vec3[]).map((p, i) => (
        <Block key={i} size={[0.08, 0.75, 0.08]} position={p} color="#5d412d" radius={0.02} />
      ))}
      {([[-1.03, 0.45, 0], [1.03, 0.45, 0]] as Vec3[]).map((p, i) => (
        <group key={i} position={p} rotation={[0, i === 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
          <Block size={[0.52, 0.1, 0.52]} position={[0, 0.32, 0]} color="#8b6749" radius={0.04} />
          <Block size={[0.52, 0.68, 0.1]} position={[0, 0.67, -0.22]} color="#745337" radius={0.04} />
        </group>
      ))}
    </group>
  );
}

function Bed({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <Block size={[2.25, 0.28, 1.15]} position={[0, 0.28, 0]} color="#8b6c52" radius={0.06} />
      <Block size={[2.12, 0.32, 1.05]} position={[0, 0.5, 0]} color="#c8bba2" radius={0.14} />
      <Block size={[0.62, 0.17, 0.46]} position={[-0.62, 0.72, -0.2]} color="#e5ddc9" radius={0.12} />
      <Block size={[0.62, 0.17, 0.46]} position={[0.13, 0.72, -0.2]} color="#ddd3bd" radius={0.12} />
      <Block size={[2.25, 0.9, 0.12]} position={[0, 0.64, -0.53]} color="#745740" radius={0.05} />
    </group>
  );
}

function TatamiArea({ position, columns = 2 }: { position: Vec3; columns?: number }) {
  const mats = Array.from({ length: columns * 2 }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return [column * 1.48 - ((columns - 1) * 1.48) / 2, 0, row * 1.34 - 0.67] as Vec3;
  });

  return (
    <group position={position}>
      {mats.map((mat, index) => (
        <group key={index} position={mat} rotation={[0, index % 2 ? Math.PI / 2 : 0, 0]}>
          <Block size={[1.38, 0.065, 1.24]} position={[0, 0, 0]} color={index % 2 ? "#a89c65" : "#b6aa72"} radius={0.018} />
          <Block size={[1.42, 0.07, 0.035]} position={[0, 0.012, -0.62]} color="#4d4932" radius={0.006} />
          <Block size={[1.42, 0.07, 0.035]} position={[0, 0.012, 0.62]} color="#4d4932" radius={0.006} />
        </group>
      ))}
    </group>
  );
}

function ShojiPanel({ position, width = 2.6, height = 2.45 }: { position: Vec3; width?: number; height?: number }) {
  const verticals = [-0.38, -0.12, 0.12, 0.38];
  const horizontals = [-0.34, 0, 0.34];
  return (
    <group position={position}>
      <Block size={[width, height, 0.055]} position={[0, 0, 0]} color="#e6dec3" radius={0.015} emissive="#6d5d3c" />
      <Block size={[width + 0.12, 0.09, 0.09]} position={[0, height / 2, 0.04]} color="#4e3828" radius={0.012} />
      <Block size={[width + 0.12, 0.09, 0.09]} position={[0, -height / 2, 0.04]} color="#4e3828" radius={0.012} />
      <Block size={[0.09, height, 0.09]} position={[-width / 2, 0, 0.04]} color="#4e3828" radius={0.012} />
      <Block size={[0.09, height, 0.09]} position={[width / 2, 0, 0.04]} color="#4e3828" radius={0.012} />
      {verticals.map((x) => <Block key={x} size={[0.035, height, 0.075]} position={[x * width, 0, 0.045]} color="#71513a" radius={0.006} />)}
      {horizontals.map((y) => <Block key={y} size={[width, 0.035, 0.075]} position={[0, y * height, 0.045]} color="#71513a" radius={0.006} />)}
    </group>
  );
}

function PaperLantern({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.58, 20]} />
        <meshStandardMaterial color="#f5dfb0" emissive="#ffbd69" emissiveIntensity={2.4} roughness={0.9} />
      </mesh>
      <Block size={[0.46, 0.035, 0.46]} position={[0, 0.31, 0]} color="#3c2b22" radius={0.01} />
      <Block size={[0.46, 0.035, 0.46]} position={[0, -0.31, 0]} color="#3c2b22" radius={0.01} />
      <pointLight color="#ffbd69" intensity={4.5} distance={3.2} />
    </group>
  );
}

function Zabuton({ position, color = "#7d6044" }: { position: Vec3; color?: string }) {
  return <Block size={[0.62, 0.12, 0.62]} position={position} color={color} radius={0.13} />;
}

function Router({ position, active }: { position: Vec3; active: boolean }) {
  return (
    <group position={position}>
      <Block size={[0.48, 0.18, 0.34]} position={[0, 0, 0]} color="#17231c" radius={0.06} emissive={active ? "#9dff3f" : "#57704e"} />
      {[-0.14, 0.14].map((x) => (
        <mesh key={x} position={[x, 0.32, -0.08]}>
          <cylinderGeometry args={[0.015, 0.015, 0.56, 8]} />
          <meshStandardMaterial color="#26372c" />
        </mesh>
      ))}
      <pointLight color="#b7ff4a" intensity={active ? 7 : 2} distance={3.5} />
    </group>
  );
}

function SignalRing({ index, position, color }: { index: number; position: Vec3; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const phase = (clock.elapsedTime * 0.34 + index * 0.28) % 1;
    ref.current.scale.setScalar(0.75 + phase * 2.3);
    const material = ref.current.material as THREE.MeshBasicMaterial;
    material.opacity = 0.65 * (1 - phase);
  });
  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.36, 0.405, 72]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function SignalPath({ step }: { step: number }) {
  const points = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(3.45, 0.68, 0.7),
      new THREE.Vector3(2.8, 2.0, 0.65),
      new THREE.Vector3(0.2, 3.0, 0.6),
      new THREE.Vector3(-1.35, 4.03, 0.75),
    ]);
    return curve.getPoints(70);
  }, []);
  return (
    <group>
      <Line
        points={points}
        color={step === 2 ? "#ff8555" : "#b8ff54"}
        lineWidth={1.8}
        transparent
        opacity={step === 0 ? 0.34 : 0.86}
        dashed
        dashSize={0.12}
        gapSize={0.1}
      />
      {[0, 1, 2].map((index) => (
        <SignalRing key={index} index={index} position={[-1.35, 3.72, 0.75]} color={step === 2 ? "#ff8555" : "#b8ff54"} />
      ))}
      {[0, 1, 2].map((index) => (
        <SignalRing key={`router-${index}`} index={index} position={[3.45, 0.57, 0.7]} color="#b8ff54" />
      ))}
    </group>
  );
}

function UprightResident() {
  return (
    <group position={[-1.7, 0.8, 0.55]}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <sphereGeometry args={[0.19, 24, 24]} />
        <meshStandardMaterial color="#d5b292" />
      </mesh>
      <mesh position={[0, 0.47, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.52, 8, 16]} />
        <meshStandardMaterial color="#6e7769" />
      </mesh>
      {[-0.13, 0.13].map((x) => (
        <mesh key={x} position={[x, -0.03, 0]} castShadow>
          <capsuleGeometry args={[0.07, 0.42, 6, 12]} />
          <meshStandardMaterial color="#504b45" />
        </mesh>
      ))}
    </group>
  );
}

function FallenResident({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <group position={[-1.35, 3.64, 0.72]} rotation={[0, 0.2, -Math.PI / 2]} scale={1.18}>
      <pointLight position={[0.1, 0.9, 1]} color="#ff9a68" intensity={4.5} distance={2.8} />
      <mesh position={[0, 0.78, 0]} castShadow>
        <sphereGeometry args={[0.23, 24, 24]} />
        <meshStandardMaterial color="#d2aa87" />
      </mesh>
      <mesh position={[0, 0.12, 0]} castShadow>
        <capsuleGeometry args={[0.26, 0.68, 8, 16]} />
        <meshStandardMaterial color="#b86e56" roughness={0.85} />
      </mesh>
      <mesh position={[0.2, 0.26, 0.03]} rotation={[0, 0, 0.9]} castShadow>
        <capsuleGeometry args={[0.07, 0.5, 6, 12]} />
        <meshStandardMaterial color="#c37a61" />
      </mesh>
      <mesh position={[-0.2, 0.2, -0.02]} rotation={[0, 0, -0.5]} castShadow>
        <capsuleGeometry args={[0.07, 0.46, 6, 12]} />
        <meshStandardMaterial color="#a96350" />
      </mesh>
      {[-0.14, 0.14].map((x, index) => (
        <mesh key={x} position={[x, -0.72, 0]} rotation={[0, 0, index ? 0.2 : -0.2]} castShadow>
          <capsuleGeometry args={[0.09, 0.64, 6, 12]} />
          <meshStandardMaterial color="#454a46" />
        </mesh>
      ))}
      <mesh position={[0, 0.8, -0.08]}>
        <sphereGeometry args={[0.235, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#b9b8ad" />
      </mesh>
    </group>
  );
}

function Courier({ active }: { active: boolean }) {
  return (
    <group position={[-0.55, -0.1, 3.05]} rotation={[0, 0.15, 0]} scale={active ? 1.05 : 0.9}>
      <mesh position={[0, 1.62, 0]} castShadow>
        <sphereGeometry args={[0.2, 24, 24]} />
        <meshStandardMaterial color="#b98868" />
      </mesh>
      <mesh position={[0, 1.78, 0]} castShadow>
        <sphereGeometry args={[0.21, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#15232c" />
      </mesh>
      <mesh position={[0, 1.1, 0]} castShadow>
        <capsuleGeometry args={[0.23, 0.62, 8, 16]} />
        <meshStandardMaterial color={active ? "#ef7048" : "#7e5747"} />
      </mesh>
      {[-0.13, 0.13].map((x) => (
        <mesh key={x} position={[x, 0.37, 0]} castShadow>
          <capsuleGeometry args={[0.075, 0.58, 6, 12]} />
          <meshStandardMaterial color="#20272b" />
        </mesh>
      ))}
      <Block size={[0.8, 0.88, 0.44]} position={[0, 1.16, -0.3]} color={active ? "#e95f3d" : "#64463d"} radius={0.08} emissive={active ? "#7d1d0f" : undefined} />
      {active ? <pointLight color="#ff734f" intensity={5} distance={3} /> : null}
    </group>
  );
}

function House({ step }: { step: number }) {
  const frame = "#202927";
  const wall = "#b6a994";
  const floor = "#7a5b42";
  const darkWood = "#4c3528";
  return (
    <group position={[1.25, -1.05, -0.25]} rotation={[0, -0.03, 0]}>
      <Block size={[9.4, 0.25, 4.6]} position={[0, 0, 0]} color="#3c342d" radius={0.04} />
      <Block size={[9.4, 0.22, 4.6]} position={[0, 3.16, 0]} color="#473a30" radius={0.03} />
      <Block size={[9.55, 0.18, 4.72]} position={[0, 6.24, -0.08]} color="#18211f" radius={0.03} />

      <Block size={[9.5, 0.18, 2.9]} position={[0, 6.75, -1.15]} rotation={[0.12, 0, 0]} color="#17201f" radius={0.02} />
      <Block size={[9.5, 0.18, 2.9]} position={[0, 6.72, 1.15]} rotation={[-0.12, 0, 0]} color="#121a19" radius={0.02} />
      <Block size={[9.9, 0.2, 0.28]} position={[0, 6.91, 0]} color="#0d1515" radius={0.04} />
      <Block size={[9.85, 0.28, 0.2]} position={[0, 6.54, 2.55]} color="#111a19" radius={0.03} />

      <Block size={[0.22, 6.25, 4.6]} position={[-4.6, 3.12, 0]} color={frame} radius={0.02} />
      <Block size={[0.22, 6.25, 4.6]} position={[4.6, 3.12, 0]} color={frame} radius={0.02} />
      <Block size={[9.35, 6.2, 0.18]} position={[0, 3.12, -2.2]} color={wall} radius={0.02} />
      {[-4.52, 0, 4.52].map((x) => <Block key={x} size={[0.18, 6.25, 0.18]} position={[x, 3.12, 2.18]} color={frame} radius={0.01} />)}

      <Block size={[0.12, 3.0, 4.35]} position={[0.1, 1.56, 0]} color="#9f917e" radius={0.015} />
      <Block size={[0.12, 3.0, 4.35]} position={[2.45, 4.72, 0]} color="#a79882" radius={0.015} />
      <Block size={[0.12, 3.0, 4.35]} position={[-0.25, 4.72, 0]} color="#9b8b76" radius={0.015} />

      <Block size={[9.25, 0.08, 4.3]} position={[0, 0.17, 0]} color={floor} radius={0.01} />
      <Block size={[9.25, 0.08, 4.3]} position={[0, 3.34, 0]} color="#8a684c" radius={0.01} />

      <Sofa position={[-2.8, 0.16, -0.8]} />
      <LowTable position={[-2.65, 0.16, 0.55]} />
      <Zabuton position={[-3.55, 0.26, 0.6]} color="#8b5948" />
      <Zabuton position={[-1.75, 0.26, 0.55]} color="#5e745d" />
      <Plant position={[-4.0, 0.2, -1.45]} scale={0.9} />
      <WarmLamp position={[-3.9, 1.05, -0.7]} />
      <DiningSet position={[1.25, 0.16, -0.2]} />
      <Block size={[1.85, 0.9, 0.48]} position={[3.42, 0.65, -1.72]} color={darkWood} radius={0.05} />
      <Router position={[3.45, 1.2, -1.4]} active={step > 0} />
      <Plant position={[4.05, 0.18, 0.85]} scale={0.75} />

      <ShojiPanel position={[3.35, 1.72, -2.08]} width={2.15} height={2.55} />
      <PaperLantern position={[2.7, 1.04, 1.45]} />
      <Block size={[2.25, 0.18, 1.05]} position={[-0.5, 0.25, 2.38]} color="#4b3528" radius={0.025} />
      <Block size={[1.5, 0.18, 0.78]} position={[-0.5, 0.42, 2.46]} color="#76624d" radius={0.025} />

      <TatamiArea position={[-2.18, 3.41, -0.1]} columns={2} />
      <Bed position={[0.95, 3.48, -1.18]} />
      <LowTable position={[-2.65, 3.48, -0.4]} />
      <Zabuton position={[-3.55, 3.58, -0.25]} color="#765a43" />
      <Zabuton position={[-1.72, 3.58, -0.35]} color="#69745c" />
      <ShojiPanel position={[-2.12, 4.73, -2.08]} width={3.75} height={2.48} />
      <Block size={[1.6, 0.1, 0.68]} position={[3.45, 4.18, -1.2]} color="#6c4e37" radius={0.03} />
      <Block size={[1.25, 1.55, 0.26]} position={[4.0, 4.28, -1.82]} color="#5a4130" radius={0.04} />
      {[3.78, 4.2, 4.62].map((y) => <Block key={y} size={[1.1, 0.04, 0.32]} position={[4, y, -1.61]} color="#a9875f" radius={0.01} />)}
      <WarmLamp position={[0.0, 4.84, -1.68]} />
      <PaperLantern position={[-3.9, 4.24, 1.32]} />
      <Plant position={[4.0, 3.52, 0.95]} scale={0.75} />

      {step === 0 ? <UprightResident /> : <FallenResident visible />}
      <Courier active={step === 2} />
      <SignalPath step={step} />

      {step === 1 ? (
        <Html position={[-1.3, 4.75, 0.8]} center distanceFactor={8}>
          <div className="scene-callout alert-callout"><b>UNUSUAL SILENCE</b><span>NO MOVEMENT FOR 8 HOURS</span></div>
        </Html>
      ) : null}
      {step === 2 ? (
        <Html position={[-0.45, 1.5, 2.8]} center distanceFactor={8}>
          <div className="scene-callout courier-callout"><b>HUMAN CHECK-IN</b><span>BENTO COURIER AT THE DOOR</span></div>
        </Html>
      ) : null}
    </group>
  );
}

export function HomeScene({ step }: { step: number }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.65]}
      camera={{ position: [8.8, 5.7, 10.2], fov: 35, near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#071018"]} />
      <fog attach="fog" args={["#071018", 17, 31]} />
      <ambientLight intensity={0.34} color="#8da0a4" />
      <directionalLight position={[-5, 9, 7]} intensity={1.6} color="#a7c7da" castShadow shadow-mapSize={[2048, 2048]} />
      <House step={step} />
      <ContactShadows position={[1.2, -1.18, 0]} opacity={0.58} scale={15} blur={2.8} far={6} color="#000000" />
      <Environment preset="night" />
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        minDistance={9.4}
        maxDistance={15}
        minPolarAngle={0.72}
        maxPolarAngle={1.25}
        minAzimuthAngle={-0.32}
        maxAzimuthAngle={0.35}
        target={[0.8, 2.2, 0]}
      />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.75} luminanceThreshold={0.68} luminanceSmoothing={0.26} mipmapBlur />
        <Vignette eskil={false} offset={0.18} darkness={0.46} />
      </EffectComposer>
    </Canvas>
  );
}
