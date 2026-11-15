"use client";

import { useEffect, useState } from "react";

type Props = {
  qrImage: string | null | undefined;
  qrString?: string | null;
  alt: string;
  className?: string;
};

/** Prefer server PNG; if missing/tiny, render from qrString in the browser. */
export function QrImage({ qrImage, qrString, alt, className }: Props) {
  const [fallback, setFallback] = useState<string | null>(null);
  const src =
    qrImage && qrImage.length > 200
      ? `data:image/png;base64,${qrImage}`
      : fallback;

  useEffect(() => {
    if (qrImage && qrImage.length > 200) {
      setFallback(null);
      return;
    }
    if (!qrString) {
      setFallback(null);
      return;
    }
    let cancelled = false;
    void import("qrcode").then((QRCode) =>
      QRCode.toDataURL(qrString, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 320,
        color: { dark: "#000000", light: "#ffffff" },
      }).then((url) => {
        if (!cancelled) setFallback(url);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [qrImage, qrString]);

  if (!src) {
    return <p className="meta">Generando QR…</p>;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className ?? "qr"} src={src} alt={alt} />;
}
