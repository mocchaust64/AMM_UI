import {
  Connection,
  PublicKey,
  Keypair,
  ComputeBudgetProgram,
  SystemProgram,
  Transaction,
} from '@solana/web3.js'
import { Program, BN, AnchorProvider } from '@coral-xyz/anchor'
import { RaydiumCpSwap } from '../../idl/types/raydium_cp_swap'
import * as anchor from '@coral-xyz/anchor'

import {
  getAmmConfigAddress,
  getPoolAddress,
  getAuthAddress,
  getPoolLpMintAddress,
  getPoolVaultAddress,
  getOracleAddress,
} from '/Users/tai/Documents/MoonRaise/AMM-UI/AMM-UI/lib/utils/pda'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'

const TRANSFER_HOOK_PROGRAM_ID = new PublicKey('12BZr6af3s7qf7GGmhBvMd46DWmVNhHfXmCwftfMk1mZ')
interface CreatePoolParams {
  ammConfigIndex?: number
  ammConfigAddress?: PublicKey
  token0Mint: PublicKey
  token1Mint: PublicKey
  token0Account: PublicKey
  token1Account: PublicKey
  initAmount0: BN
  initAmount1: BN
  wallet: AnchorProvider['wallet']
}

export class PoolService {
  private readonly program: Program<RaydiumCpSwap>
  private readonly connection: Connection

  constructor(program: Program<RaydiumCpSwap>, connection: Connection) {
    this.program = program
    this.connection = connection
  }

  async preparePoolAddresses(ammConfigIndex: number, token0Mint: PublicKey, token1Mint: PublicKey) {
    try {
      const [ammConfigAddress] = await getAmmConfigAddress(ammConfigIndex, this.program.programId)

      const [poolAddress] = await getPoolAddress(
        ammConfigAddress,
        token0Mint,
        token1Mint,
        this.program.programId
      )

      const [poolAuthority] = await getAuthAddress(this.program.programId)

      const [lpMintAddress] = await getPoolLpMintAddress(poolAddress, this.program.programId)

      const [vault0] = await getPoolVaultAddress(poolAddress, token0Mint, this.program.programId)

      const [vault1] = await getPoolVaultAddress(poolAddress, token1Mint, this.program.programId)

      const [observationAddress] = await getOracleAddress(poolAddress, this.program.programId)

      return {
        ammConfigAddress,
        poolAddress,
        poolAuthority,
        lpMintAddress,
        vault0,
        vault1,
        observationAddress,
      }
    } catch (error) {
      console.error('Lỗi khi tính toán địa chỉ PDA', error)
      throw error
    }
  }

  // Thêm hàm kiểm tra account tồn tại
  async accountExists(connection: Connection, publicKey: PublicKey): Promise<boolean> {
    try {
      const account = await connection.getAccountInfo(publicKey)
      return account !== null
    } catch (error) {
      console.error(`Lỗi khi kiểm tra tài khoản ${publicKey.toString()}:`, error)
      return false
    }
  }

  // Hàm kiểm tra token có Transfer Hook không - cải tiến để xác định chính xác hơn
  async hasTransferHookExtension(connection: Connection, mintAddress: PublicKey): Promise<boolean> {
    try {
      // Trước tiên kiểm tra bằng cách xem extension data trực tiếp từ mint
      const mintInfo = await connection.getAccountInfo(mintAddress)
      if (!mintInfo) {
        return false
      }

      // Cách kiểm tra chính xác hơn - tìm kiếm các PDA liên quan
      const [extraAccountMetaListPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('extra-account-metas'), mintAddress.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )

      const [whitelistPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('white_list'), mintAddress.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )

      // Kiểm tra cả hai PDA
      const extraAccountExists = await this.accountExists(connection, extraAccountMetaListPDA)
      const whitelistExists = await this.accountExists(connection, whitelistPDA)

      // Nếu một trong hai tồn tại, token có thể có transfer hook
      return extraAccountExists || whitelistExists
    } catch (error) {
      console.error(`Lỗi khi kiểm tra Transfer Hook cho ${mintAddress.toString()}:`, error)
      return false
    }
  }

  async createPool({
    ammConfigIndex,
    ammConfigAddress,
    token0Mint,
    token1Mint,
    token0Account,
    token1Account,
    initAmount0,
    initAmount1,
    wallet,
  }: CreatePoolParams) {
    try {
      // Tính toán các địa chỉ PDA cần thiết
      let poolAddresses

      if (ammConfigAddress) {
        // Nếu ammConfigAddress được cung cấp, sử dụng trực tiếp
        const [poolAuthority] = await getAuthAddress(this.program.programId)

        // Tính toán các địa chỉ PDA khác sử dụng ammConfigAddress
        const [poolAddress] = await getPoolAddress(
          ammConfigAddress,
          token0Mint,
          token1Mint,
          this.program.programId
        )

        const [lpMintAddress] = await getPoolLpMintAddress(poolAddress, this.program.programId)

        const [vault0] = await getPoolVaultAddress(poolAddress, token0Mint, this.program.programId)

        const [vault1] = await getPoolVaultAddress(poolAddress, token1Mint, this.program.programId)

        const [observationAddress] = await getOracleAddress(poolAddress, this.program.programId)

        poolAddresses = {
          ammConfigAddress,
          poolAddress,
          poolAuthority,
          lpMintAddress,
          vault0,
          vault1,
          observationAddress,
        }
      } else if (ammConfigIndex !== undefined) {
        // Nếu ammConfigIndex được cung cấp, tính toán ammConfigAddress và các PDA khác
        poolAddresses = await this.preparePoolAddresses(ammConfigIndex, token0Mint, token1Mint)
      } else {
        throw new Error('Phải cung cấp ammConfigIndex hoặc ammConfigAddress')
      }

      // Tạo keypair cho pool - Cần thiết cho Raydium CP Swap
      const poolKeypair = Keypair.generate()

      // LP token account cho creator
      const creatorLpTokenAddress = anchor.utils.token.associatedAddress({
        mint: poolAddresses.lpMintAddress,
        owner: wallet.publicKey!,
      })

      // Kiểm tra xem AmmConfig có tồn tại không
      const ammConfigExists = await this.accountExists(
        this.connection,
        poolAddresses.ammConfigAddress
      )
      if (!ammConfigExists) {
        throw new Error('AmmConfig không tồn tại!')
      }

      // Tăng compute budget - tăng lên để hỗ trợ transfer hook
      const modifyComputeUnitIx = ComputeBudgetProgram.setComputeUnitLimit({
        units: 800_000,
      })

      // Kiểm tra xem token có Transfer Hook không
      const token0HasTransferHook = await this.hasTransferHookExtension(this.connection, token0Mint)
      const token1HasTransferHook = await this.hasTransferHookExtension(this.connection, token1Mint)

      // Tính PDA cho whitelist
      const [whitelistPDA_token0] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('white_list'), token0Mint.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )
      const [extraAccountMetaListPDA_token0] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('extra-account-metas'), token0Mint.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )

      const [whitelistPDA_token1] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('white_list'), token1Mint.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )
      const [extraAccountMetaListPDA_token1] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('extra-account-metas'), token1Mint.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )

      // Kiểm tra xem các account whitelist có tồn tại không
      const whitelistPDA_token0_exists = await this.accountExists(
        this.connection,
        whitelistPDA_token0
      )
      const extraAccountMetaListPDA_token0_exists = await this.accountExists(
        this.connection,
        extraAccountMetaListPDA_token0
      )
      const whitelistPDA_token1_exists = await this.accountExists(
        this.connection,
        whitelistPDA_token1
      )
      const extraAccountMetaListPDA_token1_exists = await this.accountExists(
        this.connection,
        extraAccountMetaListPDA_token1
      )

      // Luôn thêm các tài khoản transfer hook cho cả hai token bất kể có transfer hook hay không
      // Điều này đảm bảo tất cả các tài khoản cần thiết được đưa vào
      const remainingAccounts: { pubkey: PublicKey; isWritable: boolean; isSigner: boolean }[] = []

      // Token0 accounts
      remainingAccounts.push(
        { pubkey: TRANSFER_HOOK_PROGRAM_ID, isWritable: false, isSigner: false },
        { pubkey: extraAccountMetaListPDA_token0, isWritable: false, isSigner: false },
        { pubkey: whitelistPDA_token0, isWritable: true, isSigner: false }
      )

      // Token1 accounts
      remainingAccounts.push(
        { pubkey: TRANSFER_HOOK_PROGRAM_ID, isWritable: false, isSigner: false },
        { pubkey: extraAccountMetaListPDA_token1, isWritable: false, isSigner: false },
        { pubkey: whitelistPDA_token1, isWritable: true, isSigner: false }
      )

      // Thêm wallet vào danh sách remainingAccounts
      remainingAccounts.push({ pubkey: wallet.publicKey, isWritable: false, isSigner: true })

      // Kiểm tra createPoolFee
      const createPoolFee = new PublicKey('2p3CiCssv21WeTyQDVZZL66UyXByJZd4oqrPyV7tz3qu')
      const createPoolFeeExists = await this.accountExists(this.connection, createPoolFee)

      // Tạo instruction để khởi tạo pool
      const initializeIx = await this.program.methods
        .initialize(
          initAmount0,
          initAmount1,
          new BN(Math.floor(Date.now() / 1000) - 3600) // openTime (1 giờ trước)
        )
        .accountsPartial({
          creator: wallet.publicKey,
          ammConfig: poolAddresses.ammConfigAddress,
          poolState: poolKeypair.publicKey,
          authority: poolAddresses.poolAuthority,
          token0Mint: token0Mint,
          token1Mint: token1Mint,
          lpMint: poolAddresses.lpMintAddress,
          creatorToken0: token0Account,
          creatorToken1: token1Account,
          creatorLpToken: creatorLpTokenAddress,
          token0Vault: poolAddresses.vault0,
          token1Vault: poolAddresses.vault1,
          observationState: poolAddresses.observationAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
          token0Program: TOKEN_2022_PROGRAM_ID,
          token1Program: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          createPoolFee: createPoolFee,
        })
        .remainingAccounts(remainingAccounts)
        .signers([poolKeypair])
        .instruction()

      // Tạo transaction thông thường
      const tx = new Transaction()
      tx.add(modifyComputeUnitIx)
      tx.add(initializeIx)

      // Đặt feePayer và lấy recent blockhash
      tx.feePayer = wallet.publicKey
      tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash

      // Ký transaction với poolKeypair
      tx.partialSign(poolKeypair)

      // Ký transaction với ví người dùng
      const signed = await wallet.signTransaction(tx)

      // Gửi transaction
      const txid = await this.connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: true,
      })

      // Chờ xác nhận
      await this.connection.confirmTransaction(txid, 'confirmed')

      return {
        txid,
        poolAddress: poolKeypair.publicKey.toString(),
        lpMintAddress: poolAddresses.lpMintAddress.toString(),
        vault0: poolAddresses.vault0.toString(),
        vault1: poolAddresses.vault1.toString(),
        creatorLpTokenAddress: creatorLpTokenAddress.toString(),
      }
    } catch (error) {
      console.error('Error creating pool:', error)
      throw error
    }
  }

  // Phương thức này chuẩn bị giao dịch tạo pool để gửi đến server
  async prepareCreatePoolTransaction({
    ammConfigIndex,
    ammConfigAddress,
    token0Mint,
    token1Mint,
    token0Account,
    token1Account,
    initAmount0,
    initAmount1,
    wallet,
  }: CreatePoolParams) {
    try {
      // Tính toán các địa chỉ PDA cần thiết
      let poolAddresses

      // Tạo keypair cho pool - Cần thiết cho Raydium CP Swap
      const poolKeypair = Keypair.generate()

      if (ammConfigAddress) {
        // Nếu ammConfigAddress được cung cấp, sử dụng trực tiếp
        const [poolAuthority] = await getAuthAddress(this.program.programId)

        // Tính toán các địa chỉ PDA khác sử dụng ammConfigAddress
        const [lpMintAddress] = await getPoolLpMintAddress(
          poolKeypair.publicKey,
          this.program.programId
        )

        const [vault0] = await getPoolVaultAddress(
          poolKeypair.publicKey,
          token0Mint,
          this.program.programId
        )

        const [vault1] = await getPoolVaultAddress(
          poolKeypair.publicKey,
          token1Mint,
          this.program.programId
        )

        const [observationAddress] = await getOracleAddress(
          poolKeypair.publicKey,
          this.program.programId
        )

        poolAddresses = {
          ammConfigAddress,
          poolAddress: poolKeypair.publicKey,
          poolAuthority,
          lpMintAddress,
          vault0,
          vault1,
          observationAddress,
        }
      } else if (ammConfigIndex !== undefined) {
        // Nếu ammConfigIndex được cung cấp, tính toán ammConfigAddress và các PDA khác
        const [ammConfigAddress] = await getAmmConfigAddress(ammConfigIndex, this.program.programId)

        const [poolAuthority] = await getAuthAddress(this.program.programId)

        const [lpMintAddress] = await getPoolLpMintAddress(
          poolKeypair.publicKey,
          this.program.programId
        )

        const [vault0] = await getPoolVaultAddress(
          poolKeypair.publicKey,
          token0Mint,
          this.program.programId
        )

        const [vault1] = await getPoolVaultAddress(
          poolKeypair.publicKey,
          token1Mint,
          this.program.programId
        )

        const [observationAddress] = await getOracleAddress(
          poolKeypair.publicKey,
          this.program.programId
        )

        poolAddresses = {
          ammConfigAddress,
          poolAddress: poolKeypair.publicKey,
          poolAuthority,
          lpMintAddress,
          vault0,
          vault1,
          observationAddress,
        }
      } else {
        throw new Error('Phải cung cấp ammConfigIndex hoặc ammConfigAddress')
      }

      // LP token account cho creator
      const creatorLpTokenAddress = anchor.utils.token.associatedAddress({
        mint: poolAddresses.lpMintAddress,
        owner: wallet.publicKey!,
      })

      // Tính PDA cho whitelist
      const [whitelistPDA_token0] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('white_list'), token0Mint.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )
      const [extraAccountMetaListPDA_token0] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('extra-account-metas'), token0Mint.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )

      const [whitelistPDA_token1] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('white_list'), token1Mint.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )
      const [extraAccountMetaListPDA_token1] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('extra-account-metas'), token1Mint.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )

      // Thêm tất cả các tài khoản có thể cần thiết vào remainingAccounts
      const remainingAccounts: { pubkey: PublicKey; isWritable: boolean; isSigner: boolean }[] = []

      // Token0 accounts - thêm luôn không cần kiểm tra
      remainingAccounts.push(
        { pubkey: TRANSFER_HOOK_PROGRAM_ID, isWritable: false, isSigner: false },
        { pubkey: extraAccountMetaListPDA_token0, isWritable: false, isSigner: false },
        { pubkey: whitelistPDA_token0, isWritable: true, isSigner: false }
      )

      // Token1 accounts - thêm luôn không cần kiểm tra
      remainingAccounts.push(
        { pubkey: TRANSFER_HOOK_PROGRAM_ID, isWritable: false, isSigner: false },
        { pubkey: extraAccountMetaListPDA_token1, isWritable: false, isSigner: false },
        { pubkey: whitelistPDA_token1, isWritable: true, isSigner: false }
      )

      // Thêm wallet vào danh sách remainingAccounts
      remainingAccounts.push({ pubkey: wallet.publicKey, isWritable: false, isSigner: true })

      // Tăng compute budget
      const modifyComputeUnitIx = ComputeBudgetProgram.setComputeUnitLimit({
        units: 800_000,
      })

      // Tạo instruction để khởi tạo pool
      const initializeIx = await this.program.methods
        .initialize(
          initAmount0,
          initAmount1,
          new BN(Math.floor(Date.now() / 1000) - 3600) // openTime (1 giờ trước)
        )
        .accountsPartial({
          creator: wallet.publicKey,
          ammConfig: poolAddresses.ammConfigAddress,
          poolState: poolKeypair.publicKey,
          authority: poolAddresses.poolAuthority,
          token0Mint: token0Mint,
          token1Mint: token1Mint,
          lpMint: poolAddresses.lpMintAddress,
          creatorToken0: token0Account,
          creatorToken1: token1Account,
          creatorLpToken: creatorLpTokenAddress,
          token0Vault: poolAddresses.vault0,
          token1Vault: poolAddresses.vault1,
          observationState: poolAddresses.observationAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
          token0Program: TOKEN_2022_PROGRAM_ID,
          token1Program: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          createPoolFee: new PublicKey('2p3CiCssv21WeTyQDVZZL66UyXByJZd4oqrPyV7tz3qu'),
        })
        .remainingAccounts(remainingAccounts)
        .signers([poolKeypair])
        .instruction()

      // Tạo transaction
      const tx = new Transaction()
      tx.add(modifyComputeUnitIx)
      tx.add(initializeIx)

      // Đặt feePayer và lấy recent blockhash
      tx.feePayer = wallet.publicKey
      tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash

      // Ký transaction với poolKeypair
      tx.partialSign(poolKeypair)

      // Serialize transaction
      const serializedTx = tx.serialize({ requireAllSignatures: false }).toString('base64')

      // Trả về thông tin cần thiết
      return {
        serializedTransaction: serializedTx,
        poolAddress: poolKeypair.publicKey.toString(),
        lpMintAddress: poolAddresses.lpMintAddress.toString(),
        vault0: poolAddresses.vault0.toString(),
        vault1: poolAddresses.vault1.toString(),
        creatorLpTokenAddress: creatorLpTokenAddress.toString(),
        token0Mint: token0Mint.toString(),
        token1Mint: token1Mint.toString(),
        token0Account: token0Account.toString(),
        token1Account: token1Account.toString(),
        initAmount0: initAmount0.toString(),
        initAmount1: initAmount1.toString(),
        creatorPublicKey: wallet.publicKey.toString(),
        ammConfigAddress: poolAddresses.ammConfigAddress.toString(),
        poolAuthority: poolAddresses.poolAuthority.toString(),
        observationAddress: poolAddresses.observationAddress.toString(),
      }
    } catch (error) {
      console.error('Error preparing create pool transaction:', error)
      throw error
    }
  }
}
