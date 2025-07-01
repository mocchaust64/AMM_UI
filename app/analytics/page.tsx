import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricsCard } from "@/components/metrics-card"
import { StatsChart } from "@/components/stats-chart"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TrendingUp, TrendingDown } from "lucide-react"

export default function AnalyticsPage() {
  const topTokens = [
    {
      name: "Solana",
      symbol: "SOL",
      price: "$100.25",
      change: "+5.2%",
      volume: "$45M",
      marketCap: "$42B",
      isPositive: true,
    },
    {
      name: "Raydium",
      symbol: "RAY",
      price: "$1.85",
      change: "+12.8%",
      volume: "$8.2M",
      marketCap: "$185M",
      isPositive: true,
    },
    {
      name: "Serum",
      symbol: "SRM",
      price: "$0.45",
      change: "-2.1%",
      volume: "$2.1M",
      marketCap: "$45M",
      isPositive: false,
    },
  ]

  const topPools = [
    { pair: "SOL/USDC", tvl: "$12.5M", volume24h: "$2.4M", fees24h: "$7.2K", apy: "12.5%" },
    { pair: "RAY/SOL", tvl: "$8.2M", volume24h: "$1.8M", fees24h: "$5.4K", apy: "18.3%" },
    { pair: "SRM/USDC", tvl: "$3.1M", volume24h: "$650K", fees24h: "$1.95K", apy: "8.7%" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">Analytics</h1>
              <p className="text-muted-foreground">Comprehensive DeFi analytics and market insights</p>
            </div>

            {/* Overview Metrics */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <MetricsCard
                title="Total Value Locked"
                value="$125.4M"
                change={{ value: "$8.2M", percentage: "+7.0%", isPositive: true }}
              />
              <MetricsCard
                title="24h Volume"
                value="$45.2M"
                change={{ value: "$5.1M", percentage: "+12.7%", isPositive: true }}
              />
              <MetricsCard
                title="Total Fees"
                value="$125.8K"
                change={{ value: "$12.5K", percentage: "+11.0%", isPositive: true }}
              />
              <MetricsCard
                title="Active Users"
                value="12,450"
                change={{ value: "1,250", percentage: "+11.2%", isPositive: true }}
              />
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="tokens">Tokens</TabsTrigger>
                <TabsTrigger value="pools">Pools</TabsTrigger>
                <TabsTrigger value="volume">Volume</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>TVL Trend</CardTitle>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost">
                          7D
                        </Button>
                        <Button size="sm" variant="default">
                          30D
                        </Button>
                        <Button size="sm" variant="ghost">
                          90D
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <StatsChart />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Volume Trend</CardTitle>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost">
                          7D
                        </Button>
                        <Button size="sm" variant="default">
                          30D
                        </Button>
                        <Button size="sm" variant="ghost">
                          90D
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <StatsChart />
                    </CardContent>
                  </Card>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Tokens by Volume</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {topTokens.map((token, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src="/placeholder.svg?height=32&width=32" />
                                <AvatarFallback>{token.symbol}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{token.name}</p>
                                <p className="text-sm text-muted-foreground">{token.symbol}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{token.price}</p>
                              <div className="flex items-center gap-1">
                                {token.isPositive ? (
                                  <TrendingUp className="h-3 w-3 text-green-500" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 text-red-500" />
                                )}
                                <span className={`text-sm ${token.isPositive ? "text-green-500" : "text-red-500"}`}>
                                  {token.change}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top Pools by TVL</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {topPools.map((pool, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{pool.pair}</p>
                              <p className="text-sm text-muted-foreground">TVL: {pool.tvl}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant="secondary">{pool.apy} APY</Badge>
                              <p className="text-sm text-muted-foreground mt-1">{pool.volume24h} 24h</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="tokens">
                <Card>
                  <CardHeader>
                    <CardTitle>Token Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Token</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>24h Change</TableHead>
                          <TableHead>Volume</TableHead>
                          <TableHead>Market Cap</TableHead>
                          <TableHead>TVL</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topTokens.map((token, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src="/placeholder.svg?height=24&width=24" />
                                  <AvatarFallback>{token.symbol}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{token.name}</div>
                                  <div className="text-xs text-muted-foreground">{token.symbol}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">{token.price}</TableCell>
                            <TableCell>
                              <Badge variant={token.isPositive ? "default" : "destructive"}>{token.change}</Badge>
                            </TableCell>
                            <TableCell>{token.volume}</TableCell>
                            <TableCell>{token.marketCap}</TableCell>
                            <TableCell>$8.2M</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pools">
                <Card>
                  <CardHeader>
                    <CardTitle>Pool Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pool</TableHead>
                          <TableHead>TVL</TableHead>
                          <TableHead>24h Volume</TableHead>
                          <TableHead>24h Fees</TableHead>
                          <TableHead>APY</TableHead>
                          <TableHead>Utilization</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topPools.map((pool, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{pool.pair}</TableCell>
                            <TableCell>{pool.tvl}</TableCell>
                            <TableCell>{pool.volume24h}</TableCell>
                            <TableCell>{pool.fees24h}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{pool.apy}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-muted rounded-full">
                                  <div className="w-3/4 h-full bg-primary rounded-full" />
                                </div>
                                <span className="text-sm">75%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="volume">
                <Card>
                  <CardHeader>
                    <CardTitle>Volume Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96">
                      <StatsChart />
                    </div>
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
