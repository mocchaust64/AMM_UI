"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, Settings, Info } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getSwapRate } from "@/lib/api/price-api"
import { useLanguage } from "@/lib/contexts/language-context"
import { toast } from "sonner"

const tokens = [
  { id: "solana", symbol: "SOL", name: "Solana", icon: "/placeholder.svg?height=20&width=20" },
  { id: "usd-coin", symbol: "USDC", name: "USD Coin", icon: "/placeholder.svg?height=20&width=20" },
  { id: "raydium", symbol: "RAY", name: "Raydium", icon: "/placeholder.svg?height=20&width=20" },
]

export function SwapInterface() {
  const { t } = useLanguage()
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [fromToken, setFromToken] = useState(tokens[0])
  const [toToken, setToToken] = useState(tokens[1])
  const [swapData, setSwapData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (fromAmount && Number(fromAmount) > 0) {
      calculateSwap()
    } else {
      setToAmount("")
      setSwapData(null)
    }
  }, [fromAmount, fromToken, toToken])

  const calculateSwap = async () => {
    setLoading(true)
    try {
      const data = await getSwapRate(fromToken.id, toToken.id, Number(fromAmount))
      if (data) {
        setToAmount(data.outputAmount.toFixed(6))
        setSwapData(data)
      }
    } catch (error) {
      console.error("Error calculating swap:", error)
      toast.error("Failed to calculate swap rate")
    } finally {
      setLoading(false)
    }
  }

  const handleSwapTokens = () => {
    const tempToken = fromToken
    setFromToken(toToken)
    setToToken(tempToken)
    setFromAmount(toAmount)
    setToAmount(fromAmount)
  }

  const handleSwap = () => {
    toast.success("Swap executed successfully!")
    setFromAmount("")
    setToAmount("")
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("swap.title")}</CardTitle>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* From Token */}
        <div className="space-y-2">
          <Label>{t("swap.from")}</Label>
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Input
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="text-right text-lg"
                type="number"
              />
            </div>
            <Button variant="outline" className="gap-2 bg-transparent">
              <Avatar className="h-5 w-5">
                <AvatarImage src={fromToken.icon || "/placeholder.svg"} />
                <AvatarFallback>{fromToken.symbol}</AvatarFallback>
              </Avatar>
              {fromToken.symbol}
            </Button>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {t("swap.balance")}: 12.5 {fromToken.symbol}
            </span>
            <span>~${(Number(fromAmount) * 100).toFixed(2)}</span>
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" className="rounded-full" onClick={handleSwapTokens}>
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        {/* To Token */}
        <div className="space-y-2">
          <Label>{t("swap.to")}</Label>
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Input
                placeholder="0.0"
                value={loading ? t("common.loading") : toAmount}
                className="text-right text-lg"
                readOnly
              />
            </div>
            <Button variant="outline" className="gap-2 bg-transparent">
              <Avatar className="h-5 w-5">
                <AvatarImage src={toToken.icon || "/placeholder.svg"} />
                <AvatarFallback>{toToken.symbol}</AvatarFallback>
              </Avatar>
              {toToken.symbol}
            </Button>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {t("swap.balance")}: 0 {toToken.symbol}
            </span>
            <span>~${(Number(toAmount) * 1).toFixed(2)}</span>
          </div>
        </div>

        {/* Swap Details */}
        {swapData && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>{t("swap.rate")}</span>
              <span>
                1 {fromToken.symbol} = {swapData.rate.toFixed(4)} {toToken.symbol}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t("swap.slippage")}</span>
              <Badge variant="secondary">0.5%</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t("swap.minimum")}</span>
              <span>
                {swapData.minimumReceived.toFixed(6)} {toToken.symbol}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t("swap.route")}</span>
              <div className="flex items-center gap-1">
                <span>{swapData.route}</span>
                <Info className="h-3 w-3" />
              </div>
            </div>
          </div>
        )}

        <Button className="w-full" size="lg" onClick={handleSwap} disabled={!fromAmount || !toAmount || loading}>
          {loading ? t("common.loading") : "Swap"}
        </Button>
      </CardContent>
    </Card>
  )
}
