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
import { Badge } from '@/components/ui/badge'
import { getDetailTokenExtensions } from '@/lib/service/tokenService'
import { GithubPoolService } from '@/lib/service/githubPoolService'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2 } from 'lucide-react'
import { TokenData } from '@/hooks/useWalletTokens'

// Định nghĩa kiểu dữ liệu cho token trong context của component
interface ExtendedTokenData extends TokenData {
  hasTransferHook?: boolean
}

// Định nghĩa kiểu dữ liệu cho thông tin extension
interface TokenExtensionDetails {
  isToken2022?: boolean
  extensions?: string[]
  transferHook?: {
    authority: string
    programId: string
  } | null
  error?: string
}

export interface TokenSelectProps {
  value?: string
  onChange?: (value: string) => void
  excludeToken?: string
  placeholder?: string
  disabled?: boolean
  includeSol?: boolean
}

export function TokenSelect({
  value,
  onChange,
  excludeToken,
  placeholder = 'Select token',
  disabled = false,
  includeSol = false,
}: TokenSelectProps) {
  const { tokens, loading } = useWalletTokens({ includeSol })
  const [searchQuery, setSearchQuery] = useState('')
  const [tokenExtensions, setTokenExtensions] = useState<Record<string, TokenExtensionDetails>>({})

  // Lấy thông tin extension cho token khi chọn
  useEffect(() => {
    async function fetchTokenExtensions() {
      if (!value) return

      try {
        const extensionInfo = await getDetailTokenExtensions(value)
        setTokenExtensions(prev => ({
          ...prev,
          [value]: extensionInfo,
        }))
      } catch (error) {
        console.error('Error fetching token extensions:', error)
      }
    }

    if (value && !tokenExtensions[value]) {
      fetchTokenExtensions()
    }
  }, [value, tokenExtensions])

  const filteredTokens = useMemo(() => {
    return tokens
      .filter(token => {
        // Loại bỏ token đã được chọn ở trường khác
        if (excludeToken) {
          return token.mint !== excludeToken
        }
        return true
      })
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
      .sort((a, b) => {
        // Sort by balance (descending)
        return b.balance - a.balance
      })
  }, [tokens, searchQuery, excludeToken])

  const handleSelect = (tokenMint: string) => {
    if (onChange) {
      onChange(tokenMint)
    }
  }

  const selectedToken = useMemo(() => {
    if (!value) return null
    return tokens.find(token => token.mint === value)
  }, [value, tokens])

  // Hàm rút gọn địa chỉ
  const shortenAddress = (address: string) => {
    if (!address || address === 'SOL') return address
    return `${address.slice(0, 5)}...${address.slice(-4)}`
  }

  // Hiển thị badge dựa trên thông tin token extensions
  const renderTokenExtensionsBadges = (token: TokenData | ExtendedTokenData) => {
    if (!token || token.mint === 'SOL') return null

    const extensionInfo = typeof token.mint === 'string' ? tokenExtensions[token.mint] : null

    return (
      <>
        {(extensionInfo?.isToken2022 || token.isToken2022) && (
          <Badge
            variant="outline"
            className="bg-purple-100/30 text-purple-600 border-purple-200 text-xs"
          >
            2022
          </Badge>
        )}

        {(extensionInfo?.transferHook || ('hasTransferHook' in token && token.hasTransferHook)) &&
          (extensionInfo?.isToken2022 || token.isToken2022) && (
            <Badge
              variant="outline"
              className="bg-amber-100/30 text-amber-600 border-amber-200 text-xs ml-1"
            >
              Hook
            </Badge>
          )}
      </>
    )
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
              {renderTokenExtensionsBadges(selectedToken)}
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
                            {renderTokenExtensionsBadges(token)}
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

// Component chỉ hiển thị token từ các pool GitHub
export function PoolTokenSelect({
  value,
  onChange,
  excludeToken,
  placeholder = 'Select token',
  disabled = false,
}: TokenSelectProps) {
  const [tokens, setTokens] = useState<ExtendedTokenData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Lấy danh sách token từ các pool GitHub
  useEffect(() => {
    async function fetchPoolTokens() {
      setLoading(true)
      try {
        const poolTokens = await GithubPoolService.getAllPoolTokens()
        setTokens(poolTokens)
      } catch (error) {
        console.error('Error fetching pool tokens:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPoolTokens()
  }, [])

  const filteredTokens = useMemo(() => {
    return tokens
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

  // Hiển thị badge dựa trên thông tin token
  const renderTokenExtensionsBadges = (token: TokenData | ExtendedTokenData) => {
    if (!token || token.mint === 'SOL') return null

    return (
      <>
        {token.isToken2022 && (
          <Badge
            variant="outline"
            className="bg-purple-100/30 text-purple-600 border-purple-200 text-xs"
          >
            2022
          </Badge>
        )}

        {token.isToken2022 && 'hasTransferHook' in token && token.hasTransferHook && (
          <Badge
            variant="outline"
            className="bg-amber-100/30 text-amber-600 border-amber-200 text-xs ml-1"
          >
            Hook
          </Badge>
        )}
      </>
    )
  }

  return (
    <Select value={value} onValueChange={handleSelect} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {selectedToken ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 rounded-full overflow-hidden">
                {selectedToken.icon ? (
                  <AvatarImage src={selectedToken.icon} alt={selectedToken.symbol} />
                ) : (
                  <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                    {selectedToken.symbol.slice(0, 2)}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="font-medium">{selectedToken.symbol}</span>
              {renderTokenExtensionsBadges(selectedToken)}
            </div>
          ) : loading ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          ) : null}
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
              <div className="py-6 text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading pool tokens...</p>
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No tokens found</div>
            ) : (
              <div className="space-y-1">
                {filteredTokens.map(token => (
                  <SelectItem key={token.mint} value={token.mint} className="cursor-pointer">
                    <div className="flex items-center justify-between w-full py-2 hover:bg-accent/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
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
                            {renderTokenExtensionsBadges(token)}
                          </div>
                          <div className="text-xs text-muted-foreground">{token.name}</div>
                          <div className="text-xs text-muted-foreground/70">
                            {shortenAddress(token.mint)}
                          </div>
                        </div>
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
