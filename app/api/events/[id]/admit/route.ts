import { z } from "zod";
import { staffOk } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAdmit, canReviewLate } from "@/lib/state";
import type { ChargeRow, EventRow, GuestRow } from "@/lib/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  guestId: z.string().min(1),
  token: z.string().optional(),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: event, error: eventError } = await db()
    .from("events")
    .select("*")
    .eq("id", id)
    .single<EventRow>();

  if (eventError || !event) {
    return Response.json({ error: "event not found" }, { status: 404 });
  }

  const token = parsed.data.token ?? new URL(req.url).searchParams.get("token");
  if (!staffOk(req) && event.public_token !== token) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: guest, error: guestError } = await db()
    .from("guests")
    .select("*")
    .eq("id", parsed.data.guestId)
    .eq("event_id", id)
    .single<GuestRow>();

  if (guestError || !guest) {
    return Response.json({ error: "guest not found" }, { status: 404 });
  }

  if (!canAdmit(guest.status) && !(staffOk(req) && canReviewLate(guest.status))) {
    return Response.json(
      { error: `guest status is ${guest.status}` },
      { status: 409 },
    );
  }

  const { data: charge } = await db()
    .from("charges")
    .select("*")
    .eq("guest_id", guest.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ChargeRow>();

  const { data: updated, error } = await db()
    .from("guests")
    .update({ status: "admitted" })
    .eq("id", guest.id)
    .select("*")
    .single<GuestRow>();

  if (error || !updated) {
    return Response.json({ error: error?.message ?? "update failed" }, { status: 500 });
  }

  return Response.json({
    guest: updated,
    admittedAt: new Date().toISOString(),
    transactionId: charge?.transaction_id ?? null,
  });
}
