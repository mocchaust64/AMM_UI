"use client"

import { useMemo, useState, useEffect } from "react"
import { Search } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {useWalletTokens } from "@/hooks/useWalletTokens"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TokenSelectProps {
  value?: string
  onChange?: (value: string) => void
  excludeToken?: string
  label?: string
  placeholder?: string
}

export function TokenSelect({
  value,
  onChange,
  excludeToken,
  label = "Select a token",
  placeholder = "Select token"
}: TokenSelectProps) {
  const { tokens, loading } = useWalletTokens()
  const [searchQuery, setSearchQuery] = useState("")
  
  // Debug log
  useEffect(() => {
    console.log('TokenSelect - tokens:', tokens);
    console.log('TokenSelect - loading:', loading);
    console.log('TokenSelect - value:', value);
    console.log('TokenSelect - excludeToken:', excludeToken);
  }, [tokens, loading, value, excludeToken]);
  
  const filteredTokens = useMemo(() => {
    const filtered = tokens
      .filter(token => 
        // Loại bỏ token đã được chọn ở trường khác
        excludeToken ? token.mint !== excludeToken : true
      )
      .filter(token => {
        // Tìm kiếm theo tên, ký hiệu hoặc địa chỉ
        if (!searchQuery) return true
        
        const query = searchQuery.toLowerCase()
        return (
          token.name.toLowerCase().includes(query) ||
          token.symbol.toLowerCase().includes(query) ||
          token.mint.toLowerCase().includes(query)
        )
      });
    
    console.log('TokenSelect - filteredTokens:', filtered);
    return filtered;
  }, [tokens, searchQuery, excludeToken])

  const handleSelect = (tokenMint: string) => {
    console.log('TokenSelect - selected token mint:', tokenMint);
    if (onChange) {
      onChange(tokenMint)
    }
  }

  const selectedToken = useMemo(() => {
    if (!value) return null
    const found = tokens.find(token => token.mint === value);
    console.log('TokenSelect - selectedToken:', found);
    return found;
  }, [value, tokens])

  return (
    <Select value={value} onValueChange={handleSelect}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {selectedToken && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={selectedToken.icon || "/placeholder.svg"} />
                <AvatarFallback>{selectedToken.symbol.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{selectedToken.symbol}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      
      <SelectContent>
        <div className="p-2">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search token..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <ScrollArea className="h-60">
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading tokens...
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No tokens found
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTokens.map((token) => (
                  <SelectItem key={token.mint} value={token.mint} className="cursor-pointer">
                    <div className="flex items-center justify-between w-full py-1">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={token.icon || "/placeholder.svg"} />
                          <AvatarFallback>{token.symbol.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{token.symbol}</div>
                          <div className="text-xs text-muted-foreground">{token.name}</div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-medium">{token.balance.toLocaleString()}</div>
                        {token.balance > 0 && (
                          <div className="text-xs text-muted-foreground">
                            ~${(token.balance * 10).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SelectContent>
    </Select>
  )
} 