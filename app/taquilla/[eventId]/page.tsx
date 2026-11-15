"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Backdrop } from "@/components/Backdrop";
import { QrImage } from "@/components/QrImage";
import { api, getStaffPin, setStaffPin } from "@/lib/client";
import { resolveEventId } from "@/lib/demo";
import {
  canAdmit,
  canIssueCharge,
  canRenew,
  canReviewLate,
  isExpired,
  statusClass,
  statusLabel,
} from "@/lib/state";
import type { EventState, GuestWithCharge } from "@/lib/types";

export default function TaquillaPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = resolveEventId(String(params.eventId));

  const [pin, setPin] = useState("");
  const [state, setState] = useState<EventState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<GuestWithCharge | null>(null);
  const [showCorte, setShowCorte] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setPin(getStaffPin());
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await api<EventState>(`/api/events/${eventId}/state`, {
        headers: { "x-staff-pin": getStaffPin() || pin },
      });
      setState(next);
      setError(null);
      setSelected((prev) => {
        if (!prev) return prev;
        return next.guests.find((g) => g.id === prev.id) ?? prev;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    }
  }, [eventId, pin]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 2000);
    return () => clearInterval(t);
  }, [refresh]);

  const savePin = () => {
    setStaffPin(pin);
    void refresh();
  };

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setBusy(null);
    }
  };

  const countdown = useMemo(() => {
    if (!selected?.charge?.expires_at) return null;
    const ms = new Date(selected.charge.expires_at).getTime() - now;
    if (ms <= 0) return "0:00";
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }, [selected, now]);

  return (
    <>
      <Backdrop mode="taquilla" pulseKey={state?.totals.paid ?? 0} />
      <main>
      <header className="topbar">
        <div data-field-obstacle className="field-copy">
          <p className="kicker">
            Umbral / Taquilla
            {state?.event.is_demo ? <span className="tag">Demo</span> : null}
          </p>
          <h1>
            {state?.event.name ?? (error ? "Taquilla privada" : "Cargando…")}
          </h1>
          <p className="sub">
            {state?.event.venue ?? "—"} · $
            {((state?.event.price_cents ?? 0) / 100).toFixed(2)} MXN
          </p>
        </div>
        <div className="toolbar">
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            aria-label="PIN staff"
          />
          <button type="button" onClick={savePin}>
            Guardar PIN
          </button>
          <button type="button" onClick={() => setShowCorte(true)}>
            Corte
          </button>
        </div>
      </header>

      {state ? (
        <div className="totals">
          <div>
            <strong>{state.totals.paid}</strong>
            <span className="meta">por entrar</span>
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
            <strong>${(state.totals.amountPaidCents / 100).toFixed(2)}</strong>
            <span className="meta">corte</span>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="error">
          {error === "unauthorized"
            ? "Taquilla privada. Escribe el PIN de staff y guarda."
            : error}
        </p>
      ) : null}

      <h2>Personas</h2>
      <div className="list">
        {(state?.guests ?? []).map((guest) => (
          <div className="guest-row" key={guest.id}>
            <div className="name">{guest.name}</div>
            <div className="meta">
              {guest.charge
                ? `$${(guest.charge.amount_cents / 100).toFixed(2)} · ${guest.charge.status}`
                : "sin cobro"}
            </div>
            <div className="guest-actions">
              <span className={statusClass(guest.status)}>
                {statusLabel(guest.status)}
              </span>
              {canIssueCharge(guest.status) ? (
                <button
                  type="button"
                  disabled={busy === guest.id}
                  onClick={() =>
                    void run(guest.id, async () => {
                      const res = await api<{ guest: GuestWithCharge }>(
                        "/api/charges",
                        {
                          method: "POST",
                          body: JSON.stringify({ guestId: guest.id }),
                        },
                      );
                      setSelected({ ...guest, ...res.guest });
                    })
                  }
                >
                  Emitir cobro
                </button>
              ) : null}
              {guest.charge ? (
                <button type="button" onClick={() => setSelected(guest)}>
                  Ver QR
                </button>
              ) : null}
              {canAdmit(guest.status) || canReviewLate(guest.status) ? (
                <button
                  type="button"
                  disabled={busy === `admit-${guest.id}`}
                  onClick={() =>
                    void run(`admit-${guest.id}`, async () => {
                      await api(`/api/events/${eventId}/admit`, {
                        method: "POST",
                        body: JSON.stringify({ guestId: guest.id }),
                      });
                    })
                  }
                >
                  Admitir
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {selected?.charge ? (
        <div
          className="modal-backdrop"
          onClick={() => setSelected(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSelected(null);
          }}
          role="presentation"
        >
          <div
            className="card modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={`Cobro CoDi de ${selected.name}`}
          >
            <p className="kicker">Cobro CoDi</p>
            <h2>{selected.name}</h2>
            <p>
              ${(selected.charge.amount_cents / 100).toFixed(2)} MXN · queda{" "}
              {countdown}
              {isExpired(selected.charge.expires_at) ? " · vencido" : ""}
            </p>
            <div className="qr-wrap">
              <QrImage
                qrImage={selected.charge.qr_image}
                qrString={selected.charge.qr_string}
                alt={`QR CoDi de ${selected.name}`}
              />
            </div>
            <div className="actions">
              {canRenew(selected.status) &&
              selected.charge &&
              (selected.charge.status === "expired" ||
                isExpired(selected.charge.expires_at)) ? (
                <button
                  type="button"
                  disabled={busy === "renew"}
                  onClick={() =>
                    void run("renew", async () => {
                      const res = await api<{ guest: GuestWithCharge }>(
                        `/api/charges/${selected.charge!.id}/renew`,
                        { method: "POST" },
                      );
                      setSelected({ ...selected, ...res.guest });
                    })
                  }
                >
                  Renovar
                </button>
              ) : null}
              <button
                type="button"
                disabled={busy === "reconcile"}
                onClick={() =>
                  void run("reconcile", async () => {
                    await api(`/api/charges/${selected.charge!.id}/reconcile`, {
                      method: "POST",
                    });
                  })
                }
              >
                Reconciliar
              </button>
              <button type="button" onClick={() => setSelected(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCorte && state ? (
        <div
          className="modal-backdrop"
          onClick={() => setShowCorte(false)}
          role="presentation"
        >
          <div
            className="card modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Corte"
          >
            <p className="kicker">Corte</p>
            <h2>{state.event.name}</h2>
            <p>Pagadas: {state.totals.paid}</p>
            <p>Pendientes: {state.totals.pending}</p>
            <p>Tardías: {state.totals.late}</p>
            <p>Adentro: {state.totals.admitted}</p>
            <p>
              Total: ${(state.totals.amountPaidCents / 100).toFixed(2)}{" "}
              {state.event.currency}
            </p>
            <div className="actions">
              <button type="button" onClick={() => setShowCorte(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
    </>
  );
}
