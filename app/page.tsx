import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { MetricsCard } from '@/components/metrics-card'
import { StatsChart } from '@/components/stats-chart'
import { VaultTable } from '@/components/vault-table'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">Dashboard Overview</h1>
              <p className="text-muted-foreground">
                Welcome to your DeFi dashboard. Monitor your positions and explore opportunities.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <MetricsCard
                title="Total Portfolio Value"
                value="$74,892"
                change={{ value: '$1,340', percentage: '+1.8%', isPositive: true }}
              />
              <MetricsCard
                title="Active Positions"
                value="12"
                change={{ value: '2', percentage: '+20%', isPositive: true }}
              />
              <MetricsCard
                title="Total Rewards Earned"
                value="$2,450"
                change={{ value: '$125', percentage: '+5.4%', isPositive: true }}
              />
            </div>

            <Card className="p-6 mb-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Portfolio Performance</h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost">
                    1D
                  </Button>
                  <Button size="sm" variant="ghost">
                    7D
                  </Button>
                  <Button size="sm" variant="ghost">
                    1M
                  </Button>
                  <Button size="sm" variant="default">
                    3M
                  </Button>
                  <Button size="sm" variant="ghost">
                    1Y
                  </Button>
                </div>
              </div>
              <StatsChart />
            </Card>

            <div>
              <h2 className="text-lg font-semibold mb-4">Your Positions</h2>
              <VaultTable />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
