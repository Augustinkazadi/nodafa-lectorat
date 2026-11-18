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
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('lectorat-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="nodafa-shell">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
