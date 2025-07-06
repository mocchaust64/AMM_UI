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
} from '@solana/spl-token'
import * as anchor from '@coral-xyz/anchor'
import * as fs from 'fs'
import * as path from 'path'
import { RaydiumCpSwap } from '../../../idl/types/raydium_cp_swap'
import idl from '../../../idl/raydium_cp_swap.json'

// Đường dẫn đến file keypair của server (cần được tạo trước)
const SERVER_KEYPAIR_PATH =
  process.env.SERVER_KEYPAIR_PATH || path.join(process.cwd(), 'server-keypair.json')

// Constants
const TRANSFER_HOOK_PROGRAM_ID = new PublicKey('12BZr6af3s7qf7GGmhBvMd46DWmVNhHfXmCwftfMk1mZ')

// Hàm để lấy keypair của server
function getServerKeypair(): Keypair {
  try {
    const keypairData = fs.readFileSync(SERVER_KEYPAIR_PATH, 'utf-8')
    const secretKey = Uint8Array.from(JSON.parse(keypairData))
    return Keypair.fromSecretKey(secretKey)
  } catch (error) {
    // Tạo keypair mới nếu không tìm thấy
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
      // Tính PDA cho whitelist và ExtraAccountMetaList cho cả token0 và token1
      const [whitelistPDA_token0] = PublicKey.findProgramAddressSync(
        [Buffer.from('white_list'), new PublicKey(token0Mint).toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )
      const [extraAccountMetaListPDA_token0] = PublicKey.findProgramAddressSync(
        [Buffer.from('extra-account-metas'), new PublicKey(token0Mint).toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )

      const [whitelistPDA_token1] = PublicKey.findProgramAddressSync(
        [Buffer.from('white_list'), new PublicKey(token1Mint).toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )
      const [extraAccountMetaListPDA_token1] = PublicKey.findProgramAddressSync(
        [Buffer.from('extra-account-metas'), new PublicKey(token1Mint).toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )

      // Tạo LP token address
      let creatorLpTokenAddressPubkey

      // Dù client có gửi giá trị này hay không, server luôn tính toán lại
      const serverCalculatedLpTokenAddress = PublicKey.findProgramAddressSync(
        [
          new PublicKey(creatorPublicKey).toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          lpMintAddress.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )[0]

      // Sử dụng giá trị đã tính toán ở server
      creatorLpTokenAddressPubkey = serverCalculatedLpTokenAddress

      // Luôn thêm tất cả các tài khoản cho cả hai token, dù có transfer hook hay không
      const remainingAccounts = [
        // Token0 accounts
        { pubkey: TRANSFER_HOOK_PROGRAM_ID, isWritable: false, isSigner: false },
        { pubkey: extraAccountMetaListPDA_token0, isWritable: false, isSigner: false },
        { pubkey: whitelistPDA_token0, isWritable: true, isSigner: false },

        // Token1 accounts
        { pubkey: TRANSFER_HOOK_PROGRAM_ID, isWritable: false, isSigner: false },
        { pubkey: extraAccountMetaListPDA_token1, isWritable: false, isSigner: false },
        { pubkey: whitelistPDA_token1, isWritable: true, isSigner: false },

        // Tài khoản LP token (tính theo cách mới)
        { pubkey: creatorLpTokenAddressPubkey, isWritable: true, isSigner: false },

        // Wallet với quyền ký
        { pubkey: new PublicKey(creatorPublicKey), isWritable: true, isSigner: true },
      ]

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
          token0Program: TOKEN_2022_PROGRAM_ID,
          token1Program: TOKEN_2022_PROGRAM_ID,
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

      // Trả về giao dịch đã ký một phần và thông tin pool
      return NextResponse.json({
        success: true,
        serializedTransaction,
        poolAddress: poolKeypair.publicKey.toString(),
        lpMintAddress: lpMintAddress.toString(),
        vault0: vault0.toString(),
        vault1: vault1.toString(),
        creatorLpTokenAddress: creatorLpTokenAddressPubkey.toString(),
      })
    } catch (txError: any) {
      return NextResponse.json(
        {
          error: 'Transaction creation failed',
          message: txError.message || 'Unknown error in transaction creation',
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to create pool',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
