'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { Search, Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useWalletTokens, WSOL_MINT } from '@/hooks/useWalletTokens'
import { ScrollArea } from '@/components/ui/scroll-area'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { getDetailTokenExtensions, TokenService } from '@/lib/service/tokenService'
import { GithubPoolService, GithubTokenInfo } from '@/lib/service/githubPoolService'
import { TokenData } from '@/hooks/useWalletTokens'
import { Skeleton as _Skeleton } from '@/components/ui/skeleton'
import { Connection } from '@solana/web3.js'

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

// Thêm type cho thông tin cơ bản của token
interface TokenBasicInfo {
  name?: string
  symbol?: string
  image?: string | null
  [key: string]: unknown
}

export interface TokenSelectProps {
  value?: string
  onChange?: (value: string) => void
  excludeToken?: string
  placeholder?: string
  disabled?: boolean
  includeSol?: boolean
  includeWrappedSol?: boolean
  forPoolCreation?: boolean
  compatibleTokens?: string[] // Thêm danh sách token tương thích
  isLoadingCompatible?: boolean // Thêm trạng thái đang tải token tương thích
}

export function TokenSelect({
  value,
  onChange,
  excludeToken,
  placeholder = 'Select token',
  disabled = false,
  includeSol = false,
  includeWrappedSol = false,
  forPoolCreation = false,
}: TokenSelectProps) {
  const { tokens, loading } = useWalletTokens({
    includeSol: forPoolCreation ? false : includeSol,
    includeWrappedSol: forPoolCreation || includeWrappedSol,
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [tokenExtensions, setTokenExtensions] = useState<Record<string, TokenExtensionDetails>>({})
  const [tokenMetadata, setTokenMetadata] = useState<Record<string, TokenBasicInfo>>({})
  const [isLoadingBasicInfo, setIsLoadingBasicInfo] = useState(false)
  const [isLoadingExtensions, setIsLoadingExtensions] = useState(false)
  const [visibleTokens, setVisibleTokens] = useState<string[]>([])

  // Tải thông tin cơ bản trước (tên, biểu tượng)
  useEffect(() => {
    async function fetchBasicTokenInfo(tokenAddresses: string[]) {
      if (tokenAddresses.length === 0 || isLoadingBasicInfo) return

      setIsLoadingBasicInfo(true)

      // Kiểm tra cache từ localStorage
      try {
        const cachedData = localStorage.getItem('token_basic_info_cache')
        if (cachedData) {
          const parsed = JSON.parse(cachedData)
          if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            // 24 giờ
            setTokenMetadata(prev => ({ ...prev, ...parsed.data }))
          }
        }
      } catch (error) {
        console.error('Error loading cached token info:', error)
      }

      const connection = new Connection(
        process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
        'confirmed'
      )

      const newMetadata: Record<string, TokenBasicInfo> = {}

      // Xử lý theo batch để tránh quá tải
      const batchSize = 10
      for (let i = 0; i < tokenAddresses.length; i += batchSize) {
        const batch = tokenAddresses
          .slice(i, i + batchSize)
          .filter(mint => mint !== 'SOL' && !tokenMetadata[mint])

        if (batch.length === 0) continue

        const promises = batch.map(async tokenMint => {
          try {
            // Chỉ lấy thông tin metadata cơ bản từ TokenService
            const basicInfo = await TokenService.getTokenIconAndName(tokenMint, connection)
            if (basicInfo) {
              newMetadata[tokenMint] = {
                name: basicInfo.name,
                symbol: basicInfo.symbol,
                image: basicInfo.icon,
              }
            }
          } catch (error) {
            if (
              !(
                error instanceof Error &&
                error.message &&
                error.message.includes('AccountNotFoundError')
              )
            ) {
              console.error(`Error fetching basic info for ${tokenMint}:`, error)
            }
          }
        })

        await Promise.allSettled(promises)

        // Đợi một chút trước khi xử lý batch tiếp theo
        if (i + batchSize < tokenAddresses.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // Cập nhật state và lưu vào cache
      if (Object.keys(newMetadata).length > 0) {
        setTokenMetadata(prev => {
          const updated = { ...prev, ...newMetadata }

          // Lưu vào localStorage
          try {
            localStorage.setItem(
              'token_basic_info_cache',
              JSON.stringify({
                data: updated,
                timestamp: Date.now(),
              })
            )
          } catch (error) {
            console.error('Error saving token info to cache:', error)
          }

          return updated
        })
      }

      setIsLoadingBasicInfo(false)
    }

    // Tạo danh sách các token cần tải thông tin cơ bản
    const tokensToFetch: string[] = []

    // Luôn ưu tiên token đã chọn
    if (value && !tokenMetadata[value]) {
      tokensToFetch.push(value)
    }

    // Thêm các token đang hiển thị
    visibleTokens.forEach(mint => {
      if (!tokenMetadata[mint] && mint !== 'SOL' && !tokensToFetch.includes(mint)) {
        tokensToFetch.push(mint)
      }
    })

    if (tokensToFetch.length > 0) {
      fetchBasicTokenInfo(tokensToFetch)
    }
  }, [value, visibleTokens, tokenMetadata, isLoadingBasicInfo])

  // Tải thông tin extension sau khi đã tải thông tin cơ bản
  useEffect(() => {
    async function fetchTokenExtensionsBackground(tokenAddresses: string[]) {
      if (tokenAddresses.length === 0 || isLoadingExtensions) return

      setIsLoadingExtensions(true)

      // Kiểm tra cache từ localStorage
      try {
        const cachedData = localStorage.getItem('token_extensions_cache')
        if (cachedData) {
          const parsed = JSON.parse(cachedData)
          if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            // 24 giờ
            setTokenExtensions(prev => ({ ...prev, ...parsed.data }))
          }
        }
      } catch (error) {
        console.error('Error loading cached extensions:', error)
      }

      const newExtensions: Record<string, TokenExtensionDetails> = {}

      // Xử lý theo batch để tránh quá tải
      const batchSize = 5
      for (let i = 0; i < tokenAddresses.length; i += batchSize) {
        const batch = tokenAddresses
          .slice(i, i + batchSize)
          .filter(mint => mint !== 'SOL' && !tokenExtensions[mint])

        if (batch.length === 0) continue

        const promises = batch.map(async tokenMint => {
          try {
            const extensionInfo = await getDetailTokenExtensions(tokenMint)
            if (extensionInfo) {
              newExtensions[tokenMint] = extensionInfo
            }
          } catch (error) {
            if (
              !(
                error instanceof Error &&
                error.message &&
                error.message.includes('AccountNotFoundError')
              )
            ) {
              console.error(`Error fetching extensions for ${tokenMint}:`, error)
            }
          }
        })

        await Promise.allSettled(promises)

        // Đợi một chút trước khi xử lý batch tiếp theo
        if (i + batchSize < tokenAddresses.length) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }

      // Cập nhật state và lưu vào cache
      if (Object.keys(newExtensions).length > 0) {
        setTokenExtensions(prev => {
          const updated = { ...prev, ...newExtensions }

          // Lưu vào localStorage
          try {
            localStorage.setItem(
              'token_extensions_cache',
              JSON.stringify({
                data: updated,
                timestamp: Date.now(),
              })
            )
          } catch (error) {
            console.error('Error saving extensions to cache:', error)
          }

          return updated
        })
      }

      setIsLoadingExtensions(false)
    }

    // Không fetch extensions nếu đang tải thông tin cơ bản
    if (isLoadingBasicInfo) return

    // Sử dụng setTimeout để không block main thread và fetch sau khi UI đã render
    const timer = setTimeout(() => {
      fetchTokenExtensionsBackground(visibleTokens)
    }, 500)

    return () => clearTimeout(timer)
  }, [visibleTokens, tokenExtensions, isLoadingBasicInfo, isLoadingExtensions])

  // Lấy thông tin extension cho token khi chọn
  useEffect(() => {
    async function fetchSelectedTokenExtension() {
      if (!value || tokenExtensions[value] || isLoadingExtensions) return

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

    fetchSelectedTokenExtension()
  }, [value, tokenExtensions, isLoadingExtensions])

  // Hàm lấy thông tin hiển thị của token - tách riêng để sử dụng nhất quán
  const getTokenDisplayInfo = useCallback(
    (token: TokenData) => {
      const metadata = token.mint !== 'SOL' ? tokenMetadata[token.mint] : null

      return {
        name: metadata?.name || token.name,
        symbol: metadata?.symbol || token.symbol,
        icon: metadata?.image || token.icon || '',
      }
    },
    [tokenMetadata]
  )

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
        // Khi tạo pool, loại bỏ SOL thông thường vì không thể dùng để tạo pool
        if (forPoolCreation && token.mint === 'SOL') {
          return false
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
        // Đưa Wrapped SOL lên đầu nếu đang ở chế độ tạo pool
        if (forPoolCreation) {
          if (a.mint === WSOL_MINT) return -1
          if (b.mint === WSOL_MINT) return 1
        }

        // Đưa token có balance lên đầu
        if (a.balance > 0 && b.balance === 0) return -1
        if (a.balance === 0 && b.balance > 0) return 1

        // Sort by balance (descending)
        return b.balance - a.balance
      })
  }, [tokens, searchQuery, excludeToken, forPoolCreation])

  // Cập nhật visibleTokens khi filtered tokens thay đổi
  useEffect(() => {
    setVisibleTokens(filteredTokens.map(token => token.mint))
  }, [filteredTokens])

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
        {token.mint === WSOL_MINT && (
          <Badge variant="outline" className="bg-blue-100/30 text-blue-600 border-blue-200 text-xs">
            Wrapped
          </Badge>
        )}
        {token.isToken2022 && (
          <Badge
            variant="outline"
            className="bg-purple-100/30 text-purple-600 border-purple-200 text-xs"
          >
            2022
          </Badge>
        )}
        {extensionInfo?.transferHook && (
          <Badge
            variant="outline"
            className="bg-amber-100/30 text-amber-600 border-amber-200 text-xs"
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
                {selectedToken.icon || tokenMetadata[selectedToken.mint]?.image ? (
                  <AvatarImage
                    src={tokenMetadata[selectedToken.mint]?.image || selectedToken.icon}
                    alt={getTokenDisplayInfo(selectedToken).symbol}
                  />
                ) : (
                  <AvatarFallback className="bg-gradient-to-r from-blue-400 to-blue-600 text-white">
                    {getTokenDisplayInfo(selectedToken).symbol.slice(0, 2)}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="font-medium">{getTokenDisplayInfo(selectedToken).symbol}</span>
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
            {loading || isLoadingBasicInfo || isLoadingExtensions ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading tokens...</p>
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No tokens found</div>
            ) : (
              <div className="space-y-1">
                {filteredTokens.map(token => {
                  const displayInfo = getTokenDisplayInfo(token)
                  return (
                    <SelectItem key={token.mint} value={token.mint} className="cursor-pointer">
                      <div className="flex items-center justify-between w-full py-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full overflow-hidden bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
                            {displayInfo.icon ? (
                              <Image
                                src={displayInfo.icon}
                                alt={displayInfo.symbol}
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-white font-semibold text-sm">
                                {displayInfo.symbol.slice(0, 2)}
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-medium">
                                {token.mint === WSOL_MINT
                                  ? forPoolCreation
                                    ? 'SOL (for pool)'
                                    : 'SOL (Wrapped)'
                                  : displayInfo.symbol}
                              </div>
                              {renderTokenExtensionsBadges(token)}
                            </div>
                            <div className="text-xs text-muted-foreground">{displayInfo.name}</div>
                            <div className="text-xs text-muted-foreground/70">
                              {shortenAddress(token.mint)}
                            </div>
                          </div>
                        </div>

                        <div className="text-right text-sm">
                          <div className="font-medium">{token.balance.toLocaleString()}</div>
                        </div>
                      </div>
                    </SelectItem>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </SelectContent>
    </Select>
  )
}

// Component chỉ hiển thị token từ các pool GitHub
export function GithubTokenSelect({
  value,
  onChange,
  excludeToken,
  placeholder = 'Select token',
  disabled = false,
}: TokenSelectProps) {
  const [tokens, setTokens] = useState<GithubTokenInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Lấy danh sách token từ Github khi component mount
  useEffect(() => {
    async function fetchGithubTokens() {
      try {
        setLoading(true)
        const poolService = new GithubPoolService()
        const tokensData = await poolService.getTokens()
        setTokens(tokensData)
      } catch (error) {
        console.error('Error fetching Github tokens:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGithubTokens()
  }, [])

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
          (token.name?.toLowerCase() || '').includes(query) ||
          (token.symbol?.toLowerCase() || '').includes(query) ||
          (token.mint?.toLowerCase() || '').includes(query)
        )
      })
  }, [tokens, searchQuery, excludeToken])

  const handleSelect = (tokenAddress: string) => {
    if (onChange) {
      onChange(tokenAddress)
    }
  }

  const selectedToken = useMemo(() => {
    if (!value) return null
    return tokens.find(token => token.mint === value)
  }, [value, tokens])

  // Hàm rút gọn địa chỉ
  const shortenAddress = (address: string) => {
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
                  <AvatarImage src={selectedToken.icon} alt={selectedToken.symbol || ''} />
                ) : (
                  <AvatarFallback className="bg-gradient-to-r from-blue-400 to-blue-600 text-white">
                    {(selectedToken.symbol || '').slice(0, 2)}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="font-medium">{selectedToken.symbol}</span>
              {selectedToken.isToken2022 && (
                <Badge
                  variant="outline"
                  className="bg-purple-100/30 text-purple-600 border-purple-200 text-xs"
                >
                  2022
                </Badge>
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
              <div className="py-6 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading tokens...</p>
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No tokens found</div>
            ) : (
              <div className="space-y-1">
                {filteredTokens.map(token => (
                  <SelectItem
                    key={token.mint || ''}
                    value={token.mint || ''}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full py-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
                          {token.icon ? (
                            <Image
                              src={token.icon}
                              alt={token.symbol || ''}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-white font-semibold text-sm">
                              {(token.symbol || '').slice(0, 2)}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{token.symbol}</div>
                            {token.isToken2022 && (
                              <Badge
                                variant="outline"
                                className="bg-purple-100/30 text-purple-600 border-purple-200 text-xs"
                              >
                                2022
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{token.name}</div>
                          <div className="text-xs text-muted-foreground/70">
                            {shortenAddress(token.mint || '')}
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

// Component dành riêng cho Swap Interface, hiển thị token từ pool
export function PoolTokenSelect({
  value,
  onChange,
  excludeToken,
  placeholder = 'Select token',
  disabled = false,
  compatibleTokens,
  isLoadingCompatible = false,
  forPoolCreation,
}: TokenSelectProps) {
  const { tokens, loading } = useWalletTokens({
    includeSol: true,
    includeWrappedSol: true,
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [tokenExtensions, setTokenExtensions] = useState<Record<string, TokenExtensionDetails>>({})
  const [visibleTokens, setVisibleTokens] = useState<string[]>([])
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false)

  // Lấy thông tin extension cho token đã chọn và token hiển thị
  useEffect(() => {
    async function fetchTokensExtensions(tokenAddresses: string[]) {
      if (tokenAddresses.length === 0 || isLoadingMetadata) return

      setIsLoadingMetadata(true)

      const newExtensions: Record<string, TokenExtensionDetails> = {}

      // Chỉ xử lý tối đa 5 token mỗi lần để tránh quá tải
      const tokensToProcess = tokenAddresses.slice(0, 5)

      const promises = tokensToProcess.map(async tokenMint => {
        // Bỏ qua SOL native và token đã có metadata
        if (tokenMint === 'SOL' || tokenExtensions[tokenMint]) return

        try {
          const extensionInfo = await getDetailTokenExtensions(tokenMint)
          if (extensionInfo) {
            newExtensions[tokenMint] = extensionInfo
          }
        } catch (error) {
          console.error('Error fetching token extensions:', error)
        }
      })

      // Đợi tất cả promise hoàn thành
      await Promise.allSettled(promises)

      // Cập nhật state với extensions mới
      if (Object.keys(newExtensions).length > 0) {
        setTokenExtensions(prev => ({
          ...prev,
          ...newExtensions,
        }))
      }

      setIsLoadingMetadata(false)

      // Xử lý phần còn lại nếu còn
      const remainingTokens = tokenAddresses.slice(5)
      if (remainingTokens.length > 0) {
        // Đợi một chút trước khi tiếp tục xử lý batch tiếp theo
        setTimeout(() => {
          fetchTokensExtensions(remainingTokens)
        }, 500)
      }
    }

    // Tạo danh sách các token cần tải metadata
    const tokensToFetch: string[] = []

    // Luôn ưu tiên token đã chọn
    if (value && !tokenExtensions[value]) {
      tokensToFetch.push(value)
    }

    // Thêm các token đang hiển thị
    visibleTokens.forEach(mint => {
      if (!tokenExtensions[mint] && mint !== 'SOL' && !tokensToFetch.includes(mint)) {
        tokensToFetch.push(mint)
      }
    })

    if (tokensToFetch.length > 0) {
      fetchTokensExtensions(tokensToFetch)
    }
  }, [value, visibleTokens, tokenExtensions, isLoadingMetadata])

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
        // Nếu có danh sách token tương thích, chỉ hiển thị các token trong danh sách đó
        if (compatibleTokens && compatibleTokens.length > 0) {
          return compatibleTokens.includes(token.mint)
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
      .sort((a, b) => b.balance - a.balance) // Sort by balance (descending)
  }, [tokens, searchQuery, excludeToken, compatibleTokens])

  // Cập nhật visibleTokens khi filtered tokens thay đổi
  useEffect(() => {
    setVisibleTokens(filteredTokens.map(token => token.mint))
  }, [filteredTokens])

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
        {token.mint === WSOL_MINT && (
          <Badge variant="outline" className="bg-blue-100/30 text-blue-600 border-blue-200 text-xs">
            Wrapped
          </Badge>
        )}
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
            {loading || isLoadingCompatible ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {isLoadingCompatible ? 'Tìm token tương thích...' : 'Loading tokens...'}
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {compatibleTokens && compatibleTokens.length === 0 && value
                  ? 'Không có token nào tương thích với token đã chọn'
                  : 'No tokens found'}
              </div>
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
                            <div className="font-medium">
                              {token.mint === WSOL_MINT
                                ? forPoolCreation
                                  ? 'SOL (for pool)'
                                  : 'SOL (Wrapped)'
                                : token.symbol}
                            </div>
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
