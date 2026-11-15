# Guion del video y demo en vivo

## Video de 90 segundos

### 0:00 a 0:05, puerta cerrada

Plano de una puerta real o de una laptop en la puerta. La pantalla dice `CERRADA`. Una fila de dos o tres personas.

Voz en off: "En México, la puerta de un foro se cobra con transferencias y capturas de pantalla."

### 0:05 a 0:15, taquilla

La pantalla de taquilla con tres nombres. El staff toca "Emitir cobro". Aparece el QR de la primera persona, grande, con monto y nombre.

Voz en off: "Umbral emite un cobro CoDi nuevo por persona. Sin terminal, sin comisión."

### 0:15 a 0:30, pago real

Un celular real escanea el QR. Se ve la app del banco. La persona confirma. El pago sale de la app.

Voz en off: "La persona paga desde su banco. El dinero llega por SPEI."

### 0:30 a 0:40, webhook y puerta

La pantalla de la puerta cambia a `PAGADO: [nombre]`. Suena un tono. La puerta se abre. La persona entra.

Voz en off: "La puerta no abre con una captura. Abre con el webhook firmado."

### 0:40 a 0:50, QR vencido

La segunda persona tarda. El QR vence. La pantalla dice `VENCIDO`. El staff toca "Renovar". Aparece un QR nuevo. La persona paga.

Voz en off: "Si el QR vence, se renueva. No se reemite mientras el primero pueda liquidarse."

### 0:50 a 1:00, duplicado

Llega un webhook duplicado. La pantalla de la puerta no se abre dos veces. La taquilla muestra "Duplicado ignorado".

Voz en off: "Un webhook duplicado no abre la puerta dos veces."

### 1:00 a 1:15, corte

La taquilla muestra 2 de 3 pagados, el total y el corte.

Voz en off: "Al final, el corte: quién pagó, quién no, cuánto entró."

### 1:15 a 1:25, cierre

Plano de la puerta abierta. Texto: "Umbral. La puerta que solo abre cuando el dinero ya cayó."

Voz en off: "Cero comisión. Cero capturas. Cero dudas."

## Demo en vivo, 3 minutos

1. Abrir `/taquilla/00000000-0000-0000-0000-000000000001` en la laptop.
2. Abrir `/puerta/00000000-0000-0000-0000-000000000001?token=demo-token` en otra ventana o en un celular.
3. Emitir un cobro. Mostrar el QR.
4. Si el jurado tiene CoDi, pedirle que pague $0.01. Si no, usar "Simular pago" y decir claramente que es modo demo.
5. Mostrar la puerta abriendo.
6. Emitir un segundo cobro y dejar que venza. Renovar.
7. Disparar un duplicado. La puerta no se abre dos veces.
8. Mostrar el corte.

## Plan B

- Si el internet falla, tener el video de 90 segundos descargado.
- Si el banco falla, tener una segunda persona con otra app bancaria.
- Si el QR no carga, tener el `qrString` y una imagen de respaldo.
- Si el webhook tarda, usar "Reconciliar" y mostrar la transacción `PAID`.
- Si todo falla, mostrar el video y el repo.

## Qué no decir

- No decir que la puerta la abre un agente.
- No decir que es un producto oficial de pey, Banxico o CoDi.
- No prometer que todo México usa CoDi.
- No decir que el dinero se devuelve; los pagos de prueba no se devuelven.
