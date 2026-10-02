import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GlobalSidebar } from "@/components/GlobalSidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Legal Contract Analyzer",
  description: "Enterprise document intelligence workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className={`${inter.className} h-full flex bg-[#09090b] text-zinc-300 overflow-hidden`}>
        <GlobalSidebar />

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col h-full bg-[#09090b] relative overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
