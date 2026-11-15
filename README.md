# Umbral

La puerta que solo abre cuando el dinero ya cayó.

Taquilla para eventos presenciales con cobros CoDi a través de la API de pey. Cada invitado recibe un QR nuevo. La puerta solo se abre cuando el webhook firmado confirma el pago. Si el QR vence, se renueva. Si el webhook se duplica, se ignora. Si el pago llega tarde, el staff decide.

Prototipo para el Cursor Hackatón México CDMX, 14 y 15 de noviembre de 2026.

**App en vivo:** https://umbral.petrasynthetic.workers.dev

## Stack

- Next.js App Router + TypeScript (vinext).
- Supabase Postgres.
- Cloudflare Workers (`npm run deploy:vinext`).
- CSS plano, Space Grotesk, blanco y negro.
- Polling cada 2 segundos.
- Webhooks con verificación Standard Webhooks.

## Setup

```bash
npm install
cp .env.example .env
# llena PEY_API_KEY, PEY_WEBHOOK_SECRET, SUPABASE_URL,
# SUPABASE_SERVICE_ROLE_KEY y STAFF_PIN (12+ caracteres)
```

Dos caminos locales:

| Comando | Puerto | Env |
|---|---|---|
| `npm run dev` | http://localhost:3000 | `.env` |
| `npm run dev:vinext` | http://localhost:3001 | `.dev.vars` |

Variables (nunca las subas al repo):

| Variable | Uso |
|---|---|
| `PEY_API_KEY` | Crear QR CoDi |
| `PEY_WEBHOOK_SECRET` | Verificar firma del webhook |
| `SUPABASE_URL` | Postgres |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor |
| `STAFF_PIN` | Header `x-staff-pin` en taquilla |
| `DEMO_MODE` | `true` habilita `/demo` y simulador |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app |

## Base de datos

1. Crea un proyecto en Supabase.
2. Corre `db/setup.sql` en el SQL Editor (schema + seed), o `schema.sql` y luego `seed.sql`.
3. Copia la URL y la service role key a `.env`.

## Pey

1. Entra a https://portal.pey.mx (también `portal.mipey.mx`).
2. Da de alta una CLABE y crea una API key ligada a esa cuenta.
3. En **Desarrollador**, engrane de la API key → webhook:
   `https://umbral.petrasynthetic.workers.dev/api/webhooks/pey`
4. Copia el secreto a `PEY_WEBHOOK_SECRET` (local y `wrangler secret put` en Cloudflare).

Prueba con **$0.01**. Los pagos de prueba no se devuelven.

## Flujo

```
Staff crea evento -> agrega invitados -> emite QR CoDi
Invitado escanea -> paga en su banco -> webhook firmado
Servidor verifica firma -> idempotencia -> invitado paid
Pantalla de puerta -> PAGADO: nombre -> abre
Staff admite -> invitado admitted -> corte
```

## Endpoints

- `GET /api/health`
- `POST /api/events`
- `POST /api/events/[id]/guests`
- `GET /api/events/[id]/state`
- `POST /api/charges`
- `POST /api/charges/[id]/renew`
- `POST /api/charges/[id]/reconcile`
- `POST /api/events/[id]/admit`
- `POST /api/webhooks/pey`
- `POST /api/demo/simulate` y `POST /api/demo/reset` (solo `DEMO_MODE=true`)

## Seguridad

- La firma del webhook es obligatoria (Standard Webhooks).
- Las llaves viven solo en el servidor y en secrets del Worker.
- `.env` y `.env.local` están en `.gitignore`.
- El repo público no debe tener CLABEs, API keys ni secretos.
- No hay cripto en este proyecto. CoDi es un pago SPEI, no un token.
- El evento seed usa `is_demo=true` y QR sintético. Un evento con `is_demo=false` llama a pey de verdad.

## Deploy

```bash
npm run deploy:vinext
```

Cuenta Cloudflare: Worker `umbral`. Secrets: `PEY_API_KEY`, `PEY_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STAFF_PIN`. El webhook debe apuntar a la URL de producción.

## Demo y pantallas

| Pantalla | URL |
|---|---|
| Landing | `/` |
| Simulador (sin banco) | `/demo` |
| Taquilla seed | `/taquilla/00000000-0000-0000-0000-000000000001` |
| Puerta seed | `/puerta/00000000-0000-0000-0000-000000000001?token=demo-token` |

El PIN de staff está en el secret `STAFF_PIN`; no se publica en el repo.

Para un cobro **real**, crea un evento con `POST /api/events` (`is_demo` queda `false`) o usa la taquilla de un evento no demo. Emite cobro, paga $0.01 con CoDi y mira la puerta. No publiques en el README el `eventId` ni el `token` de un evento real de prueba.

## Repo y entrega

- Repo público: https://github.com/Luis-Cwk/umbral
- App en vivo: https://umbral.petrasynthetic.workers.dev
- Video de ~90 segundos (pago CoDi real de $0.01 + puerta): guion en `docs/demo-script.md`
- Formulario del hackatón **antes de las 12:30 PM** del domingo 15 (cierre 13:00)

## Documentos

- `SPEC.md`: especificación completa.
- `ACCEPTANCE.md`: definition of done (casi todo P0/P1 marcado; faltan video y form).
- `docs/pey-api-notes.md`: notas de la API.
- `docs/demo-script.md`: guion del video + links para el formulario.
- `docs/DISENO-UI.md`: capa visual (campo ASCII).

## Licencia

MIT. Ver `LICENSE`.
