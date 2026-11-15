import Link from "next/link";
import { Orb } from "@/components/Orb";

export default function Home() {
  return (
    <main className="landing">
      <Orb mode="landing" phase="closed" />
      <div className="landing-copy">
        <p className="kicker">Umbral / Hackatón México 2026</p>
        <h1 style={{ marginTop: "0.85rem" }}>
          La puerta que solo abre cuando el dinero ya cayó.
        </h1>
        <p className="lede">
          Taquilla con cobros CoDi. Cada persona recibe un QR nuevo. La puerta se
          abre con el webhook firmado, no con una captura de pantalla.
        </p>
        <div className="actions" style={{ marginTop: "1.25rem" }}>
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
        <h2>Cómo funciona</h2>
        <div className="grid">
          <div className="card">
            <p className="kicker">01 / Cobro</p>
            <p>
              El staff emite un QR de CoDi por persona, con monto y referencia.
            </p>
          </div>
          <div className="card">
            <p className="kicker">02 / Pago</p>
            <p>La persona escanea con su banco. El dinero llega por SPEI.</p>
          </div>
          <div className="card">
            <p className="kicker">03 / Puerta</p>
            <p>El webhook firmado marca el pago. La puerta muestra el nombre.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
