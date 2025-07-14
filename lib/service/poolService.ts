import { Program } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import { RaydiumCpSwap } from '../../idl/types/raydium_cp_swap'
import { TokenService } from './tokenService'

interface PoolInfo {
  poolAddress: PublicKey
  poolInfo: PoolState
  token0Mint: PublicKey
  token1Mint: PublicKey
  token0Balance?: number
  token1Balance?: number
  ammConfig: PublicKey
}

// Interface cho PoolState từ program account
interface PoolState {
  token0Mint: PublicKey
  token1Mint: PublicKey
  token0Vault: PublicKey
  token1Vault: PublicKey
  ammConfig: PublicKey
  lpMint: PublicKey
  [key: string]: PublicKey | unknown // Thay thế any bằng kiểu cụ thể hơn
}

// Thông tin chi tiết hơn cho pool, bao gồm tên token, biểu tượng
interface DetailedPoolInfo {
  poolAddress: string
  name: string
  tokens: { symbol: string; icon: string; mint: string }[]
  tvl: string
  apy: string
  volume24h: string
  fees24h: string
  type: 'Standard' | 'Custom'
  isActive: boolean
}

export class PoolService {
  constructor(
    private readonly program: Program<RaydiumCpSwap>,
    private readonly connection: Connection
  ) {}

  /**
   * Tìm pool dựa trên cặp token
   * @param token0 Mint address của token thứ nhất
   * @param token1 Mint address của token thứ hai
   * @param ammConfigIndex Index của AMM config (mặc định là 0)
   * @returns Thông tin pool nếu tìm thấy, null nếu không tìm thấy
   */
  async findPoolByTokenPair(token0: PublicKey, token1: PublicKey): Promise<PoolInfo | null> {
    try {
      // Tìm tất cả các pool có trong program
      const allPools = await this.program.account.poolState.all()

      // Tìm pool khớp với cặp token (không quan tâm thứ tự)
      const matchingPool = allPools.find(poolAccount => {
        const pool = poolAccount.account

        // So sánh các mint address
        return (
          (pool.token0Mint.equals(token0) && pool.token1Mint.equals(token1)) ||
          (pool.token0Mint.equals(token1) && pool.token1Mint.equals(token0))
        )
      })

      if (!matchingPool) {
        return null
      }

      const poolAddress = matchingPool.publicKey
      const poolInfo = matchingPool.account

      // Lấy thông tin chi tiết về token balance trong pool
      const token0VaultBalance = await this.connection.getTokenAccountBalance(poolInfo.token0Vault)
      const token1VaultBalance = await this.connection.getTokenAccountBalance(poolInfo.token1Vault)

      return {
        poolAddress,
        poolInfo,
        token0Mint: poolInfo.token0Mint,
        token1Mint: poolInfo.token1Mint,
        token0Balance: token0VaultBalance?.value?.uiAmount || 0,
        token1Balance: token1VaultBalance?.value?.uiAmount || 0,
        ammConfig: poolInfo.ammConfig,
      }
    } catch (error) {
      console.error('Error finding pool by token pair:', error)
      return null
    }
  }

  /**
   * Lấy danh sách các pool trong program
   * @param limit Số lượng pool tối đa muốn lấy (mặc định là 10)
   * @returns Danh sách thông tin pool
   */
  async listPools(limit: number = 10): Promise<PoolInfo[]> {
    try {
      // Lấy tất cả các pool từ program
      const allPools = await this.program.account.poolState.all()

      // Chỉ lấy số lượng pool theo limit
      const limitedPools = allPools.slice(0, limit)

      // Chuyển đổi thành PoolInfo[]
      const poolInfos: PoolInfo[] = await Promise.all(
        limitedPools.map(async poolAccount => {
          const poolAddress = poolAccount.publicKey
          const poolInfo = poolAccount.account

          // Lấy thông tin chi tiết về token balance trong pool
          const token0VaultBalance = await this.connection.getTokenAccountBalance(
            poolInfo.token0Vault
          )
          const token1VaultBalance = await this.connection.getTokenAccountBalance(
            poolInfo.token1Vault
          )

          return {
            poolAddress,
            poolInfo,
            token0Mint: poolInfo.token0Mint,
            token1Mint: poolInfo.token1Mint,
            token0Balance: token0VaultBalance?.value?.uiAmount || 0,
            token1Balance: token1VaultBalance?.value?.uiAmount || 0,
            ammConfig: poolInfo.ammConfig,
          }
        })
      )

      return poolInfos
    } catch (error) {
      console.error('Error listing pools:', error)
      return []
    }
  }

  /**
   * Lấy danh sách các pool mà người dùng đang tham gia
   * @param userWallet Địa chỉ ví của người dùng
   * @returns Danh sách thông tin chi tiết về các pool mà người dùng tham gia
   */
  async listPoolsByOwner(userWallet: PublicKey): Promise<DetailedPoolInfo[]> {
    try {
      // Đảm bảo TokenService được khởi tạo
      await TokenService.initialize()

      // Lấy tất cả các token account của người dùng
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(userWallet, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      })

      // Lấy tất cả pool từ chương trình
      const allPools = await this.program.account.poolState.all()

      // Lọc ra các pool mà người dùng đang tham gia (đang nắm giữ LP token)
      const userPools: DetailedPoolInfo[] = []

      for (const poolAccount of allPools) {
        const poolState = poolAccount.account
        const lpMint = poolState.lpMint.toString()

        // Kiểm tra xem người dùng có nắm giữ LP token của pool này không
        const hasLpToken = tokenAccounts.value.some(
          ta =>
            ta.account.data.parsed.info.mint === lpMint &&
            parseInt(ta.account.data.parsed.info.tokenAmount.amount) > 0
        )

        if (hasLpToken) {
          // Lấy thông tin chi tiết về các token trong pool
          const token0MintAddress = poolState.token0Mint.toString()
          const token1MintAddress = poolState.token1Mint.toString()

          // Lấy thông tin token sử dụng hàm mới getTokenIconAndName
          const token0Info = await TokenService.getTokenIconAndName(
            token0MintAddress,
            this.connection
          )
          const token1Info = await TokenService.getTokenIconAndName(
            token1MintAddress,
            this.connection
          )

          // Lấy thông tin token balance trong pool
          const token0VaultBalance = await this.connection.getTokenAccountBalance(
            poolState.token0Vault
          )
          const token1VaultBalance = await this.connection.getTokenAccountBalance(
            poolState.token1Vault
          )

          // Tính toán TVL đơn giản (giả định giá 1 USD mỗi token cho ví dụ này)
          const token0Value = token0VaultBalance?.value?.uiAmount || 0
          const token1Value = token1VaultBalance?.value?.uiAmount || 0
          const tvl = token0Value + token1Value

          // Tạo thông tin chi tiết về pool
          userPools.push({
            poolAddress: poolAccount.publicKey.toString(),
            name: `${token0Info.symbol}/${token1Info.symbol}`,
            tokens: [
              {
                symbol: token0Info.symbol,
                icon: token0Info.icon,
                mint: token0MintAddress,
              },
              {
                symbol: token1Info.symbol,
                icon: token1Info.icon,
                mint: token1MintAddress,
              },
            ],
            tvl: `$${tvl.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
            apy: 'N/A', // Cần tính toán thực tế dựa trên dữ liệu lịch sử
            volume24h: 'N/A', // Cần dữ liệu lịch sử để tính
            fees24h: 'N/A', // Cần dữ liệu lịch sử để tính
            type: 'Standard', // Có thể cần thêm logic để phân biệt loại pool
            isActive: true,
          })
        }
      }

      return userPools
    } catch (error) {
      console.error('Error listing pools by owner:', error)
      return []
    }
  }
}
