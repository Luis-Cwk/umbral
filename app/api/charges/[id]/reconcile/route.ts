import { staffOk } from "@/lib/auth";
import { db } from "@/lib/db";
import { applyVerifiedPayment } from "@/lib/payments";
import { getQrTransactions } from "@/lib/pey";
import type { ChargeRow, EventRow, GuestRow } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!staffOk(_req)) {
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

  let items;
  try {
    ({ items } = await getQrTransactions(charge.provider_qr_id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "pey error";
    return Response.json({ error: message }, { status: 502 });
  }

  const paid = items.find((t) => t.status === "PAID");
  if (!paid) {
    return Response.json({
      ok: true,
      result: "pending",
      charge,
      items,
    });
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
    return Response.json({ error: "orphan charge" }, { status: 500 });
  }

  const applied = await applyVerifiedPayment({
    charge,
    guest,
    event,
    transactionId: paid.id,
    paidAt:
      typeof paid.datePaid === "number"
        ? new Date(paid.datePaid * 1000).toISOString()
        : new Date().toISOString(),
  });

  const { data: nextCharge } = await db()
    .from("charges")
    .select("*")
    .eq("id", charge.id)
    .single<ChargeRow>();

  const { data: nextGuest } = await db()
    .from("guests")
    .select("*")
    .eq("id", guest.id)
    .single<GuestRow>();

  return Response.json({
    ok: true,
    result: applied.result,
    charge: nextCharge,
    guest: nextGuest,
    items,
  });
}
