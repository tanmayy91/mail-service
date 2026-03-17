import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MailDrop — Temporary Email Service",
  description:
    "Create disposable email addresses instantly. Protect your privacy with MailDrop.",
  keywords: ["temporary email", "disposable email", "temp mail"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: "#0d0d14", color: "#e2e8f0" }}
      >
        <Providers>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#13131f",
                border: "1px solid #1e1e2e",
                color: "#e2e8f0",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
