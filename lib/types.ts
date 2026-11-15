export type GuestStatus =
  | "invited"
  | "charge_issued"
  | "paid"
  | "admitted"
  | "expired"
  | "late"
  | "duplicate"
  | "canceled";

export type ChargeStatus = "issued" | "paid" | "expired" | "late" | "canceled";

export type EventRow = {
  id: string;
  name: string;
  venue: string | null;
  starts_at: string | null;
  price_cents: number;
  currency: string;
  status: "open" | "closed";
  public_token: string;
  is_demo: boolean;
  created_at: string;
};

export type GuestRow = {
  id: string;
  event_id: string;
  name: string;
  phone: string | null;
  status: GuestStatus;
  created_at: string;
};

export type ChargeRow = {
  id: string;
  event_id: string;
  guest_id: string;
  provider_qr_id: string;
  qr_string: string | null;
  qr_image: string | null;
  amount_cents: number;
  concept: string;
  num_ref: string;
  status: ChargeStatus;
  expires_at: string;
  paid_at: string | null;
  transaction_id: string | null;
  created_at: string;
};

export type GuestWithCharge = GuestRow & {
  charge: Pick<
    ChargeRow,
    | "id"
    | "status"
    | "amount_cents"
    | "expires_at"
    | "provider_qr_id"
    | "qr_image"
    | "qr_string"
  > | null;
};

export type EventState = {
  event: Pick<
    EventRow,
    "id" | "name" | "venue" | "starts_at" | "price_cents" | "currency" | "status" | "is_demo"
  >;
  guests: GuestWithCharge[];
  totals: {
    paid: number;
    pending: number;
    late: number;
    admitted: number;
    amountPaidCents: number;
  };
};
