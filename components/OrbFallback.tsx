type Props = {
  className?: string;
  bright?: boolean;
};

/** Static radial stand-in when WebGPU/WebGL or motion is unavailable. */
export function OrbFallback({ className, bright = false }: Props) {
  return (
    <div
      className={`orb-fallback ${bright ? "is-bright" : ""} ${className ?? ""}`}
      aria-hidden
    />
  );
}
