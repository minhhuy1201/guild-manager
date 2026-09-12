import type { Metadata } from "next";
import { Be_Vietnam_Pro, Noto_Serif } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/shared/site-header";
import "./globals.css";

// App-wide font: Be Vietnam Pro (sans-serif, full Vietnamese coverage).
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// Heading font: page titles and the guild name only. Two weights, because nothing else uses it.
const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mèo Mập Giang Hồ",
  description: "Điểm danh bang hội — Mèo Mập Giang Hồ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${notoSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <SiteHeader />
          <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 pt-8 pb-12 sm:px-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
