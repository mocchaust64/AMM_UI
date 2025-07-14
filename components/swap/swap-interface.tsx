'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ArrowUpDown,
  Settings,
  Info,
  Loader2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Search,
} from 'lucide-react'
import { useLanguage } from '@/lib/contexts/language-context'
import { toast } from 'sonner'
import { PoolTokenSelect } from '@/components/TokenSelect/TokenSelect'
import { useWalletTokens } from '@/hooks/useWalletTokens'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { SwapService } from '@/lib/service/swapService'
import { Program } from '@coral-xyz/anchor'
import { RaydiumCpSwap } from '../../idl/types/raydium_cp_swap'
import { useAnchorProvider } from '@/hooks/useAnchorProvider'
import { PoolFinder, PoolInfo, AmmConfigInfo } from '@/lib/utils/pool-finder'
import { GithubPoolService } from '@/lib/service/githubPoolService'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export interface SwapInterfaceProps {
  onFromTokenChange?: (tokenMint: string) => void
  onToTokenChange?: (tokenMint: string) => void
  initialPoolAddress?: string
  loading?: boolean
}

export function SwapInterface({
  onFromTokenChange,
  onToTokenChange,
  initialPoolAddress,
  loading = false,
}: SwapInterfaceProps) {
  const { t } = useLanguage()
  const { tokens, loading: tokensLoading, refreshTokens } = useWalletTokens()
  const { tokens: nonSolTokens } = useWalletTokens({ includeSol: false })
  const wallet = useWallet()
  const { provider, program } = useAnchorProvider()

  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [fromTokenMint, setFromTokenMint] = useState('')
  const [toTokenMint, setToTokenMint] = useState('')
  const [poolAddress, setPoolAddress] = useState(initialPoolAddress || '')
  const [swapData, setSwapData] = useState<{
    outputAmount: number
    rate: number
    minimumReceived: number
    route: string
  } | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const [searchingPool, setSearchingPool] = useState(false)
  const [currentPool, setCurrentPool] = useState<PoolInfo | null>(null)
  const [ammConfigInfo, setAmmConfigInfo] = useState<AmmConfigInfo | null>(null)
  const [refreshingTokens, setRefreshingTokens] = useState(false)

  // State cho chức năng chọn pool từ GitHub
  const [githubPools, setGithubPools] = useState<any[]>([])
  const [enrichedPools, setEnrichedPools] = useState<any[]>([]) // State mới để lưu pools có thông tin phong phú
  const [loadingGithubPools, setLoadingGithubPools] = useState(false)
  const [enrichingPools, setEnrichingPools] = useState(false) // State mới để theo dõi quá trình làm giàu thông tin
  const [poolSearchTerm, setPoolSearchTerm] = useState('')
  const [showPoolSelector, setShowPoolSelector] = useState(false)

  // Khi token nguồn thay đổi, thông báo ra ngoài
  useEffect(() => {
    if (onFromTokenChange && fromTokenMint) {
      onFromTokenChange(fromTokenMint)
    }
  }, [fromTokenMint, onFromTokenChange])

  // Khi token đích thay đổi, thông báo ra ngoài
  useEffect(() => {
    if (onToTokenChange && toTokenMint) {
      onToTokenChange(toTokenMint)
    }
  }, [toTokenMint, onToTokenChange])

  // Hàm refresh danh sách token
  const handleRefreshTokens = async () => {
    setRefreshingTokens(true)
    try {
      await refreshTokens()
      toast.success('Đã cập nhật danh sách token!')
    } catch (error) {
      console.error('Error refreshing tokens:', error)
      toast.error('Không thể cập nhật danh sách token.')
    } finally {
      setRefreshingTokens(false)
    }
  }

  // Tạo RPC connection
  const connection = new Connection(
    process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
    'confirmed'
  )

  // Sử dụng program từ hook hoặc khởi tạo nếu cần
  const raydiumProgram = program as Program<RaydiumCpSwap>
  const swapService = new SwapService(raydiumProgram, connection)
  const poolFinder = new PoolFinder(raydiumProgram, connection)

  // Get selected tokens from mints
  const fromToken = tokens.find(token => token.mint === fromTokenMint)
  const toToken = tokens.find(token => token.mint === toTokenMint)

  // Kiểm tra xem ví đã kết nối chưa
  const isConnected = !!wallet.publicKey

  // Hàm để lấy danh sách pool từ GitHub
  const fetchGithubPools = async () => {
    setLoadingGithubPools(true)
    try {
      const pools = await GithubPoolService.getAllPools()
      setGithubPools(pools || [])

      // Sau khi tải pools, bắt đầu làm giàu thông tin token
      if (pools && pools.length > 0) {
        setEnrichingPools(true)
        // Chỉ làm giàu tối đa 15 pools để tránh quá tải
        const enriched = await GithubPoolService.enrichPoolsTokenInfo(pools, 15)
        setEnrichedPools(enriched)
        setEnrichingPools(false)
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách pool từ GitHub:', error)
      toast.error('Không thể tải danh sách pool từ GitHub')
    } finally {
      setLoadingGithubPools(false)
    }
  }

  // Lấy danh sách pool từ GitHub khi mở dialog
  useEffect(() => {
    if (showPoolSelector && githubPools.length === 0) {
      fetchGithubPools()
    }
  }, [showPoolSelector, githubPools.length])

  // Effect để xử lý khi initialPoolAddress thay đổi
  useEffect(() => {
    if (initialPoolAddress && initialPoolAddress !== poolAddress) {
      setPoolAddress(initialPoolAddress)

      // Tải thông tin pool từ blockchain
      const loadPoolInfo = async () => {
        if (!raydiumProgram) return

        setSearchingPool(true)
        setCurrentPool(null)
        setAmmConfigInfo(null)

        try {
          const onChainPool = await poolFinder.findPoolByAddress(new PublicKey(initialPoolAddress))
          if (onChainPool) {
            setCurrentPool(onChainPool)

            // Lấy thông tin AMM Config
            const configInfo = await poolFinder.getAmmConfigInfo(onChainPool.ammConfig)
            if (configInfo) {
              setAmmConfigInfo(configInfo)
            }

            // Cập nhật token mints từ pool
            setFromTokenMint(onChainPool.token0Mint.toString())
            setToTokenMint(onChainPool.token1Mint.toString())

            toast.success('Đã tải thông tin pool từ blockchain!')
          }
        } catch (error) {
          console.error('Lỗi khi tải thông tin pool từ blockchain:', error)
          toast.error('Không thể tải thông tin pool')
        } finally {
          setSearchingPool(false)
        }
      }

      loadPoolInfo()
    }
  }, [initialPoolAddress, poolAddress, poolFinder, raydiumProgram])

  // Tìm pool khi cặp token thay đổi
  useEffect(() => {
    const findPool = async () => {
      if (!fromTokenMint || !toTokenMint || fromTokenMint === toTokenMint || !raydiumProgram) return

      setSearchingPool(true)
      setCurrentPool(null)
      setAmmConfigInfo(null)

      try {
        // Tìm pool từ cặp token
        const pool = await poolFinder.findPoolByTokens(
          new PublicKey(fromTokenMint),
          new PublicKey(toTokenMint)
        )

        if (pool) {
          setCurrentPool(pool)
          setPoolAddress(pool.poolAddress.toString())

          // Lấy thông tin AMM Config
          const configInfo = await poolFinder.getAmmConfigInfo(pool.ammConfig)
          if (configInfo) {
            setAmmConfigInfo(configInfo)
          }

          toast.success('Đã tìm thấy pool cho cặp token này!')
        } else {
          toast.warning(
            'Không tìm thấy pool cho cặp token này. Vui lòng chọn pool từ GitHub hoặc nhập địa chỉ pool thủ công.'
          )
        }
      } catch (error) {
        console.error('Lỗi khi tìm pool:', error)
        toast.error('Không thể tìm pool tự động.')
      } finally {
        setSearchingPool(false)
      }
    }

    findPool()
  }, [fromTokenMint, toTokenMint, raydiumProgram])

  // Hàm để chọn pool từ GitHub
  const selectGithubPool = async (pool: any) => {
    if (!pool || !pool.poolAddress) {
      toast.error('Pool không hợp lệ')
      return
    }

    try {
      setSearchingPool(true)
      setCurrentPool(null)
      setAmmConfigInfo(null)

      // Đặt địa chỉ pool
      setPoolAddress(pool.poolAddress)

      // Nếu pool chưa được làm giàu thông tin, thực hiện trước khi sử dụng
      let poolWithTokenInfo = pool
      if (!pool.token0?.icon || !pool.token1?.icon) {
        poolWithTokenInfo = await GithubPoolService.enrichPoolTokenInfo(pool)
      }

      // Đặt token mints từ pool đã làm giàu thông tin
      if (poolWithTokenInfo.token0?.mint && poolWithTokenInfo.token1?.mint) {
        setFromTokenMint(poolWithTokenInfo.token0.mint)
        setToTokenMint(poolWithTokenInfo.token1.mint)
      }

      // Tải thông tin pool từ blockchain để có thông tin chi tiết hơn
      try {
        const onChainPool = await poolFinder.findPoolByAddress(new PublicKey(pool.poolAddress))
        if (onChainPool) {
          setCurrentPool(onChainPool)

          // Lấy thông tin AMM Config
          const configInfo = await poolFinder.getAmmConfigInfo(onChainPool.ammConfig)
          if (configInfo) {
            setAmmConfigInfo(configInfo)
          }
        }
      } catch (error) {
        console.error('Lỗi khi tải thông tin pool từ blockchain:', error)
      }

      toast.success('Đã chọn pool từ GitHub!')
      setShowPoolSelector(false)
    } catch (error) {
      console.error('Lỗi khi chọn pool:', error)
      toast.error('Không thể chọn pool')
    } finally {
      setSearchingPool(false)
    }
  }

  const calculateSwap = useCallback(async () => {
    if (!fromToken || !toToken || !provider || !poolAddress || !currentPool) return

    setCalculating(true)
    try {
      // Tính toán dựa trên số dư thực tế trong pool
      const amountIn = Number(fromAmount)

      // Tính toán tỷ giá dựa trên dữ liệu pool
      const result = poolFinder.calculateRate(currentPool, fromToken.mint, amountIn)

      setToAmount(result.outputAmount.toFixed(6))
      setSwapData({
        outputAmount: result.outputAmount,
        rate: result.rate,
        minimumReceived: result.minimumReceived,
        route: 'Raydium',
      })
    } catch (error) {
      console.error('Error calculating swap:', error)
      toast.error('Không thể tính toán tỷ giá swap')
    } finally {
      setCalculating(false)
    }
  }, [fromAmount, fromToken, toToken, provider, poolAddress, currentPool])

  useEffect(() => {
    if (fromAmount && Number(fromAmount) > 0 && fromToken && toToken && currentPool) {
      calculateSwap()
    } else {
      setToAmount('')
      setSwapData(null)
    }
  }, [fromAmount, fromToken, toToken, currentPool, calculateSwap])

  const handleSwapTokens = () => {
    const tempTokenMint = fromTokenMint
    setFromTokenMint(toTokenMint)
    setToTokenMint(tempTokenMint)
    setFromAmount(toAmount)
    setToAmount(fromAmount)
  }

  const handleSwap = async () => {
    if (
      !wallet.publicKey ||
      !wallet.signTransaction ||
      !fromToken ||
      !toToken ||
      !swapData ||
      !poolAddress
    ) {
      toast.error('Please connect wallet, select token, and enter pool address')
      return
    }

    setSwapping(true)
    try {
      // Chuyển đổi số lượng sang BN (với decimals của token)
      const amountIn = new BN(parseFloat(fromAmount) * 10 ** fromToken.decimals)
      const minimumAmountOut = new BN(swapData.minimumReceived * 10 ** toToken.decimals)

      // Tìm token accounts cho cả input và output
      const inputTokenAccount = fromToken.address || ''
      const outputTokenAccount = toToken.address || ''

      // Thực hiện swap với pool address được chỉ định và các tham số mới
      const result = await swapService.swap({
        ammConfigIndex: 0, // Sử dụng config index mặc định
        inputToken: new PublicKey(fromToken.mint),
        outputToken: new PublicKey(toToken.mint),
        inputTokenAccount: new PublicKey(inputTokenAccount),
        outputTokenAccount: new PublicKey(outputTokenAccount),
        amountIn,
        minimumAmountOut,
        hookTokenMint: new PublicKey(fromToken.mint), // Không còn sử dụng thực sự, giữ lại cho tương thích API
        wallet: {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
        },
        poolAddress: new PublicKey(poolAddress),
      })

      toast.success(`Swap successful! Signature: ${result.signature}`)

      // Reset form sau khi swap thành công
      setFromAmount('')
      setToAmount('')
      setSwapData(null)

      // Làm mới token balances sau 2 giây
      setTimeout(() => {
        refreshTokens()
          .then(() => toast.success('Token balance updated'))
          .catch(err => console.error('Error refreshing token:', err))
      }, 2000)
    } catch (error) {
      console.error('Swap error:', error)
      toast.error(
        'Cannot perform swap: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    } finally {
      setSwapping(false)
    }
  }

  // Kiểm tra xem token đầu vào có phải là token0 trong pool không
  const isToken0FromToken = () => {
    if (!currentPool || !fromTokenMint) return false
    return currentPool.token0Mint.toString() === fromTokenMint
  }

  // Hàm rút gọn địa chỉ để hiển thị
  const renderSafeAddress = (address: string | undefined | null) => {
    if (!address) return 'N/A'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Hàm tìm pool đã làm giàu thông tin
  const getEnrichedPool = (poolAddress: string) => {
    return (
      enrichedPools.find(p => p?.poolAddress === poolAddress) ||
      githubPools.find(p => p?.poolAddress === poolAddress)
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('swap.title')}</span>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Loading State */}
        {loading && (
          <div className="py-4 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">Loading default pool...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* From Token */}
            <div className="space-y-2">
              <Label>{t('swap.from')}</Label>
              <div className="flex flex-col space-y-2">
                <PoolTokenSelect
                  value={fromTokenMint}
                  onChange={setFromTokenMint}
                  excludeToken={toTokenMint}
                  disabled={swapping}
                />
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={fromAmount}
                    onChange={e => setFromAmount(e.target.value)}
                    className="flex-1"
                    disabled={swapping}
                  />
                  {fromToken && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFromAmount(fromToken.balance.toString())}
                      disabled={swapping}
                    >
                      MAX
                    </Button>
                  )}
                </div>
                {fromToken && (
                  <div className="text-xs text-muted-foreground">
                    Balance: {fromToken.balance.toLocaleString()} {fromToken.symbol}
                  </div>
                )}
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full bg-muted"
                onClick={handleSwapTokens}
                disabled={swapping}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>

            {/* To Token */}
            <div className="space-y-2">
              <Label>{t('swap.to')}</Label>
              <div className="flex flex-col space-y-2">
                <PoolTokenSelect
                  value={toTokenMint}
                  onChange={setToTokenMint}
                  excludeToken={fromTokenMint}
                  disabled={swapping}
                />
                <Input
                  type="number"
                  placeholder="0.0"
                  value={toAmount}
                  readOnly
                  disabled={true}
                  className={calculating ? 'animate-pulse' : ''}
                />
                {toToken && (
                  <div className="text-xs text-muted-foreground">
                    Balance: {toToken.balance.toLocaleString()} {toToken.symbol}
                  </div>
                )}
              </div>
            </div>

            {/* Pool Info */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pool:</span>
                <div className="flex items-center gap-1">
                  {searchingPool ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : currentPool ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-amber-500" />
                  )}
                  <span className="font-mono text-xs">
                    {searchingPool
                      ? 'Searching...'
                      : currentPool
                        ? renderSafeAddress(poolAddress)
                        : 'No pool found'}
                  </span>
                </div>
              </div>

              {/* Pool Selection Dialog */}
              <div className="flex justify-center">
                <Dialog open={showPoolSelector} onOpenChange={setShowPoolSelector}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      {loading ? (
                        <div className="flex items-center">
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          <span>Loading pools...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <Search className="h-3 w-3" />
                          <span>Select Pool</span>
                        </div>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Chọn Pool từ GitHub</DialogTitle>
                      <DialogDescription className="text-sm text-muted-foreground">
                        Chọn một pool để sử dụng cho giao dịch swap
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Tìm kiếm theo địa chỉ hoặc token..."
                          className="pl-9"
                          value={poolSearchTerm}
                          onChange={e => setPoolSearchTerm(e.target.value)}
                        />
                      </div>

                      <ScrollArea className="h-72 overflow-y-auto pr-4">
                        {loadingGithubPools ? (
                          <div className="flex flex-col items-center justify-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
                            <p className="text-sm text-muted-foreground">
                              Đang tải danh sách pool...
                            </p>
                          </div>
                        ) : githubPools.length === 0 ? (
                          <div className="text-center py-12 border border-dashed rounded-lg">
                            <div className="text-4xl mb-2">😢</div>
                            <p className="text-muted-foreground">Không tìm thấy pool nào</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {githubPools
                              .filter(
                                pool =>
                                  !poolSearchTerm ||
                                  pool.poolAddress
                                    ?.toLowerCase()
                                    .includes(poolSearchTerm.toLowerCase()) ||
                                  pool.token0?.symbol
                                    ?.toLowerCase()
                                    .includes(poolSearchTerm.toLowerCase()) ||
                                  pool.token1?.symbol
                                    ?.toLowerCase()
                                    .includes(poolSearchTerm.toLowerCase())
                              )
                              .map((pool, index) => {
                                // Tìm phiên bản đã làm giàu thông tin nếu có
                                const enrichedPool = getEnrichedPool(pool.poolAddress)
                                const token0 = enrichedPool?.token0 || pool.token0 || {}
                                const token1 = enrichedPool?.token1 || pool.token1 || {}

                                return (
                                  <div
                                    key={index}
                                    className={`p-4 border rounded-lg hover:border-primary hover:bg-accent cursor-pointer transition-all ${
                                      pool.poolAddress === poolAddress
                                        ? 'border-primary bg-accent/50'
                                        : 'border-border'
                                    }`}
                                    onClick={() => selectGithubPool(enrichedPool || pool)}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center">
                                        <div className="flex items-center -space-x-2 mr-3">
                                          {/* Token0 avatar */}
                                          <Avatar className="h-8 w-8 border-2 border-background">
                                            {token0?.icon ? (
                                              <AvatarImage
                                                src={token0.icon}
                                                alt={token0?.symbol || 'Token'}
                                              />
                                            ) : (
                                              <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                                                {token0?.symbol?.slice(0, 2) || '??'}
                                              </AvatarFallback>
                                            )}
                                          </Avatar>

                                          {/* Token1 avatar */}
                                          <Avatar className="h-8 w-8 border-2 border-background">
                                            {token1?.icon ? (
                                              <AvatarImage
                                                src={token1.icon}
                                                alt={token1?.symbol || 'Token'}
                                              />
                                            ) : (
                                              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-teal-500 text-white">
                                                {token1?.symbol?.slice(0, 2) || '??'}
                                              </AvatarFallback>
                                            )}
                                          </Avatar>
                                        </div>

                                        <div>
                                          <div className="font-medium flex items-center gap-2">
                                            <span>
                                              {token0?.symbol || 'Unknown'} /{' '}
                                              {token1?.symbol || 'Unknown'}
                                            </span>

                                            {/* Token extension badges */}
                                            <div className="flex gap-1">
                                              {token0?.isToken2022 && (
                                                <Badge
                                                  variant="outline"
                                                  className="bg-purple-100/30 text-purple-600 border-purple-200 text-[10px]"
                                                >
                                                  T0:2022
                                                </Badge>
                                              )}
                                              {token0?.hasTransferHook && (
                                                <Badge
                                                  variant="outline"
                                                  className="bg-amber-100/30 text-amber-600 border-amber-200 text-[10px]"
                                                >
                                                  Hook
                                                </Badge>
                                              )}
                                              {token1?.isToken2022 && (
                                                <Badge
                                                  variant="outline"
                                                  className="bg-purple-100/30 text-purple-600 border-purple-200 text-[10px]"
                                                >
                                                  T1:2022
                                                </Badge>
                                              )}
                                              {token1?.hasTransferHook && (
                                                <Badge
                                                  variant="outline"
                                                  className="bg-amber-100/30 text-amber-600 border-amber-200 text-[10px]"
                                                >
                                                  Hook
                                                </Badge>
                                              )}
                                            </div>
                                          </div>

                                          <div className="text-xs text-muted-foreground flex flex-col">
                                            <span>Pool: {renderSafeAddress(pool.poolAddress)}</span>
                                            {(token0?.name || token1?.name) && (
                                              <span className="text-[11px] opacity-70">
                                                {token0?.name && token1?.name ? (
                                                  <>
                                                    {token0.name} / {token1.name}
                                                  </>
                                                ) : token0?.name ? (
                                                  token0.name
                                                ) : (
                                                  token1?.name
                                                )}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {pool.poolAddress === poolAddress && (
                                        <Badge
                                          variant="outline"
                                          className="bg-green-100/30 text-green-600 border-green-200"
                                        >
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Selected
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}

                            {enrichingPools && (
                              <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                <span>Đang tải thông tin token...</span>
                              </div>
                            )}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Swap Details */}
              {swapData && (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate:</span>
                    <span>
                      1 {fromToken?.symbol} = {swapData.rate.toFixed(6)} {toToken?.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Minimum Received:</span>
                    <span>
                      {swapData.minimumReceived.toFixed(6)} {toToken?.symbol}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Swap Button */}
            {!isConnected ? (
              <Button className="w-full" disabled={swapping}>
                Connect Wallet
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={handleSwap}
                disabled={
                  swapping ||
                  !fromAmount ||
                  parseFloat(fromAmount) <= 0 ||
                  !fromTokenMint ||
                  !toTokenMint ||
                  !currentPool
                }
              >
                {swapping ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Swapping...
                  </>
                ) : (
                  'Swap'
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
