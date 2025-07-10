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
} from 'lucide-react'
import { useLanguage } from '@/lib/contexts/language-context'
import { toast } from 'sonner'
import { TokenSelect, TokenSelectProps } from '@/components/TokenSelect/TokenSelect'
import { useWalletTokens } from '@/hooks/useWalletTokens'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { SwapService } from '@/lib/service/swapService'
import { Program } from '@coral-xyz/anchor'
import { RaydiumCpSwap } from '../../idl/types/raydium_cp_swap'
import { useAnchorProvider } from '@/hooks/useAnchorProvider'
import { PoolFinder, PoolInfo, AmmConfigInfo } from '@/lib/utils/pool-finder'

export interface SwapInterfaceProps {
  onFromTokenChange?: (tokenMint: string) => void
  onToTokenChange?: (tokenMint: string) => void
}

export function SwapInterface({ onFromTokenChange, onToTokenChange }: SwapInterfaceProps) {
  const { t } = useLanguage()
  const { tokens, loading: tokensLoading, refreshTokens } = useWalletTokens()
  const { tokens: nonSolTokens } = useWalletTokens({ includeSol: false })
  const wallet = useWallet()
  const { provider, program } = useAnchorProvider()

  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [fromTokenMint, setFromTokenMint] = useState('')
  const [toTokenMint, setToTokenMint] = useState('')
  const [poolAddress, setPoolAddress] = useState('')
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

  useEffect(() => {
    // Set default tokens when tokens are loaded
    if (nonSolTokens.length > 0 && !fromTokenMint) {
      setFromTokenMint(nonSolTokens[0]?.mint)
    }
    if (nonSolTokens.length > 1 && !toTokenMint) {
      setToTokenMint(nonSolTokens[1]?.mint)
    }
  }, [nonSolTokens, fromTokenMint, toTokenMint])

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
            'Không tìm thấy pool cho cặp token này. Vui lòng nhập địa chỉ pool thủ công.'
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
      toast.error('Vui lòng kết nối ví, chọn token và nhập địa chỉ pool')
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

      // Tìm xem token nào có hook (nếu có)
      const hookTokenMint = new PublicKey(fromToken.mint) // Giả định token đầu vào có hook, điều chỉnh nếu cần

      // Thực hiện swap với pool address được chỉ định
      const result = await swapService.swap({
        ammConfigIndex: 0, // Điều chỉnh index nếu cần
        inputToken: new PublicKey(fromToken.mint),
        outputToken: new PublicKey(toToken.mint),
        inputTokenAccount: new PublicKey(inputTokenAccount),
        outputTokenAccount: new PublicKey(outputTokenAccount),
        amountIn,
        minimumAmountOut,
        hookTokenMint,
        wallet: {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
        },
        poolAddress: new PublicKey(poolAddress), // Thêm pool address
      })

      toast.success(`Swap thành công! Signature: ${result.signature}`)

      // Reset form sau khi swap thành công
      setFromAmount('')
      setToAmount('')
      setSwapData(null)
    } catch (error) {
      console.error('Swap error:', error)
      toast.error(
        'Không thể thực hiện swap: ' +
          (error instanceof Error ? error.message : 'Lỗi không xác định')
      )
    } finally {
      setSwapping(false)
    }
  }

  const isConnected = !!wallet.publicKey

  // Chuẩn bị props cho TokenSelect
  const fromTokenSelectProps: TokenSelectProps = {
    value: fromTokenMint,
    onChange: setFromTokenMint,
    excludeToken: toTokenMint,
    disabled: swapping,
    includeSol: false,
  }

  const toTokenSelectProps: TokenSelectProps = {
    value: toTokenMint,
    onChange: setToTokenMint,
    excludeToken: fromTokenMint,
    disabled: swapping,
    includeSol: false,
  }

  const isToken0FromToken = () => {
    if (!fromToken || !toToken || !currentPool) return false
    return fromToken.mint === currentPool.token0Mint.toString()
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{t('swap.title')}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              title="Refresh tokens"
              onClick={handleRefreshTokens}
              disabled={refreshingTokens || tokensLoading}
            >
              {refreshingTokens ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* No Tokens Warning */}
        {nonSolTokens.length === 0 && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-500 text-sm">
            <div className="flex items-center gap-2 font-medium mb-1">
              <AlertCircle className="h-4 w-4" />
              Không tìm thấy token trong ví
            </div>
            <p>
              Bạn cần có các token (không phải SOL) trong ví để sử dụng tính năng swap. Vui lòng
              thêm token vào ví của bạn.
            </p>
          </div>
        )}

        {/* Pool Status Indicator */}
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1">
            <Label>Pool:</Label>
            {searchingPool ? (
              <span className="flex items-center gap-1 text-amber-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Đang tìm pool...
              </span>
            ) : currentPool ? (
              <span className="flex items-center gap-1 text-green-500">
                <CheckCircle className="h-3 w-3" />
                Đã tìm thấy
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-500">
                <AlertCircle className="h-3 w-3" />
                Chưa tìm thấy
              </span>
            )}
          </span>
          {ammConfigInfo && (
            <Badge variant="outline" className="text-xs">
              Phí: {(ammConfigInfo.tradeFeeRate / 10000).toFixed(4)}%
            </Badge>
          )}
        </div>

        {/* Pool Address Input */}
        <div className="space-y-2">
          <Label>Pool Address</Label>
          <Input
            placeholder="Đang tìm pool tự động..."
            value={poolAddress}
            onChange={e => setPoolAddress(e.target.value)}
            disabled={swapping || searchingPool}
            className={currentPool ? 'border-green-500' : ''}
          />
        </div>

        {/* From Token */}
        <div className="space-y-2">
          <Label>{t('swap.from')}</Label>
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Input
                placeholder="0.0"
                value={fromAmount}
                onChange={e => setFromAmount(e.target.value)}
                className="text-right text-lg"
                type="number"
                disabled={swapping}
              />
            </div>
            <div className="w-32">
              <TokenSelect {...fromTokenSelectProps} />
            </div>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {t('swap.balance')}: {fromToken?.balance.toLocaleString() || '0'}{' '}
              {fromToken?.symbol || ''}
            </span>
            <span>
              ~$
              {fromToken && Number(fromAmount) > 0 ? (Number(fromAmount) * 10).toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={handleSwapTokens}
            disabled={swapping || calculating || searchingPool}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        {/* To Token */}
        <div className="space-y-2">
          <Label>{t('swap.to')}</Label>
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Input
                placeholder="0.0"
                value={
                  calculating ? t('common.loading') : searchingPool ? 'Đang tìm pool...' : toAmount
                }
                className="text-right text-lg"
                readOnly
              />
            </div>
            <div className="w-32">
              <TokenSelect {...toTokenSelectProps} />
            </div>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {t('swap.balance')}: {toToken?.balance.toLocaleString() || '0'}{' '}
              {toToken?.symbol || ''}
            </span>
            <span>
              ~${toToken && Number(toAmount) > 0 ? (Number(toAmount) * 10).toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        {/* Swap Details */}
        {swapData && ammConfigInfo && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>{t('swap.rate')}</span>
              <span>
                1 {fromToken?.symbol} = {swapData.rate.toFixed(4)} {toToken?.symbol}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Phí giao dịch</span>
              <Badge variant="secondary">{(ammConfigInfo.tradeFeeRate / 10000).toFixed(4)}%</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t('swap.slippage')}</span>
              <Badge variant="secondary">0.5%</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t('swap.minimum')}</span>
              <span>
                {swapData.minimumReceived.toFixed(6)} {toToken?.symbol}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Pool</span>
              <div className="flex items-center gap-1 max-w-[180px] truncate">
                <span className="truncate">{poolAddress}</span>
                <Info className="h-3 w-3" />
              </div>
            </div>
            {/* Thay đổi cách hiển thị thông tin thanh khoản */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Thông tin thanh khoản:</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted rounded-md p-2">
                  <div className="font-medium">{fromToken?.symbol || 'Token 1'}</div>
                  <div className="text-right">
                    {isToken0FromToken()
                      ? currentPool?.token0Balance?.toLocaleString()
                      : currentPool?.token1Balance?.toLocaleString()}
                  </div>
                </div>
                <div className="bg-muted rounded-md p-2">
                  <div className="font-medium">{toToken?.symbol || 'Token 2'}</div>
                  <div className="text-right">
                    {isToken0FromToken()
                      ? currentPool?.token1Balance?.toLocaleString()
                      : currentPool?.token0Balance?.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isConnected ? (
          <Button className="w-full" size="lg" disabled>
            Kết nối ví để swap
          </Button>
        ) : (
          <Button
            className="w-full"
            size="lg"
            onClick={handleSwap}
            disabled={
              !fromAmount ||
              !toAmount ||
              !poolAddress ||
              calculating ||
              swapping ||
              searchingPool ||
              !fromToken ||
              !toToken ||
              nonSolTokens.length === 0
            }
          >
            {swapping ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang swap...
              </span>
            ) : searchingPool ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tìm pool...
              </span>
            ) : nonSolTokens.length === 0 ? (
              'Không có token để swap'
            ) : (
              'Swap'
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
