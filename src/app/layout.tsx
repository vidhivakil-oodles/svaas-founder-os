import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { StateProvider } from "@/lib/state-provider";
import { ToastProvider } from "@/lib/toast-provider";
import { DailyLifecycleManager } from "@/lib/daily-lifecycle";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SVAAS",
  description: "Founder OS — Your Chief of Staff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[var(--svaas-ivory)] text-[var(--svaas-brown-dark)] min-h-screen`}>
        <ToastProvider>
          <StateProvider>
            <DailyLifecycleManager />
            <main className="max-w-2xl mx-auto px-5 py-6">
              {children}
            </main>
          </StateProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
