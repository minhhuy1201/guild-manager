import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Playfair_Display } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { APP_SHELL_WIDTH } from "@/lib/layout";
import "./globals.css";

// App-wide font: Be Vietnam Pro (sans-serif, full Vietnamese coverage).
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// Heading font: page and section titles, dialog titles and the guild name. Two weights, because
// nothing else uses it.
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mèo Mập Giang Hồ",
  description: "Điểm danh bang hội — Mèo Mập Giang Hồ",
};

// `viewportFit: "cover"` makes iOS report the home indicator's height through
// `env(safe-area-inset-bottom)`, which the phone's tab bar pads by; without it the value is 0.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${playfairDisplay.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <SiteHeader />
          <main
            className={`mx-auto flex w-full ${APP_SHELL_WIDTH} flex-col gap-6 px-4 pt-8 pb-12 sm:px-6`}
          >
            {children}
          </main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
