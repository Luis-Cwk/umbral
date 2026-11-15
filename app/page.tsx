import Link from "next/link";
import { Backdrop } from "@/components/Backdrop";

const EVENT_ID = "81315739-ae0c-4408-9858-8a856d9a6745";
const DOOR_TOKEN = "19f23bdf6b794f24995e6acf";

export default function Home() {
  return (
    <>
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      <Backdrop />
      <main id="contenido" className="landing">
        <section className="landing-copy">
          <div className="landing-hero">
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
