"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useWallet } from "@/lib/contexts/wallet-context"
import { toast } from "sonner"

interface CreatePoolDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const availableTokens = [
  { id: "solana", symbol: "SOL", name: "Solana", icon: "/placeholder.svg?height=32&width=32" },
  { id: "usd-coin", symbol: "USDC", name: "USD Coin", icon: "/placeholder.svg?height=32&width=32" },
  { id: "raydium", symbol: "RAY", name: "Raydium", icon: "/placeholder.svg?height=32&width=32" },
  { id: "serum", symbol: "SRM", name: "Serum", icon: "/placeholder.svg?height=32&width=32" },
]

export function CreatePoolDialog({ open, onOpenChange }: CreatePoolDialogProps) {
  const { isConnected, connect } = useWallet()
  const [poolType, setPoolType] = useState<"standard" | "custom">("standard")
  const [tokenA, setTokenA] = useState("")
  const [tokenB, setTokenB] = useState("")
  const [amountA, setAmountA] = useState("")
  const [amountB, setAmountB] = useState("")
  const [feeRate, setFeeRate] = useState("0.3")
  const [isWhitelisted, setIsWhitelisted] = useState(false)
  const [hasTransferHook, setHasTransferHook] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConnectWallet = async () => {
    try {
      await connect("phantom")
      toast.success("Wallet connected successfully!")
    } catch (error) {
      toast.error("Failed to connect wallet. Please make sure Phantom is installed.")
    }
  }

  const handleCreatePool = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first")
      return
    }

    if (!tokenA || !tokenB || !amountA || !amountB) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      // Simulate pool creation
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast.success("Pool created successfully!")
      onOpenChange(false)

      // Reset form
      setTokenA("")
      setTokenB("")
      setAmountA("")
      setAmountB("")
      setFeeRate("0.3")
      setIsWhitelisted(false)
      setHasTransferHook(false)
    } catch (error) {
      toast.error("Failed to create pool")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Liquidity Pool</DialogTitle>
          <DialogDescription>Create a new liquidity pool to enable trading between two tokens</DialogDescription>
        </DialogHeader>

        <Tabs value={poolType} onValueChange={(value) => setPoolType(value as "standard" | "custom")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="standard">Standard Pool</TabsTrigger>
            <TabsTrigger value="custom">Custom Pool</TabsTrigger>
          </TabsList>

          <TabsContent value="standard" className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tokenA">Token A</Label>
                <Select value={tokenA} onValueChange={setTokenA}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select token A" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTokens.map((token) => (
                      <SelectItem key={token.id} value={token.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={token.icon || "/placeholder.svg"} />
                            <AvatarFallback>{token.symbol}</AvatarFallback>
                          </Avatar>
                          <span>{token.name}</span>
                          <Badge variant="outline">{token.symbol}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tokenB">Token B</Label>
                <Select value={tokenB} onValueChange={setTokenB}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select token B" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTokens
                      .filter((token) => token.id !== tokenA)
                      .map((token) => (
                        <SelectItem key={token.id} value={token.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={token.icon || "/placeholder.svg"} />
                              <AvatarFallback>{token.symbol}</AvatarFallback>
                            </Avatar>
                            <span>{token.name}</span>
                            <Badge variant="outline">{token.symbol}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amountA">Amount A</Label>
                <Input
                  id="amountA"
                  type="number"
                  placeholder="0.0"
                  value={amountA}
                  onChange={(e) => setAmountA(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amountB">Amount B</Label>
                <Input
                  id="amountB"
                  type="number"
                  placeholder="0.0"
                  value={amountB}
                  onChange={(e) => setAmountB(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feeRate">Fee Rate (%)</Label>
              <Select value={feeRate} onValueChange={setFeeRate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.05">0.05% - Stable pairs</SelectItem>
                  <SelectItem value="0.3">0.30% - Standard pairs</SelectItem>
                  <SelectItem value="1.0">1.00% - Exotic pairs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customTokenA">Custom Token A Address</Label>
                <Input
                  id="customTokenA"
                  placeholder="Enter token mint address"
                  value={tokenA}
                  onChange={(e) => setTokenA(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customTokenB">Custom Token B Address</Label>
                <Input
                  id="customTokenB"
                  placeholder="Enter token mint address"
                  value={tokenB}
                  onChange={(e) => setTokenB(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customAmountA">Amount A</Label>
                <Input
                  id="customAmountA"
                  type="number"
                  placeholder="0.0"
                  value={amountA}
                  onChange={(e) => setAmountA(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customAmountB">Amount B</Label>
                <Input
                  id="customAmountB"
                  type="number"
                  placeholder="0.0"
                  value={amountB}
                  onChange={(e) => setAmountB(e.target.value)}
                />
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Advanced Settings</h4>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Whitelist Only</Label>
                      <p className="text-sm text-muted-foreground">Restrict pool access to whitelisted addresses</p>
                    </div>
                    <Switch checked={isWhitelisted} onCheckedChange={setIsWhitelisted} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Transfer Hook</Label>
                      <p className="text-sm text-muted-foreground">Enable custom transfer logic for tokens</p>
                    </div>
                    <Switch checked={hasTransferHook} onCheckedChange={setHasTransferHook} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customFeeRate">Custom Fee Rate (%)</Label>
                    <Input
                      id="customFeeRate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      placeholder="0.30"
                      value={feeRate}
                      onChange={(e) => setFeeRate(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {tokenA && tokenB && amountA && amountB && (
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-medium mb-3">Pool Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Pool Type:</span>
                  <Badge variant={poolType === "standard" ? "default" : "secondary"}>
                    {poolType === "standard" ? "Standard" : "Custom"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Fee Rate:</span>
                  <span>{feeRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Initial Liquidity:</span>
                  <span>
                    {amountA} + {amountB}
                  </span>
                </div>
                {poolType === "custom" && (
                  <>
                    <div className="flex justify-between">
                      <span>Whitelist:</span>
                      <span>{isWhitelisted ? "Enabled" : "Disabled"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transfer Hook:</span>
                      <span>{hasTransferHook ? "Enabled" : "Disabled"}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!isConnected ? (
            <Button onClick={handleConnectWallet}>Connect Wallet</Button>
          ) : (
            <Button onClick={handleCreatePool} disabled={loading}>
              {loading ? "Creating Pool..." : "Create Pool"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
