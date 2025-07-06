import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Plus, AlertTriangle, CheckCircle } from 'lucide-react'

export default function TokensPage() {
  const tokens = [
    {
      name: 'Solana',
      symbol: 'SOL',
      address: 'So11111111111111111111111111111111111111112',
      type: 'Native',
      extensions: [],
      verified: true,
      supply: '400M',
      holders: '1.2M',
      price: '$100.25',
    },
    {
      name: 'USD Coin',
      symbol: 'USDC',
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      type: 'SPL Token',
      extensions: ['Transfer Hook', 'Metadata'],
      verified: true,
      supply: '2.1B',
      holders: '850K',
      price: '$1.00',
    },
    {
      name: 'Raydium',
      symbol: 'RAY',
      address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
      type: 'SPL Token',
      extensions: ['Permanent Delegate'],
      verified: true,
      supply: '555M',
      holders: '125K',
      price: '$1.85',
    },
    {
      name: 'Custom Token',
      symbol: 'CUSTOM',
      address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      type: 'SPL Token',
      extensions: ['Transfer Hook', 'Metadata', 'Whitelist'],
      verified: false,
      supply: '1M',
      holders: '2.5K',
      price: '$0.45',
    },
  ]

  const whitelistedTokens = tokens.filter(token => token.verified)
  const customTokens = tokens.filter(token => !token.verified)

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">Token Explorer</h1>
                <p className="text-muted-foreground">
                  Explore and manage SPL tokens with extensions
                </p>
              </div>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Custom Token
              </Button>
            </div>

            <Tabs defaultValue="all" className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="all">All Tokens</TabsTrigger>
                  <TabsTrigger value="verified">Verified</TabsTrigger>
                  <TabsTrigger value="custom">Custom</TabsTrigger>
                  <TabsTrigger value="extensions">With Extensions</TabsTrigger>
                </TabsList>

                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search tokens..." className="pl-10" />
                </div>
              </div>

              <TabsContent value="all">
                <Card>
                  <CardHeader>
                    <CardTitle>All Tokens</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Token</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Extensions</TableHead>
                          <TableHead>Supply</TableHead>
                          <TableHead>Holders</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tokens.map((token, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                                  <AvatarFallback>{token.symbol}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{token.name}</div>
                                  <div className="text-xs text-muted-foreground font-mono">
                                    {token.address.slice(0, 8)}...{token.address.slice(-8)}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{token.type}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {token.extensions.length > 0 ? (
                                  token.extensions.map((ext, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {ext}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground text-sm">None</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{token.supply}</TableCell>
                            <TableCell>{token.holders}</TableCell>
                            <TableCell className="font-semibold">{token.price}</TableCell>
                            <TableCell>
                              {token.verified ? (
                                <Badge className="gap-1 bg-green-500/10 text-green-500">
                                  <CheckCircle className="h-3 w-3" />
                                  Verified
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Unverified
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline">
                                  View
                                </Button>
                                <Button size="sm" variant="outline">
                                  Add to Wallet
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="verified">
                <Card>
                  <CardHeader>
                    <CardTitle>Verified Tokens</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {whitelistedTokens.map((token, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src="/placeholder.svg?height=40&width=40" />
                                <AvatarFallback>{token.symbol}</AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold">{token.name}</h3>
                                <p className="text-sm text-muted-foreground">{token.symbol}</p>
                              </div>
                              <Badge className="ml-auto bg-green-500/10 text-green-500">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Type</span>
                              <Badge variant="outline">{token.type}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Supply</span>
                              <span>{token.supply}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm mb-3">
                              <span className="text-muted-foreground">Price</span>
                              <span className="font-semibold">{token.price}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="w-full">
                                View Details
                              </Button>
                              <Button size="sm" className="w-full">
                                Add to Wallet
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="custom">
                <Card>
                  <CardHeader>
                    <CardTitle>Custom Tokens</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {customTokens.map((token, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src="/placeholder.svg?height=40&width=40" />
                                <AvatarFallback>{token.symbol}</AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold">{token.name}</h3>
                                <p className="text-sm text-muted-foreground">{token.symbol}</p>
                              </div>
                              <Badge variant="secondary" className="ml-auto gap-1">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Unverified
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Type</span>
                              <Badge variant="outline">{token.type}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Extensions</span>
                              <div className="flex flex-wrap gap-1 justify-end">
                                {token.extensions.map((ext, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {ext}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm mb-3">
                              <span className="text-muted-foreground">Price</span>
                              <span className="font-semibold">{token.price}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="w-full">
                                View Details
                              </Button>
                              <Button size="sm" variant="destructive" className="w-full">
                                Remove
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="extensions">
                <Card>
                  <CardHeader>
                    <CardTitle>Tokens with Extensions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Token</TableHead>
                          <TableHead>Extensions</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tokens
                          .filter(token => token.extensions.length > 0)
                          .map((token, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src="/placeholder.svg?height=32&width=32" />
                                    <AvatarFallback>{token.symbol}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium">{token.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {token.symbol}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {token.extensions.map((ext, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {ext}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{token.type}</Badge>
                              </TableCell>
                              <TableCell>
                                {token.verified ? (
                                  <Badge className="gap-1 bg-green-500/10 text-green-500">
                                    <CheckCircle className="h-3 w-3" />
                                    Verified
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Unverified
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button size="sm" variant="outline">
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
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
