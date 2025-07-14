'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PoolCard } from '@/components/liquidity/pool-card'
import { CreatePoolDialog } from '@/components/liquidity/create-pool-dialog'
import { GithubPools } from '@/components/liquidity/github-pools'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Plus, Loader2, RefreshCw, Info, ChevronLeft, ChevronRight } from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useConnection } from '@solana/wallet-adapter-react'
import { Program, AnchorProvider } from '@coral-xyz/anchor'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { PoolService } from '@/lib/service/poolService'
import { Card } from '@/components/ui/card'
import RAYDIUM_CP_SWAP_IDL from '@/idl/raydium_cp_swap.json'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// Define data type for pool
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

export default function LiquidityPage() {
  const [createPoolOpen, setCreatePoolOpen] = useState(false)
  const [myPools, setMyPools] = useState<Pool[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [dismissAlert, setDismissAlert] = useState(false)
  const [activeTab, setActiveTab] = useState('my-pools')
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')

  const POOLS_PER_PAGE = 9

  const { publicKey } = useWallet()
  const { connection } = useConnection()

  // Function to save pools to cache
  const savePoolsToCache = (pools: Pool[]) => {
    try {
      localStorage.setItem(
        'my-pools-cache',
        JSON.stringify({
          pools,
          lastUpdated: Date.now(),
        })
      )
    } catch (error) {
      console.error('Failed to save pools to cache:', error)
    }
  }

  // Function to get pools from cache
  const getPoolsFromCache = () => {
    try {
      const cachedData = localStorage.getItem('my-pools-cache')
      if (!cachedData) return null

      const { pools, lastUpdated } = JSON.parse(cachedData)
      const cacheAge = Date.now() - lastUpdated

      // Cache expires after 5 minutes
      if (cacheAge > 5 * 60 * 1000) return null

      return { pools, lastUpdated }
    } catch (error) {
      console.error('Failed to get pools from cache:', error)
      return null
    }
  }

  // Check if alert has been dismissed before
  useEffect(() => {
    const dismissed = localStorage.getItem('dismissed-token-alert')
    if (dismissed) {
      setDismissAlert(true)
    }
  }, [])

  // Save dismissed state when alert is closed
  const handleDismissAlert = () => {
    setDismissAlert(true)
    localStorage.setItem('dismissed-token-alert', 'true')
  }

  // Reset page when changing tabs
  useEffect(() => {
    setCurrentPage(1)
    setSearchTerm('')
  }, [activeTab])

  // Load pools when component mounts
  useEffect(() => {
    loadUserPools()
  }, [publicKey])

  // Function to load pool data
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

    // Check cache if not force refreshing
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
      // Connect to Raydium AMM Program
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction: async (tx: any) => tx } as any,
        { commitment: 'confirmed' }
      )

      // Don't pass actual wallet object as we only need to read data
      const program = new Program(RAYDIUM_CP_SWAP_IDL, provider)

      // Initialize PoolService
      const poolService = new PoolService(program as any, connection)

      // Get list of pools user participates in
      const userPoolsData = await poolService.listPoolsByOwner(publicKey)

      // Convert to Pool format for UI
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

      // Save to cache
      savePoolsToCache(userPoolsForUI)
    } catch (error) {
      console.error('Failed to load pools:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const formatLastUpdated = () => {
    if (!lastUpdated) return ''

    const now = Date.now()
    const diffInSeconds = Math.floor((now - lastUpdated) / 1000)

    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)} minutes ago`
    } else {
      return `${Math.floor(diffInSeconds / 3600)} hours ago`
    }
  }

  // Filter pools by search term
  const filteredPools = myPools.filter(pool => {
    if (!searchTerm) return true

    const searchTermLower = searchTerm.toLowerCase()

    // Search by name, pool address or token symbol
    return (
      (pool.name && pool.name.toLowerCase().includes(searchTermLower)) ||
      pool.poolAddress.toLowerCase().includes(searchTermLower) ||
      pool.tokens.some(
        token => token.symbol && token.symbol.toLowerCase().includes(searchTermLower)
      )
    )
  })

  // Calculate total pages
  const totalPages = Math.ceil(filteredPools.length / POOLS_PER_PAGE)

  // Get pools for current page
  const paginatedPools = filteredPools.slice(
    (currentPage - 1) * POOLS_PER_PAGE,
    currentPage * POOLS_PER_PAGE
  )

  // Function to change page
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-900/30">
          {!dismissAlert && (
            <Alert className="mb-6 bg-blue-900/10 text-blue-500 border-blue-800/20">
              <Info className="h-5 w-5 text-blue-500" />
              <AlertTitle className="text-base font-medium flex items-center justify-between">
                New Update: Support for Diverse Token Types
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismissAlert}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                >
                  Close
                </Button>
              </AlertTitle>
              <AlertDescription className="text-sm">
                AMM now supports all token combinations:
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="bg-slate-100/30">
                    SPL Token + SPL Token
                  </Badge>
                  <Badge variant="outline" className="bg-slate-100/30">
                    SPL Token + Token-2022
                  </Badge>
                  <Badge variant="outline" className="bg-slate-100/30">
                    Token-2022 + Token-2022
                  </Badge>
                  <Badge variant="outline" className="bg-slate-100/30">
                    SPL Token + Transfer Hook Token
                  </Badge>
                  <Badge variant="outline" className="bg-slate-100/30">
                    Token-2022 + Transfer Hook Token
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Liquidity Pools</h1>
            <Button onClick={() => setCreatePoolOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Pool
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="my-pools">My Pools</TabsTrigger>
              <TabsTrigger value="github-pools">GitHub Pools</TabsTrigger>
            </TabsList>

            <TabsContent value="my-pools">
              <Card className="overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold mb-1">My Pools</h2>
                      <p className="text-sm text-muted-foreground">
                        Manage your liquidity positions
                      </p>
                    </div>

                    <div className="flex gap-2 w-full lg:w-auto">
                      <div className="relative flex-1 lg:w-80">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          className="pl-10"
                          placeholder="Search pools by token name or address"
                          value={searchTerm}
                          onChange={e => {
                            setSearchTerm(e.target.value)
                            setCurrentPage(1) // Reset to page 1 when searching
                          }}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => loadUserPools(true)}
                        disabled={refreshing}
                      >
                        {refreshing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border">
                  {loading ? (
                    <div className="py-12 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
                      <p className="text-sm text-muted-foreground">Loading pools...</p>
                    </div>
                  ) : filteredPools.length === 0 ? (
                    <div className="py-12 text-center">
                      {searchTerm ? (
                        <p className="text-sm text-muted-foreground mb-4">
                          No pools found matching &quot;{searchTerm}&quot;
                        </p>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground mb-4">No pools found</p>
                          <Button
                            variant="outline"
                            className="mx-auto"
                            onClick={() => setCreatePoolOpen(true)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create your first pool
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {paginatedPools.map((pool, index) => (
                          <PoolCard key={index} pool={pool} />
                        ))}
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 py-4 border-t border-border">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>

                          <div className="text-sm">
                            Page {currentPage} of {totalPages}
                          </div>

                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {lastUpdated && (
                        <div className="text-xs text-muted-foreground text-center py-2 border-t border-border">
                          Last updated {formatLastUpdated()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="github-pools">
              <GithubPools itemsPerPage={9} />
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <CreatePoolDialog _open={createPoolOpen} onOpenChange={setCreatePoolOpen} />
    </div>
  )
}
