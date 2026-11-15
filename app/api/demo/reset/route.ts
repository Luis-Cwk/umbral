import { demoModeEnabled, staffOk } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEMO_EVENT_ID } from "@/lib/demo";

export const runtime = "nodejs";

const DEMO_GUESTS = ["Ana", "Luis", "Sol", "Mar", "Noa"];

export async function POST(req: Request) {
  if (!demoModeEnabled()) {
    return Response.json({ error: "demo mode disabled" }, { status: 403 });
  }
  if (!staffOk(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  await db().from("charges").delete().eq("event_id", DEMO_EVENT_ID);
  await db().from("guests").delete().eq("event_id", DEMO_EVENT_ID);

  const { error: eventError } = await db()
    .from("events")
    .upsert({
      id: DEMO_EVENT_ID,
      name: "Función demo Umbral",
      venue: "Foro CDMX",
      starts_at: "2026-11-15T19:00:00-06:00",
      price_cents: 1,
      currency: "MXN",
      status: "open",
      public_token: "demo-token",
      is_demo: true,
    });

  if (eventError) {
    return Response.json({ error: eventError.message }, { status: 500 });
  }

  const rows = DEMO_GUESTS.map((name, i) => ({
    id: `00000000-0000-0000-0000-00000000001${i + 1}`,
    event_id: DEMO_EVENT_ID,
    name,
    phone: null,
    status: "invited" as const,
  }));

  const { data: guests, error: guestError } = await db()
    .from("guests")
    .insert(rows)
    .select("*");

  if (guestError) {
    return Response.json({ error: guestError.message }, { status: 500 });
  }

  return Response.json({ ok: true, guests });
}
