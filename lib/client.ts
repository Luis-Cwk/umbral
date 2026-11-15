const PIN_KEY = "umbral-staff-pin";

export function getStaffPin(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(PIN_KEY) ?? "";
}

export function setStaffPin(pin: string): void {
  window.localStorage.setItem(PIN_KEY, pin);
}

export async function api<T>(
  path: string,
  init: RequestInit & { staff?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (init.staff !== false) {
    const pin = getStaffPin();
    if (pin) headers.set("x-staff-pin", pin);
  }

  const res = await fetch(path, { ...init, headers, cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as T & { error?: unknown };
  if (!res.ok) {
    const message =
      typeof data.error === "string"
        ? data.error
        : `request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}
