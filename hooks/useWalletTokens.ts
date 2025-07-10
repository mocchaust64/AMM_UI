import { useState, useEffect, useCallback } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getMint,
  getTokenMetadata,
} from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'

export interface TokenData {
  mint: string
  symbol: string
  name: string
  icon?: string
  balance: number
  decimals: number
  address?: string
  isToken2022?: boolean
}

interface UseWalletTokensOptions {
  includeSol?: boolean
  forceRefresh?: boolean
}

interface Token {
  address: string
  name: string
  symbol: string
  logoURI?: string
  decimals: number
}

// Cache token list để tránh phải tải lại nhiều lần
let tokenListCache: {
  tokens: Record<string, Token>
  timestamp: number
} | null = null

// Cache cho user tokens trong localStorage
interface TokensCache {
  tokens: TokenData[]
  timestamp: number
}

const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 giờ
const TOKENS_CACHE_TTL = 10 * 60 * 1000 // 10 phút
const TOKENS_CACHE_KEY = 'wallet_tokens_cache'

// Solana SOL token address
export const WSOL_MINT = 'So11111111111111111111111111111111111111112'

export function useWalletTokens(
  options: UseWalletTokensOptions = { includeSol: true, forceRefresh: false }
) {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const [tokens, setTokens] = useState<TokenData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Lấy tokens từ cache
  const getTokensFromCache = useCallback(() => {
    if (!publicKey) return null

    try {
      const cacheKey = `${TOKENS_CACHE_KEY}_${publicKey.toString()}`
      const cachedData = localStorage.getItem(cacheKey)

      if (!cachedData) return null

      const parsedData = JSON.parse(cachedData) as TokensCache

      // Kiểm tra cache có hết hạn không
      if (Date.now() - parsedData.timestamp > TOKENS_CACHE_TTL) {
        // Cache hết hạn
        return null
      }

      return parsedData.tokens
    } catch (error) {
      console.error('Error reading tokens from cache:', error)
      return null
    }
  }, [publicKey])

  // Lưu tokens vào cache
  const saveTokensToCache = useCallback(
    (tokensData: TokenData[]) => {
      if (!publicKey) return

      try {
        const cacheKey = `${TOKENS_CACHE_KEY}_${publicKey.toString()}`
        const cacheData: TokensCache = {
          tokens: tokensData,
          timestamp: Date.now(),
        }

        localStorage.setItem(cacheKey, JSON.stringify(cacheData))
      } catch (error) {
        console.error('Error saving tokens to cache:', error)
      }
    },
    [publicKey]
  )

  // Tải danh sách token từ Solana Token List
  const loadTokenList = useCallback(
    async (forceRefresh = false): Promise<Record<string, Token>> => {
      if (!forceRefresh && tokenListCache && Date.now() - tokenListCache.timestamp < CACHE_TTL) {
        return tokenListCache.tokens
      }

      try {
        const res = await fetch(
          'https://cdn.jsdelivr.net/gh/solana-labs/token-list@latest/src/tokens/solana.tokenlist.json'
        )
        if (!res.ok) {
          throw new Error(`Failed to fetch Solana Labs token list: ${res.statusText}`)
        }
        const tokenList = await res.json()
        const tokenMap = tokenList.tokens.reduce((map: Record<string, Token>, token: Token) => {
          map[token.address] = token
          return map
        }, {})

        tokenListCache = { tokens: tokenMap, timestamp: Date.now() }
        return tokenMap
      } catch (error) {
        console.error('Error loading token list:', error)
        return {}
      }
    },
    []
  )

  // Lấy metadata từ Solana token metadata (chỉ cho token-2022)
  const fetchTokenMetadata = useCallback(
    async (
      mint: string
    ): Promise<{
      name?: string
      symbol?: string
      logoURI?: string
      decimals?: number
    } | null> => {
      if (!mint || mint === 'SOL') return null

      try {
        const mintPublicKey = new PublicKey(mint)

        // Lấy metadata trực tiếp từ @solana/spl-token
        const tokenMetadata = await getTokenMetadata(connection, mintPublicKey)

        if (tokenMetadata) {
          let metadataName = tokenMetadata.name || ''
          let metadataSymbol = tokenMetadata.symbol || ''
          const metadataUri = tokenMetadata.uri || ''
          let metadataImage = null

          // Nếu có URI, tải thêm thông tin hình ảnh
          if (metadataUri) {
            try {
              const response = await fetch(metadataUri)
              if (response.ok) {
                const metadataJson = await response.json()

                // Sử dụng dữ liệu từ URI nếu có
                metadataName = metadataJson.name || metadataName
                metadataSymbol = metadataJson.symbol || metadataSymbol
                metadataImage = metadataJson.image || null
              }
            } catch (error) {
              console.error(`Error fetching metadata from URI ${metadataUri}:`, error)
            }
          }

          return {
            name: metadataName,
            symbol: metadataSymbol,
            logoURI: metadataImage,
          }
        }

        return null
      } catch (error) {
        console.error('Error fetching token metadata:', error)
        return null
      }
    },
    [connection]
  )

  // Lấy danh sách token accounts từ cả hai program ID (SPL Token và Token-2022)
  const getExistingTokenAccounts = useCallback(
    async (owner: PublicKey) => {
      // Lấy token accounts từ cả hai program ID
      const tokenAccountsSPL = await connection.getParsedTokenAccountsByOwner(owner, {
        programId: TOKEN_PROGRAM_ID,
      })

      const tokenAccounts2022 = await connection.getParsedTokenAccountsByOwner(owner, {
        programId: TOKEN_2022_PROGRAM_ID,
      })

      // Tạo danh sách token accounts
      const tokenAccounts = new Map<
        string,
        {
          mint: string
          balance: number
          decimals: number
          isToken2022: boolean
          address: string
        }
      >()

      // Xử lý token SPL tiêu chuẩn
      for (const item of tokenAccountsSPL.value) {
        const accountData = item.account.data.parsed.info
        const mint = accountData.mint
        const balance = Number(accountData.tokenAmount.uiAmount)
        const decimals = accountData.tokenAmount.decimals
        const address = item.pubkey.toString()

        // Chỉ lưu token có số dư > 0
        if (balance > 0) {
          tokenAccounts.set(mint, {
            mint,
            balance,
            decimals,
            isToken2022: false,
            address,
          })
        }
      }

      // Xử lý token-2022
      for (const item of tokenAccounts2022.value) {
        const accountData = item.account.data.parsed.info
        const mint = accountData.mint
        const balance = Number(accountData.tokenAmount.uiAmount)
        const decimals = accountData.tokenAmount.decimals
        const address = item.pubkey.toString()

        // Chỉ lưu token có số dư > 0
        if (balance > 0) {
          tokenAccounts.set(mint, {
            mint,
            balance,
            decimals,
            isToken2022: true,
            address,
          })
        }
      }

      return tokenAccounts
    },
    [connection]
  )

  // Lấy danh sách token của ví
  const fetchTokens = useCallback(async () => {
    if (!publicKey) {
      setTokens([])
      setLoading(false)
      return
    }

    // Kiểm tra cache nếu không phải force refresh
    if (!options.forceRefresh) {
      const cachedTokens = getTokensFromCache()
      if (cachedTokens) {
        setTokens(cachedTokens)
        setLoading(false)
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      // Lấy danh sách token list để làm nguồn thông tin metadata
      const tokenList = await loadTokenList()

      // Lấy danh sách token accounts từ ví người dùng
      const tokenAccounts = await getExistingTokenAccounts(publicKey)

      // Chuyển đổi thành danh sách token
      const tokenPromises = Array.from(tokenAccounts.values()).map(async account => {
        // Tìm metadata từ token list
        const tokenInfo = tokenList[account.mint]

        // Thông tin token mặc định
        let tokenName =
          tokenInfo?.name || `Token ${account.mint.slice(0, 6)}...${account.mint.slice(-4)}`
        let tokenSymbol = tokenInfo?.symbol || account.mint.slice(0, 4).toUpperCase()
        let tokenImage = tokenInfo?.logoURI

        // Chỉ tìm metadata cho token-2022, bỏ qua SPL token thông thường
        if (account.isToken2022 && (!tokenInfo || !tokenImage)) {
          try {
            const mintPublicKey = new PublicKey(account.mint)

            // Lấy thông tin mint để kiểm tra token-2022
            const mintInfo = await getMint(
              connection,
              mintPublicKey,
              undefined,
              TOKEN_2022_PROGRAM_ID
            )

            // Nếu là token-2022, thử lấy metadata
            if (mintInfo.mintAuthority) {
              const metadata = await fetchTokenMetadata(account.mint)
              if (metadata) {
                tokenName = metadata.name || tokenName
                tokenSymbol = metadata.symbol || tokenSymbol
                tokenImage = metadata.logoURI || tokenImage
              }
            }
          } catch (error) {
            console.error(`Error fetching mint info for ${account.mint}:`, error)
          }
        }

        return {
          mint: account.mint,
          symbol: tokenSymbol,
          name: tokenName,
          icon: tokenImage,
          balance: account.balance,
          decimals: account.decimals,
          address: account.address,
          isToken2022: account.isToken2022,
        }
      })

      // Đợi tất cả promises hoàn thành
      const tokensData = await Promise.all(tokenPromises)

      // Lấy số dư SOL
      const solBalance = await connection.getBalance(publicKey)

      // Tạo token SOL
      const solToken: TokenData = {
        mint: 'SOL',
        symbol: 'SOL',
        name: 'Solana',
        icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        balance: solBalance / 1e9, // Chuyển đổi lamports sang SOL
        decimals: 9,
        address: publicKey.toString(), // SOL address là địa chỉ ví
      }

      // Chỉ thêm SOL nếu tùy chọn includeSol được đặt thành true
      const finalTokens = options.includeSol ? [solToken, ...tokensData] : tokensData
      setTokens(finalTokens)

      // Lưu kết quả vào cache
      saveTokensToCache(finalTokens)
    } catch (err: any) {
      console.error('Error fetching wallet tokens:', err)
      setError(err.message || 'Failed to fetch wallet tokens')
    } finally {
      setLoading(false)
    }
  }, [
    publicKey,
    connection,
    options.includeSol,
    options.forceRefresh,
    loadTokenList,
    getExistingTokenAccounts,
    fetchTokenMetadata,
    getTokensFromCache,
    saveTokensToCache,
  ])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  return { tokens, loading, error, refreshTokens: () => fetchTokens() }
}
