import "@/styles/globals.css";
import { Inter } from "next/font/google";
import type React from "react";
import { ThemeProvider } from "@/lib/contexts/theme-context";
import { LanguageProvider } from "@/lib/contexts/language-context";
import { SettingsProvider } from "@/lib/contexts/settings-context";
import { Toaster } from "sonner";
import { SolanaProviders } from "@/lib/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "MoonDex - DeFi Dashboard",
  description: "Complete DeFi platform for Solana ecosystem",
    generator: 'v0.dev'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <LanguageProvider>
            <SolanaProviders>
              <SettingsProvider>
                {children}
                <Toaster />
              </SettingsProvider>
            </SolanaProviders>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
