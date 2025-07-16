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

  // State cho pool được chọn từ GitHub - giá trị ban đầu là null
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null)
  const [availablePools, setAvailablePools] = useState<Pool[]>([])
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

  // Tải danh sách pools từ GitHub nhưng không tự động chọn pool mặc định
  // Load pool list from GitHub but don't automatically select a default pool
  useEffect(() => {
    const loadPools = async () => {
      setLoadingDefaultPool(true)
      try {
        const pools = await GithubPoolService.getAllPools()
        if (pools && pools.length > 0) {
          setAvailablePools(pools)
          // Don't automatically select pool and set tokens anymore
          // Let the user choose which pool they want to use
        }
      } catch (error) {
        console.error('Error loading pools from GitHub:', error)
      } finally {
        setLoadingDefaultPool(false)
      }
    }

    loadPools()
  }, [])

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
                  availablePools={availablePools}
                  onSelectPool={setSelectedPool}
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
          </main>
        </div>
      </div>
    </div>
  )
}
