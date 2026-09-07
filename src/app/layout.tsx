import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tesorería — Los Cedros Rugby 2026",
  description: "Cobros del tercer tiempo, gastos, lavandería y caja del club.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
