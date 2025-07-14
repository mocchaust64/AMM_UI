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
      console.error('Failed to initialize TokenService:', error)
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
      ]
      this.isInitialized = true
    }
  }

  static async getTokenInfo(mintAddress: string): Promise<TokenInfo | undefined> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    const tokenInfo = this.tokenList.find(token => token.address === mintAddress)

    return tokenInfo
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
        try {
          await getMint(connection, mintPublicKey, undefined, TOKEN_PROGRAM_ID)
          isToken2022 = false
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) {
          try {
            await getMint(connection, mintPublicKey, undefined, TOKEN_2022_PROGRAM_ID)
            isToken2022 = true
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (_) {
            console.error('Error determining token type:', _)
            // Không phải token hợp lệ, trả về thông tin mặc định
            return {
              name: 'Unknown Token',
              symbol: mintAddress.slice(0, 4).toUpperCase(),
              icon: '/placeholder-logo.svg',
            }
          }
        }

        // Thử lấy metadata dựa trên loại token
        let tokenMetadata = null
        try {
          tokenMetadata = await getTokenMetadata(
            connection,
            mintPublicKey,
            undefined,
            isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
          )
        } catch (error) {
          console.error('Error fetching token metadata:', error)
          // Nếu lỗi với program ID đã xác định, thử với program ID còn lại
          try {
            tokenMetadata = await getTokenMetadata(
              connection,
              mintPublicKey,
              undefined,
              isToken2022 ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID
            )
          } catch (secondError) {
            console.error('Error fetching token metadata with alternative program ID:', secondError)
          }
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
            } catch (error) {
              console.error(`Error fetching metadata from URI:`, error)
            }
          }

          return {
            name: metadataName,
            symbol: metadataSymbol,
            icon: metadataImage,
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        console.error('Error in getTokenIconAndName:', _)
      }
    }

    // Fallback khi không tìm thấy thông tin
    return {
      name: 'Unknown Token',
      symbol: mintAddress.slice(0, 4).toUpperCase(),
      icon: '/placeholder-logo.svg',
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    console.error('Error fetching token extensions:', _)

    // Trả về không có extensions khi gặp lỗi
    return {
      isToken2022: false,
      extensions: [],
      transferHook: null,
      error: _ instanceof Error ? _.message : 'Unknown error',
    }
  }
}
