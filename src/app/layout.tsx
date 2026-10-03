import type { Metadata } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import "./globals.css";
import { GlobalSidebar } from "@/components/GlobalSidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-dm-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Legal Analyzer — Document Intelligence",
  description:
    "Upload, analyze, compare, and investigate your legal documents with accurate and reliable AI insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerifDisplay.variable}`} style={{ height: "100%" }}>
      <body
        style={{
          height: "100%",
          display: "flex",
          margin: 0,
          padding: 0,
          /* Body background = sidebar dark, so the curve gap shows correctly */
          background: "#0D0D0D",
          overflowX: "hidden",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        }}
      >
        <GlobalSidebar />

        {/* MAIN CONTENT AREA — rounded left edge curves against the dark sidebar */}
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            background: "#F8F6F2",
            borderRadius: "28px 0 0 28px",
            // Strictly clip the rounded corner so scroll content doesn't bleed over it
            overflow: "hidden", 
            minWidth: 0,
            position: "relative",
          }}
        >
          {/* Scrollable inner container */}
          <div 
            className="custom-scrollbar"
            style={{ 
              height: "100%", 
              overflowY: "auto", 
              overflowX: "hidden",
              display: "flex",
              flexDirection: "column"
            }} 
          >
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
