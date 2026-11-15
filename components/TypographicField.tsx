"use client";

import { useEffect, useRef } from "react";

export type TypographicFieldProps = {
  mode?: "landing" | "door" | "header";
  phase?: "closed" | "paid" | "inside" | "review";
  pulseKey?: number | string;
  animate?: boolean;
};

const RAMP = " .:-=+*#%@";
const CHARS = RAMP.slice(1);

const CONFIG = {
  landing: {
    count: 300,
    speed: 1,
    opacity: 0.8,
    size: 11,
    tx: 0.68,
    ty: 0.45,
    amp: 0.18,
  },
  door: {
    count: 180,
    speed: 0.8,
    opacity: 0.55,
    size: 13,
    tx: 0.5,
    ty: 0.5,
    amp: 0.18,
  },
  header: {
    count: 40,
    speed: 0.6,
    opacity: 0.6,
    size: 7,
    tx: 0.5,
    ty: 0.5,
    amp: 0.1,
  },
} as const;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ch: string;
  wander: number;
};

function colorFor(
  phase: TypographicFieldProps["phase"],
  accent: number,
): [number, number, number] {
  const base: [number, number, number] =
    phase === "review" ? [255, 176, 32] : [232, 232, 232];
  const highlight: [number, number, number] =
    phase === "review" ? [255, 176, 32] : [198, 255, 74];
  const t = Math.max(0, Math.min(1, accent));
  return [
    Math.round(base[0] + (highlight[0] - base[0]) * t),
    Math.round(base[1] + (highlight[1] - base[1]) * t),
    Math.round(base[2] + (highlight[2] - base[2]) * t),
  ];
}

export function TypographicField({
  mode = "landing",
  phase = "closed",
  pulseKey = 0,
  animate = true,
}: TypographicFieldProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(phase);
  const pulseUntil = useRef(0);
  const pulseMounted = useRef(false);

  phaseRef.current = phase;

  useEffect(() => {
    if (!pulseMounted.current) {
      pulseMounted.current = true;
      return;
    }
    pulseUntil.current = performance.now() + 1400;
  }, [pulseKey]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const cfg = CONFIG[mode] ?? CONFIG.landing;
    let raf = 0;
    let disposed = false;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let lastDraw = 0;
    let particles: Particle[] = [];
    const pointer = { x: -9999, y: -9999, active: false };

    const makeParticles = () => {
      const mobile = window.innerWidth < 720;
      const count = Math.round(cfg.count * (mobile ? 0.55 : 1));
      const cx = width * cfg.tx;
      const cy = height * cfg.ty;
      const spreadX = Math.min(width * 0.28, 340);
      const spreadY = Math.min(height * 0.26, 280);
      particles = Array.from({ length: count }, () => ({
        x: cx + (Math.random() - 0.5) * spreadX,
        y: cy + (Math.random() - 0.5) * spreadY,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        ch: CHARS[Math.floor(Math.random() * CHARS.length)],
        wander: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${cfg.size}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      if (!particles.length) {
        makeParticles();
      } else {
        for (const p of particles) {
          p.x = Math.min(p.x, width);
          p.y = Math.min(p.y, height);
        }
      }
      draw();
    };

    const step = (dt: number) => {
      const currentPhase = phaseRef.current;
      const pulse =
        Math.max(0, pulseUntil.current - performance.now()) / 1400;
      const speedLimit =
        cfg.speed *
        (currentPhase === "paid" ? 1.45 : 1) *
        (1 + pulse * 0.35);

      const n = particles.length;
      const neighbor2 = 48 * 48;
      const sep2 = 22 * 22;

      for (let i = 0; i < n; i += 1) {
        const p = particles[i];
        let ax = 0;
        let ay = 0;
        let alignX = 0;
        let alignY = 0;
        let cohX = 0;
        let cohY = 0;
        let sepX = 0;
        let sepY = 0;
        let neighbors = 0;

        for (let j = 0; j < n; j += 1) {
          if (i === j) continue;
          const q = particles[j];
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > neighbor2 || d2 === 0) continue;
          const d = Math.sqrt(d2);
          alignX += q.vx;
          alignY += q.vy;
          cohX += q.x;
          cohY += q.y;
          neighbors += 1;
          if (d2 < sep2) {
            sepX -= dx / d;
            sepY -= dy / d;
          }
        }

        const now = performance.now() / 1000;
        const targetX =
          width * cfg.tx + Math.sin(now * 0.18) * width * cfg.amp;
        const targetY =
          height * cfg.ty + Math.cos(now * 0.13) * height * cfg.amp;
        ax += (targetX - p.x) * 0.0008;
        ay += (targetY - p.y) * 0.0008;

        if (neighbors > 0) {
          ax += (alignX / neighbors - p.vx) * 0.06;
          ay += (alignY / neighbors - p.vy) * 0.06;
          ax += (cohX / neighbors - p.x) * 0.006;
          ay += (cohY / neighbors - p.y) * 0.006;
          ax += sepX * 0.12;
          ay += sepY * 0.12;
        }

        p.wander += (Math.random() - 0.5) * 0.2;
        ax += Math.cos(p.wander) * 0.006;
        ay += Math.sin(p.wander) * 0.006;

        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          const radius = 190;
          if (d2 < radius * radius && d2 > 1) {
            const d = Math.sqrt(d2);
            const force = (1 - d / radius) * 1.1;
            ax += (dx / d) * force;
            ay += (dy / d) * force;
          }
        }

        const margin = 60;
        if (p.x < margin) ax += (margin - p.x) * 0.004;
        if (p.x > width - margin) ax -= (p.x - (width - margin)) * 0.004;
        if (p.y < margin) ay += (margin - p.y) * 0.004;
        if (p.y > height - margin) ay -= (p.y - (height - margin)) * 0.004;

        const maxForce = 0.12;
        ax = Math.max(-maxForce, Math.min(maxForce, ax));
        ay = Math.max(-maxForce, Math.min(maxForce, ay));

        p.vx += ax * dt;
        p.vy += ay * dt;

        const speed = Math.hypot(p.vx, p.vy);
        if (speed > speedLimit) {
          p.vx = (p.vx / speed) * speedLimit;
          p.vy = (p.vy / speed) * speedLimit;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.x < -20) p.x = width + 20;
        else if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        else if (p.y > height + 20) p.y = -20;

        if (Math.random() < 0.003) {
          p.ch = CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      }
    };

    const draw = () => {
      if (width < 2 || height < 2) return;
      ctx.clearRect(0, 0, width, height);
      const currentPhase = phaseRef.current;
      const pulse =
        Math.max(0, pulseUntil.current - performance.now()) / 1400;
      const accent =
        (currentPhase === "paid" ? 0.7 : currentPhase === "review" ? 0.5 : 0) +
        pulse * 0.4;
      const [r, g, b] = colorFor(currentPhase, accent);
      const speedLimit =
        cfg.speed *
        (currentPhase === "paid" ? 1.45 : 1) *
        (1 + pulse * 0.35);

      ctx.font = `${cfg.size}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      for (const p of particles) {
        const speed = Math.hypot(p.vx, p.vy) / speedLimit;
        const alpha =
          Math.min(0.9, 0.12 + speed * 0.55 + pulse * 0.25) * cfg.opacity;
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fillText(p.ch, p.x, p.y);
      }
    };

    const loop = (now: number) => {
      if (disposed) return;
      raf = requestAnimationFrame(loop);
      if (now - lastDraw < 1000 / 30) return;
      const dt = Math.min(2, (now - lastDraw) / 33) || 1;
      lastDraw = now;
      step(dt);
      draw();
    };

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    };

    const onDown = (event: PointerEvent) => {
      onMove(event);
    };

    const onUp = () => {
      pointer.active = false;
    };

    const onLeave = () => {
      pointer.active = false;
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else if (animate) {
        lastDraw = 0;
        raf = requestAnimationFrame(loop);
      }
    };

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
    resize();

    if (animate) raf = requestAnimationFrame(loop);
    else draw();

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    window.addEventListener("pointerleave", onLeave, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mode, animate]);

  return <canvas ref={ref} className="ascii-canvas" aria-hidden />;
}
