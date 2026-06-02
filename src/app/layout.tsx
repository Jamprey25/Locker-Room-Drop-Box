import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppSessionProvider } from "@/components/providers/app-session-provider";
import { ToastProvider } from "@/components/ui/toast";
import { Analytics } from "@vercel/analytics/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Locker Room Dropbox",
  description:
    "Shared YouTube vault and investing resources for your study group.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} relative min-h-dvh font-sans text-slate-100 antialiased`}
      >
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-20 bg-bg-base"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(ellipse_100%_65%_at_50%_-8%,rgb(14_165_233_/0.09),transparent_55%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(ellipse_70%_50%_at_100%_50%,rgb(99_102_241_/0.06),transparent)]"
        />

        <AppSessionProvider>
          <ToastProvider>{children}</ToastProvider>
        </AppSessionProvider>
      </body>
    </html>
  );
}
