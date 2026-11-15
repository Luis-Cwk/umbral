# Guion del video y demo en vivo

## Links listos (copiar al form)

| Qué | URL |
|---|---|
| App | https://umbral.petrasynthetic.workers.dev |
| Repo | https://github.com/Luis-Cwk/umbral |
| Guion | este archivo |

Deadline formulario: **domingo 15 Nov, 12:30 PM CDMX**. Deadline hackatón: **13:00**.

## Setup antes de grabar (5 min)

1. Laptop: landing → **Abrir taquilla**. Celular o segunda ventana: landing → **Ver puerta**.
2. En taquilla, escribe el PIN de staff y **Guardar PIN** (está en el secret / archivo privado, no en el repo).
3. Confirma que ves "Función real Umbral" y la lista (Ramón, Santiago, Adrián, Miriam, David). Miriam ya puede estar `Adentro`.
4. Elige a alguien en `Invitación` (p. ej. Ramón Orraca o Adrián Soto).
5. Ten listo el celular con la app del banco y CoDi.
6. Plan B abierto en otra pestaña: `/demo` (simulador, sin banco).

Si el webhook tarda >30 s tras pagar: abre el QR → **Reconciliar**.

## Video de 90 segundos

### 0:00 a 0:05, puerta cerrada

Plano de la laptop en la puerta. La pantalla dice `CERRADA`. Campo ASCII detrás.

Voz en off: "En México, la puerta de un foro se cobra con transferencias y capturas de pantalla."

### 0:05 a 0:15, taquilla

Taquilla con nombres. Staff toca emitir cobro. QR grande, monto $0.01, nombre.

Voz en off: "Umbral emite un cobro CoDi nuevo por persona. Sin terminal, sin comisión."

### 0:15 a 0:30, pago real

Celular real escanea. App del banco. Confirma. Sale el pago.

Voz en off: "La persona paga desde su banco. El dinero llega por SPEI."

### 0:30 a 0:40, webhook y puerta

Puerta → `PAGADO` + nombre. Tono. Luego `ADENTRO` / cierra.

Voz en off: "La puerta no abre con una captura. Abre con el webhook firmado."

### 0:40 a 0:50, opcional: vencido o corte

Si alcanza: renovar un QR vencido, o ir directo al corte.

Voz en off: "Si el QR vence, se renueva. No se reemite mientras el primero pueda liquidarse."

### 0:50 a 1:05, corte

Taquilla: por entrar, pendientes, tarde, adentro, corte.

Voz en off: "Al final, el corte: quién pagó, quién no, cuánto entró."

### 1:05 a 1:25, cierre

Landing o puerta. Texto: "Umbral. La puerta que solo abre cuando el dinero ya cayó."

Voz en off: "Cero comisión. Cero capturas. Cero dudas."

## Atajo de 60 s (si vas corto)

1. Puerta `CERRADA` (5 s).
2. Emitir cobro + QR (10 s).
3. Pago CoDi en banco (20 s).
4. Puerta `PAGADO` + tono (10 s).
5. Corte + cierre (15 s).

## Demo en vivo, 3 minutos

1. Landing → Abrir taquilla (evento real) en la laptop.
2. Landing → Ver puerta en otra ventana o celular.
3. Emitir cobro. Mostrar QR.
4. Si el jurado tiene CoDi, que pague $0.01. Si no: `/demo` y "Simular pago", diciendo que es demo.
5. Mostrar la puerta abriendo.
6. Si hay tiempo: renovar / Reconciliar / corte.

Para el simulador sin banco: `/demo` + PIN. Taquilla seed (QR sintético): `/taquilla/00000000-0000-0000-0000-000000000001`.

## Plan B

- Si el internet falla, tener el video de 90 segundos descargado.
- Si el banco falla, segunda persona con otra app, o `/demo`.
- Si el webhook tarda, **Reconciliar**.
- Si todo falla, mostrar el video y el repo.

## Qué no decir

- No decir que la puerta la abre un agente.
- No decir que es un producto oficial de pey, Banxico o CoDi.
- No prometer que todo México usa CoDi.
- No decir que el dinero se devuelve; los pagos de prueba no se devuelven.
- No mostrar el PIN de staff ni secrets en cámara.

## Pegar en el formulario

```text
Repo: https://github.com/Luis-Cwk/umbral
App:  https://umbral.petrasynthetic.workers.dev
Video: (tu link cuando lo subas)
```
