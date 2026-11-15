import type { GuestStatus } from "./types";

export function isExpired(expiresAt: string, now = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime();
}

export function canIssueCharge(status: GuestStatus): boolean {
  return status === "invited" || status === "expired";
}

export function canRenew(status: GuestStatus): boolean {
  return status === "charge_issued" || status === "expired";
}

export function canAdmit(status: GuestStatus): boolean {
  return status === "paid";
}

export function canReviewLate(status: GuestStatus): boolean {
  return status === "late";
}

/**
 * Transition for a verified payment. `eventOpen` decides whether a payment
 * that arrives after expiry is admitted directly or needs staff review.
 */
export function paymentTransition(
  current: GuestStatus,
  eventOpen: boolean,
): GuestStatus {
  if (current === "paid" || current === "admitted") return current;
  if (current === "late") return "late";
  if (current === "expired" || !eventOpen) return "late";
  return "paid";
}

export function statusLabel(status: GuestStatus): string {
  const labels: Record<GuestStatus, string> = {
    invited: "Invitación",
    charge_issued: "Cobro emitido",
    paid: "Pago recibido",
    admitted: "Adentro",
    expired: "QR vencido",
    late: "Pago tardío",
    duplicate: "Duplicado",
    canceled: "Cancelado",
  };
  return labels[status];
}

export function statusClass(status: GuestStatus): string {
  return `status status-${status}`;
}
