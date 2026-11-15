import { demoModeEnabled, staffOk } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildDemoQr } from "@/lib/demo-qr";
import { createQr, type CreateQrResponse } from "@/lib/pey";
import { canIssueCharge } from "@/lib/state";
import type { ChargeRow, EventRow, GuestRow } from "@/lib/types";

export const runtime = "nodejs";

/** pey requires 0 or >= 360 seconds. */
const EXPIRATION_SECONDS = 600;

async function issueQr(input: {
  event: EventRow;
  guest: GuestRow;
  numRef: string;
  concept: string;
}): Promise<CreateQrResponse> {
  if (demoModeEnabled() && input.event.is_demo) {
    return buildDemoQr(`umbral-demo://${input.numRef}`);
  }

  return createQr({
    amount: input.event.price_cents / 100,
    concept: input.concept,
    expiration: EXPIRATION_SECONDS,
    numRef: input.numRef,
    generateImage: true,
    metadata: { guestId: input.guest.id, eventId: input.event.id },
  });
}

export async function POST(req: Request) {
  if (!staffOk(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { guestId?: string };
  if (!body.guestId) {
    return Response.json({ error: "guestId required" }, { status: 400 });
  }

  const { data: guest, error: guestError } = await db()
    .from("guests")
    .select("*")
    .eq("id", body.guestId)
    .single<GuestRow>();

  if (guestError || !guest) {
    return Response.json({ error: "guest not found" }, { status: 404 });
  }

  if (!canIssueCharge(guest.status)) {
    return Response.json(
      { error: `guest status is ${guest.status}` },
      { status: 409 },
    );
  }

  const { data: event, error: eventError } = await db()
    .from("events")
    .select("*")
    .eq("id", guest.event_id)
    .single<EventRow>();

  if (eventError || !event) {
    return Response.json({ error: "event not found" }, { status: 404 });
  }

  if (event.status !== "open") {
    return Response.json({ error: "event is closed" }, { status: 409 });
  }

  const now = new Date();
  const { data: active } = await db()
    .from("charges")
    .select("*")
    .eq("guest_id", guest.id)
    .eq("status", "issued")
    .gt("expires_at", now.toISOString())
    .maybeSingle<ChargeRow>();

  if (active) {
    return Response.json({ error: "active charge exists", charge: active }, { status: 409 });
  }

  // pey: numRef must be up to 7 digits
  const numRef = String(Math.floor(1000000 + Math.random() * 9000000));
  const concept = `Admisión ${event.name} · ${guest.name}`;

  let qr: CreateQrResponse;
  try {
    qr = await issueQr({ event, guest, numRef, concept });
  } catch (error) {
    const message = error instanceof Error ? error.message : "pey error";
    return Response.json({ error: message }, { status: 502 });
  }

  const expiresAt = new Date(now.getTime() + EXPIRATION_SECONDS * 1000).toISOString();

  const { data: charge, error: chargeError } = await db()
    .from("charges")
    .insert({
      event_id: event.id,
      guest_id: guest.id,
      provider_qr_id: qr.id,
      qr_string: qr.qrString,
      qr_image: qr.qrImage,
      amount_cents: event.price_cents,
      concept,
      num_ref: numRef,
      status: "issued",
      expires_at: expiresAt,
    })
    .select("*")
    .single<ChargeRow>();

  if (chargeError || !charge) {
    return Response.json({ error: chargeError?.message ?? "charge insert failed" }, { status: 500 });
  }

  await db().from("guests").update({ status: "charge_issued" }).eq("id", guest.id);

  return Response.json({ charge, guest: { ...guest, status: "charge_issued" } }, { status: 201 });
}
