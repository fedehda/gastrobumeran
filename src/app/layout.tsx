import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
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
    <html lang="es" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("gastrobumeran_theme");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;if(s==="dark"||(!s&&d)){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}else{document.documentElement.classList.remove("dark");document.documentElement.style.colorScheme="light";}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-dark-950 text-slate-800 dark:text-gray-100 antialiased selection:bg-bumeran-500 selection:text-white transition-colors duration-200">
        <ThemeProvider>
          <AutoSyncWatcher />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
