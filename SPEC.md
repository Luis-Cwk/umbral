# SPEC: Umbral

## 0. Qué es

Umbral es una taquilla para un evento presencial. Cada persona recibe un cobro CoDi nuevo. La puerta solo se abre cuando el pago fue confirmado por el webhook firmado de pey, o por una consulta de transacción que devuelve `PAID`. Si el QR vence, se renueva. Si el webhook se duplica, se ignora. Si el pago llega tarde, queda en revisión y el staff decide.

Frase de producto: "La puerta que solo abre cuando el dinero ya cayó."

## 1. Objetivo del Cursor Hackatón CDMX

Tener una demo funcional el domingo 15 de noviembre a la 1:00 PM, con:

- Repo público en GitHub.
- App en vivo en Cloudflare Workers: https://umbral.petrasynthetic.workers.dev.
- Un evento con 8 a 12 invitados.
- Un pago CoDi real de $0.01 MXN con banco real.
- Webhook verificado, idempotente, con conciliación.
- Pantalla de taquilla y pantalla de puerta.
- Video demo de 90 segundos (opcional para el Cursor, obligatorio para el nacional).
- Formulario de entrega llenado antes de las 12:30 PM.

## 2. Usuarios y alcance

### Staff de la taquilla

Abre la app, ve la lista de invitados, emite un cobro, muestra el QR, ve el estado, renueva un QR vencido, admite a quien ya pagó, consulta el corte.

### Invitado

Escanea el QR con la app de su banco, confirma el pago, entra cuando la puerta se abre.

### Fuera de alcance para el Cursor de 24 horas

- Login con usuarios y roles. Solo un PIN de staff.
- Reembolsos automáticos. Solo un estado `late` y una decisión manual.
- Cuenta dividida, temporadas, pases, analítica avanzada.
- Push notification de CoDi. Solo QR.
- Hardware. La puerta es una pantalla y un sonido.
- Agente LLM en el camino crítico. El agente es para el nacional, no para mañana.
- Cripto, NFT, x402, USDC, ERC-8004. Prohibido por las reglas.

## 3. Stack

- Next.js App Router, TypeScript.
- Cloudflare Workers con vinext (`npm run deploy:vinext`).
- Supabase Postgres para datos. `@supabase/supabase-js` con service role key solo en el servidor.
- CSS plano con variables. Sin librería de UI. Fuente Space Grotesk, blanco y negro.
- Polling cada 2 segundos. Sin websockets.
- `standardwebhooks` para verificar la firma. Si falla, implementar HMAC-SHA256 a mano.
- `zod` para validar payloads.
- `qrcode` solo como fallback. La API de pey ya devuelve `qrImage` en base64.

## 4. Variables de entorno

```env
PEY_API_KEY=
PEY_API_BASE=https://api.pey.mx
PEY_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3001
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
STAFF_PIN=<pin-largo>
DEMO_MODE=true
```

`npm run dev` (Next) usa el puerto **3000** y lee `.env`.  
`npm run dev:vinext` (Cloudflare local) usa el puerto **3001** y lee `.dev.vars`.  
`DEMO_MODE=true` se queda para el hackatón; desactivar después del evento.

Reglas:

- `PEY_API_KEY` y `PEY_WEBHOOK_SECRET` solo en el servidor.
- `SUPABASE_SERVICE_ROLE_KEY` solo en el servidor.
- `.env` y `.env.local` van en `.gitignore`.
- `STAFF_PIN` es un PIN de 12+ caracteres; no se publica en el repo.
- `.env.example` va en el repo con placeholders.
- Nunca commitear una CLABE, una API key ni el secreto del webhook.

## 5. Modelo de datos

```sql
create extension if not exists pgcrypto;

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  venue text,
  starts_at timestamptz,
  price_cents integer not null default 100,
  currency text not null default 'MXN',
  status text not null default 'open' check (status in ('open', 'closed')),
  public_token text not null unique,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  phone text,
  status text not null default 'invited'
    check (status in ('invited', 'charge_issued', 'paid', 'admitted', 'expired', 'late', 'duplicate', 'canceled')),
  created_at timestamptz not null default now()
);

create table if not exists charges (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  provider_qr_id text not null unique,
  qr_string text,
  qr_image text,
  amount_cents integer not null,
  concept text not null,
  num_ref text not null,
  status text not null default 'issued'
    check (status in ('issued', 'paid', 'expired', 'late', 'canceled')),
  expires_at timestamptz not null,
  paid_at timestamptz,
  transaction_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  webhook_id text not null unique,
  event_type text not null,
  transaction_id text,
  payload jsonb not null,
  result text not null,
  processed_at timestamptz not null default now()
);

create index if not exists idx_guests_event on guests(event_id);
create index if not exists idx_charges_guest on charges(guest_id);
create index if not exists idx_charges_event on charges(event_id);
create index if not exists idx_charges_provider_qr on charges(provider_qr_id);
create index if not exists idx_charges_transaction on charges(transaction_id);
```

Una sola carga activa por invitado. No crear otra mientras la anterior esté `issued` y no haya vencido.

## 6. Máquina de estados

Estados del invitado:

- `invited`: sin cobro.
- `charge_issued`: QR emitido, esperando pago.
- `paid`: pago confirmado por webhook verificado o por transacción `PAID`.
- `admitted`: la puerta se abrió.
- `expired`: el QR venció sin pago.
- `late`: el pago se confirmó después del vencimiento o después de cerrar la puerta. Requiere decisión del staff.
- `duplicate`: llegó un segundo webhook para la misma carga. No cambia el estado del invitado; se registra en `webhook_events`.
- `canceled`: cancelación manual, opcional.

Transiciones:

```
invited -> charge_issued      (crear QR)
charge_issued -> paid         (webhook verificado o conciliación PAID)
charge_issued -> expired      (expires_at < now)
expired -> charge_issued      (renovar, nuevo QR)
paid -> admitted              (staff o puerta automática)
paid -> late                  (si el evento ya cerró; revisión)
```

Guardas:

1. La puerta solo abre desde `paid`. Nunca desde `charge_issued`, `expired` o `invited`.
2. No emitir un segundo cobro mientras el primero esté `issued` y no haya vencido.
3. Un webhook duplicado no cambia estado. Se responde 200 y se registra.
4. Un pago tardío no abre la puerta solo. Queda en `late` y el staff decide.
5. Toda admisión se registra con hora, actor y `transaction_id`.

## 7. API

### `GET /api/health`

Respuesta: `{ ok: true }`.

### `POST /api/events`

Body: `{ name, venue, startsAt, priceCents }`.
Header: `x-staff-pin`.
Crea un evento con `public_token` aleatorio. Devuelve el evento.

### `POST /api/events/[id]/guests`

Body: `{ names: string[] }` o `{ guests: [{ name, phone? }] }`.
Header: `x-staff-pin`.
Crea invitados en `invited`.

### `GET /api/events/[id]/state?token=...`

Devuelve:

```json
{
  "event": { "id": "", "name": "", "status": "open", "priceCents": 100 },
  "guests": [
    { "id": "", "name": "", "status": "paid", "charge": { "id": "", "status": "paid", "expiresAt": "", "providerQrId": "" } }
  ],
  "totals": { "paid": 3, "pending": 2, "late": 0, "admitted": 1, "amountPaidCents": 300 }
}
```

El `token` debe coincidir con `public_token` para el acceso público. El staff puede usar `x-staff-pin`.

### `POST /api/charges`

Body: `{ guestId }`.
Header: `x-staff-pin`.
Llama a `POST /codi/qr` en pey con:

```json
{
  "amount": 0.01,
  "concept": "Admisión [evento] [invitado]",
  "expiration": 600,
  "numRef": "1234567",
  "generateImage": true,
  "metadata": { "guestId": "", "eventId": "" }
}
```

Nota: pey exige expiración `>= 360` segundos y `numRef` de máximo 7 dígitos.

Guarda `provider_qr_id`, `qr_string`, `qr_image`, `expires_at`.
Cambia al invitado a `charge_issued`.
Devuelve el QR y la carga.

### `POST /api/charges/[id]/renew`

Header: `x-staff-pin`.
Solo si la carga está `expired` o `issued` con `expires_at` vencido.
Crea una carga nueva para el mismo invitado. La anterior queda `expired`.

### `POST /api/charges/[id]/reconcile`

Header: `x-staff-pin`.
Llama a `GET /transaction/codi/qr/{provider_qr_id}` en pey.
Si alguna transacción está `PAID`, aplica la misma transición que el webhook.
Si no, devuelve el estado actual.

### `POST /api/events/[id]/admit`

Body: `{ guestId }`.
Header: `x-staff-pin` o `token` del evento para la pantalla de la puerta.
Solo si el invitado está `paid` o `late` con aprobación.
Cambia a `admitted`, registra hora y `transaction_id`.

### `POST /api/webhooks/pey`

Sin autenticación de staff. Verifica la firma Standard Webhooks con `PEY_WEBHOOK_SECRET`.
Lee el body crudo con `await req.text()`.
Si la firma falla: 401.
Si el `webhook-id` ya existe: 200, sin efectos.
Si el `transactionId` ya existe: 200, sin efectos.
Si el evento es `codi.qr.payment_received`:
  - Busca la carga por `codiQrId`.
  - Si no existe: 200, registra `unknown_charge`.
  - Si la carga está `issued`: pasa a `paid`, guarda `transaction_id` y `paid_at`.
  - Si la carga está `expired`: pasa a `late` si el evento sigue abierto; si está cerrado, deja `late` para revisión.
  - Si ya está `paid`: registra `duplicate`, no cambia nada.
Responde 200 siempre que la firma sea válida, para evitar reintentos infinitos.

### `POST /api/demo/simulate`

Solo si `DEMO_MODE=true`.
Body: `{ guestId, kind: "paid" | "duplicate" | "expire" | "late" }`.
Usa la misma función de transición que el webhook, no un camino paralelo.
No requiere pago real. La UI debe decir "modo demo".

### `POST /api/demo/reset`

Solo si `DEMO_MODE=true`.
Reinicia el evento demo y sus invitados.

## 8. UI

### `/` Landing

- Nombre Umbral.
- Frase: "La puerta que solo abre cuando el dinero ya cayó."
- Botón "Ver demo" y "Taquilla".
- Nota de que es un prototipo para el Hackatón México.

### `/taquilla/[eventId]`

- Header con nombre del evento, total cobrado, contador de estados.
- Lista de invitados con nombre, estado, monto, hora.
- Botón "Emitir cobro" si está `invited` o `expired`.
- Modal con QR grande, monto, nombre, cuenta regresiva, botón "Renovar" y "Reconciliar".
- Botón "Admitir" si está `paid`.
- Botón "Revisar tarde" si está `late`.
- Botón "Corte" que muestra el resumen.
- Polling cada 2 segundos.
- Sin recargar la página.

### `/puerta/[eventId]?token=...`

- Pantalla completa, fondo negro.
- Estado grande: `CERRADA`, `PAGADO: [nombre]`, `ADENTRO`.
- Cuando llega un `paid`, suena un tono (Web Audio, sin archivo), muestra el nombre y abre.
- Después de 3 segundos, vuelve a `CERRADA` o muestra el siguiente.
- Polling cada 2 segundos.
- Si hay un `late`, no abre: muestra `REVISIÓN` y espera al staff.
- Sin botones visibles, salvo un enlace oculto para el staff.

### `/demo`

- Evento demo con 5 invitados.
- Botones: "Emitir cobro", "Simular pago", "Duplicar webhook", "Vencer QR", "Pago tardío", "Admitir", "Corte".
- Todo marcado como demo. No toca el evento real.

## 9. Webhook: implementación exacta

```ts
import { Webhook } from "standardwebhooks";

export async function POST(req: Request) {
  const raw = await req.text();
  const headers = Object.fromEntries(req.headers);
  const wh = new Webhook(process.env.PEY_WEBHOOK_SECRET!);

  try {
    wh.verify(raw, headers);
  } catch {
    return new Response("invalid signature", { status: 401 });
  }

  const payload = JSON.parse(raw);
  // idempotencia por headers["webhook-id"] y payload.transactionId
  // transición según payload.type === "codi.qr.payment_received"
  return Response.json({ ok: true });
}
```

Reglas:

- No confiar en el body antes de verificar.
- No usar `req.json()` antes de `req.text()`.
- Guardar el body crudo en `webhook_events.payload`.
- Responder 200 a duplicados para que pey no reintente.
- Si la base falla, responder 500 para que pey reintente.
- La transición debe ser idempotente y transaccional.

## 10. Conciliación

Si el webhook no llega en 30 segundos, la taquilla muestra "Sin confirmar" y un botón "Reconciliar".
`reconcile` llama a `GET /transaction/codi/qr/{provider_qr_id}`.
Si `items[0].status === "PAID"`, aplica la transición de pago.
No reemitir un cobro mientras la carga pueda liquidarse.
Si el QR venció y no hay pago, se puede renovar.

## 11. Modo demo

- `DEMO_MODE=true` solo en el entorno de demo.
- El evento demo tiene `is_demo=true`.
- El botón "Simular pago" llama a la misma función de transición que el webhook.
- La UI muestra una etiqueta "DEMO" visible.
- El video debe mostrar el flujo real, no solo el demo. El demo es para que el jurado pruebe sin pagar.
- Nunca mezclar datos del evento real con el demo.

## 12. Seguridad

- Firma del webhook obligatoria.
- `PEY_API_KEY`, `PEY_WEBHOOK_SECRET` y `SUPABASE_SERVICE_ROLE_KEY` solo en el servidor.
- `x-staff-pin` para las rutas de staff. No exponer el PIN en el bundle del cliente; guardarlo en una cookie httpOnly o en localStorage solo para el demo.
- `public_token` para la pantalla de la puerta.
- No registrar datos personales innecesarios. Solo nombre y teléfono opcional.
- No commitear `.env.local`.
- No usar cripto.

## 13. Build order

1. Scaffold Next.js + TypeScript + CSS plano. `npm install`.
2. `db/schema.sql` en Supabase. `db/seed.sql` para el demo.
3. `lib/pey.ts` con `createQr` y `getQrTransactions`.
4. `POST /api/charges` + `GET /api/events/[id]/state`.
5. `/taquilla/[eventId]` con lista, QR y polling.
6. `POST /api/webhooks/pey` con firma, idempotencia y transición.
7. `/puerta/[eventId]` con polling, sonido y apertura.
8. `renew`, `reconcile`, `admit`, `late`.
9. `/demo` con simulador.
10. Landing, README, `.env.example`.
11. Deploy a Cloudflare Workers. Probar desde otro celular.
12. Grabar el video de 90 segundos y llenar el formulario.

## 14. Pruebas mínimas

- `POST /codi/qr` devuelve `id`, `qrString`, `qrImage`.
- El QR se muestra y se puede escanear.
- Un pago real de $0.01 actualiza la carga a `paid`.
- Un webhook con firma inválida devuelve 401.
- Un webhook duplicado devuelve 200 y no cambia el estado.
- Un QR vencido se puede renovar.
- Un pago tardío queda `late` y no abre la puerta.
- La puerta solo abre desde `paid`.
- El corte cuenta bien.
- El modo demo funciona sin pagos reales.
- `npm run build` pasa sin errores.

## 15. Entrega del Cursor

- Repo público.
- App en vivo.
- Video de 90 segundos.
- Correos del equipo.
- Formulario llenado antes de las 12:30 PM del domingo 15.
- Nada de secretos en el repo.

## 16. Nota sobre el nacional

El Cursor es la rebanada vertical. El nacional de 4 semanas puede sumar:

- Agente de operaciones LangGraph (ver `docs/research/arquitectura-agente.md`).
- Cuenta dividida para grupos.
- Pases de temporada.
- Métricas de impacto y piloto con un foro real.
- Video de 3 minutos.

No construir nada de eso antes de que la taquilla determinista funcione.
