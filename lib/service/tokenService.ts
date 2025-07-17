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
    } catch (_) {
      // eslint-disable-line @typescript-eslint/no-unused-vars
      // eslint-disable-line @typescript-eslint/no-unused-vars
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
          tags: ['native'],
        },
        {
          chainId: 103, // Devnet
          address: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
          symbol: 'USDC',
          name: 'USD Coin (Devnet)',
          decimals: 6,
          logoURI:
            'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
          tags: ['stablecoin'],
        },
        {
          chainId: 103, // Devnet
          address: 'BFR68SCH16jfXkgWxaY4ZAE4y1KNUxhE9baag8YeZEBj',
          symbol: 'USDC',
          name: 'USD Coin (Devnet)',
          decimals: 6,
          logoURI:
            'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
          tags: ['stablecoin'],
        },
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

      const metaplexInfo = await this.getMetaplexTokenMetadata(mintAddress, connection)

      if (metaplexInfo) {
        // Tạo một đối tượng TokenInfo từ thông tin Metaplex
        const syntheticTokenInfo: TokenInfo = {
          chainId: 103, // Devnet
          address: mintAddress,
          symbol: metaplexInfo.symbol || mintAddress.slice(0, 4).toUpperCase(),
          name: metaplexInfo.name || `Token ${mintAddress.slice(0, 6)}...${mintAddress.slice(-4)}`,
          decimals: 9, // Giá trị mặc định, có thể cập nhật sau
          logoURI: metaplexInfo.image || '',
          tags: [],
        }

        // Thêm vào danh sách token để lần sau có thể tái sử dụng
        this.tokenList.push(syntheticTokenInfo)

        return syntheticTokenInfo
      }
    } catch {
      // Loại bỏ console.log và biến error không sử dụng
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
          // Loại bỏ biến error không sử dụng và console.log
          // Not a standard SPL token, trying Token-2022 program
        }

        // Nếu không phải SPL token, thử với TOKEN_2022_PROGRAM_ID
        if (!validToken) {
          try {
            mintInfo = await getMint(connection, mintPublicKey, undefined, TOKEN_2022_PROGRAM_ID)
            isToken2022 = true
            validToken = true
          } catch {
            // Loại bỏ biến error không sử dụng và console.log
            // Not a Token-2022 token either, using default values
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
          // Loại bỏ biến error không sử dụng và console.log
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
          // Loại bỏ biến error không sử dụng và console.log
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
              // Loại bỏ biến error không sử dụng và console.log
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
        // Loại bỏ biến error không sử dụng và console.log
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
        // Không phải token hợp lệ
        throw new Error('Invalid token')
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
              tokenMetadata.name || `Token ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`,
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
              // Loại bỏ biến error không sử dụng và console.log
            }
          }

          return metadata
        }
      } catch {
        // Loại bỏ biến error không sử dụng và console.log
      }
    }

    // Đối với SPL token hoặc nếu không lấy được metadata từ token-2022
    // Thử sử dụng Metaplex, bọc trong try-catch để tránh lỗi AccountNotFoundError
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
          // Loại bỏ biến error không sử dụng và console.log
        }
      }

      return metadata
    } catch (error) {
      // Xử lý khi không tìm thấy metadata
      if (
        error instanceof Error &&
        error.message &&
        error.message.includes('AccountNotFoundError')
      ) {
        // Loại bỏ console.log
        // Trả về thông tin mặc định
        return {
          name: `Token ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`,
          symbol: tokenAddress.slice(0, 4).toUpperCase(),
          uri: '',
          image: null,
          description: null,
        }
      }
      throw error
    }
  }
}

/**
 * Lấy thông tin về extensions của token (chỉ hoạt động với Token-2022)
 * @param mintAddress Địa chỉ mint của token cần kiểm tra
 * @returns Thông tin extensions và transferHook (nếu có)
 */
export async function getDetailTokenExtensions(mintAddress: string) {
  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
    const mintPublicKey = new PublicKey(mintAddress)

    // Trước tiên, kiểm tra xem token có phải là token-2022 hay không
    try {
      // Thử lấy thông tin token từ SPL Token program
      await getMint(connection, mintPublicKey, undefined, TOKEN_PROGRAM_ID)

      // Nếu lấy được thông tin từ SPL Token program, đây là token thường
      // Trả về không có extensions
      return {
        isToken2022: false,
        extensions: [],
        transferHook: null,
      }
    } catch {
      // Nếu lỗi, có thể là token-2022 hoặc địa chỉ không hợp lệ
      // Tiếp tục thử với TOKEN_2022_PROGRAM_ID
    }

    // Thử lấy thông tin từ Token-2022 program
    const mintInfo = await getMint(connection, mintPublicKey, undefined, TOKEN_2022_PROGRAM_ID)

    // Nếu lấy được thông tin, đây là token-2022
    if (!mintInfo.tlvData) {
      return {
        isToken2022: true,
        extensions: [],
        transferHook: null,
      }
    }

    // Lấy danh sách extensions
    const extensionTypes = getExtensionTypes(mintInfo.tlvData)

    // Kiểm tra xem có TransferHook không
    if (extensionTypes.includes(ExtensionType.TransferHook)) {
      const transferHookData = getTransferHook(mintInfo)

      if (transferHookData) {
        return {
          isToken2022: true,
          extensions: extensionTypes.map(type => ExtensionType[type]),
          transferHook: {
            authority: transferHookData.authority ? transferHookData.authority.toBase58() : 'None',
            programId: transferHookData.programId ? transferHookData.programId.toBase58() : 'None',
          },
        }
      }
    }

    // Trường hợp có extensions nhưng không có TransferHook
    return {
      isToken2022: true,
      extensions: extensionTypes.map(type => ExtensionType[type]),
      transferHook: null,
    }
  } catch (err) {
    // Sửa biến unused và bỏ console.error
    return {
      isToken2022: false,
      extensions: [],
      transferHook: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
