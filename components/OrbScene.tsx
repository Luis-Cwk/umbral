"use client";

import { useEffect, useRef } from "react";

export type OrbSceneProps = {
  phase?: "closed" | "paid" | "inside" | "review";
  pulseKey?: number | string;
  compact?: boolean;
  onError?: () => void;
};

function particleCount(): number {
  if (typeof window === "undefined") return 2000;
  return window.matchMedia("(max-width: 720px)").matches ? 800 : 3200;
}

function phaseIntensity(phase: OrbSceneProps["phase"]): number {
  if (phase === "paid") return 1;
  if (phase === "inside") return 0.45;
  if (phase === "review") return 0.3;
  return 0.22;
}

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
    let points: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let camera: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let scene: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let intensityUniform: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pulseUniform: any = null;

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
      if (!renderer || !points || !intensityUniform || !pulseUniform) return;

      intensityUniform.value +=
        (phaseIntensity(phaseRef.current) - intensityUniform.value) * 0.06;

      const remaining = Math.max(0, pulseUntilRef.current - performance.now());
      const pulseTarget =
        remaining > 0 ? Math.min(1, remaining / 1500) * 1.15 : 0;
      pulseUniform.value += (pulseTarget - pulseUniform.value) * 0.12;

      mouseX += (targetX - mouseX) * 0.04;
      mouseY += (targetY - mouseY) * 0.04;

      points.rotation.y = time * 0.00008 + mouseX * 0.18;
      points.rotation.x = mouseY * -0.12;
      points.scale.setScalar(
        1 +
          (phaseRef.current === "paid" ? 0.12 : 0) +
          pulseUniform.value * 0.2,
      );

      renderer.render(scene, camera);
    };

    async function start() {
      const THREE = await import("three/webgpu");
      const tsl = await import("three/tsl");
      if (disposed || !host) return;

      const count = particleCount();
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = Math.cbrt(Math.random()) * (compact ? 1.05 : 1.35);
        const i3 = i * 3;
        positions[i3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = r * Math.cos(phi);
      }

      geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );

      intensityUniform = tsl.uniform(phaseIntensity(phaseRef.current));
      pulseUniform = tsl.uniform(0);

      material = new THREE.PointsNodeMaterial({
        transparent: true,
        depthWrite: false,
        sizeAttenuation: true,
      });

      material.sizeNode = tsl
        .float(compact ? 1.6 : 2.2)
        .mul(tsl.float(1).add(pulseUniform.mul(1.8)))
        .mul(tsl.float(0.75).add(intensityUniform.mul(0.55)));

      material.colorNode = tsl.Fn(() => {
        const base = tsl.color("#d8d8d8");
        const accent = tsl.color("#b8ff3d");
        const mixAmount = pulseUniform
          .mul(0.9)
          .add(intensityUniform.mul(0.35))
          .clamp(0, 1);
        return tsl.mix(base, accent, mixAmount);
      })();

      material.opacityNode = tsl
        .float(0.35)
        .add(intensityUniform.mul(0.45))
        .add(pulseUniform.mul(0.35))
        .clamp(0.2, 0.95);

      material.positionNode = tsl.Fn(() => {
        const p = tsl.attribute("position", "vec3");
        const t = tsl.time.mul(0.18);
        const wobble = tsl.vec3(
          tsl.sin(p.y.mul(1.7).add(t)).mul(0.035),
          tsl.cos(p.x.mul(1.7).add(t)).mul(0.035),
          tsl.sin(p.x.add(p.y).add(t)).mul(0.035),
        );
        return p
          .add(wobble)
          .mul(tsl.float(1).add(pulseUniform.mul(0.28)));
      })();

      points = new THREE.Points(geometry, material);
      points.frustumCulled = false;

      scene = new THREE.Scene();
      scene.add(points);

      camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40);
      camera.position.z = compact ? 3.4 : 4.1;

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
