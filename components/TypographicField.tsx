"use client";

import { useEffect, useRef } from "react";

export type FieldMode = "landing" | "door" | "header" | "taquilla" | "demo";

export type TypographicFieldProps = {
  mode?: FieldMode;
  phase?: "closed" | "paid" | "inside" | "review";
  pulseKey?: number | string;
  animate?: boolean;
};

const RAMP = " .:-=+*#%@";
const CHARS = RAMP.slice(1);

// Same physics, different weights: tight flock on the landing, a slow
// wide drift on the taquilla, a denser and faster field on the demo.
const CONFIG = {
  landing: {
    count: 300,
    speed: 1,
    opacity: 0.8,
    size: 11,
    tx: 0.68,
    ty: 0.45,
    amp: 0.18,
    spreadX: 0.22,
    spreadY: 0.26,
    pull: 0.0008,
    align: 0.06,
    coh: 0.006,
    sep: 0.12,
  },
  door: {
    count: 280,
    speed: 0.7,
    opacity: 0.6,
    size: 12,
    tx: 0.5,
    ty: 0.5,
    amp: 0.3,
    spreadX: 0.5,
    spreadY: 0.45,
    pull: 0.0005,
    align: 0.05,
    coh: 0.003,
    sep: 0.11,
  },
  header: {
    count: 40,
    speed: 0.6,
    opacity: 0.6,
    size: 7,
    tx: 0.5,
    ty: 0.5,
    amp: 0.1,
    spreadX: 0.5,
    spreadY: 0.5,
    pull: 0.0004,
    align: 0.04,
    coh: 0.004,
    sep: 0.08,
  },
  taquilla: {
    count: 380,
    speed: 0.45,
    opacity: 0.5,
    size: 9,
    tx: 0.5,
    ty: 0.55,
    amp: 0.36,
    spreadX: 0.95,
    spreadY: 0.9,
    pull: 0.00006,
    align: 0.004,
    coh: 0.0004,
    sep: 0.05,
  },
  demo: {
    count: 260,
    speed: 1.35,
    opacity: 0.38,
    size: 9,
    tx: 0.5,
    ty: 0.5,
    amp: 0.24,
    spreadX: 0.6,
    spreadY: 0.55,
    pull: 0.00025,
    align: 0.03,
    coh: 0.002,
    sep: 0.09,
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

type Obstacle = { l: number; t: number; r: number; b: number };

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

function desiredCount(base: number): number {
  return Math.round(base * (window.innerWidth < 720 ? 0.55 : 1));
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
    let frame = 0;
    let particles: Particle[] = [];
    let obstacles: Obstacle[] = [];
    const pointer = { x: -9999, y: -9999, active: false };
    const root = document.documentElement;

    const makeParticles = () => {
      const count = desiredCount(cfg.count);
      const cx = width * cfg.tx;
      const cy = height * cfg.ty;
      const spreadX = Math.min(width * cfg.spreadX, width);
      const spreadY = Math.min(height * cfg.spreadY, height);
      particles = Array.from({ length: count }, () => ({
        x: cx + (Math.random() - 0.5) * spreadX,
        y: cy + (Math.random() - 0.5) * spreadY,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        ch: CHARS[Math.floor(Math.random() * CHARS.length)],
        wander: Math.random() * Math.PI * 2,
      }));
    };

    const refreshObstacles = () => {
      const canvasRect = canvas.getBoundingClientRect();
      obstacles = Array.from(
        document.querySelectorAll<HTMLElement>("[data-field-obstacle]"),
      ).map((el) => {
        const r = el.getBoundingClientRect();
        return {
          l: r.left - canvasRect.left,
          t: r.top - canvasRect.top,
          r: r.right - canvasRect.left,
          b: r.bottom - canvasRect.top,
        };
      });
    };

    const resize = () => {
      const host = canvas.parentElement ?? canvas;
      const rect = host.getBoundingClientRect();
      const nextW = Math.max(rect.width, window.innerWidth);
      const nextH = Math.max(rect.height, window.innerHeight);
      if (nextW < 2 || nextH < 2) return;

      const prevW = width;
      const prevH = height;
      width = nextW;
      height = nextH;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${cfg.size}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";

      const want = desiredCount(cfg.count);
      if (!particles.length || Math.abs(particles.length - want) > 8) {
        makeParticles();
      } else if (prevW > 0 && prevH > 0) {
        const sx = width / prevW;
        const sy = height / prevH;
        for (const p of particles) {
          p.x *= sx;
          p.y *= sy;
        }
      }

      refreshObstacles();
      draw();
    };

    const pushFromObstacles = (p: Particle, ax: number, ay: number) => {
      let outX = ax;
      let outY = ay;
      const pad =
        mode === "landing" || mode === "door"
          ? 36
          : mode === "taquilla" || mode === "demo"
            ? 28
            : 18;
      for (const o of obstacles) {
        const l = o.l - pad;
        const t = o.t - pad;
        const r = o.r + pad;
        const b = o.b + pad;
        if (p.x < l || p.x > r || p.y < t || p.y > b) continue;
        const left = p.x - l;
        const right = r - p.x;
        const top = p.y - t;
        const bottom = b - p.y;
        const min = Math.min(left, right, top, bottom);
        const force = 0.18;
        if (min === left) outX -= force;
        else if (min === right) outX += force;
        else if (min === top) outY -= force;
        else outY += force;
      }
      return { ax: outX, ay: outY };
    };

    const publishField = (cx: number, cy: number, pulse: number) => {
      if (width < 1 || height < 1) return;
      root.style.setProperty("--umbral-field-x", (cx / width).toFixed(4));
      root.style.setProperty("--umbral-field-y", (cy / height).toFixed(4));
      root.style.setProperty("--umbral-field-pulse", pulse.toFixed(3));
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
      let massX = 0;
      let massY = 0;

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
        ax += (targetX - p.x) * cfg.pull;
        ay += (targetY - p.y) * cfg.pull;

        if (neighbors > 0) {
          ax += (alignX / neighbors - p.vx) * cfg.align;
          ay += (alignY / neighbors - p.vy) * cfg.align;
          ax += (cohX / neighbors - p.x) * cfg.coh;
          ay += (cohY / neighbors - p.y) * cfg.coh;
          ax += sepX * cfg.sep;
          ay += sepY * cfg.sep;
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

        ({ ax, ay } = pushFromObstacles(p, ax, ay));

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
        massX += p.x;
        massY += p.y;

        if (p.x < -20) p.x = width + 20;
        else if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        else if (p.y > height + 20) p.y = -20;

        if (Math.random() < 0.003) {
          p.ch = CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      }

      if (n > 0) publishField(massX / n, massY / n, pulse);
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
      frame += 1;
      if (frame % 12 === 0) refreshObstacles();
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
    ro.observe(canvas.parentElement ?? canvas);
    window.addEventListener("resize", resize, { passive: true });
    window.visualViewport?.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("scroll", resize);
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
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("scroll", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      root.style.removeProperty("--umbral-field-x");
      root.style.removeProperty("--umbral-field-y");
      root.style.removeProperty("--umbral-field-pulse");
    };
  }, [mode, animate]);

  return <canvas ref={ref} className="ascii-canvas" aria-hidden />;
}
