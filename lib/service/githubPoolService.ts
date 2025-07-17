/**
 * Service để làm việc với các pool được lưu trữ trên GitHub
 */
import { TokenService, getDetailTokenExtensions } from './tokenService'
import { Connection } from '@solana/web3.js'

// Interfaces cho token trong pool
export interface GithubTokenInfo {
  mint?: string
  symbol?: string
  name?: string
  decimals?: number
  icon?: string
  isToken2022?: boolean
  hasTransferHook?: boolean
  // Thêm các trường mới cho metadata
  description?: string
  uri?: string
  externalUrl?: string
  supply?: string
  metadata?: Record<string, unknown> // Metadata có thể được lưu trữ để sử dụng sau này
}

// Interface cho pool từ GitHub
export interface GithubPoolInfo {
  poolAddress: string
  token0?: GithubTokenInfo
  token1?: GithubTokenInfo
  network?: string
  githubUrl?: string
  createdAt?: string
  lastUpdated?: string
}

// Interface cho thông tin extension token
export interface TokenExtensionInfo {
  isToken2022?: boolean
  transferHook?: {
    authority?: string
    programId?: string
  } | null
  extensions?: string[]
  error?: string
}

export class GithubPoolService {
  /**
   * Lấy danh sách tất cả các pool từ GitHub
   * @param retryCount Số lần thử lại nếu có lỗi
   * @returns Danh sách pool
   */
  static async getAllPools(retryCount = 2): Promise<GithubPoolInfo[]> {
    try {
      const response = await fetch('/api/get-pools-from-github', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store', // Không cache kết quả
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(
          errorData.error ||
            `Failed to fetch pools from GitHub: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json().catch(() => ({ pools: [] }))
      return data.pools || []
    } catch (_) {
      // eslint-disable-line @typescript-eslint/no-unused-vars
      // eslint-disable-line @typescript-eslint/no-unused-vars
      // Lỗi khi tải danh sách pool từ GitHub

      // Thử lại nếu còn số lần thử
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        return this.getAllPools(retryCount - 1)
      }

      // Trả về mảng rỗng nếu đã hết số lần thử
      return []
    }
  }

  /**
   * Lấy thông tin chi tiết của một pool từ GitHub
   * @param poolAddress Địa chỉ của pool
   * @param retryCount Số lần thử lại nếu có lỗi
   * @returns Thông tin chi tiết của pool
   */
  static async getPoolDetails(poolAddress: string, retryCount = 2): Promise<GithubPoolInfo | null> {
    try {
      if (!poolAddress) {
        throw new Error('Pool address is required')
      }

      const pools = await this.getAllPools()
      return pools.find((pool: GithubPoolInfo) => pool?.poolAddress === poolAddress) || null
    } catch (_) {
      // eslint-disable-line @typescript-eslint/no-unused-vars
      // eslint-disable-line @typescript-eslint/no-unused-vars
      // Lỗi khi tải chi tiết pool từ GitHub

      // Thử lại nếu còn số lần thử
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        return this.getPoolDetails(poolAddress, retryCount - 1)
      }

      return null
    }
  }

  /**
   * Làm giàu thông tin của một token từ mint address
   * @param tokenMint Địa chỉ mint của token
   * @param existingTokenInfo Thông tin sẵn có của token (từ GitHub)
   * @param connection Kết nối đến blockchain
   */
  static async enrichTokenInfo(
    tokenMint: string,
    existingTokenInfo: GithubTokenInfo = {},
    connection?: Connection
  ): Promise<GithubTokenInfo> {
    if (!connection) {
      connection = new Connection(
        process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
        'confirmed'
      )
    }

    // Lấy thông tin tên và icon cho token từ danh sách token
    let tokenInfo
    try {
      tokenInfo = await TokenService.getTokenIconAndName(tokenMint, connection)
    } catch (_) {
      // eslint-disable-line @typescript-eslint/no-unused-vars
      // eslint-disable-line @typescript-eslint/no-unused-vars
      // Lỗi khi tải thông tin token
      tokenInfo = {
        name: existingTokenInfo.name || `Token ${tokenMint.slice(0, 8)}`,
        symbol: existingTokenInfo.symbol || `Token-${tokenMint.slice(0, 4)}`,
        icon: existingTokenInfo.icon || '/placeholder-logo.svg',
      }
    }

    // Thử lấy thông tin metadata từ Metaplex
    let metaplexMetadata = null
    try {
      metaplexMetadata = await TokenService.getMetaplexTokenMetadata(tokenMint, connection)
    } catch (_) {
      // eslint-disable-line @typescript-eslint/no-unused-vars
      // eslint-disable-line @typescript-eslint/no-unused-vars
      // Lỗi khi lấy metadata từ Metaplex - xử lý im lặng
    }

    // Lấy thông tin về token extensions
    let extensionInfo
    try {
      extensionInfo = await getDetailTokenExtensions(tokenMint)
    } catch (_) {
      // eslint-disable-line @typescript-eslint/no-unused-vars
      // eslint-disable-line @typescript-eslint/no-unused-vars
      // Lỗi khi tải thông tin token extension
      extensionInfo = {
        isToken2022: existingTokenInfo.isToken2022 || false,
        transferHook: existingTokenInfo.hasTransferHook ? {} : null,
      }
    }

    // Kết hợp thông tin
    return {
      mint: tokenMint,
      symbol:
        tokenInfo.symbol ||
        metaplexMetadata?.symbol ||
        existingTokenInfo.symbol ||
        `Token-${tokenMint.slice(0, 4)}`,
      name:
        tokenInfo.name ||
        metaplexMetadata?.name ||
        existingTokenInfo.name ||
        `Token ${tokenMint.slice(0, 8)}`,
      decimals: existingTokenInfo.decimals || 9,
      icon:
        tokenInfo.icon ||
        metaplexMetadata?.image ||
        existingTokenInfo.icon ||
        '/placeholder-logo.svg',
      isToken2022: extensionInfo?.isToken2022 || existingTokenInfo.isToken2022 || false,
      hasTransferHook:
        extensionInfo?.transferHook !== null || existingTokenInfo.hasTransferHook || false,
      // Thêm thông tin metadata
      description: metaplexMetadata?.description || existingTokenInfo.description,
      uri: metaplexMetadata?.uri || existingTokenInfo.uri,
      metadata: metaplexMetadata || existingTokenInfo.metadata,
    }
  }

  /**
   * Làm giàu thông tin của tất cả token trong một pool
   * @param poolInfo Thông tin pool từ GitHub
   */
  static async enrichPoolTokenInfo(poolInfo: GithubPoolInfo) {
    if (!poolInfo) return null

    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )

    const enrichedPool = { ...poolInfo }

    // Làm giàu thông tin token0
    if (poolInfo.token0 && poolInfo.token0.mint) {
      enrichedPool.token0 = await this.enrichTokenInfo(
        poolInfo.token0.mint,
        poolInfo.token0,
        connection
      )
    }

    // Làm giàu thông tin token1
    if (poolInfo.token1 && poolInfo.token1.mint) {
      enrichedPool.token1 = await this.enrichTokenInfo(
        poolInfo.token1.mint,
        poolInfo.token1,
        connection
      )
    }

    return enrichedPool
  }

  /**
   * Làm giàu thông tin cho danh sách các pool từ GitHub
   * @param pools Danh sách pool từ GitHub
   * @param limit Giới hạn số lượng pool cần làm giàu thông tin (để tránh quá tải)
   */
  static async enrichPoolsTokenInfo(pools: GithubPoolInfo[], limit = 10) {
    if (!pools || pools.length === 0) return []

    // Giới hạn số lượng pool để tránh quá tải
    const poolsToProcess = pools.slice(0, limit)

    const enrichedPools = await Promise.all(
      poolsToProcess.map(pool => this.enrichPoolTokenInfo(pool))
    )

    return enrichedPools
  }

  /**
   * Lấy danh sách tất cả các token có trong các pool từ GitHub
   * @returns Danh sách token duy nhất từ tất cả các pool
   */
  static async getAllPoolTokens(): Promise<GithubTokenInfo[]> {
    try {
      // Lấy danh sách pool từ GitHub
      const pools = await this.getAllPools()

      // Tạo map để lưu trữ token theo mint address
      const tokenMap = new Map()

      // Tạo connection để lấy thông tin token
      const connection = new Connection(
        process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
        'confirmed'
      )

      // Duyệt qua tất cả các pool để thu thập token
      for (const pool of pools) {
        // Xử lý token0
        if (pool.token0 && pool.token0.mint) {
          const mint = pool.token0.mint
          if (!tokenMap.has(mint)) {
            // Lấy thông tin thêm về token từ TokenService
            let tokenInfo
            try {
              tokenInfo = await TokenService.getTokenIconAndName(mint, connection)
            } catch (_) {
              // eslint-disable-line @typescript-eslint/no-unused-vars
              // eslint-disable-line @typescript-eslint/no-unused-vars
              // Lỗi khi tải thông tin token
              tokenInfo = {
                name: pool.token0.name || `Token ${mint.slice(0, 8)}`,
                symbol: pool.token0.symbol || `Token-${mint.slice(0, 4)}`,
                icon: '',
              }
            }

            // Thử lấy thông tin metadata từ Metaplex
            let metaplexMetadata = null
            try {
              metaplexMetadata = await TokenService.getMetaplexTokenMetadata(mint, connection)
            } catch (_) {
              // eslint-disable-line @typescript-eslint/no-unused-vars
              // Lỗi khi lấy metadata từ Metaplex - xử lý im lặng
            }

            // Lấy thông tin về token extension
            let extensionInfo
            try {
              extensionInfo = await getDetailTokenExtensions(mint)
            } catch (_) {
              // eslint-disable-line @typescript-eslint/no-unused-vars
              // eslint-disable-line @typescript-eslint/no-unused-vars
              // Lỗi khi tải thông tin token extension
              extensionInfo = {
                isToken2022: false,
                transferHook: null,
              }
            }

            tokenMap.set(mint, {
              mint: mint,
              symbol:
                tokenInfo.symbol ||
                metaplexMetadata?.symbol ||
                pool.token0.symbol ||
                `Token-${mint.slice(0, 4)}`,
              name:
                tokenInfo.name ||
                metaplexMetadata?.name ||
                pool.token0.name ||
                `Token ${mint.slice(0, 8)}`,
              decimals: pool.token0.decimals || 9,
              icon: tokenInfo.icon || metaplexMetadata?.image || pool.token0.icon || '',
              balance: 0, // Không có thông tin số dư
              address: '', // Không có thông tin địa chỉ token account
              isToken2022: extensionInfo?.isToken2022 || pool.token0.isToken2022 || false,
              hasTransferHook:
                extensionInfo?.transferHook !== null || pool.token0.hasTransferHook || false,
              // Thêm thông tin metadata
              description: metaplexMetadata?.description || pool.token0.description,
              uri: metaplexMetadata?.uri || pool.token0.uri,
              metadata: metaplexMetadata || pool.token0.metadata,
            })
          }
        }

        // Xử lý token1
        if (pool.token1 && pool.token1.mint) {
          const mint = pool.token1.mint
          if (!tokenMap.has(mint)) {
            // Lấy thông tin thêm về token từ TokenService
            let tokenInfo
            try {
              tokenInfo = await TokenService.getTokenIconAndName(mint, connection)
            } catch (_) {
              // eslint-disable-line @typescript-eslint/no-unused-vars
              // eslint-disable-line @typescript-eslint/no-unused-vars
              // Lỗi khi tải thông tin token
              tokenInfo = {
                name: pool.token1.name || `Token ${mint.slice(0, 8)}`,
                symbol: pool.token1.symbol || `Token-${mint.slice(0, 4)}`,
                icon: '',
              }
            }

            // Thử lấy thông tin metadata từ Metaplex
            let metaplexMetadata = null
            try {
              metaplexMetadata = await TokenService.getMetaplexTokenMetadata(mint, connection)
            } catch (_) {
              // eslint-disable-line @typescript-eslint/no-unused-vars
              // eslint-disable-line @typescript-eslint/no-unused-vars
              // Lỗi khi lấy metadata từ Metaplex - xử lý im lặng
            }

            // Lấy thông tin về token extension
            let extensionInfo
            try {
              extensionInfo = await getDetailTokenExtensions(mint)
            } catch (_) {
              // eslint-disable-line @typescript-eslint/no-unused-vars
              // eslint-disable-line @typescript-eslint/no-unused-vars
              // Lỗi khi tải thông tin token extension
              extensionInfo = {
                isToken2022: false,
                transferHook: null,
              }
            }

            tokenMap.set(mint, {
              mint: mint,
              symbol:
                tokenInfo.symbol ||
                metaplexMetadata?.symbol ||
                pool.token1.symbol ||
                `Token-${mint.slice(0, 4)}`,
              name:
                tokenInfo.name ||
                metaplexMetadata?.name ||
                pool.token1.name ||
                `Token ${mint.slice(0, 8)}`,
              decimals: pool.token1.decimals || 9,
              icon: tokenInfo.icon || metaplexMetadata?.image || pool.token1.icon || '',
              balance: 0,
              address: '',
              isToken2022: extensionInfo?.isToken2022 || pool.token1.isToken2022 || false,
              hasTransferHook:
                extensionInfo?.transferHook !== null || pool.token1.hasTransferHook || false,
              // Thêm thông tin metadata
              description: metaplexMetadata?.description || pool.token1.description,
              uri: metaplexMetadata?.uri || pool.token1.uri,
              metadata: metaplexMetadata || pool.token1.metadata,
            })
          }
        }
      }

      // Chuyển map thành mảng
      return Array.from(tokenMap.values())
    } catch (_) {
      // eslint-disable-line @typescript-eslint/no-unused-vars
      // eslint-disable-line @typescript-eslint/no-unused-vars
      // Lỗi khi tải danh sách token từ pool
      return []
    }
  }

  /**
   * Lấy danh sách token từ các pool
   * Phương thức này dành cho instance của lớp
   * @returns Danh sách token duy nhất từ các pool
   */
  async getTokens(): Promise<GithubTokenInfo[]> {
    return GithubPoolService.getAllPoolTokens()
  }
}
