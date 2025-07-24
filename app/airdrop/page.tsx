'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Loader2, Check, Copy } from 'lucide-react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Connection } from '@solana/web3.js'
import { TokenService } from '@/lib/service/tokenService'
import { handleSilentError } from '@/lib/utils/error-utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// Interface cho token
interface TokenInfo {
  name: string
  symbol: string
  image?: string
  description: string
  mintAddress?: string
  tokenInfo?: {
    name: string
    symbol: string
    icon: string
  }
}

interface TokenInfoResult {
  icon?: string
  name?: string
  symbol?: string
}

// Interface cho AirdropSuccessDialog
interface AirdropSuccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  signature: string
  token: {
    symbol: string
    amount: number
    icon?: string
  }
  tokenInfo?: {
    type: string
    standard: string
    programId: string
    mintAddress: string
    transferHook?: boolean
    transferHookProgramId?: string
  }
}

// Component hiển thị thông tin giao dịch airdrop thành công
function AirdropSuccessDialog(props: AirdropSuccessDialogProps) {
  const { open, onOpenChange, signature, token, tokenInfo } = props

  // URL xem giao dịch trên Solana Explorer
  const solscanUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`
  const mintUrl = tokenInfo?.mintAddress
    ? `https://explorer.solana.com/address/${tokenInfo.mintAddress}?cluster=devnet`
    : ''

  // Hàm copy vào clipboard
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast.success(`${type} đã được sao chép`)
      },
      () => {
        toast.error('Không thể sao chép văn bản')
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Check className="w-6 h-6 text-green-500" />
            Airdrop Thành Công
          </DialogTitle>
          <DialogDescription className="text-base">
            Giao dịch của bạn đã được xác nhận trên blockchain Solana.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <Alert variant="default" className="bg-green-900/20 text-green-400 border-green-800/50">
            <Check className="h-5 w-5 text-green-500" />
            <AlertTitle className="text-base font-medium">Giao dịch Thành Công</AlertTitle>
            <AlertDescription className="text-sm">
              Bạn đã nhận thành công {token.amount} {token.symbol}.
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
                  Mã Giao Dịch
                </h3>
                <a
                  href={solscanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 flex items-center text-sm font-medium"
                >
                  Xem trên Solscan <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
              <div
                className="bg-slate-800 p-3 rounded border border-slate-700 font-mono text-sm break-all cursor-pointer hover:bg-slate-700 transition-colors text-white"
                onClick={() => copyToClipboard(signature, 'Mã giao dịch')}
              >
                {signature}
                <div className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                  <Copy size={12} />
                  Nhấp để sao chép
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Token Details */}
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
                    Thông Tin Token
                  </h3>
                </div>
                <div className="bg-slate-800 p-3 rounded border border-slate-700 text-sm">
                  <div className="flex items-center gap-2 mb-3">
                    {token.icon ? (
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={token.icon} alt={token.symbol} />
                        <AvatarFallback>{token.symbol.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-10 w-10 bg-slate-700 rounded-full flex items-center justify-center text-xs">
                        {token.symbol.slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-lg">
                        {token.amount} {token.symbol}
                      </span>
                      {tokenInfo && (
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {tokenInfo.standard}
                          </Badge>
                          {tokenInfo.transferHook && (
                            <Badge
                              variant="outline"
                              className="bg-amber-100/20 text-amber-500 border-amber-200 text-xs"
                            >
                              Transfer Hook
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {tokenInfo && (
                    <div className="space-y-1 text-xs mt-2 text-slate-300">
                      <div className="flex justify-between">
                        <span>Token Type:</span>
                        <span>{tokenInfo.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Program ID:</span>
                        <span className="font-mono">
                          {tokenInfo.programId.slice(0, 6)}...{tokenInfo.programId.slice(-4)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mint Info */}
              {tokenInfo?.mintAddress && (
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
                      Mint Address
                    </h3>
                    {mintUrl && (
                      <a
                        href={mintUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center text-sm font-medium"
                      >
                        Xem <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    )}
                  </div>
                  <div
                    className="bg-slate-800 p-3 rounded border border-slate-700 font-mono text-sm overflow-hidden text-ellipsis cursor-pointer hover:bg-slate-700 transition-colors text-white"
                    onClick={() => copyToClipboard(tokenInfo.mintAddress, 'Mint address')}
                  >
                    <div className="truncate">{tokenInfo.mintAddress}</div>
                    <div className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                      <Copy size={12} />
                      Nhấp để sao chép
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Đóng
          </Button>
          <Button
            onClick={() => window.open(solscanUrl, '_blank')}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            Xem Chi Tiết Giao Dịch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AirdropPage() {
  const { connected, publicKey } = useWallet()

  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [signatures, setSignatures] = useState<Record<string, string>>({})
  const [tokenInfos, setTokenInfos] = useState<Record<string, TokenInfoResult>>({})

  // Thêm state cho dialog thành công
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [successData, setSuccessData] = useState<{
    signature: string
    token: {
      symbol: string
      amount: number
      icon?: string
    }
    tokenInfo?: any
  } | null>(null)

  const tokens: TokenInfo[] = useMemo(
    () => [
      {
        name: 'USDC',
        symbol: 'USDC',
        description: 'Standard SPL Token for Swap Trading',
        mintAddress: 'BFR68SCH16jfXkgWxaY4ZAE4y1KNUxhE9baag8YeZEBj',
        image:
          'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
      },
      {
        name: 'Wrapped SOL',
        symbol: 'wSOL',
        description: 'SOL is wrapped into SPL token for use in DeFi',
        mintAddress: 'So11111111111111111111111111111111111111112',
      },
      {
        name: 'Token 2022',
        symbol: 'TK22',
        image: '/images/10.avif',
        description: 'New Token Standard with Advanced Solana Features',
        mintAddress: 'EyqZRrQBwtjdvHQS5BKWKHSh9HAtFhsAXzptP8wp2949',
      },
      {
        name: 'Transfer Hook Token',
        symbol: 'HOOK',
        image: '/images/tdh.jpg',
        description: 'Token 2022 with Transfer Hook integration',
        mintAddress: 'GQLRDyiqAEfBVL1LZQRvBNkN6L4b3fPynHqZtPQkV5y9',
      },
    ],
    []
  )

  useEffect(() => {
    const fetchTokenInfo = async () => {
      const connection = new Connection(
        process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
        'confirmed'
      )

      const infoResults: Record<string, TokenInfoResult> = {}

      for (const token of tokens) {
        if (token.mintAddress) {
          try {
            // Tìm thông tin token từ blockchain
            const tokenInfo = await TokenService.getTokenIconAndName(token.mintAddress, connection)
            infoResults[token.mintAddress] = tokenInfo
          } catch (error) {
            handleSilentError(error, 'Lỗi xảy ra khi lấy thông tin token')
            // Lỗi xảy ra khi lấy thông tin token
          }
        }
      }

      setTokenInfos(infoResults)
    }

    fetchTokenInfo()
  }, [tokens])

  // Lấy token info với fallback
  const getTokenInfo = (token: TokenInfo) => {
    // Sử dụng hình ảnh từ định nghĩa token nếu có, hoặc từ blockchain
    const icon =
      token.image ||
      (token.mintAddress && tokenInfos[token.mintAddress]?.icon) ||
      '/placeholder-logo.svg'

    // Luôn ưu tiên tên và symbol từ định nghĩa token (đã được khai báo trực tiếp)
    return {
      name: token.name,
      symbol: token.symbol,
      icon,
    }
  }

  const handleClaimToken = async (tokenSymbol: string) => {
    if (!connected || !publicKey) {
      toast.error('Vui lòng kết nối ví của bạn trước')
      return
    }

    setIsLoading(tokenSymbol)

    try {
      const response = await fetch('/api/airdrop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicKey: publicKey.toBase58(),
          tokenSymbol,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra')
      }

      if (data.signature) {
        setSignatures(prev => ({
          ...prev,
          [tokenSymbol]: data.signature,
        }))

        const currentToken = tokens.find(t => t.symbol === tokenSymbol)
        const info = currentToken ? getTokenInfo(currentToken) : null

        setSuccessData({
          signature: data.signature,
          token: {
            symbol: tokenSymbol,
            amount: AIRDROP_AMOUNTS[tokenSymbol as keyof typeof AIRDROP_AMOUNTS],
            icon: info?.icon,
          },
          tokenInfo: data.tokenType,
        })
        setShowSuccessDialog(true)
      }
    } catch (error) {
      toast.error(
        `Lỗi khi claim ${tokenSymbol}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setIsLoading(null)
    }
  }

  // Hàm tạo URL để xem transaction trên Solana Explorer
  const getSolanaExplorerUrl = (signature: string) => {
    return `https://explorer.solana.com/tx/${signature}?cluster=devnet`
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="container mx-auto">
              <div className="flex items-center justify-between mb-8">
                <Link href="/">
                  <Button variant="ghost" className="gap-2">
                    <ArrowLeft size={16} />
                    Back to home{' '}
                  </Button>
                </Link>
                <h1 className="text-3xl font-bold text-center flex-1">
                  Airdrop Token For Testing Swap
                </h1>
                <div className="w-[120px]"></div> {/* Spacer để cân bằng layout */}
              </div>

              {!connected ? (
                <Card className="max-w-md mx-auto">
                  <CardHeader>
                    <CardTitle>Connect wallet</CardTitle>
                    <CardDescription>
                      Please connect your wallet to claim free tokens
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {tokens.map(token => {
                    const info = getTokenInfo(token)
                    return (
                      <Card key={token.symbol} className="flex flex-col">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                              {info.icon ? (
                                <Image
                                  src={info.icon}
                                  alt={info.symbol}
                                  width={48}
                                  height={48}
                                  className="object-cover app-logo"
                                  onError={e => {
                                    // Fallback nếu ảnh lỗi
                                    ;(e.target as HTMLImageElement).src = '/placeholder-logo.svg'
                                  }}
                                />
                              ) : (
                                <span className="text-xl font-bold">{token.symbol.charAt(0)}</span>
                              )}
                            </div>
                            <div>
                              <CardTitle>{info.name}</CardTitle>
                              <CardDescription className="flex items-center gap-1">
                                <span>{info.symbol}</span>
                                {token.mintAddress && (
                                  <Badge variant="outline" className="text-xs ml-1">
                                    Devnet
                                  </Badge>
                                )}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                          <p className="text-sm text-muted-foreground">{token.description}</p>
                          {token.mintAddress && (
                            <p className="mt-2 text-xs font-mono text-muted-foreground truncate">
                              Mint: {token.mintAddress}
                            </p>
                          )}
                          {signatures[token.symbol] && (
                            <div className="mt-2">
                              <Link
                                href={getSolanaExplorerUrl(signatures[token.symbol])}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 flex items-center gap-1 hover:underline"
                              >
                                <ExternalLink size={12} />
                                Xem giao dịch
                              </Link>
                            </div>
                          )}
                        </CardContent>
                        <CardFooter>
                          <Button
                            className="w-full"
                            onClick={() => handleClaimToken(token.symbol)}
                            disabled={isLoading === token.symbol}
                          >
                            {isLoading === token.symbol ? (
                              <div className="flex items-center">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Đang xử lý...
                              </div>
                            ) : (
                              `Claim ${token.symbol}`
                            )}
                          </Button>
                        </CardFooter>
                      </Card>
                    )
                  })}
                </div>
              )}

              <div className="max-w-2xl mx-auto mt-12 text-center">
                <h2 className="text-2xl font-semibold mb-4">Instructions</h2>
                <ol className="text-left space-y-3">
                  <li>1. Connect your Solana wallet</li>
                  <li>2. Claim the tokens you want to use for testing</li>
                  <li>
                    3. Wait for the tokens to be sent to your wallet (usually takes a few seconds)
                  </li>
                  <li>4. Return to the main page to use the swap feature</li>
                </ol>
                <p className="mt-6 text-sm text-muted-foreground">
                  Note: These tokens are for testing purposes only and have no real value.
                </p>

                <Link href="/" className="mt-8 inline-block">
                  <Button className="gap-2">Back to Swap </Button>
                </Link>
              </div>

              {/* Thêm AirdropSuccessDialog */}
              {successData && (
                <AirdropSuccessDialog
                  open={showSuccessDialog}
                  onOpenChange={setShowSuccessDialog}
                  signature={successData.signature}
                  token={successData.token}
                  tokenInfo={successData.tokenInfo}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

// Định nghĩa hằng số AIRDROP_AMOUNTS
const AIRDROP_AMOUNTS = {
  USDC: 100,
  wSOL: 1,
  TK22: 100,
  HOOK: 100,
}
