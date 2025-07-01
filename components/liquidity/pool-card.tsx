import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TrendingUp } from "lucide-react"

interface PoolCardProps {
  pool: {
    name: string
    tokens: { symbol: string; icon: string }[]
    tvl: string
    apy: string
    volume24h: string
    fees24h: string
    type: "Standard" | "Custom"
    isActive: boolean
  }
}

export function PoolCard({ pool }: PoolCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {pool.tokens.map((token, index) => (
              <Avatar key={index} className="h-8 w-8 border-2 border-background">
                <AvatarImage src={token.icon || "/placeholder.svg"} />
                <AvatarFallback>{token.symbol}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <CardTitle className="text-lg">{pool.name}</CardTitle>
        </div>
        <Badge variant={pool.type === "Standard" ? "default" : "secondary"}>{pool.type}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
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
