import QRCode from "qrcode";
import type { CreateQrResponse } from "./pey";

/** Build a real PNG QR for demo charges (pey is skipped when is_demo). */
export async function buildDemoQr(payload: string): Promise<CreateQrResponse> {
  const dataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
    color: { dark: "#000000", light: "#ffffff" },
  });
  const qrImage = dataUrl.replace(/^data:image\/png;base64,/, "");
  return {
    id: `demo-qr-${crypto.randomUUID()}`,
    qrString: payload,
    qrImage,
  };
}
