"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Wallet, Coins, Droplets } from "lucide-react"

export function PortfolioOverview() {
  const portfolioData = {
    totalValue: "$74,892.50",
    change24h: "+$1,340.25",
    changePercent: "+1.82%",
    isPositive: true,
  }

  const breakdown = [
    { label: "Tokens", value: "$45,230.00", percentage: "60.3%", icon: Coins },
    { label: "LP Positions", value: "$18,450.50", percentage: "24.6%", icon: Droplets },
    { label: "Farming", value: "$11,212.00", percentage: "15.1%", icon: TrendingUp },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Portfolio Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-3xl font-bold">{portfolioData.totalValue}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={portfolioData.isPositive ? "default" : "destructive"} className="gap-1">
                  {portfolioData.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {portfolioData.changePercent}
                </Badge>
                <span className="text-sm text-muted-foreground">{portfolioData.change24h} (24h)</span>
              </div>
            </div>

            <div className="space-y-3">
              {breakdown.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.percentage}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
