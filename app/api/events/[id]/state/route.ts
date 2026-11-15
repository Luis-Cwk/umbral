import { staffOk } from "@/lib/auth";
import { db } from "@/lib/db";
import { expireStaleCharges } from "@/lib/payments";
import type { ChargeRow, EventRow, EventState, GuestRow } from "@/lib/types";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const token = new URL(req.url).searchParams.get("token");

  const { data: event, error: eventError } = await db()
    .from("events")
    .select("*")
    .eq("id", id)
    .single<EventRow>();

  if (eventError || !event) {
    return Response.json({ error: "event not found" }, { status: 404 });
  }

  if (!staffOk(req) && event.public_token !== token) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  await expireStaleCharges(id);

  const { data: guests, error: guestsError } = await db()
    .from("guests")
    .select("*")
    .eq("event_id", id)
    .order("created_at", { ascending: true })
    .returns<GuestRow[]>();

  if (guestsError) {
    return Response.json({ error: guestsError.message }, { status: 500 });
  }

  const guestIds = (guests ?? []).map((g) => g.id);
  const { data: charges } = guestIds.length
    ? await db()
        .from("charges")
        .select("*")
        .in("guest_id", guestIds)
        .order("created_at", { ascending: false })
        .returns<ChargeRow[]>()
    : { data: [] as ChargeRow[] };

  const latest = new Map<string, ChargeRow>();
  for (const charge of charges ?? []) {
    if (!latest.has(charge.guest_id)) latest.set(charge.guest_id, charge);
  }

  const stateGuests = (guests ?? []).map((guest) => {
    const charge = latest.get(guest.id);
    return {
      ...guest,
      charge: charge
        ? {
            id: charge.id,
            status: charge.status,
            amount_cents: charge.amount_cents,
            expires_at: charge.expires_at,
            provider_qr_id: charge.provider_qr_id,
            qr_image: charge.qr_image,
            qr_string: charge.qr_string,
          }
        : null,
    };
  });

  const totals = stateGuests.reduce(
    (acc, guest) => {
      if (guest.status === "paid") acc.paid += 1;
      if (guest.status === "admitted") acc.admitted += 1;
      if (guest.status === "late") acc.late += 1;
      if (guest.status === "invited" || guest.status === "charge_issued") acc.pending += 1;
      if (guest.status === "paid" || guest.status === "admitted") {
        acc.amountPaidCents += guest.charge?.amount_cents ?? event.price_cents;
      }
      return acc;
    },
    { paid: 0, pending: 0, late: 0, admitted: 0, amountPaidCents: 0 },
  );

  const state: EventState = {
    event: {
      id: event.id,
      name: event.name,
      venue: event.venue,
      starts_at: event.starts_at,
      price_cents: event.price_cents,
      currency: event.currency,
      status: event.status,
      is_demo: event.is_demo,
    },
    guests: stateGuests,
    totals,
  };

  return Response.json(state);
}
