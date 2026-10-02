import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AutoSyncWatcher } from "@/components/fudo/AutoSyncWatcher";

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: "GastroBumeran • Plataforma de Fidelización & POS de Caja",
  description: "Sistema híbrido de fidelización gastronómica: Puntos por Consumo + Sellos por Visita con protección anti-inflacionaria de 90 días.",
  manifest: "/manifest.json",
  icons: {
    icon: "/gastro-icon.svg",
    apple: "/gastro-icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GastroBumeran",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark h-full">
      <body className="min-h-full flex flex-col bg-dark-950 text-gray-100 antialiased selection:bg-bumeran-500 selection:text-white">
        <AutoSyncWatcher />
        {children}
      </body>
    </html>
  );
}
