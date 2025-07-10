import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey, Transaction, ComputeBudgetProgram, Connection } from '@solana/web3.js'
import { Program, BN } from '@coral-xyz/anchor'
import { RaydiumCpSwap } from '../../idl/types/raydium_cp_swap'
import { getAuthAddress, getOracleAddress } from '../utils/pda'
import { PoolService } from './poolService'
import * as anchor from '@coral-xyz/anchor'

const TRANSFER_HOOK_PROGRAM_ID = new PublicKey('12BZr6af3s7qf7GGmhBvMd46DWmVNhHfXmCwftfMk1mZ')

interface SwapParams {
  ammConfigIndex: number
  inputToken: PublicKey
  outputToken: PublicKey
  inputTokenAccount: PublicKey
  outputTokenAccount: PublicKey
  amountIn: BN
  minimumAmountOut: BN
  hookTokenMint: PublicKey
  wallet: {
    publicKey: PublicKey
    signTransaction: (tx: Transaction) => Promise<Transaction>
  }
  poolAddress?: PublicKey
}

// Định nghĩa kiểu dữ liệu cho pool info
interface PoolInfo {
  poolAddress: PublicKey
  poolState?: any
  poolInfo?: any
}

export class SwapService {
  private readonly poolService: PoolService

  constructor(
    private readonly program: Program<RaydiumCpSwap>,
    private readonly connection: Connection
  ) {
    this.poolService = new PoolService(program, connection)
  }

  async swap({
    ammConfigIndex,
    inputToken,
    outputToken,
    inputTokenAccount,
    outputTokenAccount,
    amountIn,
    minimumAmountOut,
    hookTokenMint,
    wallet,
    poolAddress,
  }: SwapParams) {
    try {
      // 1. Tìm hoặc sử dụng pool address
      let pool: PoolInfo
      let poolAddr: PublicKey

      if (poolAddress) {
        // Sử dụng pool address được cung cấp
        try {
          // Lấy thông tin pool từ address
          const poolState = await this.program.account.poolState.fetch(poolAddress)
          pool = {
            poolAddress,
            poolState,
          }
          poolAddr = poolAddress
        } catch (error) {
          console.error('Không thể tải thông tin pool:', error)
          throw new Error('Pool address không hợp lệ hoặc không tồn tại')
        }
      } else {
        // Tìm pool dựa vào token pair
        const foundPool = await this.poolService.findPoolByTokenPair(
          inputToken,
          outputToken,
          ammConfigIndex
        )

        if (!foundPool) {
          throw new Error('Không tìm thấy pool cho cặp token này')
        }

        pool = {
          poolAddress: foundPool.poolAddress,
          poolInfo: foundPool.poolInfo,
        }
        poolAddr = foundPool.poolAddress
      }

      // 2. Get PDAs
      const [auth] = await getAuthAddress(this.program.programId)
      const [observationAddress] = await getOracleAddress(poolAddr, this.program.programId)

      // 3. Get pool state
      let poolState
      if (pool.poolState) {
        poolState = pool.poolState
      } else if (pool.poolInfo) {
        poolState = pool.poolInfo
      } else {
        poolState = await this.program.account.poolState.fetch(poolAddr)
      }

      // 4. Determine input/output vaults
      const inputVault: PublicKey = inputToken.equals(poolState.token0Mint)
        ? poolState.token0Vault
        : poolState.token1Vault

      const outputVault: PublicKey = inputToken.equals(poolState.token0Mint)
        ? poolState.token1Vault
        : poolState.token0Vault

      // 5. Get AMM config
      const ammConfigAddress = poolState.ammConfig

      // 6. Setup remaining accounts for transfer hooks
      const remainingAccounts: { pubkey: PublicKey; isWritable: boolean; isSigner: boolean }[] = []

      // Thêm tài khoản cho input token
      const [whitelistPDA_input] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('white_list'), inputToken.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )
      const [extraAccountMetaListPDA_input] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('extra-account-metas'), inputToken.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )

      // Luôn thêm tài khoản transfer hook cho input token
      remainingAccounts.push(
        { pubkey: TRANSFER_HOOK_PROGRAM_ID, isWritable: false, isSigner: false },
        { pubkey: extraAccountMetaListPDA_input, isWritable: false, isSigner: false },
        { pubkey: whitelistPDA_input, isWritable: true, isSigner: false }
      )

      // Thêm tài khoản cho output token
      const [whitelistPDA_output] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('white_list'), outputToken.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )
      const [extraAccountMetaListPDA_output] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('extra-account-metas'), outputToken.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )

      // Luôn thêm tài khoản transfer hook cho output token
      remainingAccounts.push(
        { pubkey: TRANSFER_HOOK_PROGRAM_ID, isWritable: false, isSigner: false },
        { pubkey: extraAccountMetaListPDA_output, isWritable: false, isSigner: false },
        { pubkey: whitelistPDA_output, isWritable: true, isSigner: false }
      )

      // Thêm wallet vào danh sách remainingAccounts - Quan trọng cho transfer hook
      remainingAccounts.push({ pubkey: wallet.publicKey, isWritable: false, isSigner: true })

      // 7. Create swap instruction
      const swapIx = await this.program.methods
        .swapBaseInput(amountIn, minimumAmountOut)
        .accountsPartial({
          payer: wallet.publicKey,
          authority: auth,
          ammConfig: ammConfigAddress,
          poolState: poolAddr,
          inputTokenAccount,
          outputTokenAccount,
          inputVault,
          outputVault,
          inputTokenProgram: TOKEN_2022_PROGRAM_ID,
          outputTokenProgram: TOKEN_2022_PROGRAM_ID,
          inputTokenMint: inputToken,
          outputTokenMint: outputToken,
          observationState: observationAddress,
        })
        .remainingAccounts(remainingAccounts)
        .instruction()

      // 8. Create and send transaction
      const modifyComputeUnit = ComputeBudgetProgram.setComputeUnitLimit({
        units: 800_000, // Tăng từ 400_000 lên 800_000
      })

      const tx = new Transaction().add(modifyComputeUnit).add(swapIx)

      tx.feePayer = wallet.publicKey
      tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash

      const signedTx = await wallet.signTransaction(tx)
      const signature = await this.connection.sendRawTransaction(signedTx.serialize())
      await this.connection.confirmTransaction(signature)

      return { signature }
    } catch (error) {
      console.error('Swap error:', error)
      throw error
    }
  }
}
