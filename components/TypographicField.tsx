"use client";

import { useEffect, useRef } from "react";

export type TypographicFieldProps = {
  mode?: "landing" | "door" | "header";
  phase?: "closed" | "paid" | "inside" | "review";
  pulseKey?: number | string;
  animate?: boolean;
};

const RAMP =
  " .'`^\",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

const MODES = {
  landing: { cell: 12, cx: 0.68, cy: 0.4, radius: 0.5 },
  door: { cell: 14, cx: 0.5, cy: 0.5, radius: 0.55 },
  header: { cell: 6, cx: 0.5, cy: 0.5, radius: 0.7 },
} as const;

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

    const cfg = MODES[mode] ?? MODES.landing;
    const start = performance.now();
    let raf = 0;
    let disposed = false;
    let cols = 0;
    let rows = 0;
    let cell = cfg.cell;
    let last = 0;

    const draw = (now: number) => {
      const rectW = canvas.clientWidth;
      const rectH = canvas.clientHeight;
      if (rectW < 2 || rectH < 2 || cols < 1 || rows < 1) return;

      ctx.clearRect(0, 0, rectW, rectH);

      const t = (now - start) / 1000;
      const pulse = Math.max(0, pulseUntil.current - now) / 1400;
      const currentPhase = phaseRef.current;
      const accent =
        (currentPhase === "paid"
          ? 0.7
          : currentPhase === "review"
            ? 0.45
            : 0) + pulse * 0.5;
      const [r, g, b] = colorFor(currentPhase, accent);

      const blobs = [
        {
          x: cfg.cx + Math.sin(t * 0.22) * 0.14,
          y: cfg.cy + Math.cos(t * 0.17) * 0.12,
          r: 0.22,
          k: 1,
        },
        {
          x: cfg.cx + Math.cos(t * 0.13 + 1.7) * 0.2,
          y: cfg.cy + Math.sin(t * 0.19 + 0.6) * 0.16,
          r: 0.16,
          k: 0.7,
        },
        {
          x: cfg.cx + Math.sin(t * 0.31 + 3.1) * 0.1,
          y: cfg.cy + Math.cos(t * 0.27 + 2.2) * 0.18,
          r: 0.11,
          k: 0.5,
        },
      ];

      for (let y = 0; y < rows; y += 1) {
        const ny = (y + 0.5) / rows;
        for (let x = 0; x < cols; x += 1) {
          const nx = (x + 0.5) / cols;
          let v = 0;
          for (const blob of blobs) {
            const dx = nx - blob.x;
            const dy = ny - blob.y;
            v += blob.k * Math.exp(-(dx * dx + dy * dy) / (2 * blob.r * blob.r));
          }
          const d = Math.hypot(nx - cfg.cx, ny - cfg.cy);
          const mask = Math.max(0, 1 - Math.pow(d / cfg.radius, 2));
          v *= mask;
          v += pulse * 0.3 * Math.exp(-(d * d) / 0.18);
          if (v < 0.03) continue;

          const idx = Math.min(
            RAMP.length - 1,
            Math.floor(v * (RAMP.length - 1) * 1.35),
          );
          const ch = RAMP[idx];
          if (ch === " ") continue;

          const alpha = Math.min(0.92, 0.16 + v * 0.95);
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.fillText(ch, x * cell, y * cell);
        }
      }
    };

    const loop = (now: number) => {
      if (disposed) return;
      if (now - last > 1000 / 30) {
        last = now;
        draw(now);
      }
      raf = requestAnimationFrame(loop);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = cfg.cell;
      cols = Math.ceil(rect.width / cell);
      rows = Math.ceil(rect.height / cell);
      ctx.font = `${cell - 1}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      if (!animate) draw(start);
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else if (animate) {
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    };

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
    resize();

    if (animate) raf = requestAnimationFrame(loop);
    else draw(start);

    window.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mode, animate]);

  return <canvas ref={ref} className="ascii-canvas" aria-hidden />;
}
