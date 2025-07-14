'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  RefreshCw,
  ExternalLink,
  Copy,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowRightLeft,
} from 'lucide-react'
import { GithubPoolService } from '@/lib/service/githubPoolService'
import { toast } from 'sonner'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface GithubPoolsProps {
  itemsPerPage?: number
  onSelectPool?: (pool: any) => void
}

export function GithubPools({ itemsPerPage = 10, onSelectPool }: GithubPoolsProps) {
  const [pools, setPools] = useState<any[]>([])
  const [enrichedPools, setEnrichedPools] = useState<any[]>([]) // Thêm state cho pools đã được làm giàu thông tin
  const [loading, setLoading] = useState(true)
  const [enriching, setEnriching] = useState(false) // Thêm state để theo dõi quá trình làm giàu thông tin
  const [refreshing, setRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()

  // Hàm để lấy danh sách pool từ GitHub
  const fetchPools = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const poolsData = await GithubPoolService.getAllPools()
      setPools(poolsData || []) // Ensure it's always an array even if API returns null/undefined

      // After loading pools, start enriching token information
      if (poolsData && poolsData.length > 0) {
        setEnriching(true)
        // Only enrich up to 15 pools to avoid overloading
        const enriched = await GithubPoolService.enrichPoolsTokenInfo(poolsData, 15)
        setEnrichedPools(enriched)
        setEnriching(false)
      }
    } catch (error: any) {
      toast.error(`Error fetching pool list: ${error.message}`)
      setPools([]) // Set pools to empty array when there's an error
      setEnrichedPools([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Get pool list when component is mounted
  useEffect(() => {
    fetchPools()
  }, [])

  // Function to copy address to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`Copied ${label} to clipboard`),
      () => toast.error('Could not copy to clipboard')
    )
  }

  // Hàm để định dạng thời gian
  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: vi })
    } catch (error) {
      return 'Unknown'
    }
  }

  // Hàm để lấy badge cho loại token
  const getTokenBadge = (token: any) => {
    if (!token) return null

    return (
      <div className="flex gap-1 flex-wrap">
        {token.isToken2022 ? (
          <Badge variant="outline" className="bg-purple-100/30 text-purple-600 border-purple-200">
            Token-2022
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-blue-100/30 text-blue-600 border-blue-200">
            SPL Token
          </Badge>
        )}

        {token.hasTransferHook && (
          <Badge variant="outline" className="bg-amber-100/30 text-amber-600 border-amber-200">
            Transfer Hook
          </Badge>
        )}
      </div>
    )
  }

  // Hàm để hiển thị địa chỉ rút gọn an toàn
  const renderSafeAddress = (address: string | undefined | null) => {
    if (!address) return 'Unknown'
    return `${address.slice(0, 8)}...${address.slice(-8)}`
  }

  // Hàm để xử lý khi chọn pool
  const handleSelectPool = async (pool: any) => {
    // Nếu pool chưa được làm giàu thông tin, thực hiện trước khi sử dụng
    let poolWithTokenInfo = pool
    if (!pool.token0?.icon || !pool.token1?.icon) {
      try {
        poolWithTokenInfo = await GithubPoolService.enrichPoolTokenInfo(pool)
      } catch (error) {
        console.error('Lỗi khi làm giàu thông tin token:', error)
      }
    }

    if (onSelectPool) {
      // Nếu có hàm callback onSelectPool, gọi nó với pool đã chọn
      onSelectPool(poolWithTokenInfo)
    } else {
      // Nếu không có callback, chuyển hướng đến trang pool chi tiết
      if (poolWithTokenInfo?.poolAddress) {
        router.push(`/pool/${poolWithTokenInfo.poolAddress}`)
      }
    }
  }

  // Tìm pool đã được làm giàu thông tin
  const getEnrichedPool = (poolAddress: string) => {
    return enrichedPools.find(p => p?.poolAddress === poolAddress)
  }

  // Lọc pools theo từ khóa tìm kiếm
  const filteredPools = pools.filter(pool => {
    if (!searchTerm) return true

    const searchTermLower = searchTerm.toLowerCase()

    // Tìm kiếm theo địa chỉ pool, token mint hoặc network
    return (
      (pool?.poolAddress && pool.poolAddress.toLowerCase().includes(searchTermLower)) ||
      (pool?.token0?.mint && pool.token0.mint.toLowerCase().includes(searchTermLower)) ||
      (pool?.token1?.mint && pool.token1.mint.toLowerCase().includes(searchTermLower)) ||
      (pool?.network && pool.network.toLowerCase().includes(searchTermLower))
    )
  })

  // Tính toán số trang
  const totalPages = Math.ceil(filteredPools.length / itemsPerPage)

  // Lấy pools cho trang hiện tại
  const paginatedPools = filteredPools.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Hàm chuyển trang
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Pools on GitHub</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10 h-9"
              placeholder="Search pools..."
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
            onClick={() => fetchPools(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">Loading pool list...</p>
          </div>
        ) : filteredPools.length === 0 ? (
          <div className="py-8 text-center">
            {searchTerm ? (
              <p className="text-sm text-muted-foreground mb-2">
                No pools found matching &quot;{searchTerm}&quot;
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mb-2">No pools saved on GitHub yet</p>
            )}
            <Button variant="outline" onClick={() => fetchPools(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedPools.map((pool, index) => {
              // Tìm phiên bản đã làm giàu thông tin nếu có
              const enrichedPool = getEnrichedPool(pool.poolAddress)
              const token0 = enrichedPool?.token0 || pool.token0 || {}
              const token1 = enrichedPool?.token1 || pool.token1 || {}

              return (
                <Card
                  key={index}
                  className="overflow-hidden border border-slate-200 dark:border-slate-800"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-base flex items-center gap-2">
                            Pool
                            <Badge variant="outline" className="font-normal">
                              {pool?.network || 'devnet'}
                            </Badge>
                          </h3>
                          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                            {pool?.poolAddress && (
                              <span
                                className="cursor-pointer hover:text-blue-500 transition-colors"
                                onClick={() => copyToClipboard(pool.poolAddress, 'pool address')}
                              >
                                {renderSafeAddress(pool.poolAddress)}
                                <Copy className="inline ml-1 h-3 w-3" />
                              </span>
                            )}
                            {pool?.githubUrl && (
                              <Link
                                href={pool.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-600 flex items-center"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                GitHub
                              </Link>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {onSelectPool && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleSelectPool(enrichedPool || pool)}
                              className="flex items-center gap-1"
                            >
                              <ArrowRightLeft className="h-3 w-3" />
                              Swap
                            </Button>
                          )}

                          <Link
                            href={`/pool/${pool.poolAddress}`}
                            className="text-sm font-medium text-blue-500 hover:text-blue-600"
                          >
                            View details
                          </Link>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              {token0?.icon ? (
                                <AvatarImage src={token0.icon} alt={token0?.symbol || 'Token'} />
                              ) : (
                                <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                                  {token0?.symbol?.slice(0, 2) || '??'}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <div className="text-xs text-muted-foreground">Token 0</div>
                              <div className="font-medium">
                                {token0?.symbol ||
                                  (token0?.mint && renderSafeAddress(token0.mint)) ||
                                  'Unknown'}
                              </div>
                              {token0?.name && token0.name !== token0.symbol && (
                                <div className="text-xs text-muted-foreground">{token0.name}</div>
                              )}
                            </div>
                          </div>
                          {token0?.mint && (
                            <div className="text-xs text-muted-foreground mt-2">
                              {renderSafeAddress(token0.mint)}
                            </div>
                          )}
                          <div className="mt-2">{getTokenBadge(token0)}</div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              {token1?.icon ? (
                                <AvatarImage src={token1.icon} alt={token1?.symbol || 'Token'} />
                              ) : (
                                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-teal-500 text-white">
                                  {token1?.symbol?.slice(0, 2) || '??'}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <div className="text-xs text-muted-foreground">Token 1</div>
                              <div className="font-medium">
                                {token1?.symbol ||
                                  (token1?.mint && renderSafeAddress(token1.mint)) ||
                                  'Unknown'}
                              </div>
                              {token1?.name && token1.name !== token1.symbol && (
                                <div className="text-xs text-muted-foreground">{token1.name}</div>
                              )}
                            </div>
                          </div>
                          {token1?.mint && (
                            <div className="text-xs text-muted-foreground mt-2">
                              {renderSafeAddress(token1.mint)}
                            </div>
                          )}
                          <div className="mt-2">{getTokenBadge(token1)}</div>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground mt-2">
                        Created {pool?.createdAt ? formatTime(pool.createdAt) : 'unknown'}
                        {pool?.lastUpdated && ` • Updated ${formatTime(pool.lastUpdated)}`}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {enriching && (
              <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin mr-2" />
                <span>Loading token information...</span>
              </div>
            )}

            {/* Phân trang */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 py-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="text-sm">
                  Page {currentPage} / {totalPages}
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
          </div>
        )}
      </CardContent>
    </Card>
  )
}
