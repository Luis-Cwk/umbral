import Link from "next/link";
import { Backdrop } from "@/components/Backdrop";

const EVENT_ID = "7134e66a-1d64-4601-aea7-1af257198c0f";
const DOOR_TOKEN = "d7ef0c843119410b844032ff";

export default function Home() {
  return (
    <>
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      <Backdrop />
      <main id="contenido" className="landing">
        <section className="landing-copy">
          <div className="landing-hero field-copy" data-field-obstacle>
            <p className="kicker">Umbral / CDMX 2026</p>
            <h1>La puerta que solo abre cuando el dinero ya cayó.</h1>
            <div className="actions">
              <Link className="btn" href={`/taquilla/${EVENT_ID}`}>
                Abrir taquilla
              </Link>
              <Link
                className="btn btn--ghost"
                href={`/puerta/${EVENT_ID}?token=${DOOR_TOKEN}`}
              >
                Ver puerta
              </Link>
            </div>

            <details className="info">
              <summary>Cómo funciona</summary>
              <div className="info-body">
                <div className="grid">
                  <div className="card">
                    <p className="kicker">01 / Cobro</p>
                    <p>Un QR nuevo por persona.</p>
                  </div>
                  <div className="card">
                    <p className="kicker">02 / Pago</p>
                    <p>SPEI instantáneo, sin comisión.</p>
                  </div>
                  <div className="card">
                    <p className="kicker">03 / Puerta</p>
                    <p>Abre con el webhook firmado.</p>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </section>
      </main>
    </>
  );
}
