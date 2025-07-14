'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { SwapInterface } from '@/components/swap/swap-interface'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TokenInfoDisplay } from '@/components/TokenExtension/TokenInfoDisplay'
import { useWalletTokens } from '@/hooks/useWalletTokens'
import { GithubPoolService } from '@/lib/service/githubPoolService'

// Sửa định nghĩa kiểu dữ liệu cho pool để phù hợp với GithubPoolInfo
interface Pool {
  poolAddress: string
  token0?: {
    mint?: string
    symbol?: string
    name?: string
    decimals?: number
    icon?: string
    isToken2022?: boolean
    hasTransferHook?: boolean
  }
  token1?: {
    mint?: string
    symbol?: string
    name?: string
    decimals?: number
    icon?: string
    isToken2022?: boolean
    hasTransferHook?: boolean
  }
  network?: string
  githubUrl?: string
  createdAt?: string
  lastUpdated?: string
}

export default function SwapPage() {
  const { tokens } = useWalletTokens()
  const [fromToken, setFromToken] = useState<string>('')
  const [toToken, setToToken] = useState<string>('')
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  // State cho pool được chọn từ GitHub
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null)
  const [loadingDefaultPool, setLoadingDefaultPool] = useState<boolean>(true)

  // Lấy thời gian cập nhật token cuối cùng từ localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        // Lấy khóa cache của người dùng hiện tại (nếu có)
        const cacheKeys = Object.keys(localStorage)
        const tokenCacheKey = cacheKeys.find(key => key.startsWith('wallet_tokens_cache_'))

        if (tokenCacheKey) {
          const cacheData = JSON.parse(localStorage.getItem(tokenCacheKey) || '{}')
          if (cacheData.timestamp) {
            setLastUpdated(cacheData.timestamp)
          }
        }
      }
    } catch (error) {
      console.error('Error reading token cache timestamp:', error)
    }
  }, [tokens])

  // Tải pool mặc định từ GitHub khi component được mount
  useEffect(() => {
    const loadDefaultPool = async () => {
      setLoadingDefaultPool(true)
      try {
        const pools = await GithubPoolService.getAllPools()
        if (pools && pools.length > 0) {
          const firstPool = pools[0]
          setSelectedPool(firstPool)

          // Đặt token mints từ pool đầu tiên
          if (firstPool.token0?.mint) {
            setFromToken(firstPool.token0.mint)
          }
          if (firstPool.token1?.mint) {
            setToToken(firstPool.token1.mint)
          }
        }
      } catch (error) {
        console.error('Lỗi khi tải pool mặc định:', error)
      } finally {
        setLoadingDefaultPool(false)
      }
    }

    loadDefaultPool()
  }, [])

  const recentSwaps = [
    {
      from: 'SOL',
      to: 'USDC',
      amount: '5.2',
      value: '$520.40',
      time: '2 min ago',
      signature: '3xR7...',
      fee: '0.000005 SOL',
      price: '1 SOL = 100.08 USDC',
    },
    {
      from: 'USDC',
      to: 'RAY',
      amount: '100',
      value: '$100.00',
      time: '15 min ago',
      signature: '5tT3...',
      fee: '0.000005 SOL',
      price: '1 USDC = 0.5 RAY',
    },
    {
      from: 'RAY',
      to: 'SOL',
      amount: '50',
      value: '$75.50',
      time: '1 hour ago',
      signature: '9jK1...',
      fee: '0.000005 SOL',
      price: '1 RAY = 0.0151 SOL',
    },
  ]

  const selectedFromToken = tokens.find(t => t.mint === fromToken)
  const selectedToToken = tokens.find(t => t.mint === toToken)

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold mb-2 text-cen">Token Swap</h1>
              <p className="text-muted-foreground text-center">
                Swap tokens instantly with the best rates across Solana DEXs
              </p>
              {lastUpdated && (
                <Badge variant="outline" className="mt-2 text-xs">
                  Token list updated: {new Date(lastUpdated).toLocaleString()}
                </Badge>
              )}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <SwapInterface
                  onFromTokenChange={setFromToken}
                  onToTokenChange={setToToken}
                  initialPoolAddress={selectedPool?.poolAddress}
                  loading={loadingDefaultPool}
                />
              </div>

              <div className="space-y-6">
                {/* Market Info - đã di chuyển lên trên */}
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

                {/* Token Info - đã di chuyển xuống dưới */}
                <Card>
                  <CardHeader>
                    <CardTitle>Token Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-col space-y-4">
                      <TokenInfoDisplay token={selectedFromToken} title="Token 1" />
                      <TokenInfoDisplay token={selectedToToken} title="Token 2" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recent Swaps - đã mở rộng với thêm thông tin chi tiết */}
            <div className="mt-6 max-w-8xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Swaps</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentSwaps.map((swap, index) => (
                    <div key={index} className="bg-muted/50 roundedx-lg overflow-hidden">
                      <div className="flex items-center justify-between p-3 border-b border-border/50">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="px-2 py-1">
                            {swap.from} → {swap.to}
                          </Badge>
                          <div>
                            <p className="font-semibold">
                              {swap.amount} {swap.from}
                            </p>
                            <p className="text-sm text-muted-foreground">{swap.value}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{swap.time}</p>
                          <p className="text-xs text-muted-foreground">
                            Signature: {swap.signature}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Price:</span> {swap.price}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Network Fee:</span> {swap.fee}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
