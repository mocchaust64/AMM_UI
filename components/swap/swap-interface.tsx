"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, Settings, Info } from "lucide-react"
import { useLanguage } from "@/lib/contexts/language-context"
import { toast } from "sonner"
import { TokenSelect } from "@/components/TokenSelect"
import { useWalletTokens } from "@/hooks/useWalletTokens"

export function SwapInterface() {
  const { t } = useLanguage()
  const { tokens } = useWalletTokens()
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [fromTokenMint, setFromTokenMint] = useState("")
  const [toTokenMint, setToTokenMint] = useState("")
  const [swapData, setSwapData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Get selected tokens from mints
  const fromToken = tokens.find(token => token.mint === fromTokenMint)
  const toToken = tokens.find(token => token.mint === toTokenMint)

  useEffect(() => {
    // Set default tokens when tokens are loaded
    if (tokens.length > 0 && !fromTokenMint) {
      setFromTokenMint(tokens[0]?.mint)
    }
    if (tokens.length > 1 && !toTokenMint) {
      setToTokenMint(tokens[1]?.mint)
    }
  }, [tokens, fromTokenMint, toTokenMint])

  useEffect(() => {
    if (fromAmount && Number(fromAmount) > 0 && fromToken && toToken) {
      calculateSwap()
    } else {
      setToAmount("")
      setSwapData(null)
    }
  }, [fromAmount, fromToken, toToken])

  const calculateSwap = async () => {
    if (!fromToken || !toToken) return

    setLoading(true)
    try {
      // Mock swap calculation
      const mockRate = Math.random() * 10 + 0.1
      const outputAmount = Number(fromAmount) * mockRate
      
      setToAmount(outputAmount.toFixed(6))
      setSwapData({
        outputAmount,
        rate: mockRate,
        minimumReceived: outputAmount * 0.995,
        route: "Jupiter",
      })
    } catch (error) {
      console.error("Error calculating swap:", error)
      toast.error("Failed to calculate swap rate")
    } finally {
      setLoading(false)
    }
  }

  const handleSwapTokens = () => {
    const tempTokenMint = fromTokenMint
    setFromTokenMint(toTokenMint)
    setToTokenMint(tempTokenMint)
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
            <div className="w-32">
              <TokenSelect 
                value={fromTokenMint}
                onChange={setFromTokenMint}
                excludeToken={toTokenMint}
              />
            </div>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {t("swap.balance")}: {fromToken?.balance.toLocaleString() || "0"} {fromToken?.symbol || ""}
            </span>
            <span>~${fromToken && Number(fromAmount) > 0 ? (Number(fromAmount) * 10).toFixed(2) : "0.00"}</span>
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
            <div className="w-32">
              <TokenSelect 
                value={toTokenMint}
                onChange={setToTokenMint}
                excludeToken={fromTokenMint}
              />
            </div>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {t("swap.balance")}: {toToken?.balance.toLocaleString() || "0"} {toToken?.symbol || ""}
            </span>
            <span>~${toToken && Number(toAmount) > 0 ? (Number(toAmount) * 10).toFixed(2) : "0.00"}</span>
          </div>
        </div>

        {/* Swap Details */}
        {swapData && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>{t("swap.rate")}</span>
              <span>
                1 {fromToken?.symbol} = {swapData.rate.toFixed(4)} {toToken?.symbol}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t("swap.slippage")}</span>
              <Badge variant="secondary">0.5%</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t("swap.minimum")}</span>
              <span>
                {swapData.minimumReceived.toFixed(6)} {toToken?.symbol}
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

        <Button 
          className="w-full" 
          size="lg" 
          onClick={handleSwap} 
          disabled={!fromAmount || !toAmount || loading || !fromToken || !toToken}
        >
          {loading ? t("common.loading") : "Swap"}
        </Button>
      </CardContent>
    </Card>
  )
}
