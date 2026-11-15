# Umbral: estado del diseño

Documento de traspaso para Cursor. Última actualización: 14 de noviembre de 2026.
Todo lo descrito aquí está desplegado en `https://umbral.petrasynthetic.workers.dev` y en `main`.

## Resumen

La interfaz es blanco y negro, una sola tipografía (Space Grotesk) y un solo acento verde
(`--ok: #c6ff4a`). No hay tarjetas decorativas en la portada ni orbes 3D. El fondo es un campo
de caracteres ASCII animado en canvas 2D, y cada pantalla tiene una variación distinta del mismo
motor de física.

## Archivos de la capa visual

| Archivo | Qué hace |
|---|---|
| `app/page.tsx` | Portada. Kicker, titular, dos botones, `<details>` "Cómo funciona". |
| `app/globals.css` | Todo el sistema: variables, layout, botones, campo, modales, móvil. |
| `components/TypographicField.tsx` | Motor del campo ASCII. Config por pantalla y física de boids. |
| `components/Orb.tsx` | Envoltura cliente. Decide si anima y aplica la clase de capa. |
| `components/Backdrop.tsx` | Atajo para el campo animado que usan todas las pantallas. |
| `components/OrbFallback.tsx` | Degradado estático cuando el campo está apagado. |
| `app/puerta/[eventId]/page.tsx` | Pantalla de puerta. Usa `mode="door"` y pasa la fase. |
| `app/taquilla/[eventId]/page.tsx` | Taquilla del staff. Usa `mode="taquilla"`. |
| `app/demo/page.tsx` | Simulador sin cobro real. Usa `mode="demo"`. |

Eliminados: `components/FieldPanel.tsx`, `components/OrbScene.tsx` y la dependencia `three`.
No volver a introducir WebGL ni un orbe 3D: la pieza visual es canvas 2D a propósito.

## Cómo se monta el campo

`<Backdrop mode="..." phase={...} pulseKey={...} />` va como hermano del contenido, antes de
`<main>`. Renderiza una capa `position: fixed` a toda la ventana con `pointer-events: none`.

```tsx
<>
  <Backdrop mode="taquilla" pulseKey={state?.totals.paid ?? 0} />
  <main>...</main>
</>
```

- `phase`: `closed | paid | inside | review`. Cambia el color (ámbar en `review`) y acelera.
- `pulseKey`: cualquier valor que cambie dispara un pulso de 1400 ms. Se usa el contador de
  pagadas, así el destello ocurre solo cuando entra un pago.
- El contenido siempre va por encima: `main` tiene `position: relative; z-index: 1`.

## Variaciones por pantalla

Todas comparten la misma física. Cambian los pesos en `CONFIG` de `components/TypographicField.tsx`.

| Modo | Caracteres | Tamaño | Velocidad | Opacidad | Dispersión | Lectura |
|---|---|---|---|---|---|---|
| `landing` | 300 | 11 px | 1.0 | 0.8 | 0.22 / 0.26 | Cardumen compacto que viaja por la derecha |
| `door` | 280 | 12 px | 0.7 | 0.6 | 0.5 / 0.45 | Suelto, ocupa media pantalla, detrás del rótulo |
| `taquilla` | 380 | 9 px | 0.45 | 0.5 | 0.95 / 0.9 | Deriva lenta de ancho completo, sin grupo visible |
| `demo` | 260 | 9 px | 1.35 | 0.38 | 0.6 / 0.55 | Denso y rápido, reacciona a la invitada elegida |
| `header` | 40 | 7 px | 0.6 | 0.6 | 0.5 / 0.5 | Reservado, hoy sin uso |

Pesos de fuerza por modo (`pull`, `align`, `coh`, `sep`): la portada y la puerta tiran fuerte al
objetivo; la taquilla casi no (`pull: 0.00006`), por eso se ve como campo y no como banco de peces.

Opacidad efectiva = opacidad de la config por la opacidad CSS de la capa:

| Modo | Clase CSS | Opacidad CSS | Efectiva |
|---|---|---|---|
| landing | `.orb-layer--landing` | 0.9 | 0.72 |
| door | `.orb-layer--door` | 0.45 | 0.27 |
| taquilla | `.orb-layer--taquilla` | 0.8 | 0.40 |
| demo | `.orb-layer--demo` | 0.8 | 0.30 |

## Motor del campo (no cambiar sin medir)

- Canvas 2D con `devicePixelRatio` limitado a 2 y techo de 30 cuadros por segundo.
- Boids con tres fuerzas: separación (radio 22 px), alineación y cohesión (radio 48 px), más un
  objetivo que oscila con seno y coseno sobre el punto `tx, ty`.
- El puntero y el tacto repelen: radio 190 px, fuerza 1.1, se apaga al levantar el dedo.
- Los caracteres cambian de glifo al azar (0.3 % por cuadro) y se envuelven por los bordes.
- En móvil (menos de 720 px) la cantidad baja a 55 %.
- El costo es O(n²) por cuadro. Con 380 caracteres y 30 fps aguanta, pero no subir de ~450 sin
  cambiar a una rejilla espacial.

## Reglas de composición

- Portada: kicker, titular, dos botones y un `<details>` "Cómo funciona". Sin lede, sin cita, sin
  subtítulos que repitan el titular.
- Botones primario y secundario: rectangulares (`border-radius: 0.35rem`), mismo alto (2.7 rem),
  mayúsculas de 0.66 rem con `letter-spacing: 0.14em`. Primario blanco lleno; secundario con borde.
- "Cómo funciona" no es botón: es un `summary` de texto con `+` y foco visible.
- Espaciado del bloque principal: 36 px entre titular y acciones, 36 px entre acciones y el enlace.
- Puerta: rótulo `clamp(2.6rem, 9vw, 5.5rem)`, interlineado 0.9. Antes era `clamp(4.2rem, 18vw, 11rem)`
  y se veía tosca.
- Taquilla y demo: `main` con 1040 px de ancho máximo, estadísticas en una fila en escritorio y dos
  columnas en móvil, con el último bloque a lo ancho.

## Trampas ya resueltas (no repetirlas)

1. **`prefers-reduced-motion`.** Este Brave viene con "reducir movimiento" activado. `Orb` respetaba
   esa preferencia y la puerta se congelaba. Ahora todas las pantallas animan siempre. El apagador
   real es `?orb=0`.
2. **Apilar el campo.** El canvas es `position: fixed` con `z-index: 0`; si el contenido no está
   posicionado, el canvas se pinta encima. De ahí el `main { position: relative; z-index: 1 }`.
3. **Las tarjetas tapan el campo.** `.card` tiene `background: var(--panel)` opaco. Las filas de
   invitadas no, por eso el campo se ve pasar detrás de la lista.
4. **Modales.** `.modal-backdrop` va en `z-index: 40`, por encima del campo y del contenido.
5. **Contraste.** La taquilla está a 0.40 de opacidad efectiva; la demo a 0.30. Si se sube, compite
   con montos y botones. Para bajarla, tocar `opacity` de la config, no la clase CSS.

## Parámetros de URL

- `?orb=0` apaga el campo en cualquier pantalla (queda el degradado estático).
- `?orb=1` ya no hace falta, pero se sigue aceptando.

## Comandos

```bash
npm run build
npm run deploy:vinext
```

Rutas de prueba:

```text
https://umbral.petrasynthetic.workers.dev/
https://umbral.petrasynthetic.workers.dev/taquilla/00000000-0000-0000-0000-000000000001
https://umbral.petrasynthetic.workers.dev/puerta/00000000-0000-0000-0000-000000000001?token=demo-token
https://umbral.petrasynthetic.workers.dev/demo
```

La taquilla pide PIN de staff. Sin PIN devuelve 401 y el campo queda en `pulseKey` 0: es esperado.

## Qué no tocar

- El flujo de cobro, el webhook firmado, la idempotencia y la máquina de estados de la puerta.
  El diseño no debe alterar ninguna decisión de pago.
- La identidad visual: blanco y negro puros, Space Grotesk, un solo acento verde. No proponer
  paletas ni tipografías nuevas.
- El README público no lleva tokens de eventos.

## Commits de esta etapa

```text
7a7ab34  feat: minimal editorial landing with info toggle
e5b4fec  feat: full-bleed flocking ascii field
b846c4d  feat: tighten landing copy and controls
6cd2175  fix: landing spacing and always-on field
4c4c955  fix: more air between title, actions and info
7bc16c1  feat: per-screen ascii field variations
83ca7dd  fix: door field always animates, more particles, smaller title
```
