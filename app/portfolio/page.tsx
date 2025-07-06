import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { PortfolioOverview } from "@/components/portfolio/portfolio-overview"
import { WalletTokens } from "@/components/portfolio/wallet-tokens"
import { VaultTable } from "@/components/vault-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">Portfolio</h1>
              <p className="text-muted-foreground">Track your DeFi positions and performance</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-1">
                <PortfolioOverview />
              </div>
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Chart</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      Portfolio performance chart will be displayed here
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Tabs defaultValue="positions" className="space-y-6">
              <TabsList>
                <TabsTrigger value="positions">All Positions</TabsTrigger>
                <TabsTrigger value="tokens">Tokens</TabsTrigger>
                <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
                <TabsTrigger value="farming">Farming</TabsTrigger>
              </TabsList>

              <TabsContent value="positions">
                <VaultTable />
              </TabsContent>

              <TabsContent value="tokens">
                <WalletTokens />
              </TabsContent>

              <TabsContent value="liquidity">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground text-center">Liquidity positions will be displayed here</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="farming">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground text-center">Farming positions will be displayed here</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  )
}
