import { z } from "zod";
import { staffOk } from "@/lib/auth";
import { db } from "@/lib/db";
import type { EventRow } from "@/lib/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().min(1).max(120),
  venue: z.string().max(120).optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  priceCents: z.number().int().positive().max(1_000_000).default(1),
});

export async function POST(req: Request) {
  if (!staffOk(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, venue, startsAt, priceCents } = parsed.data;
  const publicToken = crypto.randomUUID().replace(/-/g, "").slice(0, 24);

  const { data: event, error } = await db()
    .from("events")
    .insert({
      name,
      venue: venue ?? null,
      starts_at: startsAt ?? null,
      price_cents: priceCents,
      currency: "MXN",
      status: "open",
      public_token: publicToken,
      is_demo: false,
    })
    .select("*")
    .single<EventRow>();

  if (error || !event) {
    return Response.json({ error: error?.message ?? "insert failed" }, { status: 500 });
  }

  return Response.json({ event }, { status: 201 });
}
