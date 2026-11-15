"use client";

import { useEffect, useState } from "react";
import { OrbFallback } from "./OrbFallback";
import {
  TypographicField,
  type TypographicFieldProps,
} from "./TypographicField";

export type OrbProps = Omit<TypographicFieldProps, "animate"> & {
  animate?: boolean;
  className?: string;
};

function isDisabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("orb") === "0";
}

function autoShouldAnimate(): boolean {
  if (typeof window === "undefined") return true;
  const params = new URLSearchParams(window.location.search);
  if (params.get("orb") === "1") return true;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Orb({
  mode = "landing",
  phase = "closed",
  pulseKey = 0,
  animate,
  className,
}: OrbProps) {
  const [enabled, setEnabled] = useState(false);
  const [autoAnimate, setAutoAnimate] = useState(true);

  useEffect(() => {
    if (isDisabled()) {
      setEnabled(false);
      return;
    }
    setEnabled(true);
    setAutoAnimate(autoShouldAnimate());
  }, []);

  const layerClass = [
    "orb-layer",
    mode === "landing" ? "orb-layer--landing" : "",
    mode === "door" ? "orb-layer--door" : "",
    mode === "header" ? "orb-layer--header" : "",
    mode === "panel" ? "orb-layer--panel" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!enabled) {
    return (
      <div className={layerClass} aria-hidden>
        <OrbFallback bright={phase === "paid"} />
      </div>
    );
  }

  return (
    <div className={layerClass} aria-hidden>
      <TypographicField
        mode={mode}
        phase={phase}
        pulseKey={pulseKey}
        animate={animate ?? autoAnimate}
      />
    </div>
  );
}
