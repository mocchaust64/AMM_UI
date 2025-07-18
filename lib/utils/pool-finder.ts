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
  poolState?: PoolState
}

// Interface cho PoolState từ program account
export interface PoolState {
  token0Mint: PublicKey
  token1Mint: PublicKey
  token0Vault: PublicKey
  token1Vault: PublicKey
  ammConfig: PublicKey
  lpMint: PublicKey
  [key: string]: PublicKey | unknown // Thay thế any bằng kiểu cụ thể hơn
}

// Interface cho thông tin AMM Config
export interface AmmConfigInfo {
  tradeFeeRate: number // Phí giao dịch, cần chia cho 10000 để có %
  protocolFeeRate: number // % của phí giao dịch dành cho protocol
  fundFeeRate: number // % của phí giao dịch dành cho fund
}

// Interface cho AmmConfig từ program
export interface AmmConfigData {
  tradeFeeRate: {
    toNumber: () => number
  }
  protocolFeeRate: {
    toNumber: () => number
  }
  fundFeeRate: {
    toNumber: () => number
  }
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
      // Sử dụng AMM Config mặc định nếu không cung cấp
      const ammConfig = ammConfigAddress || this.defaultAmmConfig

      // Lấy tất cả pool từ chương trình
      const allPools = await this.program.account.poolState.all()

      // Lọc các pool khớp với cả token và AMM Config
      const matchingPools = allPools.filter(pool => {
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
        return null
      }

      // Lấy pool đầu tiên tìm thấy
      const pool = matchingPools[0]

      // Lấy thông tin token balance nếu có thể
      let token0Balance: number | undefined
      let token1Balance: number | undefined

      try {
        const token0VaultInfo = await this.connection.getTokenAccountBalance(
          pool.account.token0Vault
        )
        token0Balance = token0VaultInfo.value.uiAmount || 0
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        // Không thể lấy thông tin Token 0 vault
      }

      try {
        const token1VaultInfo = await this.connection.getTokenAccountBalance(
          pool.account.token1Vault
        )
        token1Balance = token1VaultInfo.value.uiAmount || 0
      } catch {
        // Không thể lấy thông tin Token 1 vault
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
   * Tìm pool từ địa chỉ
   */
  async findPoolByAddress(poolAddress: PublicKey): Promise<PoolInfo | null> {
    try {
      try {
        const poolState = await this.program.account.poolState.fetch(poolAddress)

        // Lấy thông tin token balance nếu có thể
        let token0Balance: number | undefined
        let token1Balance: number | undefined

        try {
          const token0VaultInfo = await this.connection.getTokenAccountBalance(
            poolState.token0Vault
          )
          token0Balance = token0VaultInfo.value.uiAmount || 0
        } catch {
          // Không thể lấy thông tin Token 0 vault
        }

        try {
          const token1VaultInfo = await this.connection.getTokenAccountBalance(
            poolState.token1Vault
          )
          token1Balance = token1VaultInfo.value.uiAmount || 0
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) {
          // Không thể lấy thông tin Token 1 vault
        }

        return {
          poolAddress,
          token0Mint: poolState.token0Mint,
          token1Mint: poolState.token1Mint,
          ammConfig: poolState.ammConfig,
          token0Balance,
          token1Balance,
          poolState,
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        return null
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      console.error(`Lỗi khi tìm pool từ địa chỉ: ${_}`)
      return null
    }
  }

  /**
   * Lấy thông tin AMM Config
   */
  async getAmmConfigInfo(ammConfigAddress: PublicKey): Promise<AmmConfigInfo | null> {
    try {
      // Lấy dữ liệu AMM Config và cast sang đúng kiểu
      const ammConfig = (await this.program.account.ammConfig.fetch(
        ammConfigAddress
      )) as unknown as AmmConfigData

      // Chuyển đổi thành các kiểu dữ liệu phù hợp
      return {
        tradeFeeRate: ammConfig.tradeFeeRate.toNumber(),
        protocolFeeRate: ammConfig.protocolFeeRate.toNumber(),
        fundFeeRate: ammConfig.fundFeeRate.toNumber(),
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
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
      throw new Error('Pool does not have enough liquidity')
    }

    // Lấy phí giao dịch từ pool, mặc định 0.25% nếu không có
    // Xử lý an toàn cho ammConfig, tránh truy cập trực tiếp vào thuộc tính của PublicKey
    let tradeFeeRate = 25 / 10000 // Mặc định 0.25%
    if (pool.poolState && typeof pool.poolState === 'object' && 'ammConfig' in pool.poolState) {
      const ammConfigData = pool.poolState.ammConfig as unknown as { tradeFeeRate?: number }
      if (ammConfigData && typeof ammConfigData === 'object' && 'tradeFeeRate' in ammConfigData) {
        tradeFeeRate = (ammConfigData.tradeFeeRate || 25) / 10000
      }
    }

    // Công thức tính toán dựa trên AMM x*y=k có tính phí giao dịch
    // Trong đó:
    // - x là số lượng token đầu vào
    // - y là số lượng token đầu ra
    // - k là hằng số
    // - fee là phí giao dịch

    // Tính k - hằng số của pool
    const k = inBalance * outBalance

    // Số lượng token đầu vào thực tế sau khi trừ phí giao dịch
    const amountWithFee = amount * (1 - tradeFeeRate)

    // Tính số lượng token đầu vào sau khi thêm amount và trừ phí
    const inBalanceAfterSwap = inBalance + amountWithFee

    // Tính số lượng token đầu ra sau khi swap
    const outBalanceAfterSwap = k / inBalanceAfterSwap

    // Số lượng token đầu ra nhận được
    const outputAmount = outBalance - outBalanceAfterSwap

    // Kiểm tra xem pool có đủ token đầu ra không
    if (outputAmount <= 0 || outputAmount > outBalance * 0.99) {
      throw new Error('Insufficient tokens in pool for this transaction')
    }

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
