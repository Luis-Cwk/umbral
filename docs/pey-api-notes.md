# Notas de la API de pey

Base: `https://api.pey.mx`
Auth: `Authorization: Bearer <PEY_API_KEY>`
Documentación: https://docs.pey.mx
OpenAPI: https://docs.pey.mx/openapi.json

## 1. Crear QR de CoDi

```
POST /codi/qr
```

Body:

```json
{
  "amount": 0.01,
  "concept": "Admisión Foro Umbral · Ana",
  "expiration": 600,
  "numRef": "1234567",
  "generateImage": true,
  "metadata": { "guestId": "...", "eventId": "..." }
}
```

`amount` va en MXN, no en centavos. `expiration` va en segundos: `0` (sin vencimiento) o **mínimo 360**. `numRef` debe ser **hasta 7 dígitos** (no UUID). Guarda `guestId`/`eventId` en `metadata`. `bankAccountId` es opcional si la API key ya está ligada a una cuenta.

Respuesta 201:

```json
{
  "id": "IDC asignado por Banxico",
  "qrString": "payload que se codifica en el QR",
  "qrImage": "PNG en base64, o null"
}
```

`qrImage` solo viene si `generateImage: true`. Se puede usar directo:

```tsx
<img src={`data:image/png;base64,${charge.qrImage}`} alt="QR CoDi" />
```

Si `qrImage` es null, usa `qrString` con una librería de QR.

## 2. Consultar transacciones de un QR

```
GET /transaction/codi/qr/{id}
```

`id` es el `id` que devolvió `POST /codi/qr`, no el `numRef`.

Respuesta:

```json
{
  "items": [
    {
      "id": "ULID de la transacción",
      "status": "PENDING",
      "amount": 0.01,
      "currency": "MXN",
      "paymentMethod": "CODI",
      "description": "Admisión ...",
      "dateCreated": 1790000000
    }
  ]
}
```

`status` es `PENDING` o `PAID`. Los items vienen del más nuevo al más viejo, máximo 20. Para conciliar, busca el primero con `status === "PAID"`.

## 3. Webhook

Evento: `codi.qr.payment_received`.

Payload de ejemplo:

```json
{
  "type": "codi.qr.payment_received",
  "amount": 0.01,
  "apiKeyId": "01M3...",
  "codiQrId": "IDC del QR",
  "concept": "Admisión ...",
  "datePaid": 1790724818,
  "numRef": "1234567",
  "transactionId": "ULID de la transacción"
}
```

Headers de Standard Webhooks:

- `webhook-id`
- `webhook-timestamp`
- `webhook-signature: v1,...`

Verificación:

```ts
import { Webhook } from "standardwebhooks";

const raw = await req.text();
const headers = Object.fromEntries(req.headers);
const wh = new Webhook(process.env.PEY_WEBHOOK_SECRET!);

try {
  wh.verify(raw, headers);
} catch {
  return new Response("invalid signature", { status: 401 });
}
```

Reglas:

- Leer `req.text()` antes de `req.json()`.
- Guardar el body crudo en `webhook_events.payload`.
- Idempotencia por `webhook-id` y por `transactionId`.
- Responder 200 a duplicados para que pey no reintente.
- Responder 500 si la base falla, para que pey reintente.
- No confiar en el body sin verificar la firma.

## 4. Cuentas y pruebas

- El alta ante Banxico tarda alrededor de cinco días.
- Portal: https://portal.pey.mx (también `portal.mipey.mx`). Para probar, usa una CLABE de la hoja del evento o la tuya ya activa.
- No commitees la CLABE, la API key ni el secreto del webhook.
- Los pagos de prueba no se devuelven. Usa $0.01. `numRef` es máximo 7 dígitos.
- No hay sandbox. Se prueba en producción con montos chicos.
- Cada API key se liga a una cuenta CoDi y, si aplica, a una cuenta Stripe.

## 5. Errores

Formato:

```json
{
  "error": {
    "message": "...",
    "type": "INVALID_REQUEST",
    "requestId": "..."
  }
}
```

Si falla, imprime el `requestId` completo. No adivines la causa.

## 6. Lo que no se usa

- Push notification (`POST /codi/pn`). Requiere que el celular ya esté dado de alta en CoDi. Para el Cursor, solo QR.
- Payment links. Útiles para el nacional, no para la puerta.
- Cripto, x402, USDC, NFT. Prohibido por las reglas del hackatón.
