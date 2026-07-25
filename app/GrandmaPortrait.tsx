"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function GrandmaFigure() {
  const group = useRef<THREE.Group>(null);
  const skin = "#e2b089";
  const blush = "#e89a8a";
  const whiteHair = "#ffffff";
  const hairShade = "#d8d4cc";
  const kimono = "#6f9a78";
  const trim = "#3d5544";
  const baseY = -0.55;

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.rotation.y = -0.15 + Math.sin(t * 0.65) * 0.08;
    group.current.position.y = baseY + Math.sin(t * 1.3) * 0.02;
  });

  return (
    <group ref={group} position={[0, baseY, 0]} scale={1.05}>
      {/* Head */}
      <group position={[0, 1.52, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.23, 28, 28]} />
          <meshStandardMaterial color={skin} roughness={0.5} />
        </mesh>

        {/* Soft white hair dome */}
        <mesh position={[0, 0.07, -0.03]} castShadow>
          <sphereGeometry args={[0.245, 24, 24, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
          <meshStandardMaterial color={whiteHair} roughness={0.7} />
        </mesh>
        {/* Cute bun */}
        <mesh position={[0, 0.24, -0.04]} castShadow>
          <sphereGeometry args={[0.11, 20, 20]} />
          <meshStandardMaterial color={whiteHair} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.24, -0.04]}>
          <sphereGeometry args={[0.118, 16, 16]} />
          <meshStandardMaterial color={hairShade} roughness={1} transparent opacity={0.25} />
        </mesh>

        {/* Blush */}
        <mesh position={[-0.12, -0.02, 0.17]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial color={blush} transparent opacity={0.45} roughness={0.8} />
        </mesh>
        <mesh position={[0.12, -0.02, 0.17]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial color={blush} transparent opacity={0.45} roughness={0.8} />
        </mesh>

        {/* Cute eyes */}
        <mesh position={[-0.07, 0.03, 0.2]}>
          <sphereGeometry args={[0.038, 14, 14]} />
          <meshStandardMaterial color="#1a211c" />
        </mesh>
        <mesh position={[0.07, 0.03, 0.2]}>
          <sphereGeometry args={[0.038, 14, 14]} />
          <meshStandardMaterial color="#1a211c" />
        </mesh>
        <mesh position={[-0.06, 0.045, 0.23]}>
          <sphereGeometry args={[0.012, 10, 10]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.08, 0.045, 0.23]}>
          <sphereGeometry args={[0.012, 10, 10]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>

        {/* Soft smile */}
        <mesh position={[0, -0.07, 0.21]} rotation={[1.35, 0, 0]}>
          <torusGeometry args={[0.05, 0.012, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#c97b6d" />
        </mesh>
      </group>

      {/* Body */}
      <mesh position={[0, 0.92, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.52, 8, 16]} />
        <meshStandardMaterial color={kimono} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.14, 0.13]}>
        <boxGeometry args={[0.28, 0.08, 0.08]} />
        <meshStandardMaterial color={trim} />
      </mesh>

      {/* Arms folded softly in front */}
      <mesh position={[-0.2, 0.98, 0.2]} rotation={[0.85, 0.15, 0.9]} castShadow>
        <capsuleGeometry args={[0.055, 0.28, 6, 10]} />
        <meshStandardMaterial color={kimono} />
      </mesh>
      <mesh position={[0.2, 0.98, 0.2]} rotation={[0.85, -0.15, -0.9]} castShadow>
        <capsuleGeometry args={[0.055, 0.28, 6, 10]} />
        <meshStandardMaterial color={kimono} />
      </mesh>

      {/* Legs */}
      {[-0.1, 0.1].map((x) => (
        <mesh key={x} position={[x, 0.34, 0]} castShadow>
          <capsuleGeometry args={[0.07, 0.42, 6, 12]} />
          <meshStandardMaterial color="#2f3a34" />
        </mesh>
      ))}

      {/* Cane */}
      <mesh position={[0.36, 0.7, 0.12]} rotation={[0.05, 0, 0.08]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 1.05, 8]} />
        <meshStandardMaterial color="#5e412a" roughness={0.5} />
      </mesh>
    </group>
  );
}

export function GrandmaPortrait() {
  return (
    <div className="grandma-portrait-scene" role="img" aria-label="Cute 3D sample of Grandma">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.85, 3.35], fov: 28, near: 0.1, far: 40 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ camera, gl }) => {
          camera.lookAt(0, 0.7, 0);
          camera.updateProjectionMatrix();
          gl.setClearColor("#7f8c7c");
          gl.shadowMap.type = THREE.PCFShadowMap;
        }}
      >
        <color attach="background" args={["#7f8c7c"]} />
        <ambientLight intensity={1.05} color="#f2f5ee" />
        <directionalLight position={[2.4, 4.2, 3]} intensity={1.7} color="#fff7ea" castShadow />
        <directionalLight position={[-2.2, 1.8, 1.2]} intensity={0.5} color="#b7c8b8" />
        <hemisphereLight args={["#f7f8f2", "#5a6558", 0.5]} />
        <GrandmaFigure />
        <ContactShadows position={[0, -0.08, 0]} opacity={0.42} scale={5} blur={2.2} far={3.5} color="#2a322c" />
      </Canvas>
    </div>
  );
}
