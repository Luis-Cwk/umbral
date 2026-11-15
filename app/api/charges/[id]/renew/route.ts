import { demoModeEnabled, staffOk } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildDemoQr } from "@/lib/demo-qr";
import { createQr, type CreateQrResponse } from "@/lib/pey";
import { canRenew, isExpired } from "@/lib/state";
import type { ChargeRow, EventRow, GuestRow } from "@/lib/types";

export const runtime = "nodejs";

/** pey requires 0 or >= 360 seconds. */
const EXPIRATION_SECONDS = 600;

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!staffOk(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const { data: charge, error: chargeError } = await db()
    .from("charges")
    .select("*")
    .eq("id", id)
    .single<ChargeRow>();

  if (chargeError || !charge) {
    return Response.json({ error: "charge not found" }, { status: 404 });
  }

  const { data: guest, error: guestError } = await db()
    .from("guests")
    .select("*")
    .eq("id", charge.guest_id)
    .single<GuestRow>();

  if (guestError || !guest) {
    return Response.json({ error: "guest not found" }, { status: 404 });
  }

  if (!canRenew(guest.status)) {
    return Response.json(
      { error: `guest status is ${guest.status}` },
      { status: 409 },
    );
  }

  const stillAlive =
    charge.status === "issued" && !isExpired(charge.expires_at);
  if (stillAlive) {
    return Response.json(
      { error: "charge still active; wait until it expires" },
      { status: 409 },
    );
  }

  const { data: event, error: eventError } = await db()
    .from("events")
    .select("*")
    .eq("id", charge.event_id)
    .single<EventRow>();

  if (eventError || !event) {
    return Response.json({ error: "event not found" }, { status: 404 });
  }

  if (event.status !== "open") {
    return Response.json({ error: "event is closed" }, { status: 409 });
  }

  if (charge.status === "issued") {
    await db().from("charges").update({ status: "expired" }).eq("id", charge.id);
  }

  // pey: numRef must be up to 7 digits
  const numRef = String(Math.floor(1000000 + Math.random() * 9000000));
  const concept = `Admisión ${event.name} · ${guest.name}`;
  const now = new Date();

  let qr: CreateQrResponse;
  try {
    if (demoModeEnabled() && event.is_demo) {
      qr = await buildDemoQr(`umbral-demo://${numRef}`);
    } else {
      qr = await createQr({
        amount: event.price_cents / 100,
        concept,
        expiration: EXPIRATION_SECONDS,
        numRef,
        generateImage: true,
        metadata: {
          guestId: guest.id,
          eventId: event.id,
          renewedFrom: charge.id,
        },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "pey error";
    return Response.json({ error: message }, { status: 502 });
  }

  const expiresAt = new Date(now.getTime() + EXPIRATION_SECONDS * 1000).toISOString();

  const { data: next, error: insertError } = await db()
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

  if (insertError || !next) {
    return Response.json(
      { error: insertError?.message ?? "charge insert failed" },
      { status: 500 },
    );
  }

  await db().from("guests").update({ status: "charge_issued" }).eq("id", guest.id);

  return Response.json(
    { charge: next, guest: { ...guest, status: "charge_issued" } },
    { status: 201 },
  );
}
