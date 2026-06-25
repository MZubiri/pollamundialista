import type { Metadata } from "next";
import { Montserrat, Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-title",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Polla Mundialista 2026",
  description: "Pronostica los partidos del mundial y compite por el primer lugar con tus compañeros.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${montserrat.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-body">
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: "rgba(11, 33, 22, 0.95)",
              color: "#f3f6f4",
              border: "1px solid rgba(26, 77, 52, 0.8)",
              backdropFilter: "blur(10px)",
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}

