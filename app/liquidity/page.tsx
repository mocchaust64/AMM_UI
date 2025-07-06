'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PoolCard } from '@/components/liquidity/pool-card'
import { CreatePoolDialog } from '@/components/liquidity/create-pool-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Plus } from 'lucide-react'

export default function LiquidityPage() {
  const [createPoolOpen, setCreatePoolOpen] = useState(false)

  const pools = [
    {
      name: 'SOL/USDC',
      tokens: [
        { symbol: 'SOL', icon: '/placeholder.svg?height=32&width=32' },
        { symbol: 'USDC', icon: '/placeholder.svg?height=32&width=32' },
      ],
      tvl: '$2.4M',
      apy: '12.5%',
      volume24h: '$450K',
      fees24h: '$1.2K',
      type: 'Standard' as const,
      isActive: true,
    },
    {
      name: 'RAY/SOL',
      tokens: [
        { symbol: 'RAY', icon: '/placeholder.svg?height=32&width=32' },
        { symbol: 'SOL', icon: '/placeholder.svg?height=32&width=32' },
      ],
      tvl: '$1.8M',
      apy: '18.3%',
      volume24h: '$320K',
      fees24h: '$890',
      type: 'Standard' as const,
      isActive: true,
    },
    {
      name: 'CUSTOM/SOL',
      tokens: [
        { symbol: 'CUSTOM', icon: '/placeholder.svg?height=32&width=32' },
        { symbol: 'SOL', icon: '/placeholder.svg?height=32&width=32' },
      ],
      tvl: '$850K',
      apy: '25.7%',
      volume24h: '$120K',
      fees24h: '$450',
      type: 'Custom' as const,
      isActive: true,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">Liquidity Pools</h1>
                <p className="text-muted-foreground">Provide liquidity to earn fees and rewards</p>
              </div>
              <Button className="gap-2" onClick={() => setCreatePoolOpen(true)}>
                <Plus className="h-4 w-4" />
                Create Pool
              </Button>
            </div>

            <Tabs defaultValue="all" className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="all">All Pools</TabsTrigger>
                  <TabsTrigger value="my-positions">My Positions</TabsTrigger>
                  <TabsTrigger value="standard">Standard</TabsTrigger>
                  <TabsTrigger value="custom">Custom</TabsTrigger>
                </TabsList>

                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search pools..." className="pl-10" />
                </div>
              </div>

              <TabsContent value="all" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pools.map((pool, index) => (
                    <PoolCard key={index} pool={pool} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="my-positions">
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No liquidity positions found</p>
                  <Button className="mt-4" onClick={() => setCreatePoolOpen(true)}>
                    Add Liquidity
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="standard">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pools
                    .filter(pool => pool.type === 'Standard')
                    .map((pool, index) => (
                      <PoolCard key={index} pool={pool} />
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="custom">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pools
                    .filter(pool => pool.type === 'Custom')
                    .map((pool, index) => (
                      <PoolCard key={index} pool={pool} />
                    ))}
                </div>
              </TabsContent>
            </Tabs>

            <CreatePoolDialog _open={createPoolOpen} onOpenChange={setCreatePoolOpen} />
          </main>
        </div>
      </div>
    </div>
  )
}
