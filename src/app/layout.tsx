import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { StateProvider } from "@/lib/state-provider";
import { ToastProvider } from "@/lib/toast-provider";
import { DailyLifecycleManager } from "@/lib/daily-lifecycle";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const lora = Lora({ subsets: ["latin"], variable: "--font-serif" });

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
      <body className={`${inter.variable} ${lora.variable} font-[family-name:var(--font-sans)] bg-[var(--svaas-ivory)] text-[var(--svaas-brown-dark)] min-h-screen`}>
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
