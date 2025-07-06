'use client'

import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { SwapInterface } from '@/components/swap/swap-interface'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function SwapPage() {
  const recentSwaps = [
    { from: 'SOL', to: 'USDC', amount: '5.2', value: '$520.40', time: '2 min ago' },
    { from: 'USDC', to: 'RAY', amount: '100', value: '$100.00', time: '15 min ago' },
    { from: 'RAY', to: 'SOL', amount: '50', value: '$75.50', time: '1 hour ago' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">Token Swap</h1>
              <p className="text-muted-foreground">
                Swap tokens instantly with the best rates across Solana DEXs
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <SwapInterface />
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Swaps</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recentSwaps.map((swap, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">
                            {swap.from} → {swap.to}
                          </Badge>
                          <div>
                            <p className="font-semibold">
                              {swap.amount} {swap.from}
                            </p>
                            <p className="text-sm text-muted-foreground">{swap.value}</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{swap.time}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Market Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>SOL/USDC</span>
                      <span className="font-semibold">$100.25</span>
                    </div>
                    <div className="flex justify-between">
                      <span>24h Volume</span>
                      <span className="font-semibold">$2.4M</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Network Fee</span>
                      <span className="font-semibold">0.00025 SOL</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
