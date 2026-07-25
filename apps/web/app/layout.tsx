import type { Metadata } from "next";
import { Geist_Mono, Google_Sans_Flex } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/shared/site-header";
import "./globals.css";

// Font chính toàn hệ thống: Google Sans Flex (variable, có optical sizing).
const googleSans = Google_Sans_Flex({
  variable: "--font-google-sans",
  subsets: ["latin", "vietnamese"],
  axes: ["opsz"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${googleSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <SiteHeader />
          <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
