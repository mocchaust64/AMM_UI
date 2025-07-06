"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, ExternalLink, Copy, Plus } from "lucide-react"
import { useWalletTokens } from "@/hooks/useWalletTokens"
import { toast } from "sonner"

export function WalletTokens() {
  const { tokens, loading } = useWalletTokens()
  const [searchQuery, setSearchQuery] = useState("")

  const filteredTokens = tokens.filter(token => {
    if (!searchQuery) return true
    
    const query = searchQuery.toLowerCase()
    return (
      token.name.toLowerCase().includes(query) ||
      token.symbol.toLowerCase().includes(query) ||
      token.mint.toLowerCase().includes(query)
    )
  })

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    toast.success("Token address copied to clipboard")
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Wallet Tokens</CardTitle>
        <div className="flex gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search tokens..." 
              className="pl-10" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Add Custom Token
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">
            Loading wallet tokens...
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {searchQuery ? "No tokens found matching your search" : "No tokens found in your wallet"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTokens.map((token) => (
                <TableRow key={token.mint}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={token.logoURI || "/placeholder.svg"} />
                        <AvatarFallback>{token.symbol.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium flex items-center gap-1">
                          {token.name}
                          <Badge variant="outline" className="ml-1">{token.symbol}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {token.mint.slice(0, 8)}...{token.mint.slice(-8)}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{token.balance.toLocaleString()}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">${(token.balance * 10).toFixed(2)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleCopyAddress(token.mint)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
} 