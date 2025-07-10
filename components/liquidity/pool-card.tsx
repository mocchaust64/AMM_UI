import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, ExternalLink, Share2, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Link from 'next/link'
import { useState } from 'react'
import { TokenIconDisplay } from '@/components/TokenExtension/TokenInfoDisplay'

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
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {pool.tokens.map((token, index) => (
              <div
                key={index}
                className="h-8 w-8 border-2 border-background rounded-full overflow-hidden relative z-10"
                style={{ zIndex: 10 - index }}
              >
                <TokenIconDisplay token={token} />
              </div>
            ))}
          </div>
          <CardTitle className="text-lg">{pool.name}</CardTitle>
        </div>
        <Badge variant={pool.type === 'Standard' ? 'default' : 'secondary'}>{pool.type}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={getExplorerUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <span>{shortenAddress(pool.poolAddress)}</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="font-mono text-xs">{pool.poolAddress}</p>
                <p className="text-xs text-muted-foreground">Xem trên Solana Explorer</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={copyToClipboard}
                    className="p-1 rounded-full hover:bg-muted transition-colors"
                  >
                    <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {isCopied ? 'Đã sao chép!' : 'Sao chép địa chỉ pool'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={`/pool/${pool.poolAddress}`}
                    className="p-1 rounded-full hover:bg-muted transition-colors"
                  >
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top">Xem chi tiết pool</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">TVL</p>
            <p className="font-semibold">{pool.tvl}</p>
          </div>
          <div>
            <p className="text-muted-foreground">APY</p>
            <div className="flex items-center gap-1">
              <p className="font-semibold text-green-500">{pool.apy}</p>
              <TrendingUp className="h-3 w-3 text-green-500" />
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">24h Volume</p>
            <p className="font-semibold">{pool.volume24h}</p>
          </div>
          <div>
            <p className="text-muted-foreground">24h Fees</p>
            <p className="font-semibold">{pool.fees24h}</p>
          </div>
        </div>

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
