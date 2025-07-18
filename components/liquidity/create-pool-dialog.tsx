'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { toast } from 'sonner'
import { TokenSelect, TokenSelectProps } from '@/components/TokenSelect/TokenSelect'
import { useWalletTokens } from '@/hooks/useWalletTokens'
import { usePoolCreation } from '@/hooks/usePoolCreation'
import { Check, ExternalLink, Info, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { getDetailTokenExtensions } from '@/lib/service/tokenService'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { PoolFinder } from '@/lib/utils/pool-finder'
import { PublicKey } from '@solana/web3.js'
import { useAnchorProvider } from '@/hooks/useAnchorProvider'

// Định nghĩa interface cho thông tin token
interface TokenInfo {
  isToken2022?: boolean
  transferHook?: {
    authority?: string
    programId?: string
  } | null
  extensions?: string[]
}

interface CreatePoolDialogProps {
  _open: boolean
  onOpenChange: (_open: boolean) => void
}

interface SuccessDialogProps {
  _open: boolean
  onOpenChange: (_open: boolean) => void
  txid: string
  poolAddress: string
  lpMintAddress: string
}

function SuccessDialog(props: SuccessDialogProps) {
  const { _open: open, onOpenChange, txid, poolAddress, lpMintAddress } = props

  // Dựa vào môi trường để tạo link phù hợp (ở đây dùng devnet)
  const solscanUrl = `https://solscan.io/tx/${txid}?cluster=devnet`
  const poolUrl = `https://solscan.io/account/${poolAddress}?cluster=devnet`
  const lpMintUrl = `https://solscan.io/token/${lpMintAddress}?cluster=devnet`

  // Hàm sao chép vào clipboard
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
            Pool Created Successfully
          </DialogTitle>
          <DialogDescription className="text-base">
            Your liquidity pool has been created successfully and is now available on the Solana
            blockchain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <Alert variant="default" className="bg-green-900/20 text-green-400 border-green-800/50">
            <Check className="h-5 w-5 text-green-500" />
            <AlertTitle className="text-base font-medium">Transaction Confirmed</AlertTitle>
            <AlertDescription className="text-sm">
              Your transaction has been successfully confirmed on the Solana blockchain.
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
                onClick={() => copyToClipboard(txid, 'Transaction ID')}
              >
                {txid}
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
              {/* Pool Address */}
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
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                    Pool Address
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

              {/* LP Token */}
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
                      <circle cx="12" cy="12" r="10"></circle>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    LP Token
                  </h3>
                  <a
                    href={lpMintUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center text-sm font-medium"
                  >
                    View <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
                <div
                  className="bg-slate-800 p-3 rounded border border-slate-700 font-mono text-sm overflow-hidden text-ellipsis cursor-pointer hover:bg-slate-700 transition-colors text-white"
                  onClick={() => copyToClipboard(lpMintAddress, 'LP token address')}
                >
                  <div className="truncate">{lpMintAddress}</div>
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
            onClick={() => window.open(poolUrl, '_blank')}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            View Pool Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Thêm component AlertInfo để hiển thị thông tin về Transfer Hook và tự động whitelist
interface AlertInfoProps {
  showAlert: boolean
  hasTransferHook: boolean
}

function AlertInfo({ showAlert, hasTransferHook }: AlertInfoProps) {
  if (!showAlert || !hasTransferHook) return null

  return (
    <Alert className="mt-4 bg-blue-900/20 text-blue-400 border-blue-800/50">
      <Info className="h-5 w-5" />
      <AlertTitle>Important Information</AlertTitle>
      <AlertDescription className="text-sm">
        <p className="mb-1">
          You are creating a pool with a token that has a Transfer Hook. The vault will be
          automatically added to the token whitelist.
        </p>
      </AlertDescription>
    </Alert>
  )
}

// Thêm component hiển thị thông báo lỗi
interface ErrorDisplayProps {
  error: string | null
  txHash?: string
}

function ErrorDisplay({ error, txHash }: ErrorDisplayProps) {
  if (!error) return null

  const getSolscanLink = (hash: string) => `https://solscan.io/tx/${hash}?cluster=devnet`

  return (
    <Alert variant="destructive" className="mt-4">
      <AlertCircle className="h-5 w-5" />
      <AlertTitle>Pool Creation Error</AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          <p>{error}</p>
          {txHash && (
            <>
              <p className="font-mono text-xs break-all">Transaction hash: {txHash}</p>
              <a
                href={getSolscanLink(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white underline flex items-center gap-1"
              >
                View details on Solscan
                <ExternalLink size={12} />
              </a>
            </>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

interface TokenWithBalance {
  balance: number
  symbol: string
}

function isTokenWithBalance(token: unknown): token is TokenWithBalance {
  return (
    typeof token === 'object' &&
    token !== null &&
    'balance' in token &&
    typeof (token as { balance: unknown }).balance === 'number' &&
    'symbol' in token &&
    typeof (token as { symbol: unknown }).symbol === 'string'
  )
}

export function CreatePoolDialog(props: CreatePoolDialogProps) {
  const { _open: open, onOpenChange } = props
  const { connected: isConnected } = useWallet()
  const { setVisible } = useWalletModal()
  const { tokens } = useWalletTokens()
  const { createPool, error: poolCreationError } = usePoolCreation()
  const { provider, program } = useAnchorProvider()

  const [poolType, setPoolType] = useState<'standard' | 'custom'>('standard')
  const [tokenAMint, setTokenAMint] = useState('')
  const [tokenBMint, setTokenBMint] = useState('')
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  const [creatingPool, setCreatingPool] = useState(false)
  // Thêm state để kiểm tra trùng lặp pool
  const [isDuplicatePool, setIsDuplicatePool] = useState(false)
  const [duplicatePoolAddress, setDuplicatePoolAddress] = useState<string | null>(null)

  // State để lưu thông tin chi tiết về token extensions
  const [tokenAInfo, setTokenAInfo] = useState<TokenInfo | null>(null)
  const [tokenBInfo, setTokenBInfo] = useState<TokenInfo | null>(null)

  // Thêm state cho dialog thành công
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [createdPoolInfo, setCreatedPoolInfo] = useState<{
    txid: string
    poolAddress: string
    lpMintAddress: string
  } | null>(null)

  // Thêm state để kiểm tra xem có token nào có transfer hook không
  const [showAutoWhitelistInfo, setShowAutoWhitelistInfo] = useState(false)
  const [hasTransferHookToken, setHasTransferHookToken] = useState(false)

  // Thêm state để lưu transaction hash lỗi
  const [errorTxHash, setErrorTxHash] = useState<string | undefined>()

  useEffect(() => {
    if (poolCreationError) {
      toast.error(`Pool creation error: ${poolCreationError}`)
    }
  }, [poolCreationError])

  // Tự động lấy thông tin extensions khi chọn token
  useEffect(() => {
    async function fetchTokenAInfo() {
      if (tokenAMint) {
        try {
          const info = await getDetailTokenExtensions(tokenAMint)
          setTokenAInfo(info)
        } catch (error) {
          console.error('Error fetching token A info:', error)
          toast.error(`Token không hợp lệ hoặc không lấy được thông tin decimal: ${tokenAMint}`)
          // Reset lựa chọn token không hợp lệ
          setTokenAMint('')
          setTokenAInfo(null)
        }
      } else {
        setTokenAInfo(null)
      }
    }
    fetchTokenAInfo()
  }, [tokenAMint])

  useEffect(() => {
    async function fetchTokenBInfo() {
      if (tokenBMint) {
        try {
          const info = await getDetailTokenExtensions(tokenBMint)
          setTokenBInfo(info)
        } catch (error) {
          console.error('Error fetching token B info:', error)
          toast.error(`Token không hợp lệ hoặc không lấy được thông tin decimal: ${tokenBMint}`)
          // Reset lựa chọn token không hợp lệ
          setTokenBMint('')
          setTokenBInfo(null)
        }
      } else {
        setTokenBInfo(null)
      }
    }
    fetchTokenBInfo()
  }, [tokenBMint])

  useEffect(() => {
    // Kiểm tra nếu có token nào có transfer hook
    const checkTransferHook = tokenAInfo?.transferHook || tokenBInfo?.transferHook
    setHasTransferHookToken(!!checkTransferHook)

    // Hiển thị thông tin chỉ khi cả hai token đã được chọn
    if (tokenAMint && tokenBMint) {
      setShowAutoWhitelistInfo(true)
    } else {
      setShowAutoWhitelistInfo(false)
    }
  }, [tokenAMint, tokenBMint, tokenAInfo, tokenBInfo])

  // Sửa lại useEffect để lấy transaction hash từ lỗi
  useEffect(() => {
    if (poolCreationError) {
      // Kiểm tra xem có transaction hash trong lỗi không
      const txHashMatch = poolCreationError.match(/Transaction hash: ([a-zA-Z0-9]{43,})/)
      const solscanMatch = poolCreationError.match(
        /Solscan: https:\/\/solscan\.io\/tx\/([a-zA-Z0-9]{43,})/
      )

      if (txHashMatch && txHashMatch[1]) {
        setErrorTxHash(txHashMatch[1])
      } else if (solscanMatch && solscanMatch[1]) {
        setErrorTxHash(solscanMatch[1])
      } else {
        setErrorTxHash(undefined)
      }
    } else {
      setErrorTxHash(undefined)
    }
  }, [poolCreationError])

  // Thêm effect để kiểm tra xem đã tồn tại pool với cặp token này chưa
  useEffect(() => {
    const checkExistingPool = async () => {
      // Chỉ kiểm tra khi cả hai token đã được chọn và provider đã sẵn sàng
      if (!tokenAMint || !tokenBMint || !provider || !program) {
        setIsDuplicatePool(false)
        setDuplicatePoolAddress(null)
        return
      }

      try {
        // Khởi tạo PoolFinder để tìm pool
        const poolFinder = new PoolFinder(program, provider.connection)

        // Tìm pool hiện có với cặp token này
        const existingPool = await poolFinder.findPoolByTokens(
          new PublicKey(tokenAMint),
          new PublicKey(tokenBMint)
        )

        // Nếu tìm thấy pool, đánh dấu là trùng lặp
        if (existingPool) {
          setIsDuplicatePool(true)
          setDuplicatePoolAddress(existingPool.poolAddress.toString())
          toast.warning('A pool with these tokens already exists!')
        } else {
          setIsDuplicatePool(false)
          setDuplicatePoolAddress(null)
        }
      } catch (error) {
        console.error('Error checking for existing pool:', error)
        setIsDuplicatePool(false)
        setDuplicatePoolAddress(null)
      }
    }

    checkExistingPool()
  }, [tokenAMint, tokenBMint, provider, program])

  const tokenA = tokens.find(token => token.mint === tokenAMint)
  const tokenB = tokens.find(token => token.mint === tokenBMint)

  // Chuẩn bị props cho TokenSelect
  const tokenASelectProps: TokenSelectProps = {
    value: tokenAMint,
    onChange: setTokenAMint,
    excludeToken: tokenBMint,
    disabled: creatingPool,
    includeSol: false,
    includeWrappedSol: true,
    forPoolCreation: true,
    placeholder: 'Select token A',
  }

  const tokenBSelectProps: TokenSelectProps = {
    value: tokenBMint,
    onChange: setTokenBMint,
    excludeToken: tokenAMint,
    disabled: creatingPool,
    includeSol: false,
    includeWrappedSol: true,
    forPoolCreation: true,
    placeholder: 'Select token B',
  }

  // Hiển thị badge dựa trên loại token
  const renderTokenTypeBadge = (tokenInfo: TokenInfo | null) => {
    if (!tokenInfo) return null

    return (
      <div className="flex items-center gap-1 text-xs mt-1">
        {tokenInfo.isToken2022 ? (
          <Badge variant="outline" className="bg-purple-100/30 text-purple-600 border-purple-200">
            Token-2022
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-blue-100/30 text-blue-600 border-blue-200">
            SPL Token
          </Badge>
        )}

        {tokenInfo.isToken2022 && tokenInfo.transferHook && (
          <Badge variant="outline" className="bg-amber-100/30 text-amber-600 border-amber-200">
            Transfer Hook
          </Badge>
        )}
      </div>
    )
  }

  const handleConnectWallet = async () => {
    try {
      setVisible(true)
    } catch {
      toast.error('Failed to open wallet selector. Please try again.')
    }
  }

  // Thêm hàm để xác thực số lượng token
  const validateAmount = (value: string, token: unknown): string => {
    // Loại bỏ các ký tự không phải số
    const numericValue = value.replace(/[^0-9.]/g, '')

    // Nếu giá trị không phải số hợp lệ, trả về chuỗi rỗng
    if (isNaN(parseFloat(numericValue))) {
      return ''
    }

    // Lấy số lượng chữ số thập phân hiện tại
    const parts = numericValue.split('.')
    const hasDecimal = parts.length > 1
    const decimalPart = hasDecimal ? parts[1] : ''

    // Kiểm tra xem token có thuộc tính decimals không
    if (!token || typeof token !== 'object' || !('decimals' in token)) {
      // Nếu không có thông tin decimals, thông báo lỗi
      toast.error('Không có thông tin decimals cho token này')
      return numericValue // Vẫn trả về giá trị hiện tại
    }

    const tokenDecimals = (token as { decimals: number }).decimals

    // Nếu số lượng chữ số thập phân vượt quá decimals của token, cắt bớt
    if (hasDecimal && decimalPart.length > tokenDecimals) {
      const truncatedValue = `${parts[0]}.${decimalPart.substring(0, tokenDecimals)}`
      return truncatedValue
    }

    // Kiểm tra xem có token và giá trị có vượt quá số dư không
    if (isTokenWithBalance(token) && parseFloat(numericValue) > token.balance) {
      toast.warning(`Amount exceeds your ${token.symbol} balance`)
      return token.balance.toString()
    }

    return numericValue
  }

  // Thêm hàm định dạng số lượng token theo decimal
  const formatTokenAmount = (amount: number, _decimals: number) => {
    // Định dạng số với dấu phẩy ngăn cách hàng nghìn và chỉ hiển thị 1 số thập phân
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1, // Chỉ hiển thị 1 số thập phân thay vì đầy đủ
    })
  }

  const handleCreatePool = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    try {
      setCreatingPool(true)
      setErrorTxHash(undefined) // Reset error hash khi bắt đầu tạo pool mới

      const tokenA = tokens.find(t => t.mint === tokenAMint)
      const tokenB = tokens.find(t => t.mint === tokenBMint)

      if (!tokenA || !tokenB) {
        toast.error('Token accounts not found')
        return
      }

      if (!tokenA.address || !tokenB.address) {
        toast.error('Token account addresses not found')
        return
      }

      const decimalsA = tokenA.decimals
      const decimalsB = tokenB.decimals

      const parsedAmountA = parseFloat(amountA) * Math.pow(10, decimalsA)
      const parsedAmountB = parseFloat(amountB) * Math.pow(10, decimalsB)

      const result = await createPool({
        token0Mint: tokenAMint,
        token1Mint: tokenBMint,
        token0Account: tokenA.address,
        token1Account: tokenB.address,
        initAmount0: parsedAmountA.toString(),
        initAmount1: parsedAmountB.toString(),
      })

      // Lưu thông tin pool đã tạo và hiển thị dialog thành công
      setCreatedPoolInfo({
        txid: result.txid,
        poolAddress: result.poolAddress,
        lpMintAddress: result.lpMintAddress,
      })

      // Đóng dialog tạo pool
      onOpenChange(false)

      // Mở dialog thành công
      setSuccessDialogOpen(true)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create pool'

      // Kiểm tra xem có transaction hash trong lỗi không
      if (typeof errorMessage === 'string') {
        const txHashMatch = errorMessage.match(/Transaction hash: ([a-zA-Z0-9]{43,})/)
        const solscanMatch = errorMessage.match(
          /Solscan: https:\/\/solscan\.io\/tx\/([a-zA-Z0-9]{43,})/
        )

        if (txHashMatch && txHashMatch[1]) {
          setErrorTxHash(txHashMatch[1])
        } else if (solscanMatch && solscanMatch[1]) {
          setErrorTxHash(solscanMatch[1])
        }
      }

      toast.error(errorMessage)
    } finally {
      setCreatingPool(false)
    }
  }

  // Chuẩn bị thông tin về token type cho hiển thị
  const getTokenTypeSummary = () => {
    if (!tokenAInfo || !tokenBInfo) return null

    let typeDescription = ''
    const hasAnyToken2022 = tokenAInfo.isToken2022 || tokenBInfo.isToken2022
    const hasAnyTransferHook =
      (tokenAInfo.isToken2022 && tokenAInfo.transferHook) ||
      (tokenBInfo.isToken2022 && tokenBInfo.transferHook)

    if (!hasAnyToken2022) {
      typeDescription = 'Standard SPL Tokens'
    } else if (hasAnyTransferHook) {
      typeDescription = 'Transfer Hook Compatible'
    } else if (hasAnyToken2022) {
      typeDescription = 'Token-2022 Compatible'
    }

    return typeDescription
  }

  // Hiển thị thông báo trùng lặp nếu phát hiện pool đã tồn tại
  const renderDuplicatePoolWarning = () => {
    if (!isDuplicatePool) return null

    return (
      <Alert className="mt-4 bg-amber-900/20 text-amber-400 border-amber-800/50">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>Pool Already Exists</AlertTitle>
        <AlertDescription className="text-sm">
          <p className="mb-1">
            A pool with these tokens already exists. You cannot create a duplicate pool.
          </p>
          {duplicatePoolAddress && (
            <p className="text-xs font-mono">Pool address: {duplicatePoolAddress}</p>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Liquidity Pool</DialogTitle>
            <DialogDescription>
              Create a new liquidity pool to enable trading between two tokens
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={poolType}
            onValueChange={value => setPoolType(value as 'standard' | 'custom')}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="standard">Standard Pool</TabsTrigger>
              <TabsTrigger value="custom">Custom Pool</TabsTrigger>
            </TabsList>

            <TabsContent value="standard" className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tokenA">Token A</Label>
                  <TokenSelect {...tokenASelectProps} />
                  {renderTokenTypeBadge(tokenAInfo)}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tokenB">Token B</Label>
                  <TokenSelect {...tokenBSelectProps} />
                  {renderTokenTypeBadge(tokenBInfo)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amountA">
                    Amount A {tokenA && `(Decimals: ${tokenA.decimals})`}
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="amountA"
                      type="number"
                      placeholder="0.0"
                      value={amountA}
                      onChange={e => setAmountA(validateAmount(e.target.value, tokenA))}
                      step={tokenA ? `1e-${tokenA.decimals}` : '0.000000001'}
                    />
                    {tokenA && (
                      <Badge variant="outline" className="whitespace-nowrap">
                        Balance: {formatTokenAmount(tokenA.balance, tokenA.decimals)}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amountB">
                    Amount B {tokenB && `(Decimals: ${tokenB.decimals})`}
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="amountB"
                      type="number"
                      placeholder="0.0"
                      value={amountB}
                      onChange={e => setAmountB(validateAmount(e.target.value, tokenB))}
                      step={tokenB ? `1e-${tokenB.decimals}` : '0.000000001'}
                    />
                    {tokenB && (
                      <Badge variant="outline" className="whitespace-nowrap">
                        Balance: {formatTokenAmount(tokenB.balance, tokenB.decimals)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customTokenA">Custom Token A</Label>
                  <TokenSelect {...tokenASelectProps} />
                  {renderTokenTypeBadge(tokenAInfo)}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customTokenB">Custom Token B</Label>
                  <TokenSelect {...tokenBSelectProps} />
                  {renderTokenTypeBadge(tokenBInfo)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customAmountA">
                    Amount A {tokenA && `(Decimals: ${tokenA.decimals})`}
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="customAmountA"
                      type="number"
                      placeholder="0.0"
                      value={amountA}
                      onChange={e => setAmountA(validateAmount(e.target.value, tokenA))}
                      disabled={creatingPool}
                      step={tokenA ? `1e-${tokenA.decimals}` : '0.000000001'}
                    />
                    {tokenA && (
                      <Badge variant="outline" className="whitespace-nowrap">
                        Balance: {formatTokenAmount(tokenA.balance, tokenA.decimals)}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customAmountB">
                    Amount B {tokenB && `(Decimals: ${tokenB.decimals})`}
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="customAmountB"
                      type="number"
                      placeholder="0.0"
                      value={amountB}
                      onChange={e => setAmountB(validateAmount(e.target.value, tokenB))}
                      disabled={creatingPool}
                      step={tokenB ? `1e-${tokenB.decimals}` : '0.000000001'}
                    />
                    {tokenB && (
                      <Badge variant="outline" className="whitespace-nowrap">
                        Balance: {formatTokenAmount(tokenB.balance, tokenB.decimals)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Advanced Settings</h4>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {tokenAMint && tokenBMint && amountA && amountB && (
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-medium mb-3">Pool Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Pool Type:</span>
                    <Badge variant={poolType === 'standard' ? 'default' : 'secondary'}>
                      {poolType === 'standard' ? 'Standard' : 'Custom'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Tokens:</span>
                    <span>
                      {tokenA?.symbol || tokenAMint.slice(0, 6)} /{' '}
                      {tokenB?.symbol || tokenBMint.slice(0, 6)}
                    </span>
                  </div>
                  {getTokenTypeSummary() && (
                    <div className="flex justify-between">
                      <span>Token Compatibility:</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className="flex items-center gap-1 cursor-help">
                              {getTokenTypeSummary()}
                              <Info className="h-3 w-3" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>This AMM now supports all token combinations:</p>
                            <ul className="list-disc pl-4 mt-1 text-xs">
                              <li>SPL Token + SPL Token</li>
                              <li>SPL Token + Token-2022</li>
                              <li>Token-2022 + Token-2022</li>
                              <li>SPL Token + Token with Transfer Hook</li>
                              <li>Token-2022 + Token with Transfer Hook</li>
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Initial Liquidity:</span>
                    <span>
                      {amountA} {tokenA?.symbol || ''} + {amountB} {tokenB?.symbol || ''}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Thêm AlertInfo component ở đây */}
          <AlertInfo showAlert={showAutoWhitelistInfo} hasTransferHook={hasTransferHookToken} />

          {/* Thêm thông báo trùng lặp nếu có */}
          {renderDuplicatePoolWarning()}

          {/* Hiển thị thông báo lỗi nếu có */}
          <ErrorDisplay error={poolCreationError} txHash={errorTxHash} />

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creatingPool}>
              Cancel
            </Button>
            {!isConnected ? (
              <Button onClick={handleConnectWallet} className="w-full">
                Connect Wallet
              </Button>
            ) : (
              <Button
                onClick={handleCreatePool}
                className="w-full"
                disabled={
                  creatingPool ||
                  !tokenAMint ||
                  !tokenBMint ||
                  !amountA ||
                  !amountB ||
                  isDuplicatePool
                }
              >
                {creatingPool
                  ? 'Creating Pool...'
                  : isDuplicatePool
                    ? 'Pool Already Exists'
                    : 'Create Pool'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {createdPoolInfo && (
        <SuccessDialog
          _open={successDialogOpen}
          onOpenChange={setSuccessDialogOpen}
          txid={createdPoolInfo.txid}
          poolAddress={createdPoolInfo.poolAddress}
          lpMintAddress={createdPoolInfo.lpMintAddress}
        />
      )}
    </>
  )
}
