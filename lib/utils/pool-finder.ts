import { Program } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import { RaydiumCpSwap } from '../../idl/types/raydium_cp_swap'

// Định nghĩa interface cho pool
export interface PoolInfo {
  poolAddress: PublicKey
  token0Mint: PublicKey
  token1Mint: PublicKey
  ammConfig: PublicKey
  token0Balance?: number
  token1Balance?: number
  poolState?: any
}

// Interface cho thông tin AMM Config
export interface AmmConfigInfo {
  tradeFeeRate: number // Phí giao dịch, cần chia cho 10000 để có %
  protocolFeeRate: number // % của phí giao dịch dành cho protocol
  fundFeeRate: number // % của phí giao dịch dành cho fund
}

export class PoolFinder {
  private readonly program: Program<RaydiumCpSwap>
  private readonly connection: Connection
  private readonly defaultAmmConfig: PublicKey

  constructor(
    program: Program<RaydiumCpSwap>,
    connection: Connection,
    defaultAmmConfig = new PublicKey('5nWyCWXhJEaHmj8zJ1graq64dgfyX4oY7r7NZ3xxfozN')
  ) {
    this.program = program
    this.connection = connection
    this.defaultAmmConfig = defaultAmmConfig
  }

  /**
   * Tìm pool từ cặp token và AMM Config
   */
  async findPoolByTokens(
    token0Mint: PublicKey,
    token1Mint: PublicKey,
    ammConfigAddress?: PublicKey
  ): Promise<PoolInfo | null> {
    try {
      console.log(`Tìm pool cho token ${token0Mint.toString()} và ${token1Mint.toString()}`)

      // Sử dụng AMM Config mặc định nếu không cung cấp
      const ammConfig = ammConfigAddress || this.defaultAmmConfig

      // Lấy tất cả pool từ chương trình
      const allPools = await this.program.account.poolState.all()
      console.log(`Đang tìm kiếm trong ${allPools.length} pools...`)

      // Lọc các pool khớp với cả token và AMM Config
      const matchingPools = allPools.filter((pool: any) => {
        const poolToken0 = pool.account.token0Mint.toString()
        const poolToken1 = pool.account.token1Mint.toString()
        const poolConfig = pool.account.ammConfig.toString()

        return (
          poolConfig === ammConfig.toString() &&
          ((poolToken0 === token0Mint.toString() && poolToken1 === token1Mint.toString()) ||
            (poolToken0 === token1Mint.toString() && poolToken1 === token0Mint.toString()))
        )
      })

      if (matchingPools.length === 0) {
        console.log('Không tìm thấy pool cho cặp token này')
        return null
      }

      // Lấy pool đầu tiên tìm thấy
      const pool = matchingPools[0]
      console.log(`Đã tìm thấy pool: ${pool.publicKey.toString()}`)

      // Lấy thông tin token balance nếu có thể
      let token0Balance: number | undefined
      let token1Balance: number | undefined

      try {
        const token0VaultInfo = await this.connection.getTokenAccountBalance(
          pool.account.token0Vault
        )
        token0Balance = token0VaultInfo.value.uiAmount || 0
      } catch (err) {
        console.log(`Không thể lấy thông tin Token 0 vault`)
      }

      try {
        const token1VaultInfo = await this.connection.getTokenAccountBalance(
          pool.account.token1Vault
        )
        token1Balance = token1VaultInfo.value.uiAmount || 0
      } catch (err) {
        console.log(`Không thể lấy thông tin Token 1 vault`)
      }

      return {
        poolAddress: pool.publicKey,
        token0Mint: pool.account.token0Mint,
        token1Mint: pool.account.token1Mint,
        ammConfig: pool.account.ammConfig,
        token0Balance,
        token1Balance,
        poolState: pool.account,
      }
    } catch (error) {
      console.error(`Lỗi khi tìm pool từ token: ${error}`)
      return null
    }
  }

  /**
   * Lấy thông tin AMM Config
   */
  async getAmmConfigInfo(ammConfigAddress: PublicKey): Promise<AmmConfigInfo | null> {
    try {
      const ammConfig = await this.program.account.ammConfig.fetch(ammConfigAddress)

      return {
        tradeFeeRate: Number(ammConfig.tradeFeeRate),
        protocolFeeRate: Number(ammConfig.protocolFeeRate),
        fundFeeRate: Number(ammConfig.fundFeeRate),
      }
    } catch (error) {
      console.error(`Lỗi khi lấy thông tin AMM Config: ${error}`)
      return null
    }
  }

  /**
   * Tính toán tỷ giá dựa trên dữ liệu pool
   */
  calculateRate(
    pool: PoolInfo,
    fromTokenMint: string,
    amount: number
  ): { outputAmount: number; rate: number; minimumReceived: number } {
    // Xác định token đầu vào và đầu ra
    const isToken0 = pool.token0Mint.toString() === fromTokenMint

    // Lấy số dư của token đầu vào và đầu ra
    const inBalance = isToken0 ? pool.token0Balance || 0 : pool.token1Balance || 0
    const outBalance = isToken0 ? pool.token1Balance || 0 : pool.token0Balance || 0

    if (inBalance === 0 || outBalance === 0) {
      throw new Error('Pool không có đủ thanh khoản')
    }

    // Công thức tính toán dựa trên AMM x*y=k
    // Trong đó:
    // - x là số lượng token đầu vào
    // - y là số lượng token đầu ra
    // - k là hằng số

    // Tính k
    const k = inBalance * outBalance

    // Tính số lượng token đầu vào sau khi thêm amount
    const inBalanceAfterSwap = inBalance + amount

    // Tính số lượng token đầu ra sau khi swap
    const outBalanceAfterSwap = k / inBalanceAfterSwap

    // Số lượng token đầu ra nhận được
    const outputAmount = outBalance - outBalanceAfterSwap

    // Tỷ giá: 1 token đầu vào = ? token đầu ra
    const rate = outputAmount / amount

    // Số lượng tối thiểu nhận được (trừ đi 0.5% slippage)
    const minimumReceived = outputAmount * 0.995

    return {
      outputAmount,
      rate,
      minimumReceived,
    }
  }
}
