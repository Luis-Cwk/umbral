import { Webhook } from "standardwebhooks";
import { db } from "@/lib/db";
import { applyVerifiedPayment } from "@/lib/payments";
import type { ChargeRow, EventRow, GuestRow } from "@/lib/types";

export const runtime = "nodejs";

type PeyWebhook = {
  type: string;
  codiQrId?: string;
  transactionId?: string;
  amount?: number;
  numRef?: string;
  concept?: string;
  datePaid?: number;
};

export async function POST(req: Request) {
  const secret = process.env.PEY_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "webhook secret not configured" }, { status: 500 });
  }

  const raw = await req.text();
  const headers = Object.fromEntries(req.headers) as Record<string, string>;

  try {
    new Webhook(secret).verify(raw, headers);
  } catch {
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(raw) as PeyWebhook;
  const webhookId = req.headers.get("webhook-id");
  if (!webhookId) {
    return Response.json({ error: "webhook-id required" }, { status: 400 });
  }
  const transactionId = payload.transactionId ?? null;

  const { error: insertError } = await db().from("webhook_events").insert({
    webhook_id: webhookId,
    event_type: payload.type,
    transaction_id: transactionId,
    payload,
    result: "received",
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return Response.json({ ok: true, result: "duplicate" });
    }
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  if (transactionId) {
    const { data: priorTx } = await db()
      .from("charges")
      .select("id")
      .eq("transaction_id", transactionId)
      .maybeSingle();
    if (priorTx) {
      await db()
        .from("webhook_events")
        .update({ result: "duplicate" })
        .eq("webhook_id", webhookId);
      return Response.json({ ok: true, result: "duplicate" });
    }
  }

  if (payload.type !== "codi.qr.payment_received" || !payload.codiQrId) {
    await db()
      .from("webhook_events")
      .update({ result: "ignored" })
      .eq("webhook_id", webhookId);
    return Response.json({ ok: true, result: "ignored" });
  }

  const { data: charge, error: chargeError } = await db()
    .from("charges")
    .select("*")
    .eq("provider_qr_id", payload.codiQrId)
    .maybeSingle<ChargeRow>();

  if (chargeError || !charge) {
    await db()
      .from("webhook_events")
      .update({ result: "unknown_charge" })
      .eq("webhook_id", webhookId);
    return Response.json({ ok: true, result: "unknown_charge" });
  }

  const { data: event } = await db()
    .from("events")
    .select("*")
    .eq("id", charge.event_id)
    .single<EventRow>();

  const { data: guest } = await db()
    .from("guests")
    .select("*")
    .eq("id", charge.guest_id)
    .single<GuestRow>();

  if (!event || !guest) {
    await db()
      .from("webhook_events")
      .update({ result: "orphan_charge" })
      .eq("webhook_id", webhookId);
    return Response.json({ ok: true, result: "orphan_charge" });
  }

  const paidAt =
    typeof payload.datePaid === "number"
      ? new Date(payload.datePaid * 1000).toISOString()
      : new Date().toISOString();

  const applied = await applyVerifiedPayment({
    charge,
    guest,
    event,
    transactionId,
    paidAt,
  });

  await db()
    .from("webhook_events")
    .update({ result: applied.result })
    .eq("webhook_id", webhookId);

  return Response.json({ ok: true, result: applied.result });
}
