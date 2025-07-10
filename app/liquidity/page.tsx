'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PoolCard } from '@/components/liquidity/pool-card'
import { CreatePoolDialog } from '@/components/liquidity/create-pool-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Plus, Loader2, RefreshCw } from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useConnection } from '@solana/wallet-adapter-react'
import { Program, AnchorProvider } from '@coral-xyz/anchor'
import { Badge } from '@/components/ui/badge'

import { PoolService } from '@/lib/service/poolService'
import { Card } from '@/components/ui/card'
import RAYDIUM_CP_SWAP_IDL from '@/idl/raydium_cp_swap.json'

// Định nghĩa kiểu dữ liệu cho pool
interface Pool {
  name: string
  tokens: { symbol: string; icon: string }[]
  tvl: string
  apy: string
  volume24h: string
  fees24h: string
  type: 'Standard' | 'Custom'
  isActive: boolean
  poolAddress: string
}

interface CachedPoolsData {
  pools: Pool[]
  lastUpdated: number
}

// Thời gian cache hết hạn (30 phút = 30 * 60 * 1000 ms)
const CACHE_EXPIRATION = 30 * 60 * 1000
const CACHE_KEY = 'user_liquidity_pools'

export default function LiquidityPage() {
  const [createPoolOpen, setCreatePoolOpen] = useState(false)
  const [myPools, setMyPools] = useState<Pool[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  const { publicKey, wallet } = useWallet()
  const { connection } = useConnection()

  // Hàm lưu dữ liệu vào cache
  const savePoolsToCache = (pools: Pool[]) => {
    if (!publicKey) return

    try {
      const userKey = publicKey.toString()
      const cacheData: CachedPoolsData = {
        pools,
        lastUpdated: Date.now(),
      }

      localStorage.setItem(`${CACHE_KEY}_${userKey}`, JSON.stringify(cacheData))
    } catch (error) {
      console.error('Error saving pools to cache:', error)
    }
  }

  // Hàm đọc dữ liệu từ cache
  const getPoolsFromCache = (): CachedPoolsData | null => {
    if (!publicKey) return null

    try {
      const userKey = publicKey.toString()
      const cachedData = localStorage.getItem(`${CACHE_KEY}_${userKey}`)

      if (!cachedData) return null

      const parsedData = JSON.parse(cachedData) as CachedPoolsData

      // Kiểm tra cache có hết hạn chưa
      if (Date.now() - parsedData.lastUpdated > CACHE_EXPIRATION) {
        return null
      }

      return parsedData
    } catch (error) {
      console.error('Error reading pools from cache:', error)
      return null
    }
  }

  // Hàm load dữ liệu pools
  const loadUserPools = async (forceRefresh = false) => {
    if (!publicKey) {
      setMyPools([])
      setLoading(false)
      return
    }

    if (forceRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    // Kiểm tra cache nếu không phải force refresh
    if (!forceRefresh) {
      const cachedData = getPoolsFromCache()
      if (cachedData) {
        setMyPools(cachedData.pools)
        setLastUpdated(cachedData.lastUpdated)
        setLoading(false)
        return
      }
    }

    try {
      // Kết nối với Raydium AMM Program
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction: async (tx: any) => tx } as any,
        { commitment: 'confirmed' }
      )

      // Không truyền đối tượng wallet thực tế vì chỉ cần đọc dữ liệu
      const program = new Program(RAYDIUM_CP_SWAP_IDL, provider)

      // Khởi tạo PoolService
      const poolService = new PoolService(program as any, connection)

      // Lấy danh sách pool mà người dùng tham gia
      const userPoolsData = await poolService.listPoolsByOwner(publicKey)

      // Chuyển đổi sang định dạng Pool cho giao diện
      const userPoolsForUI = userPoolsData.map(pool => ({
        name: pool.name,
        tokens: pool.tokens.map(token => ({
          symbol: token.symbol,
          icon: token.icon,
        })),
        tvl: pool.tvl,
        apy: pool.apy || '0%',
        volume24h: pool.volume24h || '$0',
        fees24h: pool.fees24h || '$0',
        type: pool.type,
        isActive: pool.isActive,
        poolAddress: pool.poolAddress,
      }))

      setMyPools(userPoolsForUI)
      setLastUpdated(Date.now())

      // Lưu vào cache
      savePoolsToCache(userPoolsForUI)
    } catch (error) {
      console.error('Error loading user pools:', error)

      // Trong trường hợp lỗi, sử dụng dữ liệu mẫu để kiểm tra giao diện
      // Chỉ nên sử dụng trong môi trường phát triển
      if (process.env.NODE_ENV === 'development') {
        const mockPools = [
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
            poolAddress: 'Ew2coQtFDbLDgSagTbTrhHQwfKjNYDW2MJRt1QfvjkBR',
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
            poolAddress: 'CwQ5z4jRS5KYQwFo4GpKJtBLsRWZpv9gDYpsgTPKN1Mm',
          },
        ]

        setMyPools(mockPools)
      } else {
        setMyPools([])
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Hàm refresh dữ liệu
  const handleRefresh = () => {
    loadUserPools(true)
  }

  useEffect(() => {
    loadUserPools()
  }, [publicKey, connection])

  // Lọc pool theo tìm kiếm
  const filteredPools = myPools.filter(pool =>
    pool.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">My Liquidity Pools</h1>
                <p className="text-muted-foreground">
                  {publicKey
                    ? 'Manage your liquidity positions'
                    : 'Connect your wallet to view your liquidity positions'}
                </p>
                {lastUpdated && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    Cập nhật: {new Date(lastUpdated).toLocaleString()}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                {publicKey && !loading && (
                  <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                    {refreshing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Refresh
                      </>
                    )}
                  </Button>
                )}
                <Button
                  className="gap-2"
                  onClick={() => setCreatePoolOpen(true)}
                  disabled={!publicKey}
                >
                  <Plus className="h-4 w-4" />
                  Create Pool
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-end">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search pools..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                  <p>Loading your liquidity positions...</p>
                </div>
              ) : !publicKey ? (
                <Card className="text-center py-12 bg-muted/40">
                  <p className="text-muted-foreground">
                    Connect your wallet to view your liquidity positions
                  </p>
                </Card>
              ) : filteredPools.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No liquidity positions found</p>
                  <Button className="mt-4" onClick={() => setCreatePoolOpen(true)}>
                    Add Liquidity
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredPools.map((pool, index) => (
                    <PoolCard key={index} pool={pool} />
                  ))}
                </div>
              )}
            </div>

            <CreatePoolDialog _open={createPoolOpen} onOpenChange={setCreatePoolOpen} />
          </main>
        </div>
      </div>
    </div>
  )
}
