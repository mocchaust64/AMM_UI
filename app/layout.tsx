import "@/styles/globals.css"
import { Inter } from "next/font/google"
import type React from "react"
import { ThemeProvider } from "@/lib/contexts/theme-context"
import { LanguageProvider } from "@/lib/contexts/language-context"
import { WalletProvider } from "@/lib/contexts/wallet-context"
import { SettingsProvider } from "@/lib/contexts/settings-context"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "SolanaFi - DeFi Dashboard",
  description: "Complete DeFi platform for Solana ecosystem",
    generator: 'v0.dev'
}

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
            <WalletProvider>
              <SettingsProvider>
                {children}
                <Toaster />
              </SettingsProvider>
            </WalletProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
