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

// Hàm để upload thông tin pool lên GitHub
async function uploadPoolToGithub(poolData: any) {
  try {
    // Xác định URL API endpoint
    // Khi chạy trong Next.js API route, chúng ta cần một URL tuyệt đối
    const apiUrl = 'http://localhost:3000/api/upload-pool-to-github'
    console.log('Uploading pool to GitHub using URL:', apiUrl)

    // Gọi API upload-pool-to-github
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(poolData),
    })

    // Kiểm tra kết quả
    if (!response.ok) {
      let errorMessage
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || response.statusText
      } catch (e) {
        errorMessage = response.statusText
      }
      console.error(`Failed to upload pool to GitHub: ${response.status} ${errorMessage}`)
      return { success: false, error: errorMessage }
    }

    const result = await response.json()
    console.log('Pool uploaded to GitHub successfully:', result)
    return { success: true, data: result }
  } catch (error: any) {
    console.error('Error uploading pool to GitHub:', error)
    return { success: false, error: error.message }
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
      // Tạo mảng remainingAccounts
      const remainingAccounts = []

      // Xác định loại token (SPL Token hoặc Token-2022) bằng cách sử dụng getDetailTokenExtensions
      const token0Info = await getDetailTokenExtensions(token0Mint)
      const token1Info = await getDetailTokenExtensions(token1Mint)

      const token0ProgramId = token0Info.isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
      const token1ProgramId = token1Info.isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID

      // Log thông tin token để debug
      console.log(
        `Token0 (${token0Mint}): isToken2022=${token0Info.isToken2022}, Program=${token0ProgramId.toString()}`
      )
      console.log(
        `Token1 (${token1Mint}): isToken2022=${token1Info.isToken2022}, Program=${token1ProgramId.toString()}`
      )

      // Chỉ thêm tài khoản transfer hook cho token0 nếu nó có transfer hook
      if (token0Info.isToken2022 && token0Info.transferHook) {
        // Tính PDA cho whitelist và ExtraAccountMetaList cho token0
        const [whitelistPDA_token0] = PublicKey.findProgramAddressSync(
          [Buffer.from('white_list'), new PublicKey(token0Mint).toBuffer()],
          TRANSFER_HOOK_PROGRAM_ID
        )
        const [extraAccountMetaListPDA_token0] = PublicKey.findProgramAddressSync(
          [Buffer.from('extra-account-metas'), new PublicKey(token0Mint).toBuffer()],
          TRANSFER_HOOK_PROGRAM_ID
        )

        // Thêm tài khoản cho token0
        remainingAccounts.push(
          { pubkey: TRANSFER_HOOK_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: extraAccountMetaListPDA_token0, isWritable: false, isSigner: false },
          { pubkey: whitelistPDA_token0, isWritable: true, isSigner: false }
        )
      }

      // Chỉ thêm tài khoản transfer hook cho token1 nếu nó có transfer hook
      if (token1Info.isToken2022 && token1Info.transferHook) {
        // Tính PDA cho whitelist và ExtraAccountMetaList cho token1
        const [whitelistPDA_token1] = PublicKey.findProgramAddressSync(
          [Buffer.from('white_list'), new PublicKey(token1Mint).toBuffer()],
          TRANSFER_HOOK_PROGRAM_ID
        )
        const [extraAccountMetaListPDA_token1] = PublicKey.findProgramAddressSync(
          [Buffer.from('extra-account-metas'), new PublicKey(token1Mint).toBuffer()],
          TRANSFER_HOOK_PROGRAM_ID
        )

        // Thêm tài khoản cho token1
        remainingAccounts.push(
          { pubkey: TRANSFER_HOOK_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: extraAccountMetaListPDA_token1, isWritable: false, isSigner: false },
          { pubkey: whitelistPDA_token1, isWritable: true, isSigner: false }
        )
      }

      // Tạo LP token address - sửa cách tính để tương thích với cả Token-2022
      const creatorLpTokenAddressPubkey = getAssociatedTokenAddressSync(
        lpMintAddress,
        new PublicKey(creatorPublicKey),
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )

      // Thêm tài khoản LP token và wallet vào remainingAccounts
      remainingAccounts.push(
        // Tài khoản LP token
        { pubkey: creatorLpTokenAddressPubkey, isWritable: true, isSigner: false },
        // Wallet với quyền ký
        { pubkey: new PublicKey(creatorPublicKey), isWritable: true, isSigner: true }
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

      // Chuẩn bị thông tin pool để lưu lên GitHub
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
          hasTransferHook: token0Info.isToken2022 && token0Info.transferHook,
          extensions: token0Info.extensions || [],
          initialAmount: initAmount0,
          // Không có thông tin về symbol và name trong API route
          // Sẽ được cập nhật sau khi pool được tạo
        },
        token1: {
          mint: token1Mint,
          vault: vault1.toString(),
          isToken2022: token1Info.isToken2022,
          hasTransferHook: token1Info.isToken2022 && token1Info.transferHook,
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

      // Upload thông tin pool lên GitHub (không chờ đợi kết quả để không làm chậm response)
      uploadPoolToGithub(poolInfo)
        .then(result => {
          if (result.success) {
            console.log(
              `Pool ${poolKeypair.publicKey.toString()} đã được lưu lên GitHub thành công:`,
              result.data
            )
          } else {
            console.error(
              `Không thể lưu pool ${poolKeypair.publicKey.toString()} lên GitHub:`,
              result.error
            )
          }
        })
        .catch(error => {
          console.error(
            `Lỗi không xác định khi lưu pool ${poolKeypair.publicKey.toString()} lên GitHub:`,
            error
          )
        })

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
