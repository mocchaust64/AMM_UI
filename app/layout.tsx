'use client'

import '@/styles/globals.css'
import { Inter } from 'next/font/google'
import type React from 'react'
import { ThemeProvider } from '@/lib/contexts/theme-context'
import { LanguageProvider } from '@/lib/contexts/language-context'
import { Toaster } from 'sonner'
import { SolanaProviders } from '@/lib/providers'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === '/') {
      router.push('/swap')
    }
  }, [pathname, router])

  return (
    <html lang="en">
      <head>
        <title>MoonDex - DeFi Dashboard</title>
        <meta name="description" content="Complete DeFi platform for Solana ecosystem" />
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <LanguageProvider>
            <SolanaProviders>
              {children}
              <Toaster />
            </SolanaProviders>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
