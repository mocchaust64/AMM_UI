import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function TradingPage() {
  const orderBook = {
    bids: [
      { price: 99.95, amount: 1.5, total: 149.93 },
      { price: 99.9, amount: 2.3, total: 229.77 },
      { price: 99.85, amount: 0.8, total: 79.88 },
    ],
    asks: [
      { price: 100.05, amount: 1.2, total: 120.06 },
      { price: 100.1, amount: 1.8, total: 180.18 },
      { price: 100.15, amount: 2.1, total: 210.32 },
    ],
  }

  const recentTrades = [
    { price: 100.02, amount: 0.5, time: "14:32:15", type: "buy" },
    { price: 99.98, amount: 1.2, time: "14:32:10", type: "sell" },
    { price: 100.01, amount: 0.8, time: "14:32:05", type: "buy" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">Advanced Trading</h1>
              <p className="text-muted-foreground">Professional trading interface with orderbook and charts</p>
            </div>

            <div className="grid lg:grid-cols-4 gap-6">
              {/* Trading Chart */}
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                      <CardTitle>SOL/USDC</CardTitle>
                      <Badge variant="secondary">$100.25</Badge>
                      <Badge variant="default" className="text-green-500">
                        +2.5%
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost">
                        1m
                      </Button>
                      <Button size="sm" variant="ghost">
                        5m
                      </Button>
                      <Button size="sm" variant="default">
                        15m
                      </Button>
                      <Button size="sm" variant="ghost">
                        1h
                      </Button>
                      <Button size="sm" variant="ghost">
                        4h
                      </Button>
                      <Button size="sm" variant="ghost">
                        1d
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96 flex items-center justify-center bg-muted/20 rounded-lg">
                      <p className="text-muted-foreground">TradingView Chart Integration</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Order Form */}
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-green-500">Buy SOL</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Tabs defaultValue="limit">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="limit">Limit</TabsTrigger>
                          <TabsTrigger value="market">Market</TabsTrigger>
                        </TabsList>
                        <TabsContent value="limit" className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Price (USDC)</label>
                            <Input placeholder="100.25" />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Amount (SOL)</label>
                            <Input placeholder="0.0" />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Total (USDC)</label>
                            <Input placeholder="0.0" readOnly />
                          </div>
                          <Button className="w-full bg-green-600 hover:bg-green-700">Buy SOL</Button>
                        </TabsContent>
                        <TabsContent value="market" className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Amount (SOL)</label>
                            <Input placeholder="0.0" />
                          </div>
                          <Button className="w-full bg-green-600 hover:bg-green-700">Buy SOL (Market)</Button>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-500">Sell SOL</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Tabs defaultValue="limit">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="limit">Limit</TabsTrigger>
                          <TabsTrigger value="market">Market</TabsTrigger>
                        </TabsList>
                        <TabsContent value="limit" className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Price (USDC)</label>
                            <Input placeholder="100.25" />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Amount (SOL)</label>
                            <Input placeholder="0.0" />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Total (USDC)</label>
                            <Input placeholder="0.0" readOnly />
                          </div>
                          <Button className="w-full bg-red-600 hover:bg-red-700">Sell SOL</Button>
                        </TabsContent>
                        <TabsContent value="market" className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Amount (SOL)</label>
                            <Input placeholder="0.0" />
                          </div>
                          <Button className="w-full bg-red-600 hover:bg-red-700">Sell SOL (Market)</Button>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Order Book */}
                <Card>
                  <CardHeader>
                    <CardTitle>Order Book</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-red-500 mb-2">Asks</h4>
                        <div className="space-y-1">
                          {orderBook.asks.map((ask, index) => (
                            <div key={index} className="flex justify-between text-xs">
                              <span className="text-red-500">{ask.price}</span>
                              <span>{ask.amount}</span>
                              <span className="text-muted-foreground">{ask.total}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="text-center py-2 border-y">
                        <span className="text-lg font-bold">100.02</span>
                        <span className="text-sm text-green-500 ml-2">+0.02</span>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-green-500 mb-2">Bids</h4>
                        <div className="space-y-1">
                          {orderBook.bids.map((bid, index) => (
                            <div key={index} className="flex justify-between text-xs">
                              <span className="text-green-500">{bid.price}</span>
                              <span>{bid.amount}</span>
                              <span className="text-muted-foreground">{bid.total}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Trades */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Trades</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {recentTrades.map((trade, index) => (
                        <div key={index} className="flex justify-between text-xs">
                          <span className={trade.type === "buy" ? "text-green-500" : "text-red-500"}>
                            {trade.price}
                          </span>
                          <span>{trade.amount}</span>
                          <span className="text-muted-foreground">{trade.time}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Market Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>24h Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Volume</span>
                      <span className="font-semibold">$2.4M</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">High</span>
                      <span className="font-semibold">$102.50</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Low</span>
                      <span className="font-semibold">$98.20</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Change</span>
                      <span className="font-semibold text-green-500">+2.5%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Open Orders */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Open Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pair</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Filled</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No open orders
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  )
}
