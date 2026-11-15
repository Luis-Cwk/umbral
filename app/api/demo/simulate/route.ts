import { z } from "zod";
import { demoModeEnabled, staffOk } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEMO_EVENT_ID } from "@/lib/demo";
import { applyVerifiedPayment } from "@/lib/payments";
import type { ChargeRow, EventRow, GuestRow } from "@/lib/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  guestId: z.string().min(1),
  kind: z.enum(["paid", "duplicate", "expire", "late"]),
});

export async function POST(req: Request) {
  if (!demoModeEnabled()) {
    return Response.json({ error: "demo mode disabled" }, { status: 403 });
  }
  if (!staffOk(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: guest, error: guestError } = await db()
    .from("guests")
    .select("*")
    .eq("id", parsed.data.guestId)
    .eq("event_id", DEMO_EVENT_ID)
    .single<GuestRow>();

  if (guestError || !guest) {
    return Response.json({ error: "demo guest not found" }, { status: 404 });
  }

  const { data: event } = await db()
    .from("events")
    .select("*")
    .eq("id", DEMO_EVENT_ID)
    .single<EventRow>();

  if (!event?.is_demo) {
    return Response.json({ error: "demo event missing" }, { status: 404 });
  }

  const { data: charge } = await db()
    .from("charges")
    .select("*")
    .eq("guest_id", guest.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ChargeRow>();

  if (parsed.data.kind === "expire") {
    if (!charge) {
      return Response.json({ error: "no charge to expire" }, { status: 409 });
    }
    await db()
      .from("charges")
      .update({
        status: "expired",
        expires_at: new Date(Date.now() - 1000).toISOString(),
      })
      .eq("id", charge.id);
    await db().from("guests").update({ status: "expired" }).eq("id", guest.id);
    return Response.json({ ok: true, result: "expired" });
  }

  if (!charge) {
    return Response.json({ error: "issue a charge first" }, { status: 409 });
  }

  if (parsed.data.kind === "duplicate") {
    if (!charge.transaction_id) {
      return Response.json({ error: "charge has no transaction yet" }, { status: 409 });
    }
    return Response.json({ ok: true, result: "duplicate" });
  }

  if (parsed.data.kind === "late") {
    await db()
      .from("charges")
      .update({
        status: "expired",
        expires_at: new Date(Date.now() - 1000).toISOString(),
      })
      .eq("id", charge.id);
    await db().from("guests").update({ status: "expired" }).eq("id", guest.id);

    const { data: refreshed } = await db()
      .from("charges")
      .select("*")
      .eq("id", charge.id)
      .single<ChargeRow>();
    const { data: expiredGuest } = await db()
      .from("guests")
      .select("*")
      .eq("id", guest.id)
      .single<GuestRow>();

    if (!refreshed || !expiredGuest) {
      return Response.json({ error: "refresh failed" }, { status: 500 });
    }

    const applied = await applyVerifiedPayment({
      charge: refreshed,
      guest: expiredGuest,
      event,
      transactionId: `demo-late-${crypto.randomUUID()}`,
    });
    return Response.json({ ok: true, result: applied.result });
  }

  // paid
  const applied = await applyVerifiedPayment({
    charge,
    guest,
    event,
    transactionId: `demo-paid-${crypto.randomUUID()}`,
  });
  return Response.json({ ok: true, result: applied.result });
}
