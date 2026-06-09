import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Musarty — MCP/UCP AI Bubble for Shopify | 104% Conversion",
  description: "The world's first MCP-native floating AI bubble for Shopify stores. ChatGPT, Gemini, Claude — all in one chrome-gold interface. Real carts. Real checkouts. Real revenue.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0a0f] text-white min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
