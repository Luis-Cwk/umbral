"use client";

import { useEffect, useState } from "react";
import { Orb } from "./Orb";

export function FieldPanel() {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("orb") === "0") return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setPlaying(params.get("orb") === "1" || !reduced);
  }, []);

  return (
    <aside className="field-panel">
      <div className="field-panel__head">
        <span>Monospace × Single Weight</span>
        <button
          type="button"
          className="field-toggle"
          onClick={() => setPlaying((value) => !value)}
          aria-pressed={playing}
        >
          {playing ? "Pausar" : "Animar"}
        </button>
      </div>
      <Orb mode="panel" phase="closed" animate={playing} />
      <div className="field-panel__foot">
        <span>CoDi / SPEI</span>
        <span>$0.01 MXN</span>
      </div>
    </aside>
  );
}
