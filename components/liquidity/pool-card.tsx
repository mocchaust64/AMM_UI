import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, ExternalLink, Share2, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Link from 'next/link'
import { useState } from 'react'
import { TokenIconDisplay } from '@/components/TokenExtension/TokenInfoDisplay'
import Image from 'next/image'
import React from 'react'

interface PoolCardProps {
  pool: {
    name: string
    tokens: { symbol: string; icon: string; name?: string }[]
    tvl: string
    apy: string
    volume24h: string
    fees24h: string
    type: 'Standard' | 'Custom'
    isActive: boolean
    poolAddress: string
  }
}

export function PoolCard({ pool }: PoolCardProps) {
  const [isCopied, setIsCopied] = useState(false)

  // Hàm rút gọn địa chỉ
  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  // Hàm copy địa chỉ vào clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(pool.poolAddress)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  // Lấy URL của Solana Explorer cho pool
  const getExplorerUrl = () => {
    return `https://explorer.solana.com/address/${pool.poolAddress}?cluster=devnet`
  }

  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden border border-slate-200 dark:border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-3 px-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center" style={{ width: '58px', height: '34px' }}>
            {pool.tokens.map((token, index) => {
              // Tính toán vị trí của mỗi token icon để không bị chồng lấp
              const positionStyle = {
                position: 'absolute',
                zIndex: 10 - index,
                left: index * 24 + 'px',
              } as React.CSSProperties

              return (
                <div
                  key={index}
                  style={positionStyle}
                  className="h-8 w-8 rounded-full overflow-hidden bg-white border-2 border-background shadow-sm"
                >
                  {token.icon ? (
                    <Image
                      src={token.icon}
                      alt={token.symbol || 'Token'}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
                      <span className="text-white font-semibold text-xs">
                        {token.symbol?.slice(0, 2) || '??'}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div>
            <CardTitle className="text-base font-semibold">
              {pool.tokens[0]?.symbol || 'Token'}/{pool.tokens[1]?.symbol || 'Token'}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {shortenAddress(pool.poolAddress)}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={copyToClipboard}
                      className="inline-flex ml-1 hover:text-primary"
                    >
                      <Share2 className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {isCopied ? 'Copied!' : 'Copy pool address'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </p>
          </div>
        </div>
        <Badge variant={pool.type === 'Standard' ? 'default' : 'secondary'}>{pool.type}</Badge>
      </CardHeader>

      <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-3 grid grid-cols-2 gap-x-8 gap-y-3 border-t border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs text-muted-foreground mb-1">TVL</p>
          <p className="font-semibold text-base">{pool.tvl}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">APY</p>
          <div className="flex items-center gap-1">
            <p className="font-semibold text-base text-green-500">{pool.apy}</p>
            {pool.apy !== 'N/A' && <TrendingUp className="h-3 w-3 text-green-500" />}
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">24h Volume</p>
          <p className="font-semibold text-base">{pool.volume24h}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">24h Fees</p>
          <p className="font-semibold text-base">{pool.fees24h}</p>
        </div>
      </div>

      <CardContent className="px-4 py-3">
        <div className="flex gap-2">
          <Button className="flex-1">Add Liquidity</Button>
          <Button variant="outline" className="flex-1 bg-transparent">
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
