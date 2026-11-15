import { db } from "./db";
import { isExpired, paymentTransition } from "./state";
import type { ChargeRow, ChargeStatus, EventRow, GuestRow, GuestStatus } from "./types";

export type ApplyPaymentResult = {
  guestStatus: GuestStatus;
  chargeStatus: ChargeStatus;
  result: string;
};

/**
 * Apply a verified payment to a charge/guest. Used by webhook, reconcile and demo.
 */
export async function applyVerifiedPayment(input: {
  charge: ChargeRow;
  guest: GuestRow;
  event: EventRow;
  transactionId: string | null;
  paidAt?: string;
}): Promise<ApplyPaymentResult> {
  const { charge, guest, event, transactionId } = input;
  const paidAt = input.paidAt ?? new Date().toISOString();

  if (charge.status === "paid") {
    return {
      guestStatus: guest.status,
      chargeStatus: "paid",
      result: "duplicate",
    };
  }

  if (transactionId) {
    const { data: existing } = await db()
      .from("charges")
      .select("id")
      .eq("transaction_id", transactionId)
      .maybeSingle();
    if (existing && existing.id !== charge.id) {
      return {
        guestStatus: guest.status,
        chargeStatus: charge.status,
        result: "duplicate",
      };
    }
  }

  const guestForTransition: GuestStatus =
    charge.status === "expired" || isExpired(charge.expires_at)
      ? "expired"
      : guest.status;

  const nextGuestStatus = paymentTransition(
    guestForTransition,
    event.status === "open",
  );
  const nextChargeStatus: ChargeStatus =
    nextGuestStatus === "late" ? "late" : "paid";

  await db()
    .from("charges")
    .update({
      status: nextChargeStatus,
      paid_at: paidAt,
      transaction_id: transactionId,
    })
    .eq("id", charge.id);

  await db().from("guests").update({ status: nextGuestStatus }).eq("id", guest.id);

  return {
    guestStatus: nextGuestStatus,
    chargeStatus: nextChargeStatus,
    result: nextGuestStatus,
  };
}

/** Mark issued charges past expires_at as expired. */
export async function expireStaleCharges(eventId: string): Promise<void> {
  const now = new Date().toISOString();

  const { data: stale } = await db()
    .from("charges")
    .select("id, guest_id")
    .eq("event_id", eventId)
    .eq("status", "issued")
    .lte("expires_at", now)
    .returns<Pick<ChargeRow, "id" | "guest_id">[]>();

  if (!stale?.length) return;

  const chargeIds = stale.map((c) => c.id);
  const guestIds = [...new Set(stale.map((c) => c.guest_id))];

  await db().from("charges").update({ status: "expired" }).in("id", chargeIds);

  await db()
    .from("guests")
    .update({ status: "expired" })
    .in("id", guestIds)
    .eq("status", "charge_issued");
}
