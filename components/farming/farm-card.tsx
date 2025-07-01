import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Coins, Clock } from "lucide-react"

interface FarmCardProps {
  farm: {
    name: string
    tokens: { symbol: string; icon: string }[]
    apy: string
    tvl: string
    rewards: string[]
    timeLeft: string
    userStaked: string
    pendingRewards: string
    isActive: boolean
  }
}

export function FarmCard({ farm }: FarmCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {farm.tokens.map((token, index) => (
              <Avatar key={index} className="h-8 w-8 border-2 border-background">
                <AvatarImage src={token.icon || "/placeholder.svg"} />
                <AvatarFallback>{token.symbol}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <CardTitle className="text-lg">{farm.name}</CardTitle>
        </div>
        <Badge variant={farm.isActive ? "default" : "secondary"}>{farm.isActive ? "Active" : "Ended"}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">APY</p>
            <p className="font-semibold text-green-500">{farm.apy}</p>
          </div>
          <div>
            <p className="text-muted-foreground">TVL</p>
            <p className="font-semibold">{farm.tvl}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Your Stake</p>
            <p className="font-semibold">{farm.userStaked}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Pending Rewards</p>
            <p className="font-semibold text-yellow-500">{farm.pendingRewards}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Coins className="h-4 w-4" />
            <span>Rewards: {farm.rewards.join(", ")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <span>Time left: {farm.timeLeft}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button className="flex-1">Stake</Button>
          <Button variant="outline" className="flex-1 bg-transparent">
            Harvest
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
