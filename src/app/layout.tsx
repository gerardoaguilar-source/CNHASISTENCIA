import type { Metadata, Viewport } from "next";
import "./globals.css";
import { COLEGIO } from "@/lib/config";

export const metadata: Metadata = {
  title: {
    default: `Asistencia · ${COLEGIO}`,
    template: `%s · Asistencia CNH`,
  },
  description:
    "Pase de lista y aviso de inasistencia a padres de familia — Secundaria y Preparatoria.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Asistencia CNH",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#063D1F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
