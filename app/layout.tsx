import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Umbral",
  description: "La puerta que solo abre cuando el dinero ya cayó.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
