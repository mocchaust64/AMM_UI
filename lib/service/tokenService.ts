import { TokenInfo } from '@solana/spl-token-registry'
import { Connection, PublicKey } from '@solana/web3.js'
import {
  getMint,
  getExtensionTypes,
  getTransferHook,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ExtensionType,
  getTokenMetadata,
} from '@solana/spl-token'
import { Metaplex } from '@metaplex-foundation/js'
import { handleSilentError } from '../utils/error-utils'

// Cache cho metadata của token
const tokenMetadataCache: Record<string, any> = {}

// Cache cho thông tin extensions của token
const tokenExtensionsCache: Record<string, any> = {}

export class TokenService {
  private static tokenList: TokenInfo[] = []
  private static isInitialized = false

  static async initialize() {
    if (this.isInitialized) {
      return
    }

    try {
      const response = await fetch(
        'https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json'
      )
      const data = await response.json()

      // Lọc chỉ lấy các token trên devnet
      this.tokenList = data.tokens
        ? data.tokens.filter(
            (token: TokenInfo) => token.chainId === 103 // 103 là chainId của Solana Devnet
          )
        : []
      this.isInitialized = true
    } catch (error) {
      handleSilentError(error, 'Lỗi khi tải danh sách token từ CDN')
      // Loại bỏ console.error
      // Fallback to common tokens on devnet

      this.tokenList = [
        {
          chainId: 103, // Devnet
          address: 'So11111111111111111111111111111111111111112',
          symbol: 'SOL',
          name: 'Solana',
          decimals: 9,
          logoURI:
            'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
          tags: ['native', 'wrapped-solana'],
        },
        // Thêm các token mặc định khác nếu cần
      ]
      this.isInitialized = true
    }
  }

  static async getTokenInfo(mintAddress: string): Promise<TokenInfo | undefined> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    // Tìm trong danh sách token
    const tokenInfo = this.tokenList.find(token => token.address === mintAddress)

    // Nếu tìm thấy trong danh sách, trả về kết quả
    if (tokenInfo) {
      return tokenInfo
    }

    // Nếu không tìm thấy, thử lấy thông tin từ Metaplex
    try {
      const connection = new Connection(
        process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
        'confirmed'
      )

      // Lấy thông tin mint từ blockchain để có decimal chính xác
      let mintInfo
      let decimals
      let isToken2022 = false

      // Thử lấy thông tin mint từ Token program
      try {
        mintInfo = await getMint(
          connection,
          new PublicKey(mintAddress),
          undefined,
          TOKEN_PROGRAM_ID
        )
        decimals = mintInfo.decimals
        isToken2022 = false
      } catch {
        // Nếu thất bại, thử lấy từ Token-2022 program
        try {
          mintInfo = await getMint(
            connection,
            new PublicKey(mintAddress),
            undefined,
            TOKEN_2022_PROGRAM_ID
          )
          decimals = mintInfo.decimals
          isToken2022 = true
        } catch {
          // Không lấy được thông tin mint, ném ra lỗi
          throw new Error(`Cannot retrieve decimals information for token ${mintAddress}`)
        }
      }

      const metaplexInfo = await this.getMetaplexTokenMetadata(mintAddress, connection)

      if (metaplexInfo) {
        // Tạo một đối tượng TokenInfo từ thông tin Metaplex
        const syntheticTokenInfo: TokenInfo = {
          chainId: 103, // Devnet
          address: mintAddress,
          symbol: metaplexInfo.symbol || mintAddress.slice(0, 4).toUpperCase(),
          name: metaplexInfo.name || `Token ${mintAddress.slice(0, 6)}...${mintAddress.slice(-4)}`,
          decimals, // Sử dụng decimals đã lấy được từ mint
          logoURI: metaplexInfo.image || '',
          tags: [],
        }

        // Thêm vào danh sách token để lần sau có thể tái sử dụng
        this.tokenList.push(syntheticTokenInfo)

        return syntheticTokenInfo
      }
    } catch (error) {
      console.error('Error getting token info:', error)
      throw error // Ném ra lỗi để được xử lý ở lớp cao hơn
    }

    // Không tìm thấy thông tin
    return undefined
  }

  // Thêm method mới để lấy tất cả token
  static async getAllTokens(): Promise<TokenInfo[]> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    return this.tokenList
  }

  // Hàm lấy icon và tên của token từ mint address
  static async getTokenIconAndName(
    mintAddress: string,
    connection?: Connection
  ): Promise<{
    name: string
    symbol: string
    icon: string
  }> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    // Tìm token trong danh sách có sẵn
    const tokenInfo = this.tokenList.find(token => token.address === mintAddress)

    if (tokenInfo) {
      return {
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        icon: tokenInfo.logoURI || '/placeholder-logo.svg',
      }
    }

    // Nếu không tìm thấy và có connection, thử lấy metadata từ token
    if (connection) {
      try {
        const mintPublicKey = new PublicKey(mintAddress)

        // Xác định loại token (SPL Token hoặc Token-2022)
        let isToken2022 = false
        let validToken = false
        let mintInfo

        // Thử với TOKEN_PROGRAM_ID trước (SPL Token)
        try {
          mintInfo = await getMint(connection, mintPublicKey, undefined, TOKEN_PROGRAM_ID)
          isToken2022 = false
          validToken = true
        } catch {
          // Không phải SPL token tiêu chuẩn, thử với Token-2022
        }

        // Nếu không phải SPL token, thử với TOKEN_2022_PROGRAM_ID
        if (!validToken) {
          try {
            mintInfo = await getMint(connection, mintPublicKey, undefined, TOKEN_2022_PROGRAM_ID)
            isToken2022 = true
            validToken = true
          } catch {
            // Không phải Token-2022, sử dụng giá trị mặc định
          }
        }

        // Nếu không phải token hợp lệ, trả về thông tin mặc định
        if (!validToken) {
          return {
            name: 'Unknown Token',
            symbol: mintAddress.slice(0, 4).toUpperCase(),
            icon: '/placeholder-logo.svg',
          }
        }

        // Thử lấy metadata sử dụng phương pháp Metaplex trước
        try {
          const metaplexInfo = await this.getMetaplexTokenMetadata(mintAddress, connection)
          if (metaplexInfo) {
            return {
              name: metaplexInfo.name,
              symbol: metaplexInfo.symbol,
              icon: metaplexInfo.image || '/placeholder-logo.svg',
            }
          }
        } catch {
          // Xử lý im lặng lỗi khi lấy metadata từ Metaplex
        }

        // Nếu không lấy được qua Metaplex, thử phương pháp spl-token tiêu chuẩn
        let tokenMetadata = null
        try {
          tokenMetadata = await getTokenMetadata(
            connection,
            mintPublicKey,
            undefined,
            isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
          )
        } catch {
          // Xử lý im lặng lỗi khi lấy metadata từ token program
        }

        if (tokenMetadata) {
          let metadataName = tokenMetadata.name || 'Unknown Token'
          let metadataSymbol = tokenMetadata.symbol || 'UNKNOWN'
          let metadataImage = '/placeholder-logo.svg'

          // Nếu có URI, tải thêm thông tin hình ảnh
          if (tokenMetadata.uri) {
            try {
              const response = await fetch(tokenMetadata.uri)
              if (response.ok) {
                const metadataJson = await response.json()

                // Sử dụng dữ liệu từ URI nếu có
                metadataName = metadataJson.name || metadataName
                metadataSymbol = metadataJson.symbol || metadataSymbol
                metadataImage = metadataJson.image || metadataImage
              }
            } catch {
              // Xử lý im lặng lỗi khi tải URI
            }
          }

          return {
            name: metadataName,
            symbol: metadataSymbol,
            icon: metadataImage,
          }
        }

        // Nếu vẫn không có metadata, trả về thông tin cơ bản từ mint
        if (mintInfo) {
          return {
            name: `Token ${mintAddress.slice(0, 6)}...${mintAddress.slice(-4)}`,
            symbol: mintAddress.slice(0, 4).toUpperCase(),
            icon: '/placeholder-logo.svg',
          }
        }
      } catch {
        // Xử lý im lặng lỗi không xác định
      }
    }

    // Fallback khi không tìm thấy thông tin
    return {
      name: 'Unknown Token',
      symbol: mintAddress.slice(0, 4).toUpperCase(),
      icon: '/placeholder-logo.svg',
    }
  }

  /**
   * Lấy metadata của token sử dụng Metaplex
   * @param tokenAddress Địa chỉ mint của token
   * @param connection Connection đến mạng Solana
   * @returns Thông tin metadata của token
   */
  static async getMetaplexTokenMetadata(tokenAddress: string, connection: Connection) {
    // Kiểm tra cache trước
    if (tokenMetadataCache[tokenAddress]) {
      return tokenMetadataCache[tokenAddress]
    }

    try {
      const mintPublicKey = new PublicKey(tokenAddress)

      // Kiểm tra loại token trước (SPL Token hoặc Token-2022)
      let isToken2022 = false

      try {
        // Thử lấy thông tin với TOKEN_PROGRAM_ID (SPL Token)
        await getMint(connection, mintPublicKey, undefined, TOKEN_PROGRAM_ID)
      } catch {
        // Nếu lỗi, thử với TOKEN_2022_PROGRAM_ID
        try {
          await getMint(connection, mintPublicKey, undefined, TOKEN_2022_PROGRAM_ID)
          isToken2022 = true
        } catch {
          // Không phải token hợp lệ, trả về thông tin mặc định
          const defaultData = {
            name: `Token ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`,
            symbol: tokenAddress.slice(0, 4).toUpperCase(),
            uri: '',
            image: null,
            description: null,
          }
          tokenMetadataCache[tokenAddress] = defaultData
          return defaultData
        }
      }

      // Khởi tạo Metaplex instance
      const metaplex = Metaplex.make(connection)

      // Với token-2022, thử lấy metadata từ on-chain trước tiên
      if (isToken2022) {
        try {
          // Lấy metadata từ token program
          const tokenMetadata = await getTokenMetadata(
            connection,
            mintPublicKey,
            undefined,
            TOKEN_2022_PROGRAM_ID
          )

          if (tokenMetadata) {
            const metadata = {
              name:
                tokenMetadata.name ||
                `Token ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`,
              symbol: tokenMetadata.symbol || tokenAddress.slice(0, 4).toUpperCase(),
              uri: tokenMetadata.uri || '',
              image: null as string | null,
              description: null as string | null,
            }

            // Nếu có URI, tải thêm thông tin
            if (tokenMetadata.uri) {
              try {
                const response = await fetch(tokenMetadata.uri)
                if (response.ok) {
                  const metadataJson = await response.json()
                  metadata.image = metadataJson.image || null
                  metadata.description = metadataJson.description || null
                }
              } catch {
                // Xử lý im lặng lỗi khi tải URI
              }
            }

            // Lưu vào cache
            tokenMetadataCache[tokenAddress] = metadata
            return metadata
          }
        } catch {
          // Xử lý im lặng lỗi khi lấy metadata từ token program
        }
      }

      // Đối với SPL token hoặc nếu không lấy được metadata từ token-2022
      // Thử sử dụng Metaplex
      try {
        const nft = await metaplex.nfts().findByMint({ mintAddress: mintPublicKey })

        // Tạo object chứa metadata
        const metadata = {
          name: nft.name,
          symbol: nft.symbol,
          uri: nft.uri,
          image: null as string | null,
          description: null as string | null,
        }

        // Nếu có JSON metadata, lấy thêm thông tin
        if (nft.json) {
          metadata.image = nft.json.image || null
          metadata.description = nft.json.description || null
        } else if (nft.uri) {
          // Nếu không có sẵn JSON nhưng có URI, tải metadata từ URI
          try {
            const response = await fetch(nft.uri)
            if (response.ok) {
              const metadataJson = await response.json()
              metadata.image = metadataJson.image || null
              metadata.description = metadataJson.description || null
            }
          } catch {
            // Xử lý im lặng lỗi khi tải URI
          }
        }

        // Lưu vào cache
        tokenMetadataCache[tokenAddress] = metadata
        return metadata
      } catch {
        // Không tìm thấy metadata, trả về thông tin mặc định
        const defaultData = {
          name: `Token ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`,
          symbol: tokenAddress.slice(0, 4).toUpperCase(),
          uri: '',
          image: null,
          description: null,
        }
        tokenMetadataCache[tokenAddress] = defaultData
        return defaultData
      }
    } catch {
      // Lỗi không xác định, trả về thông tin mặc định
      const defaultData = {
        name: `Token ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`,
        symbol: tokenAddress.slice(0, 4).toUpperCase(),
        uri: '',
        image: null,
        description: null,
      }
      tokenMetadataCache[tokenAddress] = defaultData
      return defaultData
    }
  }
}

/**
 * Lấy thông tin về extensions của token (chỉ hoạt động với Token-2022)
 * @param mintAddress Địa chỉ mint của token cần kiểm tra
 * @returns Thông tin extensions và transferHook (nếu có)
 */
export async function getDetailTokenExtensions(mintAddress: string) {
  // Kiểm tra cache trước
  if (tokenExtensionsCache[mintAddress]) {
    return tokenExtensionsCache[mintAddress]
  }

  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
    const mintPublicKey = new PublicKey(mintAddress)

    // Trước tiên, kiểm tra xem token có phải là token-2022 hay không
    try {
      // Thử lấy thông tin token từ SPL Token program
      await getMint(connection, mintPublicKey, undefined, TOKEN_PROGRAM_ID)

      // Nếu lấy được thông tin từ SPL Token program, đây là token thường
      // Trả về không có extensions
      const result = {
        isToken2022: false,
        extensions: [],
        transferHook: null,
      }

      // Lưu vào cache
      tokenExtensionsCache[mintAddress] = result
      return result
    } catch {
      // Nếu lỗi, có thể là token-2022 hoặc địa chỉ không hợp lệ
      // Tiếp tục thử với TOKEN_2022_PROGRAM_ID
    }

    // Thử lấy thông tin từ Token-2022 program
    const mintInfo = await getMint(connection, mintPublicKey, undefined, TOKEN_2022_PROGRAM_ID)

    // Nếu lấy được thông tin, đây là token-2022
    if (!mintInfo.tlvData) {
      const result = {
        isToken2022: true,
        extensions: [],
        transferHook: null,
      }

      // Lưu vào cache
      tokenExtensionsCache[mintAddress] = result
      return result
    }

    // Lấy danh sách extensions
    const extensionTypes = getExtensionTypes(mintInfo.tlvData)

    // Kiểm tra xem có TransferHook không
    if (extensionTypes.includes(ExtensionType.TransferHook)) {
      const transferHookData = getTransferHook(mintInfo)

      if (transferHookData) {
        const result = {
          isToken2022: true,
          extensions: extensionTypes.map(type => ExtensionType[type]),
          transferHook: {
            authority: transferHookData.authority ? transferHookData.authority.toBase58() : 'None',
            programId: transferHookData.programId ? transferHookData.programId.toBase58() : 'None',
          },
        }

        // Lưu vào cache
        tokenExtensionsCache[mintAddress] = result
        return result
      }
    }

    // Trường hợp có extensions nhưng không có TransferHook
    const result = {
      isToken2022: true,
      extensions: extensionTypes.map(type => ExtensionType[type]),
      transferHook: null,
    }

    // Lưu vào cache
    tokenExtensionsCache[mintAddress] = result
    return result
  } catch (err) {
    // Sửa biến unused và bỏ console.error
    const result = {
      isToken2022: false,
      extensions: [],
      transferHook: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }

    // Lưu vào cache (ngay cả khi có lỗi)
    tokenExtensionsCache[mintAddress] = result
    return result
  }
}
