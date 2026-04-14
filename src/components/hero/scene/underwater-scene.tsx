"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

/**
 * Minimal MVP scene — dark underwater plane fills the canvas with a
 * vertical gradient (darker deep, slightly lighter up). Subsequent
 * milestones add bubbles, caustic rays, text distortion overlay.
 */
export function UnderwaterScene() {
  const planeRef = useRef<Mesh | null>(null);

  // Placeholder slow drift for the background plane so the scene is
  // never fully static — demonstrates the render loop is alive.
  useFrame((state) => {
    if (!planeRef.current) return;
    const t = state.clock.getElapsedTime();
    planeRef.current.position.x = Math.sin(t * 0.06) * 0.08;
    planeRef.current.position.y = Math.cos(t * 0.05) * 0.06;
  });

  return (
    <>
      {/* Background plane — large enough to fill any camera perspective */}
      <mesh ref={planeRef} position={[0, 0, -5]}>
        <planeGeometry args={[40, 25]} />
        <shaderMaterial
          uniforms={{
            uTop: { value: [0.055, 0.22, 0.245] }, // #0e3a3f
            uBottom: { value: [0.03, 0.15, 0.17] }, // #092a30 deeper
            uHighlight: { value: [0.32, 0.66, 0.69] }, // #51a8af teal
          }}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform vec3 uTop;
            uniform vec3 uBottom;
            uniform vec3 uHighlight;
            varying vec2 vUv;

            // Simple 2D hash for noise
            float hash(vec2 p) {
              return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }

            float noise(vec2 p) {
              vec2 i = floor(p);
              vec2 f = fract(p);
              vec2 u = f * f * (3.0 - 2.0 * f);
              return mix(
                mix(hash(i + vec2(0, 0)), hash(i + vec2(1, 0)), u.x),
                mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x),
                u.y
              );
            }

            void main() {
              // Vertical gradient: lighter top (surface), darker bottom (deep)
              vec3 col = mix(uBottom, uTop, smoothstep(0.0, 1.0, vUv.y));

              // Subtle highlight glow in upper-right (pseudo light source)
              float glow = smoothstep(0.3, 1.0, vUv.y) *
                           smoothstep(0.4, 1.0, vUv.x) * 0.14;
              col += uHighlight * glow;

              // Soft noise grain for tactile depth
              float n = noise(vUv * 180.0) * 0.018;
              col += vec3(n);

              gl_FragColor = vec4(col, 1.0);
            }
          `}
        />
      </mesh>
    </>
  );
}
