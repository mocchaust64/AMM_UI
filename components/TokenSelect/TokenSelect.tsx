'use client'

import { useMemo, useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useWalletTokens } from '@/hooks/useWalletTokens'
import { ScrollArea } from '@/components/ui/scroll-area'
import Image from 'next/image'

export interface TokenSelectProps {
  value?: string
  onChange?: (value: string) => void
  excludeToken?: string
  label?: string
  placeholder?: string
  disabled?: boolean
  includeSol?: boolean
}

export function TokenSelect({
  value,
  onChange,
  excludeToken,
  label = 'Select a token',
  placeholder = 'Select token',
  disabled = false,
  includeSol = false,
}: TokenSelectProps) {
  const { tokens, loading } = useWalletTokens({ includeSol })
  const [searchQuery, setSearchQuery] = useState('')

  // Debug log
  useEffect(() => {
    console.log('TokenSelect - tokens:', tokens)
  }, [tokens])

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
      })

    return filtered
  }, [tokens, searchQuery, excludeToken])

  const handleSelect = (tokenMint: string) => {
    if (onChange) {
      onChange(tokenMint)
    }
  }

  const selectedToken = useMemo(() => {
    if (!value) return null
    const found = tokens.find(token => token.mint === value)
    return found
  }, [value, tokens])

  // Hàm rút gọn địa chỉ
  const shortenAddress = (address: string) => {
    if (!address || address === 'SOL') return address
    return `${address.slice(0, 5)}...${address.slice(-4)}`
  }

  return (
    <Select value={value} onValueChange={handleSelect} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {selectedToken && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 rounded-full overflow-hidden">
                {selectedToken.icon ? (
                  <AvatarImage src={selectedToken.icon} alt={selectedToken.symbol} />
                ) : (
                  <AvatarFallback className="bg-gradient-to-r from-blue-400 to-blue-600 text-white">
                    {selectedToken.symbol.slice(0, 2)}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="font-medium">{selectedToken.symbol}</span>
              {selectedToken.isToken2022 && (
                <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                  2022
                </span>
              )}
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
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <ScrollArea className="h-60 custom-scroll">
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading tokens...
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No tokens found</div>
            ) : (
              <div className="space-y-1">
                {filteredTokens.map(token => (
                  <SelectItem key={token.mint} value={token.mint} className="cursor-pointer">
                    <div className="flex items-center justify-between w-full py-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
                          {token.icon ? (
                            <Image
                              src={token.icon}
                              alt={token.symbol}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-white font-semibold text-sm">
                              {token.symbol.slice(0, 2)}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{token.symbol}</div>
                            {token.isToken2022 && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-1 py-0.5 rounded-full font-medium">
                                2022
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{token.name}</div>
                          <div className="text-xs text-muted-foreground/70">
                            {shortenAddress(token.mint)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right pr-2">
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
