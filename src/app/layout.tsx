import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Nunito, Fraunces, Lexend } from "next/font/google";
import { AccessibilityPanel } from "@/components/AccessibilityPanel";
import { A11yProvider } from "@/components/A11yProvider";
import { AppNav } from "@/components/AppNav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { getCurrentProfile } from "@/lib/auth";
import { A11Y_BOOTSTRAP_SCRIPT } from "@/lib/a11y";
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

const legible = Lexend({
  variable: "--font-legible",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  // Only applied in a11y “fuente legible” — don't preload on every visit
  preload: false,
  display: "swap",
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
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentProfile();

  return (
    <html
      lang="es"
      className={`${display.variable} ${body.variable} ${legible.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col antialiased">
        <Script id="canuto-a11y" strategy="beforeInteractive">
          {A11Y_BOOTSTRAP_SCRIPT}
        </Script>
        <A11yProvider>
          <a href="#contenido" className="skip-link">
            Saltar al contenido
          </a>
          <AppNav profile={profile} />
          <main id="contenido" className="flex-1" tabIndex={-1}>
            {children}
          </main>
          <InstallPrompt />
          <AccessibilityPanel />
        </A11yProvider>
      </body>
    </html>
  );
}
