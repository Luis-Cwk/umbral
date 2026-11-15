import { z } from "zod";
import { staffOk } from "@/lib/auth";
import { db } from "@/lib/db";
import type { EventRow, GuestRow } from "@/lib/types";

export const runtime = "nodejs";

const bodySchema = z.union([
  z.object({ names: z.array(z.string().min(1).max(80)).min(1).max(50) }),
  z.object({
    guests: z
      .array(
        z.object({
          name: z.string().min(1).max(80),
          phone: z.string().max(32).optional().nullable(),
        }),
      )
      .min(1)
      .max(50),
  }),
]);

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!staffOk(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

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

  const rows =
    "names" in parsed.data
      ? parsed.data.names.map((name) => ({
          event_id: id,
          name,
          phone: null,
          status: "invited" as const,
        }))
      : parsed.data.guests.map((g) => ({
          event_id: id,
          name: g.name,
          phone: g.phone ?? null,
          status: "invited" as const,
        }));

  const { data: guests, error } = await db()
    .from("guests")
    .insert(rows)
    .select("*")
    .returns<GuestRow[]>();

  if (error || !guests) {
    return Response.json({ error: error?.message ?? "insert failed" }, { status: 500 });
  }

  return Response.json({ guests }, { status: 201 });
}
