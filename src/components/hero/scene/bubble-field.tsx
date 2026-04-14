"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { InstancedMesh, Object3D } from "three";

type Bubble = {
  x: number;
  y: number;
  z: number;
  r: number;
  vy: number;
  phase: number;
  freq: number;
};

const BUBBLE_COUNT = 42;

/**
 * Bubble particle field — instanced spheres with a custom fresnel-rim
 * shader for a glass / water bubble look. One draw call for all bubbles.
 *
 * Physics per frame (delta-normalized for 60fps-equivalent motion):
 *   y += vy          — upward buoyancy
 *   x += sin drift   — lateral wobble, unique phase per bubble
 *   respawn at bottom when y > top of frustum
 *
 * The bubble spread is tuned for a perspective camera at z=5, fov=45:
 *   visible volume roughly x[-3.5, 3.5], y[-3.5, 3.5], z[-2, 2]
 */
export function BubbleField() {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  const bubbles = useMemo<Bubble[]>(
    () =>
      Array.from({ length: BUBBLE_COUNT }, () => ({
        x: (Math.random() - 0.5) * 7,
        // start y-distributed across full frustum so the scene is full from frame 1
        y: (Math.random() - 0.5) * 7,
        z: (Math.random() - 0.5) * 3.4,
        r: 0.025 + Math.random() * 0.13,
        vy: 0.0025 + Math.random() * 0.006,
        phase: Math.random() * Math.PI * 2,
        freq: 0.4 + Math.random() * 1.2,
      })),
    [],
  );

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    // normalize physics to 60fps-equivalent rate so scene behaves same at 120fps
    const step = Math.min(delta * 60, 3);

    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      b.y += b.vy * step;

      // respawn bubble at bottom when it crosses top of frustum
      if (b.y > 3.9) {
        b.y = -3.9;
        b.x = (Math.random() - 0.5) * 7;
        b.z = (Math.random() - 0.5) * 3.4;
      }

      const wobbleX = Math.sin(t * b.freq + b.phase) * 0.18;

      dummy.position.set(b.x + wobbleX, b.y, b.z);
      dummy.scale.setScalar(b.r);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, BUBBLE_COUNT]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 14, 14]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        vertexShader={`
          varying vec3 vNormalView;
          varying vec3 vViewDir;
          void main() {
            vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
            vec3 nWorld = normalize(mat3(instanceMatrix) * normal);
            vNormalView = normalize(normalMatrix * nWorld);
            vViewDir = normalize(-mvPosition.xyz);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying vec3 vNormalView;
          varying vec3 vViewDir;

          void main() {
            float NdotV = max(0.0, dot(vNormalView, vViewDir));

            // Fresnel rim: brightest where surface is perpendicular to view.
            // pow for a tighter, sharper rim.
            float fresnel = pow(1.0 - NdotV, 3.0);

            // Inner highlight: fake a small specular blob on upper-left of each bubble
            // by dotting against a fixed light direction in view space.
            float highlight = pow(max(0.0, dot(vNormalView, normalize(vec3(-0.55, 0.72, 0.42)))), 28.0);

            // Colors: cool glassy rim + very bright specular center
            vec3 rim = vec3(0.56, 0.90, 0.96) * fresnel * 0.92;
            vec3 spec = vec3(0.98, 1.00, 1.00) * highlight * 0.85;

            // Faint inner tint so the bubble isn't a hollow ring
            vec3 inner = vec3(0.32, 0.70, 0.74) * pow(NdotV, 6.0) * 0.16;

            vec3 col = rim + spec + inner;
            float alpha = clamp(fresnel * 0.55 + highlight * 0.72 + 0.05, 0.0, 0.95);

            gl_FragColor = vec4(col, alpha);
          }
        `}
      />
    </instancedMesh>
  );
}
