import type { Metadata } from "next";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "LECTORAT | Notre-Dame de Fatima – Gombe",
  description: "Plateforme du Lectorat de la paroisse Notre-Dame de Fatima – Gombe (Archidiocèse de Kinshasa)",
  icons: {
    icon: "/logo-lectorat.jpg",
    apple: "/logo-lectorat.jpg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="nodafa-shell">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
