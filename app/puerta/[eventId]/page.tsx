"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Backdrop } from "@/components/Backdrop";
import { resolveEventId } from "@/lib/demo";
import type { EventState, GuestWithCharge } from "@/lib/types";

function playOpenTone() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(784, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    void ctx.resume();
  } catch {
    // ignore audio failures
  }
}

function PuertaInner() {
  const params = useParams<{ eventId: string }>();
  const search = useSearchParams();
  const eventId = resolveEventId(String(params.eventId));
  const token = search.get("token") ?? "demo-token";

  const [state, setState] = useState<EventState | null>(null);
  const [current, setCurrent] = useState<GuestWithCharge | null>(null);
  const [phase, setPhase] = useState<"closed" | "paid" | "inside" | "review">(
    "closed",
  );
  const [pulseKey, setPulseKey] = useState(0);
  const seen = useRef<Set<string>>(new Set());
  const queue = useRef<GuestWithCharge[]>([]);

  const refresh = useCallback(async () => {
    const res = await fetch(
      `/api/events/${eventId}/state?token=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return;
    const next = (await res.json()) as EventState;
    setState(next);

    for (const guest of next.guests) {
      if (guest.status === "paid" && !seen.current.has(guest.id)) {
        seen.current.add(guest.id);
        queue.current.push(guest);
      }
      if (guest.status === "late" && !seen.current.has(`late-${guest.id}`)) {
        seen.current.add(`late-${guest.id}`);
        setPhase("review");
        setCurrent(guest);
      }
    }
  }, [eventId, token]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 2000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    if (phase !== "closed" || queue.current.length === 0) return;
    const guest = queue.current.shift()!;
    setCurrent(guest);
    setPhase("paid");
    setPulseKey((n) => n + 1);
    playOpenTone();

    const admitTimer = setTimeout(() => {
      void fetch(`/api/events/${eventId}/admit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: guest.id, token }),
      }).then(() => {
        setPhase("inside");
      });
    }, 1200);

    const closeTimer = setTimeout(() => {
      setPhase("closed");
      setCurrent(null);
    }, 3500);

    return () => {
      clearTimeout(admitTimer);
      clearTimeout(closeTimer);
    };
  }, [phase, eventId, token, state]);

  const label =
    phase === "paid"
      ? "PAGADO"
      : phase === "inside"
        ? "ADENTRO"
        : phase === "review"
          ? "REVISIÓN"
          : "CERRADA";

  return (
    <div className="door">
      <Backdrop mode="door" phase={phase} pulseKey={pulseKey} />
      <div className="door-frame">
        <p className="kicker">
          Umbral{state?.event.is_demo ? " · demo" : ""}
        </p>
        <h1>{label}</h1>
        <p className="door-name">{current?.name ?? ""}</p>
      </div>
      <footer className="door-foot">
        <p>
          {phase === "review"
            ? "Pago tardío. Espera al staff."
            : "Solo abre cuando el pago ya cayó."}
        </p>
        <Link href={`/taquilla/${eventId}`}>Taquilla</Link>
      </footer>
    </div>
  );
}

export default function PuertaPage() {
  return (
    <Suspense
      fallback={
        <div className="door">
          <div className="door-frame">
            <p className="kicker">Umbral</p>
            <h1>CERRADA</h1>
          </div>
        </div>
      }
    >
      <PuertaInner />
    </Suspense>
  );
}
