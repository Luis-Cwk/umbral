export function staffOk(req: Request): boolean {
  const pin = process.env.STAFF_PIN;
  return Boolean(pin && req.headers.get("x-staff-pin") === pin);
}

export function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE === "true";
}

export { DEMO_EVENT_ID } from "./demo";
