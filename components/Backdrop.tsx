"use client";

import { useState } from "react";
import { Orb } from "./Orb";

export function Backdrop() {
  const [playing, setPlaying] = useState(true);

  return (
    <>
      <Orb mode="landing" phase="closed" animate={playing} />
      <button
        type="button"
        className="backdrop-toggle"
        onClick={() => setPlaying((value) => !value)}
        aria-pressed={playing}
      >
        {playing ? "Pausar fondo" : "Animar fondo"}
      </button>
    </>
  );
}
