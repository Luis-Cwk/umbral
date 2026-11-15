export const DEMO_EVENT_ID = "00000000-0000-0000-0000-000000000001";

export function resolveEventId(eventId: string): string {
  if (eventId === "demo") return DEMO_EVENT_ID;
  return eventId;
}
