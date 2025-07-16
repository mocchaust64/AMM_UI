'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ArrowUpDown,
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle,
  Search,
  ExternalLink,
  Check,
} from 'lucide-react'
import { useLanguage } from '@/lib/contexts/language-context'
import { toast } from 'sonner'
import { GithubTokenSelect } from '@/components/TokenSelect/TokenSelect'
import { useWalletTokens } from '@/hooks/useWalletTokens'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { SwapService } from '@/lib/service/swapService'
import { Program } from '@coral-xyz/anchor'
import { RaydiumCpSwap } from '../../idl/types/raydium_cp_swap'
import { useAnchorProvider } from '@/hooks/useAnchorProvider'
import { PoolFinder, PoolInfo, AmmConfigInfo } from '@/lib/utils/pool-finder'
import { GithubPoolService, GithubPoolInfo, GithubTokenInfo } from '@/lib/service/githubPoolService'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// Sử dụng lại type từ githubPoolService
type SwapGithubPool = GithubPoolInfo

export interface SwapInterfaceProps {
  onFromTokenChange?: (tokenMint: string) => void
  onToTokenChange?: (tokenMint: string) => void
  initialPoolAddress?: string
  loading?: boolean
  availablePools?: GithubPoolInfo[]
  onSelectPool?: (pool: GithubPoolInfo | null) => void
}

// Add SwapSuccessDialog interface and component
interface SwapSuccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  signature: string
  fromToken: {
    symbol: string
    amount: string
    icon?: string
  }
  toToken: {
    symbol: string
    amount: string
    icon?: string
  }
  poolAddress: string
}

function SwapSuccessDialog(props: SwapSuccessDialogProps) {
  const { open, onOpenChange, signature, fromToken, toToken, poolAddress } = props

  // Create Solscan URLs for transaction and pool
  const solscanUrl = `https://solscan.io/tx/${signature}?cluster=devnet`
  const poolUrl = `https://solscan.io/account/${poolAddress}?cluster=devnet`

  // Copy to clipboard function
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast.success(`${type} copied to clipboard`)
      },
      () => {
        toast.error('Could not copy text')
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Check className="w-6 h-6 text-green-500" />
            Swap Completed Successfully
          </DialogTitle>
          <DialogDescription className="text-base">
            Your swap transaction has been confirmed on the Solana blockchain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <Alert variant="default" className="bg-green-900/20 text-green-400 border-green-800/50">
            <Check className="h-5 w-5 text-green-500" />
            <AlertTitle className="text-base font-medium">Transaction Confirmed</AlertTitle>
            <AlertDescription className="text-sm">
              You&apos;ve successfully swapped {fromToken.amount} {fromToken.symbol} for{' '}
              {toToken.amount} {toToken.symbol}.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6">
            {/* Transaction ID */}
            <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-blue-500"
                  >
                    <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>
                    <line x1="16" y1="8" x2="2" y2="22"></line>
                    <line x1="17.5" y1="15" x2="9" y2="15"></line>
                  </svg>
                  Transaction
                </h3>
                <a
                  href={solscanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 flex items-center text-sm font-medium"
                >
                  View on Solscan <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
              <div
                className="bg-slate-800 p-3 rounded border border-slate-700 font-mono text-sm break-all cursor-pointer hover:bg-slate-700 transition-colors text-white"
                onClick={() => copyToClipboard(signature, 'Transaction ID')}
              >
                {signature}
                <div className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  Click to copy
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Swap Details */}
              <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-purple-500"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M8 12h8"></path>
                      <path d="M12 16V8"></path>
                    </svg>
                    Swap Details
                  </h3>
                </div>
                <div className="bg-slate-800 p-3 rounded border border-slate-700 text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      {fromToken.icon ? (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={fromToken.icon} alt={fromToken.symbol} />
                          <AvatarFallback>{fromToken.symbol.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-6 w-6 bg-slate-700 rounded-full flex items-center justify-center text-xs">
                          {fromToken.symbol.slice(0, 2)}
                        </div>
                      )}
                      <span className="font-medium">
                        {fromToken.amount} {fromToken.symbol}
                      </span>
                    </div>
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      {toToken.icon ? (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={toToken.icon} alt={toToken.symbol} />
                          <AvatarFallback>{toToken.symbol.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-6 w-6 bg-slate-700 rounded-full flex items-center justify-center text-xs">
                          {toToken.symbol.slice(0, 2)}
                        </div>
                      )}
                      <span className="font-medium">
                        {toToken.amount} {toToken.symbol}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pool Info */}
              <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-amber-500"
                    >
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                    Pool Used
                  </h3>
                  <a
                    href={poolUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center text-sm font-medium"
                  >
                    View <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
                <div
                  className="bg-slate-800 p-3 rounded border border-slate-700 font-mono text-sm overflow-hidden text-ellipsis cursor-pointer hover:bg-slate-700 transition-colors text-white"
                  onClick={() => copyToClipboard(poolAddress, 'Pool address')}
                >
                  <div className="truncate">{poolAddress}</div>
                  <div className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Click to copy
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Close
          </Button>
          <Button
            onClick={() => window.open(solscanUrl, '_blank')}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            View Transaction Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SwapInterface({
  onFromTokenChange,
  onToTokenChange,
  initialPoolAddress,
  loading,
  availablePools = [],
  onSelectPool,
}: SwapInterfaceProps) {
  const { t } = useLanguage()
  const { tokens, loading: loadingTokens, refreshTokens } = useWalletTokens()

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
  const [_ammConfigInfo, setAmmConfigInfo] = useState<AmmConfigInfo | null>(null)
  // Thêm state để theo dõi xem người dùng đã chọn pool thủ công chưa
  const [userSelectedPool, setUserSelectedPool] = useState(!!initialPoolAddress)

  // Thêm state để theo dõi xem người dùng đã chọn token thủ công chưa
  const [userSelectedTokens, setUserSelectedTokens] = useState({
    from: false,
    to: false,
  })

  // Thêm state để lưu danh sách token có pool tương thích với token đầu vào
  const [compatibleTokens, setCompatibleTokens] = useState<string[]>([])
  const [loadingCompatibleTokens, setLoadingCompatibleTokens] = useState(false)

  // Thêm cache cho danh sách pool từ GitHub để tránh gọi API quá nhiều
  const [poolsCache, setPoolsCache] = useState<{
    timestamp: number
    pools: SwapGithubPool[]
  } | null>(null)

  // Thêm state để lưu danh sách token từ GitHub
  const [githubTokens, setGithubTokens] = useState<GithubTokenInfo[]>([])
  const [loadingGithubTokens, setLoadingGithubTokens] = useState(false)

  // State cho chức năng chọn pool từ GitHub
  const [githubPools, setGithubPools] = useState<SwapGithubPool[]>([])
  const [enrichedPools, setEnrichedPools] = useState<SwapGithubPool[]>([]) // State mới để lưu pools có thông tin phong phú
  const [loadingGithubPools, setLoadingGithubPools] = useState(false)
  const [enrichingPools, setEnrichingPools] = useState(false) // State mới để theo dõi quá trình làm giàu thông tin
  const [poolSearchTerm, setPoolSearchTerm] = useState('')
  const [showPoolSelector, setShowPoolSelector] = useState(false)

  // Add state for swap success dialog
  const [showSwapSuccessDialog, setShowSwapSuccessDialog] = useState(false)
  const [swapSuccessData, setSwapSuccessData] = useState<{
    signature: string
    fromToken: {
      symbol: string
      amount: string
      icon?: string
    }
    toToken: {
      symbol: string
      amount: string
      icon?: string
    }
  } | null>(null)

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

  // Tạo RPC connection
  const connection = useMemo(
    () =>
      new Connection(
        process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
        'confirmed'
      ),
    []
  )

  // Sử dụng program từ hook hoặc khởi tạo nếu cần
  const raydiumProgram = program as Program<RaydiumCpSwap>
  const swapService = new SwapService(raydiumProgram, connection)

  // Bọc poolFinder trong useMemo để tránh tạo lại mỗi lần render
  const poolFinder = useMemo(
    () => new PoolFinder(raydiumProgram, connection),
    [raydiumProgram, connection]
  )

  // Get selected tokens from mints
  const fromToken = tokens.find(token => token.mint === fromTokenMint)
  const toToken = tokens.find(token => token.mint === toTokenMint)

  // Kiểm tra xem ví đã kết nối chưa
  const isConnected = !!wallet.publicKey

  // Hàm để lấy danh sách pool từ GitHub
  const fetchGithubPools = async () => {
    setLoadingGithubPools(true)
    try {
      // Nếu đã có pools có sẵn từ props, sử dụng chúng
      let poolsToUse: SwapGithubPool[] = []
      if (availablePools && availablePools.length > 0) {
        poolsToUse = [...availablePools] // Tạo bản sao để không ảnh hưởng đến prop gốc
      } else {
        // Nếu không, tải từ API
        poolsToUse = await getGithubPoolsWithCache()
      }

      setGithubPools(poolsToUse)

      // Bắt đầu làm giàu thông tin token ngay lập tức
      if (poolsToUse && poolsToUse.length > 0) {
        setEnrichingPools(true)

        // Đảm bảo enriched pools là array mới để tránh lỗi reference
        const enrichedPoolsArray: SwapGithubPool[] = []

        // Chỉ làm giàu tối đa 20 pools để tránh quá tải
        const poolsToEnrich = poolsToUse.slice(0, 20)

        // Thực hiện làm giàu thông tin từng pool một và cập nhật UI ngay lập tức
        for (const pool of poolsToEnrich) {
          try {
            const enrichedPool = await GithubPoolService.enrichPoolTokenInfo(pool)
            if (enrichedPool) {
              enrichedPoolsArray.push(enrichedPool)

              // Cập nhật UI sau mỗi pool được làm giàu thông tin
              setEnrichedPools(prev => {
                // Thêm pool mới hoặc cập nhật pool đã có
                const existingIndex = prev.findIndex(
                  p => p.poolAddress === enrichedPool.poolAddress
                )
                if (existingIndex >= 0) {
                  const newPools = [...prev]
                  newPools[existingIndex] = enrichedPool
                  return newPools
                } else {
                  return [...prev, enrichedPool]
                }
              })
            }
          } catch (error) {
            console.error('Lỗi khi làm giàu thông tin pool:', error)
          }
        }
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách pool từ GitHub:', error)
      toast.error('Không thể tải danh sách pool từ GitHub')
    } finally {
      setEnrichingPools(false)
      setLoadingGithubPools(false)
    }
  }

  // Lấy danh sách pool từ GitHub khi mở dialog
  useEffect(() => {
    if (showPoolSelector && githubPools.length === 0) {
      fetchGithubPools()
    }
  }, [showPoolSelector, githubPools.length])

  // Pre-load và làm giàu thông tin cho các pool quan trọng khi component được mount
  useEffect(() => {
    // Chỉ thực hiện khi có pool từ props và chưa có enriched pools
    if (availablePools && availablePools.length > 0 && enrichedPools.length === 0) {
      // Chỉ thực hiện việc làm giàu ngầm cho các pool quan trọng (5 pool đầu tiên)
      const importantPools = availablePools.slice(0, 5)

      // Không hiển thị loading state để tránh làm phiền người dùng
      const preloadPoolInfo = async () => {
        for (const pool of importantPools) {
          if (!pool.poolAddress) continue

          try {
            const enrichedPool = await GithubPoolService.enrichPoolTokenInfo(pool)
            if (enrichedPool) {
              setEnrichedPools(prev => {
                const existingIndex = prev.findIndex(
                  p => p.poolAddress === enrichedPool.poolAddress
                )
                if (existingIndex >= 0) {
                  const newPools = [...prev]
                  newPools[existingIndex] = enrichedPool
                  return newPools
                } else {
                  return [...prev, enrichedPool]
                }
              })
            }
          } catch (error) {
            console.error('Lỗi khi preload thông tin pool:', error)
          }
        }
      }

      preloadPoolInfo()
    }
  }, [availablePools])

  // Effect để xử lý khi initialPoolAddress thay đổi
  useEffect(() => {
    if (initialPoolAddress && initialPoolAddress !== poolAddress) {
      setPoolAddress(initialPoolAddress)
      setUserSelectedPool(true) // Đánh dấu là người dùng đã chọn pool

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

  // Hàm để reset pool đã chọn
  const resetSelectedPool = () => {
    setUserSelectedPool(false)
    setPoolAddress('')
    setCurrentPool(null)
    if (onSelectPool) {
      onSelectPool(null)
    }

    // Nếu đã có token từ và token đến, tự động tìm pool
    if (fromTokenMint && toTokenMint && fromTokenMint !== toTokenMint) {
      findPoolForTokens()
    }
  }

  // Hàm tìm pool dựa trên cặp token
  const findPoolForTokens = async () => {
    if (!fromTokenMint || !toTokenMint || fromTokenMint === toTokenMint || !raydiumProgram) {
      return
    }

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

  // Tìm pool khi cặp token thay đổi - chỉ khi người dùng chưa chọn pool thủ công
  useEffect(() => {
    const findPool = async () => {
      if (
        !fromTokenMint ||
        !toTokenMint ||
        fromTokenMint === toTokenMint ||
        !raydiumProgram ||
        userSelectedPool
      ) {
        // Không tìm pool nếu người dùng đã chọn pool thủ công
        return
      }

      findPoolForTokens()
    }

    findPool()
  }, [fromTokenMint, toTokenMint, raydiumProgram, poolFinder, userSelectedPool])

  // Lấy danh sách pool từ GitHub với caching
  const getGithubPoolsWithCache = async (): Promise<SwapGithubPool[]> => {
    // Nếu có sẵn pools từ props, ưu tiên sử dụng chúng
    if (availablePools && availablePools.length > 0) {
      return availablePools
    }

    // Nếu có cache và còn hợp lệ (dưới 5 phút), sử dụng cache
    const CACHE_TTL = 5 * 60 * 1000 // 5 phút
    if (poolsCache && Date.now() - poolsCache.timestamp < CACHE_TTL) {
      return poolsCache.pools
    }

    // Nếu không có cache hoặc cache hết hạn, lấy danh sách mới
    const pools = await GithubPoolService.getAllPools()

    // Lưu vào cache
    setPoolsCache({
      timestamp: Date.now(),
      pools: pools || [],
    })

    return pools || []
  }

  // Cải thiện hàm tìm kiếm token tương thích
  useEffect(() => {
    const findCompatibleTokens = async () => {
      if (!fromTokenMint || !raydiumProgram) {
        setCompatibleTokens([])
        return
      }

      setLoadingCompatibleTokens(true)
      try {
        const compatibleTokenMints: string[] = []

        // 1. Tìm các token tương thích từ pool on-chain
        try {
          // Lấy tất cả pool từ chương trình Raydium
          const onChainPools = await raydiumProgram.account.poolState.all()

          // Lọc và lấy các token tương thích
          onChainPools.forEach(pool => {
            const poolToken0 = pool.account.token0Mint.toString()
            const poolToken1 = pool.account.token1Mint.toString()

            if (poolToken0 === fromTokenMint) {
              compatibleTokenMints.push(poolToken1)
            } else if (poolToken1 === fromTokenMint) {
              compatibleTokenMints.push(poolToken0)
            }
          })

          console.log(`Tìm thấy ${compatibleTokenMints.length} token tương thích từ blockchain`)
        } catch (error) {
          console.error('Lỗi khi tìm token tương thích từ blockchain:', error)
        }

        // 2. Tìm các token tương thích từ danh sách pool GitHub
        try {
          // Lấy danh sách pool từ GitHub (sử dụng cache)
          const pools = await getGithubPoolsWithCache()

          // Tìm các pool có chứa token đầu vào
          pools.forEach(pool => {
            if (pool.token0?.mint === fromTokenMint && pool.token1?.mint) {
              compatibleTokenMints.push(pool.token1.mint)
            } else if (pool.token1?.mint === fromTokenMint && pool.token0?.mint) {
              compatibleTokenMints.push(pool.token0.mint)
            }
          })

          console.log(`Tìm thấy ${compatibleTokenMints.length} token tương thích tổng cộng`)
        } catch (error) {
          console.error('Lỗi khi tìm token tương thích từ GitHub:', error)
        }

        // Loại bỏ các token trùng lặp
        const uniqueCompatibleTokens = [...new Set(compatibleTokenMints)]

        console.log(`Sau khi loại bỏ trùng lặp: ${uniqueCompatibleTokens.length} token tương thích`)
        setCompatibleTokens(uniqueCompatibleTokens)

        // Cảnh báo nếu không tìm thấy token tương thích
        if (uniqueCompatibleTokens.length === 0) {
          toast.warning(`Không tìm thấy token nào có pool với ${fromTokenMint.slice(0, 8)}...`)
        }
      } catch (error) {
        console.error('Lỗi khi tìm token tương thích:', error)
        toast.error('Không thể tìm token tương thích')
        setCompatibleTokens([])
      } finally {
        setLoadingCompatibleTokens(false)
      }
    }

    findCompatibleTokens()
  }, [fromTokenMint, raydiumProgram])

  // Lấy danh sách token từ GitHub
  useEffect(() => {
    const fetchGithubTokens = async () => {
      setLoadingGithubTokens(true)
      try {
        const poolService = new GithubPoolService()
        const tokens = await poolService.getTokens()
        setGithubTokens(tokens)
      } catch (error) {
        console.error('Lỗi khi lấy danh sách token từ GitHub:', error)
        toast.error('Không thể lấy danh sách token từ GitHub')
      } finally {
        setLoadingGithubTokens(false)
      }
    }

    fetchGithubTokens()
  }, [])

  // Lọc danh sách token tương thích từ githubTokens
  const compatibleGithubTokens = useMemo(() => {
    if (!fromTokenMint || compatibleTokens.length === 0) return []

    return githubTokens.filter(token => token.mint && compatibleTokens.includes(token.mint))
  }, [fromTokenMint, compatibleTokens, githubTokens])

  // Hàm để chọn pool từ GitHub
  const selectGithubPool = async (pool: SwapGithubPool) => {
    if (!pool || !pool.poolAddress) {
      toast.error('Pool không hợp lệ')
      return
    }

    try {
      setSearchingPool(true)
      setCurrentPool(null)
      setAmmConfigInfo(null)
      setUserSelectedPool(true) // Đánh dấu là người dùng đã chọn pool thủ công

      // Đặt địa chỉ pool
      setPoolAddress(pool.poolAddress)

      // Nếu pool chưa được làm giàu thông tin, thực hiện trước khi sử dụng
      let poolWithTokenInfo = pool
      if (!pool.token0?.icon || !pool.token1?.icon) {
        const enrichedPool = await GithubPoolService.enrichPoolTokenInfo(pool)
        if (enrichedPool !== null) {
          poolWithTokenInfo = enrichedPool
        }
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

      // Thông báo ra ngoài về pool đã chọn
      if (onSelectPool) {
        onSelectPool(pool)
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
  }, [fromAmount, fromToken, toToken, provider, poolAddress, currentPool, poolFinder])

  useEffect(() => {
    if (fromAmount && Number(fromAmount) > 0 && fromToken && toToken && currentPool) {
      calculateSwap()
    } else {
      setToAmount('')
      setSwapData(null)
    }
  }, [fromAmount, fromToken, toToken, currentPool, calculateSwap, poolFinder])

  const handleSwapTokens = () => {
    const tempTokenMint = fromTokenMint
    setFromTokenMint(toTokenMint)
    setToTokenMint(tempTokenMint)
    setFromAmount(toAmount)
    setToAmount(fromAmount)

    // Chuyển đổi trạng thái của token đã chọn
    const tempFromSelected = userSelectedTokens.from
    setUserSelectedTokens({
      from: userSelectedTokens.to,
      to: tempFromSelected,
    })

    // Reset userSelectedPool khi đổi token để tìm pool mới
    if (fromTokenMint !== toTokenMint) {
      setUserSelectedPool(false)
    }
  }

  // Thêm hàm validate amount để không cho phép nhập quá số dư
  const validateAmount = (value: string, tokenBalance: number): string => {
    // Loại bỏ các ký tự không phải số
    const numericValue = value.replace(/[^0-9.]/g, '')

    // Nếu giá trị không phải số hợp lệ, trả về chuỗi rỗng
    if (isNaN(parseFloat(numericValue))) {
      return ''
    }

    // Kiểm tra xem giá trị có vượt quá số dư không
    const amount = parseFloat(numericValue)
    if (amount > tokenBalance) {
      toast.warning('Amount exceeds your token balance')
      return tokenBalance.toString()
    }

    return numericValue
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

      // Store swap success data
      setSwapSuccessData({
        signature: result.signature,
        fromToken: {
          symbol: fromToken.symbol,
          amount: fromAmount,
          icon: fromToken.icon,
        },
        toToken: {
          symbol: toToken.symbol,
          amount: swapData.outputAmount.toFixed(6),
          icon: toToken.icon,
        },
      })

      // Show success dialog
      setShowSwapSuccessDialog(true)

      // Reset form after successful swap
      setFromAmount('')
      setToAmount('')
      setSwapData(null)

      // Làm mới token balances sau 2 giây
      setTimeout(() => {
        refreshTokens().catch(err => console.error('Error refreshing token:', err))
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

  // Hàm rút gọn địa chỉ để hiển thị
  const renderSafeAddress = (address: string | undefined | null) => {
    if (!address) return 'N/A'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Hàm tìm pool đã được làm giàu thông tin
  const getEnrichedPool = (poolAddress: string): SwapGithubPool | undefined => {
    return (
      enrichedPools.find(p => p.poolAddress === poolAddress) ||
      githubPools.find(p => p.poolAddress === poolAddress)
    )
  }

  // Xử lý khi người dùng chọn token đầu vào
  const handleFromTokenChange = (tokenMint: string) => {
    if (tokenMint === fromTokenMint) return // Không làm gì nếu token không thay đổi

    // Đánh dấu là người dùng đã chủ động chọn token đầu vào
    setUserSelectedTokens(prev => ({ ...prev, from: true }))

    setFromTokenMint(tokenMint)

    // Reset token đầu ra nếu đã chọn trước đó và không còn tương thích
    if (toTokenMint && !compatibleTokens.includes(toTokenMint)) {
      setToTokenMint('')
      // Thông báo với người dùng
      toast.info('Đã đặt lại token đầu ra vì không tìm thấy pool tương thích')

      // Chỉ reset pool đã chọn thủ công khi token đầu ra không còn tương thích
      setUserSelectedPool(false)
      setCurrentPool(null)
      setPoolAddress('')
    }

    // Thông báo với người dùng
    toast.info('Đang tìm các token tương thích...')
  }

  // Hiển thị trong giao diện
  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('swap.title')}</span>
            <Button variant="outline" size="icon" aria-label="Settings">
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
                  <GithubTokenSelect
                    value={fromTokenMint}
                    onChange={handleFromTokenChange}
                    excludeToken={toTokenMint}
                    disabled={swapping || loadingGithubTokens}
                    placeholder={loadingGithubTokens ? 'Đang tải token...' : 'Select token'}
                  />
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={fromAmount}
                      onChange={e => {
                        const validatedAmount = fromToken
                          ? validateAmount(e.target.value, fromToken.balance)
                          : e.target.value
                        setFromAmount(validatedAmount)
                      }}
                      className="flex-1"
                      disabled={swapping || !fromTokenMint}
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
                  disabled={swapping || !fromTokenMint || !toTokenMint}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>

              {/* To Token */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  {t('swap.to')}
                  {loadingCompatibleTokens && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                  {!loadingCompatibleTokens && compatibleTokens.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {compatibleTokens.length} pools tương thích
                    </Badge>
                  )}
                </Label>
                <div className="flex flex-col space-y-2">
                  <GithubTokenSelect
                    value={toTokenMint}
                    onChange={value => {
                      setToTokenMint(value)
                      setUserSelectedTokens(prev => ({ ...prev, to: true }))
                    }}
                    excludeToken={fromTokenMint}
                    disabled={swapping || !fromTokenMint || loadingCompatibleTokens}
                    placeholder={
                      loadingCompatibleTokens ? 'Đang tìm token tương thích...' : 'Select token'
                    }
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
                <div className="flex justify-between text-sm items-center">
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

                {/* Pool Selection Button */}
                <div className="flex gap-2">
                  <Dialog open={showPoolSelector} onOpenChange={setShowPoolSelector}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        {loadingGithubPools ? (
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

                        {enrichingPools && (
                          <div className="flex items-center justify-center text-xs text-muted-foreground bg-muted/30 py-1 px-3 rounded-md">
                            <Loader2 className="h-3 w-3 animate-spin mr-2" />
                            <span>Đang tải thông tin token...</span>
                          </div>
                        )}

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
                                                  className="app-logo"
                                                  onError={e => {
                                                    // Nếu ảnh lỗi, thay thế bằng fallback
                                                    ;(e.target as HTMLImageElement).src =
                                                      '/placeholder-logo.svg'
                                                  }}
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
                                                  className="app-logo"
                                                  onError={e => {
                                                    // Nếu ảnh lỗi, thay thế bằng fallback
                                                    ;(e.target as HTMLImageElement).src =
                                                      '/placeholder-logo.svg'
                                                  }}
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
                                              <span>
                                                Pool: {renderSafeAddress(pool.poolAddress)}
                                              </span>
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

                  {userSelectedPool && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetSelectedPool}
                      disabled={searchingPool || swapping}
                      className="flex-shrink-0"
                    >
                      Reset
                    </Button>
                  )}
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

      {/* Add SwapSuccessDialog */}
      {swapSuccessData && (
        <SwapSuccessDialog
          open={showSwapSuccessDialog}
          onOpenChange={setShowSwapSuccessDialog}
          signature={swapSuccessData.signature}
          fromToken={swapSuccessData.fromToken}
          toToken={swapSuccessData.toToken}
          poolAddress={poolAddress}
        />
      )}
    </>
  )
}
