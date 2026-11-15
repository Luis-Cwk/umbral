import Link from "next/link";
import { FieldPanel } from "@/components/FieldPanel";

export default function Home() {
  return (
    <>
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      <main id="contenido" className="landing">
        <section className="landing-copy">
          <div className="landing-hero">
            <p className="kicker">Umbral / Hackatón México 2026</p>
            <h1>La puerta que solo abre cuando el dinero ya cayó.</h1>
            <p className="lede">
              Taquilla con cobros CoDi. La puerta abre con el webhook firmado.
            </p>
            <div className="actions">
              <Link className="btn" href="/demo">
                Ver demo
              </Link>
              <Link
                className="btn"
                href="/taquilla/00000000-0000-0000-0000-000000000001"
              >
                Taquilla
              </Link>
              <Link
                className="btn"
                href="/puerta/00000000-0000-0000-0000-000000000001?token=demo-token"
              >
                Puerta
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

          <blockquote className="landing-quote">
            <p>“El pago no es un botón. Es un umbral.”</p>
            <footer>Umbral / CDMX 2026</footer>
          </blockquote>
        </section>

        <FieldPanel />
      </main>
    </>
  );
}
