"use client";

import { useState } from "react";
import { Orb } from "./Orb";

export function FieldPanel() {
  const [playing, setPlaying] = useState(true);

  return (
    <div className="field-column">
      <aside className="field-panel">
        <div className="field-panel__head">
          <span>Monospace × Single Weight</span>
          <span>01</span>
        </div>
        <Orb mode="panel" phase="closed" animate={playing} />
        <div className="field-panel__foot">
          <span>CoDi / SPEI</span>
          <span>$0.01 MXN</span>
        </div>
      </aside>
      <div className="field-caption">
        <span>Fondo tipográfico</span>
        <button
          type="button"
          className="field-toggle"
          onClick={() => setPlaying((value) => !value)}
          aria-pressed={playing}
        >
          {playing ? "Pausar fondo" : "Animar fondo"}
        </button>
      </div>
    </div>
  );
}
