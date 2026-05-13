import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { Header } from "@/components/Header";
import { FaturaFiLogo } from "@/components/FaturaFiLogo";

export const metadata: Metadata = {
  title: "FaturaFi — AI-powered invoice finance on Solana",
  description:
    "Turkish SMEs tokenize their unpaid invoices and access global Solana liquidity. Risk-scored by AI, settled on Solana.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased bg-cream-50 text-bark-800">
        <WalletContextProvider>
          {/* Background layers — soft, warm, fixed */}
          <div className="fixed inset-0 -z-10 bg-cream-50" />
          <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
            <div className="glow-terra w-[600px] h-[600px] -top-40 -left-40 animate-glow-pulse" />
            <div className="glow-mint w-[500px] h-[500px] top-1/3 -right-20 animate-glow-pulse" style={{ animationDelay: "2s" }} />
          </div>

          <Header />

          <main className="pt-16 min-h-screen relative">{children}</main>

          <footer className="border-t border-bark-800/10 mt-32 py-10 relative bg-cream-100/50">
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-center md:justify-start gap-3 text-sm text-bark-500">
              <FaturaFiLogo size={24} />
              <span className="font-medium text-bark-700">FaturaFi</span>
              <span className="text-bark-400">·</span>
              <span className="italic">Paid before payday.</span>
            </div>
          </footer>
        </WalletContextProvider>
      </body>
    </html>
  );
}
