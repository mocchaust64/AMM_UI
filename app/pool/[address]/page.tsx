'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, ArrowLeft, ExternalLink, Copy, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useAnchorProvider } from '@/hooks/useAnchorProvider'
import { TokenService } from '@/lib/service/tokenService'
import { TokenIconDisplay } from '@/components/TokenExtension/TokenInfoDisplay'

interface PoolDetail {
  poolAddress: string
  token0: {
    symbol: string
    name: string
    mint: string
    decimals: number
    balance: number
    icon: string
  }
  token1: {
    symbol: string
    name: string
    mint: string
    decimals: number
    balance: number
    icon: string
  }
  tvl: string
  apy: string
  volume24h: string
  fees24h: string
  lpSupply: number
  status: string
  ammConfigAddress: string
  createdAt: string
  lastUpdated?: number // Timestamp lần cập nhật cuối
}

// Thời gian cache hết hạn (30 phút = 30 * 60 * 1000 ms)
const CACHE_EXPIRATION = 30 * 60 * 1000

export default function PoolDetailPage() {
  const params = useParams()
  const { connection } = useConnection()
  const [pool, setPool] = useState<PoolDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const poolAddress = params.address as string
  const { program } = useAnchorProvider()

  // Copy text to clipboard with visual feedback
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(type)
    setTimeout(() => setCopiedText(null), 2000)
  }

  // Lấy dữ liệu pool từ localStorage
  const getPoolFromCache = (address: string): PoolDetail | null => {
    try {
      const cacheKey = `pool_${address}`
      const cachedData = localStorage.getItem(cacheKey)

      if (!cachedData) return null

      const poolData = JSON.parse(cachedData) as PoolDetail

      // Kiểm tra cache có hết hạn chưa
      if (poolData.lastUpdated && Date.now() - poolData.lastUpdated < CACHE_EXPIRATION) {
        return poolData
      }

      return null
    } catch (error) {
      console.error('Lỗi khi đọc cache:', error)
      return null
    }
  }

  // Lưu dữ liệu pool vào localStorage
  const savePoolToCache = (poolData: PoolDetail) => {
    try {
      const cacheKey = `pool_${poolData.poolAddress}`
      // Thêm timestamp lưu cache
      const dataToCache = {
        ...poolData,
        lastUpdated: Date.now(),
      }
      localStorage.setItem(cacheKey, JSON.stringify(dataToCache))
    } catch (error) {
      console.error('Lỗi khi lưu cache:', error)
    }
  }

  // Hàm fetch dữ liệu pool từ blockchain
  const fetchPoolFromChain = async (forceRefresh = false) => {
    if (!poolAddress) {
      setError('Invalid pool address')
      setLoading(false)
      return
    }

    if (!program) {
      setError('Vui lòng kết nối ví để xem thông tin pool.')
      setLoading(false)
      return
    }

    try {
      if (forceRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      // Lấy thông tin về pool
      try {
        const poolState = await program.account.poolState.fetch(new PublicKey(poolAddress))

        // Lấy thông tin token account balances
        const token0VaultBalance = await connection.getTokenAccountBalance(poolState.token0Vault)

        const token1VaultBalance = await connection.getTokenAccountBalance(poolState.token1Vault)

        // Lấy thông tin token từ TokenService
        const token0Mint = poolState.token0Mint.toString()
        const token1Mint = poolState.token1Mint.toString()

        // Sử dụng hàm mới getTokenIconAndName để lấy thông tin đầy đủ
        const token0Info = await TokenService.getTokenIconAndName(token0Mint, connection)
        const token1Info = await TokenService.getTokenIconAndName(token1Mint, connection)

        // Tạo pool detail với thông tin token thật
        const poolDetail: PoolDetail = {
          poolAddress,
          token0: {
            symbol: token0Info.symbol,
            name: token0Info.name,
            mint: token0Mint,
            decimals: poolState.mint0Decimals,
            balance: token0VaultBalance?.value?.uiAmount || 0,
            icon: token0Info.icon,
          },
          token1: {
            symbol: token1Info.symbol,
            name: token1Info.name,
            mint: token1Mint,
            decimals: poolState.mint1Decimals,
            balance: token1VaultBalance?.value?.uiAmount || 0,
            icon: token1Info.icon,
          },
          tvl:
            '$' +
            (
              (token0VaultBalance?.value?.uiAmount || 0) +
              (token1VaultBalance?.value?.uiAmount || 0)
            ).toLocaleString(),
          apy: '12.5%',
          volume24h: '$450K',
          fees24h: '$1.2K',
          lpSupply: poolState.lpSupply.toNumber(),
          status: poolState.status === 0 ? 'Active' : 'Inactive',
          ammConfigAddress: poolState.ammConfig.toString(),
          createdAt: new Date().toLocaleDateString(), // Thực tế nên lấy từ dữ liệu on-chain
          lastUpdated: Date.now(), // Thêm timestamp
        }

        setPool(poolDetail)
        savePoolToCache(poolDetail) // Lưu vào cache
      } catch (e) {
        console.error('Error fetching pool:', e)
        setError('Không thể tải thông tin pool. Pool có thể không tồn tại hoặc đã bị xóa.')
      }
    } catch (e) {
      console.error('Error in fetchPoolDetails:', e)
      setError('Đã xảy ra lỗi khi tải thông tin chi tiết về pool')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Hàm refresh dữ liệu
  const handleRefresh = () => {
    fetchPoolFromChain(true)
  }

  useEffect(() => {
    async function fetchPoolDetails() {
      if (!poolAddress) {
        setError('Invalid pool address')
        setLoading(false)
        return
      }

      // Kiểm tra cache trước
      const cachedPool = getPoolFromCache(poolAddress)
      if (cachedPool) {
        setPool(cachedPool)
        setLoading(false)
        return
      }

      // Nếu không có cache, fetch từ blockchain
      await fetchPoolFromChain()
    }

    fetchPoolDetails()
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            {/* Back button and Refresh button */}
            <div className="mb-4 flex items-center justify-between">
              <Link
                href="/liquidity"
                className="flex items-center text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Liquidity Pools
              </Link>

              {!loading && pool && (
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                  {refreshing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Refresh Data
                    </>
                  )}
                </Button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <p>Loading pool details...</p>
              </div>
            ) : error ? (
              <Card className="p-6">
                <div className="text-center py-8">
                  <p className="text-lg font-medium text-red-500 mb-4">{error}</p>
                  <div className="flex items-center justify-center gap-4">
                    <Link href="/liquidity">
                      <Button>Return to Liquidity Pools</Button>
                    </Link>
                    <Button variant="outline" onClick={handleRefresh}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </div>
              </Card>
            ) : pool ? (
              <div className="space-y-6">
                {/* Pool header */}
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div>
                      <div className="flex items-center mb-2">
                        <div className="flex -space-x-2 mr-3">
                          <div className="h-10 w-10 border-2 border-background rounded-full overflow-hidden z-20">
                            <TokenIconDisplay
                              token={{
                                symbol: pool.token0.symbol,
                                icon: pool.token0.icon,
                                name: pool.token0.name,
                              }}
                            />
                          </div>
                          <div className="h-10 w-10 border-2 border-background rounded-full overflow-hidden z-10">
                            <TokenIconDisplay
                              token={{
                                symbol: pool.token1.symbol,
                                icon: pool.token1.icon,
                                name: pool.token1.name,
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <CardTitle className="text-2xl">
                            {pool.token0.symbol}/{pool.token1.symbol} Pool
                          </CardTitle>
                          <div className="flex items-center text-sm text-muted-foreground mt-1">
                            <span className="mr-2">Pool Address:</span>
                            <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                              {pool.poolAddress.slice(0, 8)}...{pool.poolAddress.slice(-8)}
                            </code>
                            <button
                              className="ml-1 p-1 rounded-full hover:bg-muted"
                              onClick={() => copyToClipboard(pool.poolAddress, 'address')}
                            >
                              {copiedText === 'address' ? (
                                <Badge variant="outline" className="text-xs">
                                  Copied!
                                </Badge>
                              ) : (
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              )}
                            </button>
                            <Link
                              href={`https://explorer.solana.com/address/${pool.poolAddress}?cluster=devnet`}
                              target="_blank"
                              className="ml-2 p-1 rounded-full hover:bg-muted"
                            >
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </Link>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge
                          variant="outline"
                          className={pool.status === 'Active' ? 'text-green-500' : 'text-red-500'}
                        >
                          {pool.status}
                        </Badge>
                        <Badge variant="secondary">Devnet</Badge>
                        {pool.lastUpdated && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Cập nhật: {new Date(pool.lastUpdated).toLocaleString()}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button>Add Liquidity</Button>
                      <Button variant="outline">Remove Liquidity</Button>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">TVL</p>
                        <p className="text-2xl font-bold">{pool.tvl}</p>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">APY</p>
                        <p className="text-2xl font-bold text-green-500">{pool.apy}</p>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">24h Volume</p>
                        <p className="text-2xl font-bold">{pool.volume24h}</p>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">24h Fees</p>
                        <p className="text-2xl font-bold">{pool.fees24h}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pool details tabs */}
                <Tabs defaultValue="overview" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="assets">Assets</TabsTrigger>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Pool Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">LP Supply:</span>
                              <span>{pool.lpSupply.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">AMM Config:</span>
                              <div className="flex items-center">
                                <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                                  {pool.ammConfigAddress.slice(0, 6)}...
                                  {pool.ammConfigAddress.slice(-6)}
                                </code>
                                <button
                                  className="ml-1 p-1 rounded-full hover:bg-muted"
                                  onClick={() => copyToClipboard(pool.ammConfigAddress, 'config')}
                                >
                                  {copiedText === 'config' ? (
                                    <Badge variant="outline" className="text-xs">
                                      Copied!
                                    </Badge>
                                  ) : (
                                    <Copy className="h-3 w-3 text-muted-foreground" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Created:</span>
                              <span>{pool.createdAt}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Fee Tier:</span>
                              <span>0.25%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Protocol Fee:</span>
                              <span>0.05%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Status:</span>
                              <span
                                className={
                                  pool.status === 'Active' ? 'text-green-500' : 'text-red-500'
                                }
                              >
                                {pool.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="assets" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Pool Assets</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Token 0 */}
                          <div className="flex items-center justify-between p-4 rounded-lg border">
                            <TokenIconDisplay
                              token={{
                                symbol: pool.token0.symbol,
                                icon: pool.token0.icon,
                                name: pool.token0.name,
                              }}
                            />
                            <div className="text-right">
                              <p className="font-bold">{pool.token0.balance.toLocaleString()}</p>
                              <div className="flex items-center text-xs text-muted-foreground">
                                <span className="mr-1">Mint:</span>
                                <code className="bg-muted px-1 py-0.5 rounded font-mono">
                                  {pool.token0.mint.slice(0, 4)}...{pool.token0.mint.slice(-4)}
                                </code>
                              </div>
                            </div>
                          </div>

                          {/* Token 1 */}
                          <div className="flex items-center justify-between p-4 rounded-lg border">
                            <TokenIconDisplay
                              token={{
                                symbol: pool.token1.symbol,
                                icon: pool.token1.icon,
                                name: pool.token1.name,
                              }}
                            />
                            <div className="text-right">
                              <p className="font-bold">{pool.token1.balance.toLocaleString()}</p>
                              <div className="flex items-center text-xs text-muted-foreground">
                                <span className="mr-1">Mint:</span>
                                <code className="bg-muted px-1 py-0.5 rounded font-mono">
                                  {pool.token1.mint.slice(0, 4)}...{pool.token1.mint.slice(-4)}
                                </code>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="transactions" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-10 text-muted-foreground">
                          <p>Transaction history will be available soon</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  )
}
