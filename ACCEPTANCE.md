# ACCEPTANCE: Umbral

Definition of done para el Cursor Hackatón CDMX. Si algo no pasa esta lista, no está listo para el video.

## P0, sin esto no hay entrega

- [ ] El repo es público y no tiene `.env.local`, llaves, CLABEs ni secretos.
- [ ] `npm run build` pasa sin errores.
- [ ] La app está desplegada (Cloudflare Workers) y abre desde otro celular.
- [ ] `GET /api/health` responde `{ ok: true }`.
- [ ] Se puede crear un evento con 8 a 12 invitados.
- [ ] Se puede emitir un cobro CoDi para un invitado.
- [ ] El QR se muestra en pantalla y se puede escanear con una app bancaria real.
- [ ] Un pago real de $0.01 MXN actualiza al invitado a `paid`.
- [ ] El webhook verifica la firma; una firma inválida devuelve 401.
- [ ] Un webhook duplicado devuelve 200 y no cambia el estado.
- [ ] La pantalla de la puerta cambia a `PAGADO: [nombre]` y abre.
- [ ] La puerta no abre desde `charge_issued`, `expired` o `invited`.
- [ ] La taquilla muestra el estado en menos de 3 segundos desde el pago.
- [ ] El corte muestra pagados, pendientes, tardíos y total.
- [ ] El video de 90 segundos muestra un pago real de principio a fin.
- [ ] El formulario de entrega está lleno antes de las 12:30 PM del domingo.

## P1, suma puntos

- [ ] Un QR vencido se puede renovar sin crear un cobro duplicado.
- [ ] Un pago tardío queda en `late` y pide decisión del staff.
- [ ] El botón "Reconciliar" consulta la transacción y actualiza si ya está `PAID`.
- [ ] El modo demo funciona sin pagos reales y está marcado como demo.
- [ ] La pantalla de la puerta reproduce un tono al abrir.
- [ ] El README explica el flujo, las variables y cómo probar.
- [ ] Hay un diagrama de estados en el README o en `docs/`.
- [ ] El repo tiene un commit por hito, no un solo commit gigante.

## P2, si sobra tiempo

- [ ] El corte se puede compartir como imagen.
- [ ] El staff puede admitir manualmente un `late` con una nota.
- [ ] La taquilla muestra el tiempo restante del QR.
- [ ] El evento demo tiene 5 invitados y un botón de reset.
- [ ] Hay una página de impacto con el antes/después.
- [ ] El video tiene subtítulos en español.

## Pruebas manuales

### 1. Pago real

1. Crear evento.
2. Agregar invitado "Prueba".
3. Emitir cobro.
4. Escanear el QR con la app del banco.
5. Pagar $0.01.
6. Ver que el invitado pasa a `paid`.
7. Ver que la puerta muestra el nombre.
8. Admitir.
9. Ver que pasa a `admitted`.
10. Ver el corte.

### 2. Firma inválida

```bash
curl.exe -i -X POST https://umbral.petrasynthetic.workers.dev/api/webhooks/pey \
  -H "Content-Type: application/json" \
  -H "webhook-id: test-bad" \
  -H "webhook-timestamp: 1" \
  -H "webhook-signature: v1,bad" \
  -d "{\"type\":\"codi.qr.payment_received\"}"
```

Debe devolver 401 y no tocar la base.

### 3. Duplicado

Enviar dos veces el mismo webhook válido. La segunda debe devolver 200, registrar `duplicate` y no abrir la puerta dos veces.

### 4. Vencido

Usar el botón **Vencer QR** del demo o esperar 600s (pey exige expiración ≥ 360s). La taquilla debe mostrar `expired` y permitir renovar. No debe permitir emitir otro mientras el primero siga vivo.

### 5. Tardío

Pagar después de que venció el QR. La taquilla debe mostrar `late`, no abrir la puerta y pedir decisión del staff.

## Demo de 90 segundos

1. 0:00 Puerta cerrada. Pantalla `CERRADA`.
2. 0:05 Taquilla, tres nombres. "Emitir cobro". QR.
3. 0:15 Celular real escanea. App del banco. Paga $0.01.
4. 0:30 Webhook. Pantalla `PAGADO: [nombre]`. Tono. Puerta abre.
5. 0:45 Segundo QR vence. `VENCIDO`. Renovar. Paga.
6. 1:00 Webhook duplicado. El sistema lo ignora. La puerta no se abre dos veces.
7. 1:15 Taquilla 2 de 3, total, corte.
8. 1:25 Cierre: "La puerta que solo abre cuando el dinero ya cayó."

## Antes de enviar

- [ ] `git status` limpio y sin `.env.local`.
- [ ] `npm run build` pasa.
- [ ] La app en vivo abre en incógnito.
- [ ] El video se reproduce sin login.
- [ ] El repo es público.
- [ ] El formulario tiene el link del repo, el link de la app y el video.
- [ ] Los correos del equipo están escritos.
