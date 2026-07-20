import type { Metadata, Viewport } from "next";
import { Nunito, Fraunces } from "next/font/google";
import { AppNav } from "@/components/AppNav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { getCurrentProfile } from "@/lib/auth";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const body = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Canuto — ¿Qué hacemos en Córdoba?",
  description: "Planes cerca tuyo en Córdoba Capital. Sin vueltas.",
  applicationName: "Canuto",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Canuto",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#f2f5f8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentProfile();

  return (
    <html lang="es" className={`${display.variable} ${body.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <AppNav profile={profile} />
        <main className="flex-1">{children}</main>
        <InstallPrompt />
      </body>
    </html>
  );
}
