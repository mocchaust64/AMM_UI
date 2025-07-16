import { NextRequest, NextResponse } from 'next/server'
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  ComputeBudgetProgram,
  VersionedTransaction,
} from '@solana/web3.js'
import { Program, BN, AnchorProvider } from '@coral-xyz/anchor'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import * as anchor from '@coral-xyz/anchor'
import * as fs from 'fs'
import * as path from 'path'
import { RaydiumCpSwap } from '../../../idl/types/raydium_cp_swap'
import idl from '../../../idl/raydium_cp_swap.json'
import { getDetailTokenExtensions } from '@/lib/service/tokenService'

const SERVER_KEYPAIR_PATH =
  process.env.SERVER_KEYPAIR_PATH || path.join(process.cwd(), 'server-keypair.json')

// Constants
const TRANSFER_HOOK_PROGRAM_ID = new PublicKey('12BZr6af3s7qf7GGmhBvMd46DWmVNhHfXmCwftfMk1mZ')
const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112')

// Hàm để lấy keypair của server
function getServerKeypair(): Keypair {
  try {
    const keypairData = fs.readFileSync(SERVER_KEYPAIR_PATH, 'utf-8')
    const secretKey = Uint8Array.from(JSON.parse(keypairData))
    return Keypair.fromSecretKey(secretKey)
  } catch {
    const keypair = Keypair.generate()
    fs.writeFileSync(SERVER_KEYPAIR_PATH, JSON.stringify(Array.from(keypair.secretKey)))
    return keypair
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const {
      token0Mint,
      token1Mint,
      token0Account,
      token1Account,
      initAmount0,
      initAmount1,
      creatorPublicKey,
      ammConfigAddress,
      token0HasTransferHook, // Nhận thông tin từ client
      token1HasTransferHook, // Nhận thông tin từ client
    } = body

    // Validate required fields
    if (
      !token0Mint ||
      !token1Mint ||
      !token0Account ||
      !token1Account ||
      !initAmount0 ||
      !initAmount1 ||
      !creatorPublicKey ||
      !ammConfigAddress
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Kiểm tra đặc biệt nếu có token là Wrapped SOL
    const hasWrappedSol =
      new PublicKey(token0Mint).equals(WSOL_MINT) || new PublicKey(token1Mint).equals(WSOL_MINT)

    if (hasWrappedSol) {
      console.log('Pool includes Wrapped SOL, optimizing transaction...')
    }

    // Kết nối đến Solana
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )

    // Tạo keypair cho pool
    const poolKeypair = Keypair.generate()

    // Lấy programId từ IDL
    const programId = new PublicKey(idl.address)

    // Tính toán các PDA cần thiết
    const [poolAuthority] = await PublicKey.findProgramAddress(
      [Buffer.from('vault_and_lp_mint_auth_seed')],
      programId
    )

    const [lpMintAddress] = await PublicKey.findProgramAddress(
      [Buffer.from('pool_lp_mint'), poolKeypair.publicKey.toBuffer()],
      programId
    )

    const [vault0] = await PublicKey.findProgramAddress(
      [
        Buffer.from('pool_vault'),
        poolKeypair.publicKey.toBuffer(),
        new PublicKey(token0Mint).toBuffer(),
      ],
      programId
    )

    const [vault1] = await PublicKey.findProgramAddress(
      [
        Buffer.from('pool_vault'),
        poolKeypair.publicKey.toBuffer(),
        new PublicKey(token1Mint).toBuffer(),
      ],
      programId
    )

    const [observationAddress] = await PublicKey.findProgramAddress(
      [Buffer.from('observation'), poolKeypair.publicKey.toBuffer()],
      programId
    )

    // Tạo wallet cho server
    const serverKeypair = getServerKeypair()
    // Sử dụng cách tạo wallet tương tự như trong hooks/usePoolCreation.tsx
    const wallet = {
      publicKey: serverKeypair.publicKey,
      signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
        if (tx instanceof Transaction) {
          tx.partialSign(serverKeypair)
        }
        return tx
      },
      signAllTransactions: async <T extends Transaction | VersionedTransaction>(
        txs: T[]
      ): Promise<T[]> => {
        return txs.map(tx => {
          if (tx instanceof Transaction) {
            tx.partialSign(serverKeypair)
          }
          return tx
        })
      },
    }

    // Tạo provider
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })

    // Tạo program - cách mới nhất không cần truyền programId
    const program = new Program(idl, provider) as Program<RaydiumCpSwap>

    // Tạo transaction mới
    const tx = new Transaction()

    // Tăng compute budget - tăng lên để đảm bảo đủ cho transfer hook
    const modifyComputeUnitIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 800_000,
    })
    tx.add(modifyComputeUnitIx)

    try {
      // Tạo mảng remainingAccounts
      const remainingAccounts = []

      // Xác định loại token (SPL Token hoặc Token-2022) bằng cách sử dụng getDetailTokenExtensions
      const token0Info = await getDetailTokenExtensions(token0Mint)
      const token1Info = await getDetailTokenExtensions(token1Mint)

      // Sử dụng thông tin từ client nếu có, nếu không thì dùng kết quả từ API
      const token0HasHook =
        token0HasTransferHook || (token0Info.isToken2022 && token0Info.transferHook)
      const token1HasHook =
        token1HasTransferHook || (token1Info.isToken2022 && token1Info.transferHook)

      const token0ProgramId = token0Info.isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
      const token1ProgramId = token1Info.isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID

      // Ghi log thông tin các token để debug
      console.log('Token 0 info:', {
        mint: token0Mint,
        isToken2022: token0Info.isToken2022,
        hasTransferHook: token0HasHook,
        programId: token0ProgramId.toString(),
        extensions: token0Info.extensions || [],
      })

      console.log('Token 1 info:', {
        mint: token1Mint,
        isToken2022: token1Info.isToken2022,
        hasTransferHook: token1HasHook,
        programId: token1ProgramId.toString(),
        extensions: token1Info.extensions || [],
      })

      // Tạo danh sách remainingAccounts ĐÚNG THỨ TỰ theo auto-whitelist-hook-pool-test.ts

      // Chỉ thêm tài khoản transfer hook cho token0 nếu nó có transfer hook
      if (token0HasHook) {
        // Tính PDA cho whitelist và ExtraAccountMetaList cho token0
        const [whitelistPDA_token0] = PublicKey.findProgramAddressSync(
          [Buffer.from('white_list'), new PublicKey(token0Mint).toBuffer()],
          TRANSFER_HOOK_PROGRAM_ID
        )
        const [extraAccountMetaListPDA_token0] = PublicKey.findProgramAddressSync(
          [Buffer.from('extra-account-metas'), new PublicKey(token0Mint).toBuffer()],
          TRANSFER_HOOK_PROGRAM_ID
        )

        // Thêm tài khoản cho token0 ĐÚNG THỨ TỰ
        remainingAccounts.push(
          { pubkey: TRANSFER_HOOK_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: extraAccountMetaListPDA_token0, isWritable: false, isSigner: false },
          { pubkey: whitelistPDA_token0, isWritable: true, isSigner: false }
        )

        console.log('Added transfer hook accounts for token0:', {
          hookProgram: TRANSFER_HOOK_PROGRAM_ID.toString(),
          extraAccountMetaList: extraAccountMetaListPDA_token0.toString(),
          whitelist: whitelistPDA_token0.toString(),
        })
      }

      // Chỉ thêm tài khoản transfer hook cho token1 nếu nó có transfer hook
      if (token1HasHook) {
        // Tính PDA cho whitelist và ExtraAccountMetaList cho token1
        const [whitelistPDA_token1] = PublicKey.findProgramAddressSync(
          [Buffer.from('white_list'), new PublicKey(token1Mint).toBuffer()],
          TRANSFER_HOOK_PROGRAM_ID
        )
        const [extraAccountMetaListPDA_token1] = PublicKey.findProgramAddressSync(
          [Buffer.from('extra-account-metas'), new PublicKey(token1Mint).toBuffer()],
          TRANSFER_HOOK_PROGRAM_ID
        )

        // Thêm tài khoản cho token1 ĐÚNG THỨ TỰ
        remainingAccounts.push(
          { pubkey: TRANSFER_HOOK_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: extraAccountMetaListPDA_token1, isWritable: false, isSigner: false },
          { pubkey: whitelistPDA_token1, isWritable: true, isSigner: false }
        )

        console.log('Added transfer hook accounts for token1:', {
          hookProgram: TRANSFER_HOOK_PROGRAM_ID.toString(),
          extraAccountMetaList: extraAccountMetaListPDA_token1.toString(),
          whitelist: whitelistPDA_token1.toString(),
        })
      }

      // QUAN TRỌNG: Wallet phải được thêm vào cuối cùng
      remainingAccounts.push(
        // Wallet với quyền ký - phải ở cuối cùng sau các tài khoản khác
        { pubkey: new PublicKey(creatorPublicKey), isWritable: true, isSigner: true }
      )

      console.log(
        'Total remaining accounts:',
        remainingAccounts.length,
        'Creator wallet:',
        creatorPublicKey
      )

      // Tạo LP token address
      const creatorLpTokenAddressPubkey = getAssociatedTokenAddressSync(
        lpMintAddress,
        new PublicKey(creatorPublicKey),
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )

      // Tạo instruction để khởi tạo pool
      const initializeIx = await program.methods
        .initialize(
          new BN(initAmount0),
          new BN(initAmount1),
          new BN(Math.floor(Date.now() / 1000) - 3600) // openTime (1 giờ trước)
        )
        .accountsPartial({
          creator: new PublicKey(creatorPublicKey),
          ammConfig: new PublicKey(ammConfigAddress),
          poolState: poolKeypair.publicKey,
          authority: poolAuthority,
          token0Mint: new PublicKey(token0Mint),
          token1Mint: new PublicKey(token1Mint),
          lpMint: lpMintAddress,
          creatorToken0: new PublicKey(token0Account),
          creatorToken1: new PublicKey(token1Account),
          creatorLpToken: creatorLpTokenAddressPubkey,
          token0Vault: vault0,
          token1Vault: vault1,
          observationState: observationAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
          token0Program: token0ProgramId,
          token1Program: token1ProgramId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          createPoolFee: new PublicKey('2p3CiCssv21WeTyQDVZZL66UyXByJZd4oqrPyV7tz3qu'),
        })
        .remainingAccounts(remainingAccounts)
        .instruction()

      // Thêm instruction vào transaction
      tx.add(initializeIx)

      // QUAN TRỌNG: Đặt feePayer trước khi ký
      tx.feePayer = new PublicKey(creatorPublicKey)

      // Lấy recent blockhash
      const { blockhash } = await connection.getLatestBlockhash('confirmed')
      tx.recentBlockhash = blockhash

      // Thêm poolKeypair vào signers và ký transaction
      tx.sign(poolKeypair)

      // Serialize giao dịch đã ký một phần để gửi về client
      const serializedTransaction = tx.serialize({ requireAllSignatures: false }).toString('base64')

      // Thêm thông tin chi tiết hơn về transfer hook và Wrapped SOL
      const poolInfo = {
        poolAddress: poolKeypair.publicKey.toString(),
        lpMintAddress: lpMintAddress.toString(),
        vault0: vault0.toString(),
        vault1: vault1.toString(),
        ammConfig: ammConfigAddress,
        token0: {
          mint: token0Mint,
          vault: vault0.toString(),
          isToken2022: token0Info.isToken2022,
          hasTransferHook: !!(token0Info.isToken2022 && token0Info.transferHook),
          isWrappedSol: token0Mint === WSOL_MINT.toString(),
          extensions: token0Info.extensions || [],
          initialAmount: initAmount0,
          // Không có thông tin về symbol và name trong API route
          // Sẽ được cập nhật sau khi pool được tạo
        },
        token1: {
          mint: token1Mint,
          vault: vault1.toString(),
          isToken2022: token1Info.isToken2022,
          hasTransferHook: !!(token1Info.isToken2022 && token1Info.transferHook),
          isWrappedSol: token1Mint === WSOL_MINT.toString(),
          extensions: token1Info.extensions || [],
          initialAmount: initAmount1,
          // Không có thông tin về symbol và name trong API route
          // Sẽ được cập nhật sau khi pool được tạo
        },
        createdAt: new Date().toISOString(),
        createdBy: creatorPublicKey,
        network: process.env.SOLANA_NETWORK || 'devnet',
        status: 'active',
        txid: '', // Sẽ được cập nhật sau khi transaction được xác nhận
      }

      // Không upload ngay mà sẽ để client gọi API upload sau khi xác nhận giao dịch thành công
      // uploadPoolToGithub(poolInfo)
      //   .then(_result => {})
      //   .catch(() => {})

      // Trả về giao dịch đã ký một phần và thông tin pool
      return NextResponse.json({
        success: true,
        serializedTransaction,
        poolAddress: poolKeypair.publicKey.toString(),
        lpMintAddress: lpMintAddress.toString(),
        vault0: vault0.toString(),
        vault1: vault1.toString(),
        creatorLpTokenAddress: creatorLpTokenAddressPubkey.toString(),
        poolInfo, // Thêm poolInfo để client có thể upload sau khi transaction thành công
      })
    } catch (txError: unknown) {
      return NextResponse.json(
        {
          error: 'Transaction creation failed',
          message:
            txError instanceof Error ? txError.message : 'Unknown error in transaction creation',
        },
        { status: 500 }
      )
    }
  } catch (apiError: unknown) {
    return NextResponse.json(
      {
        error: 'Failed to create pool',
        message: apiError instanceof Error ? apiError.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
