"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Backdrop } from "@/components/Backdrop";
import { QrImage } from "@/components/QrImage";
import { api, getStaffPin, setStaffPin } from "@/lib/client";
import { DEMO_EVENT_ID } from "@/lib/demo";
import { statusClass, statusLabel } from "@/lib/state";
import type { EventState } from "@/lib/types";

export default function DemoPage() {
  const eventId = DEMO_EVENT_ID;
  const [pin, setPin] = useState("");
  const [state, setState] = useState<EventState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const existing = getStaffPin();
    if (existing) setPin(existing);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setStaffPin(pin);
      const next = await api<EventState>(`/api/events/${eventId}/state`);
      setState(next);
      setError(null);
      if (!selected && next.guests[0]) setSelected(next.guests[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    }
  }, [eventId, pin, selected]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 2000);
    return () => clearInterval(t);
  }, [refresh]);

  const guest =
    state?.guests.find((g) => g.id === selected) ?? state?.guests[0] ?? null;

  const fieldPhase =
    guest?.status === "paid"
      ? "paid"
      : guest?.status === "late"
        ? "review"
        : guest?.status === "admitted"
          ? "inside"
          : "closed";

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      setStaffPin(pin);
      await fn();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Backdrop
        mode="demo"
        phase={fieldPhase}
        pulseKey={state?.totals.paid ?? 0}
      />
      <main>
      <header className="topbar">
        <div>
          <p className="kicker">
            Umbral / Demo <span className="tag">Demo</span>
          </p>
          <h1>Simulador sin cobro real</h1>
          <p className="sub">Misma transición que el webhook. El pago real va en la taquilla.</p>
        </div>
        <div className="toolbar">
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            aria-label="PIN staff"
          />
          <Link className="btn" href={`/taquilla/${eventId}`}>
            Taquilla
          </Link>
          <Link className="btn" href={`/puerta/${eventId}?token=demo-token`}>
            Puerta
          </Link>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <h2>Persona</h2>
      <div className="split">
        <div>
          <div className="actions">
            {(state?.guests ?? []).map((g) => (
              <button
                key={g.id}
                type="button"
                className={selected === g.id ? "chip is-on" : "chip"}
                onClick={() => setSelected(g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>

          {guest ? (
            <div className="card" style={{ marginTop: "0.85rem" }}>
              <div className="guest-head">
                <div className="name">{guest.name}</div>
                <span className={statusClass(guest.status)}>
                  {statusLabel(guest.status)}
                </span>
              </div>
              <div className="actions" style={{ marginTop: "0.9rem" }}>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                void run("issue", async () => {
                  await api("/api/charges", {
                    method: "POST",
                    body: JSON.stringify({ guestId: guest.id }),
                  });
                })
              }
            >
              Emitir cobro
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                void run("paid", async () => {
                  await api("/api/demo/simulate", {
                    method: "POST",
                    body: JSON.stringify({ guestId: guest.id, kind: "paid" }),
                  });
                })
              }
            >
              Simular pago
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                void run("dup", async () => {
                  await api("/api/demo/simulate", {
                    method: "POST",
                    body: JSON.stringify({
                      guestId: guest.id,
                      kind: "duplicate",
                    }),
                  });
                })
              }
            >
              Duplicar webhook
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                void run("expire", async () => {
                  await api("/api/demo/simulate", {
                    method: "POST",
                    body: JSON.stringify({ guestId: guest.id, kind: "expire" }),
                  });
                })
              }
            >
              Vencer QR
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                void run("late", async () => {
                  await api("/api/demo/simulate", {
                    method: "POST",
                    body: JSON.stringify({ guestId: guest.id, kind: "late" }),
                  });
                })
              }
            >
              Pago tardío
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                void run("admit", async () => {
                  await api(`/api/events/${eventId}/admit`, {
                    method: "POST",
                    body: JSON.stringify({ guestId: guest.id }),
                  });
                })
              }
            >
              Admitir
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                void run("reset", async () => {
                  await api("/api/demo/reset", { method: "POST" });
                })
              }
            >
              Reset
            </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className={guest?.charge ? "qr-stage" : "qr-stage is-empty"}>
          {guest?.charge ? (
            <QrImage
              qrImage={guest.charge.qr_image}
              qrString={guest.charge.qr_string}
              alt={`QR demo de ${guest.name}`}
            />
          ) : (
            <p className="meta">Emite un cobro para ver el QR.</p>
          )}
        </div>
      </div>

      {state ? (
        <>
          <h2>Corte</h2>
          <div className="totals">
            <div>
              <strong>{state.totals.paid}</strong>
              <span className="meta">con pago</span>
            </div>
            <div>
              <strong>{state.totals.pending}</strong>
              <span className="meta">pendientes</span>
            </div>
            <div>
              <strong>{state.totals.late}</strong>
              <span className="meta">tarde</span>
            </div>
            <div>
              <strong>{state.totals.admitted}</strong>
              <span className="meta">adentro</span>
            </div>
            <div>
              <strong>
                ${(state.totals.amountPaidCents / 100).toFixed(2)}
              </strong>
              <span className="meta">total</span>
            </div>
          </div>
        </>
      ) : null}
    </main>
    </>
  );
}
