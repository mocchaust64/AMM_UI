'use client'

import { useState, useEffect } from 'react'
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
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Connection } from '@solana/web3.js'
import { TokenService } from '@/lib/service/tokenService'

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

export default function AirdropPage() {
  const { connected, publicKey } = useWallet()

  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [signatures, setSignatures] = useState<Record<string, string>>({})
  const [tokenInfos, setTokenInfos] = useState<Record<string, TokenInfoResult>>({})

  const tokens: TokenInfo[] = [
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
  ]

  // Lấy token info từ blockchain khi component mount
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

      toast.success(data.message || `Đã gửi ${tokenSymbol} tới ví của bạn thành công`)

      // Lưu signature nếu có
      if (data.signature) {
        setSignatures(prev => ({
          ...prev,
          [tokenSymbol]: data.signature,
        }))
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
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <Link href="/">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft size={16} />
            back to home{' '}
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-center flex-1">Airdrop Token For Testing Swap</h1>
        <div className="w-[120px]"></div> {/* Spacer để cân bằng layout */}
      </div>

      {!connected ? (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Connect wallet</CardTitle>
            <CardDescription>Please connect your wallet to claim free tokens</CardDescription>
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
          <li>3. Wait for the tokens to be sent to your wallet (usually takes a few seconds)</li>
          <li>4. Return to the main page to use the swap feature</li>
        </ol>
        <p className="mt-6 text-sm text-muted-foreground">
          Note: These tokens are for testing purposes only and have no real value.
        </p>

        <Link href="/" className="mt-8 inline-block">
          <Button className="gap-2">Back to Swap </Button>
        </Link>
      </div>
    </div>
  )
}
