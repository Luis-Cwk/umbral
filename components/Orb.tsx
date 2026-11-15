"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { OrbFallback } from "./OrbFallback";
import type { OrbSceneProps } from "./OrbScene";

const OrbScene = dynamic(() => import("./OrbScene"), {
  ssr: false,
  loading: () => <OrbFallback />,
});

export type OrbProps = OrbSceneProps & {
  mode?: "landing" | "door" | "header";
  className?: string;
};

function shouldDisableOrb(): boolean {
  if (typeof window === "undefined") return true;
  const params = new URLSearchParams(window.location.search);
  if (params.get("orb") === "0") return true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return true;
  }
  return false;
}

export function Orb({
  mode = "landing",
  phase = "closed",
  pulseKey = 0,
  className,
}: OrbProps) {
  const [ready, setReady] = useState(false);
  const [disabled, setDisabled] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setDisabled(shouldDisableOrb());
    setReady(true);
  }, []);

  const compact = mode === "header";
  const layerClass = [
    "orb-layer",
    mode === "landing" ? "orb-layer--landing" : "",
    mode === "door" ? "orb-layer--door" : "",
    mode === "header" ? "orb-layer--header" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!ready || disabled || failed) {
    return (
      <div className={layerClass} aria-hidden>
        <OrbFallback bright={phase === "paid"} />
      </div>
    );
  }

  return (
    <div className={layerClass} aria-hidden>
      <OrbScene
        phase={phase}
        pulseKey={pulseKey}
        compact={compact}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
