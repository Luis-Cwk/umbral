"use client";

import { useEffect, useRef } from "react";

export type OrbSceneProps = {
  phase?: "closed" | "paid" | "inside" | "review";
  pulseKey?: number | string;
  compact?: boolean;
  onError?: () => void;
};

function particleCount(): number {
  if (typeof window === "undefined") return 1200;
  return window.matchMedia("(max-width: 720px)").matches ? 600 : 1600;
}

function phaseIntensity(phase: OrbSceneProps["phase"]): number {
  if (phase === "paid") return 1;
  if (phase === "inside") return 0.45;
  if (phase === "review") return 0.3;
  return 0.22;
}

/**
 * A sphere of instanced planes. The per-particle position lives in the
 * instance matrix, not in a detached attribute, so every particle renders.
 * TSL only drives color and opacity; it does not move the instances.
 */
export default function OrbScene({
  phase = "closed",
  pulseKey = 0,
  compact = false,
  onError,
}: OrbSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);
  const pulseUntilRef = useRef(0);
  const onErrorRef = useRef(onError);

  phaseRef.current = phase;
  onErrorRef.current = onError;

  const pulseMounted = useRef(false);
  useEffect(() => {
    if (!pulseMounted.current) {
      pulseMounted.current = true;
      return;
    }
    pulseUntilRef.current = performance.now() + 1500;
  }, [pulseKey]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderer: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let geometry: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let material: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mesh: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let camera: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let scene: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let intensityUniform: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pulseUniform: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let group: any = null;

    const onMove = (event: MouseEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      targetX = (event.clientX / w - 0.5) * 2;
      targetY = (event.clientY / h - 0.5) * 2;
    };

    const onResize = () => {
      if (!renderer || !camera || !host) return;
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w < 2 || h < 2) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    const onVisibility = () => {
      if (!renderer) return;
      if (document.hidden) renderer.setAnimationLoop(null);
      else if (!disposed) renderer.setAnimationLoop(tick);
    };

    const tick = (time: number) => {
      if (!renderer || !group || !intensityUniform || !pulseUniform) return;

      intensityUniform.value +=
        (phaseIntensity(phaseRef.current) - intensityUniform.value) * 0.06;

      const remaining = Math.max(0, pulseUntilRef.current - performance.now());
      const pulseTarget =
        remaining > 0 ? Math.min(1, remaining / 1500) * 1.15 : 0;
      pulseUniform.value += (pulseTarget - pulseUniform.value) * 0.12;

      mouseX += (targetX - mouseX) * 0.04;
      mouseY += (targetY - mouseY) * 0.04;

      group.rotation.y = time * 0.00012 + mouseX * 0.2;
      group.rotation.x = mouseY * -0.14;
      group.scale.setScalar(
        1 +
          (phaseRef.current === "paid" ? 0.14 : 0) +
          pulseUniform.value * 0.22,
      );

      renderer.render(scene, camera);
    };

    async function start() {
      const THREE = await import("three/webgpu");
      const tsl = await import("three/tsl");
      if (disposed || !host) return;

      const count = particleCount();
      const radius = compact ? 1.05 : 1.4;
      const positions = new Float32Array(count * 3);

      for (let i = 0; i < count; i += 1) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = Math.cbrt(Math.random()) * radius;
        const i3 = i * 3;
        positions[i3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = r * Math.cos(phi);
      }

      intensityUniform = tsl.uniform(phaseIntensity(phaseRef.current));
      pulseUniform = tsl.uniform(0);

      geometry = new THREE.PlaneGeometry(0.03, 0.03);

      material = new THREE.MeshBasicNodeMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });

      material.colorNode = tsl.Fn(() => {
        const base = tsl.color("#e8e8e8");
        const accent = tsl.color("#c6ff4a");
        const mixAmount = pulseUniform
          .mul(0.85)
          .add(intensityUniform.mul(0.4))
          .add(0.2)
          .clamp(0, 1);
        return tsl.mix(base, accent, mixAmount);
      })();

      material.opacityNode = tsl.Fn(() => {
        const dist = tsl.uv().sub(0.5).length();
        const soft = tsl.float(1).sub(dist.mul(2).clamp(0, 1));
        return soft
          .mul(soft)
          .mul(
            tsl
              .float(0.45)
              .add(intensityUniform.mul(0.4))
              .add(pulseUniform.mul(0.35)),
          )
          .clamp(0.15, 0.95);
      })();

      mesh = new THREE.InstancedMesh(geometry, material, count);
      mesh.frustumCulled = false;

      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i += 1) {
        const i3 = i * 3;
        dummy.position.set(
          positions[i3],
          positions[i3 + 1],
          positions[i3 + 2],
        );
        dummy.scale.setScalar(0.55 + Math.random() * 0.9);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;

      group = new THREE.Group();
      group.add(mesh);

      scene = new THREE.Scene();
      scene.add(group);

      camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40);
      camera.position.z = compact ? 3.2 : 3.5;

      const makeRenderer = (forceWebGL: boolean) =>
        new THREE.WebGPURenderer({
          antialias: false,
          alpha: true,
          forceWebGL,
        });

      try {
        renderer = makeRenderer(false);
        await renderer.init();
      } catch {
        try {
          renderer?.dispose();
        } catch {
          // ignore
        }
        renderer = makeRenderer(true);
        await renderer.init();
      }

      if (disposed) {
        renderer.dispose();
        return;
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      renderer.domElement.style.pointerEvents = "none";
      host.appendChild(renderer.domElement);

      onResize();
      window.addEventListener("mousemove", onMove, { passive: true });
      window.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", onVisibility);
      renderer.setAnimationLoop(tick);
    }

    void start().catch(() => {
      onErrorRef.current?.();
    });

    return () => {
      disposed = true;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      renderer?.setAnimationLoop(null);
      if (renderer?.domElement?.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
      material?.dispose();
      geometry?.dispose();
      renderer?.dispose();
    };
  }, [compact]);

  return <div ref={hostRef} className="orb-canvas-host" aria-hidden />;
}
