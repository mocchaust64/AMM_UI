import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { FarmCard } from '@/components/farming/farm-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Zap } from 'lucide-react'

export default function FarmingPage() {
  const farms = [
    {
      name: 'SOL-USDC LP',
      tokens: [
        { symbol: 'SOL', icon: '/placeholder.svg?height=32&width=32' },
        { symbol: 'USDC', icon: '/placeholder.svg?height=32&width=32' },
      ],
      apy: '45.2%',
      tvl: '$1.2M',
      rewards: ['NATIVE', 'BONUS'],
      timeLeft: '45 days',
      userStaked: '$2,450.00',
      pendingRewards: '$125.50',
      isActive: true,
    },
    {
      name: 'RAY-SOL LP',
      tokens: [
        { symbol: 'RAY', icon: '/placeholder.svg?height=32&width=32' },
        { symbol: 'SOL', icon: '/placeholder.svg?height=32&width=32' },
      ],
      apy: '32.8%',
      tvl: '$850K',
      rewards: ['RAY'],
      timeLeft: '12 days',
      userStaked: '$1,200.00',
      pendingRewards: '$45.20',
      isActive: true,
    },
    {
      name: 'NATIVE Staking',
      tokens: [{ symbol: 'NATIVE', icon: '/placeholder.svg?height=32&width=32' }],
      apy: '28.5%',
      tvl: '$2.8M',
      rewards: ['NATIVE'],
      timeLeft: '90 days',
      userStaked: '$5,000.00',
      pendingRewards: '$285.75',
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
                <h1 className="text-2xl font-bold mb-2">Farming & Staking</h1>
                <p className="text-muted-foreground">Stake your LP tokens and earn rewards</p>
              </div>
              <Button className="gap-2">
                <Zap className="h-4 w-4" />
                Auto-Compound All
              </Button>
            </div>

            <Tabs defaultValue="active" className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="active">Active Farms</TabsTrigger>
                  <TabsTrigger value="my-farms">My Farms</TabsTrigger>
                  <TabsTrigger value="ended">Ended</TabsTrigger>
                </TabsList>

                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search farms..." className="pl-10" />
                </div>
              </div>

              <TabsContent value="active" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {farms.map((farm, index) => (
                    <FarmCard key={index} farm={farm} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="my-farms">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {farms
                    .filter(farm => Number.parseFloat(farm.userStaked.replace(/[$,]/g, '')) > 0)
                    .map((farm, index) => (
                      <FarmCard key={index} farm={farm} />
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="ended">
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No ended farms</p>
                </div>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  )
}
