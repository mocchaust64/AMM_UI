import { NextRequest, NextResponse } from 'next/server'
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createTransferInstruction,
} from '@solana/spl-token'
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddress as getAssociatedTokenAddress2022,
  createAssociatedTokenAccountInstruction as createAssociatedTokenAccountInstruction2022,
  createTransferInstruction as createTransferInstruction2022,
  createTransferCheckedWithTransferHookInstruction,
} from '@solana/spl-token'
import * as anchor from '@coral-xyz/anchor'
import transferHookIdl from '@/idl/transfer_hook.json'
import { SystemProgram } from '@solana/web3.js'

// Địa chỉ mint của USDC trên devnet (từ input của user)
const USDC_MINT = new PublicKey('BFR68SCH16jfXkgWxaY4ZAE4y1KNUxhE9baag8YeZEBj')

// Địa chỉ mint của Wrapped SOL trên devnet
const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112')

// Địa chỉ mint của Token 2022 trên devnet
const TK22_MINT = new PublicKey('EyqZRrQBwtjdvHQS5BKWKHSh9HAtFhsAXzptP8wp2949')

// Địa chỉ mint của Transfer Hook Token trên devnet
const HOOK_MINT = new PublicKey('GQLRDyiqAEfBVL1LZQRvBNkN6L4b3fPynHqZtPQkV5y9')

// Địa chỉ của Transfer Hook Program
const TRANSFER_HOOK_PROGRAM_ID = new PublicKey('12BZr6af3s7qf7GGmhBvMd46DWmVNhHfXmCwftfMk1mZ')

// Số lượng token mỗi lần airdrop
const AIRDROP_AMOUNTS = {
  USDC: 100, // 100 USDC
  wSOL: 1, // 1 WSOL
  TK22: 100, // 100 TK22
  HOOK: 100, // 100 HOOK
}

// Lấy keypair từ private key được lưu trong env
function getAdminKeypair(): Keypair {
  // Lấy private key từ env và chuyển đổi thành uint8array
  const privateKeyString = process.env.ADMIN_PRIVATE_KEY || ''
  const privateKeyArray = JSON.parse(privateKeyString)
  const privateKeyUint8 = new Uint8Array(privateKeyArray)

  // Tạo keypair từ private key
  return Keypair.fromSecretKey(privateKeyUint8)
}

// Hàm để airdrop token SPL
async function airdropSPLToken(
  connection: Connection,
  adminKeypair: Keypair,
  receiverAddress: PublicKey,
  mintAddress: PublicKey,
  amount: number,
  decimals: number = 6 // mặc định là 6 cho USDC
): Promise<string> {
  // Lấy địa chỉ token account của admin
  const adminTokenAccount = await getAssociatedTokenAddress(
    mintAddress,
    adminKeypair.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  // Lấy địa chỉ token account của người nhận
  const receiverTokenAccount = await getAssociatedTokenAddress(
    mintAddress,
    receiverAddress,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  // Tạo transaction
  const transaction = new Transaction()

  // Kiểm tra xem token account của người nhận đã tồn tại chưa
  const receiverTokenAccountInfo = await connection.getAccountInfo(receiverTokenAccount)
  if (!receiverTokenAccountInfo) {
    // Nếu chưa tồn tại, thêm instruction để tạo token account
    transaction.add(
      createAssociatedTokenAccountInstruction(
        adminKeypair.publicKey, // Payer
        receiverTokenAccount, // Associated token account address
        receiverAddress, // Owner of token account
        mintAddress, // Token mint
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    )
  }

  // Thêm instruction để chuyển token
  transaction.add(
    createTransferInstruction(
      adminTokenAccount, // Source
      receiverTokenAccount, // Destination
      adminKeypair.publicKey, // Authority (owner of source)
      amount * 10 ** decimals // Amount, nhân với 10^decimals để đúng format
    )
  )

  // Gửi và xác nhận transaction
  const signature = await sendAndConfirmTransaction(connection, transaction, [adminKeypair])

  return signature
}

// Hàm để airdrop token Token-2022
async function airdropToken2022(
  connection: Connection,
  adminKeypair: Keypair,
  receiverAddress: PublicKey,
  mintAddress: PublicKey,
  amount: number,
  decimals: number = 6 // mặc định là 6
): Promise<string> {
  // Lấy địa chỉ token account của admin cho Token-2022
  const adminTokenAccount = await getAssociatedTokenAddress2022(
    mintAddress,
    adminKeypair.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  // Lấy địa chỉ token account của người nhận cho Token-2022
  const receiverTokenAccount = await getAssociatedTokenAddress2022(
    mintAddress,
    receiverAddress,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  // Tạo transaction
  const transaction = new Transaction()

  // Kiểm tra xem token account của người nhận đã tồn tại chưa
  const receiverTokenAccountInfo = await connection.getAccountInfo(receiverTokenAccount)
  if (!receiverTokenAccountInfo) {
    // Nếu chưa tồn tại, thêm instruction để tạo token account
    transaction.add(
      createAssociatedTokenAccountInstruction2022(
        adminKeypair.publicKey, // Payer
        receiverTokenAccount, // Associated token account address
        receiverAddress, // Owner of token account
        mintAddress, // Token mint
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    )
  }

  // Thêm instruction để chuyển token
  transaction.add(
    createTransferInstruction2022(
      adminTokenAccount, // Source
      receiverTokenAccount, // Destination
      adminKeypair.publicKey, // Authority (owner of source)
      amount * 10 ** decimals, // Amount, nhân với 10^decimals để đúng format
      [], // Multigsignature signers (không có)
      TOKEN_2022_PROGRAM_ID // Program ID của Token-2022
    )
  )

  // Gửi và xác nhận transaction
  const signature = await sendAndConfirmTransaction(connection, transaction, [adminKeypair])

  return signature
}

// Hàm để airdrop Transfer Hook Token
async function airdropTransferHookToken(
  connection: Connection,
  adminKeypair: Keypair,
  receiverAddress: PublicKey,
  mintAddress: PublicKey,
  amount: number,
  decimals: number = 9
): Promise<string> {
  // Lấy địa chỉ token account của admin cho Token-2022
  const adminTokenAccount = await getAssociatedTokenAddress2022(
    mintAddress,
    adminKeypair.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  // Lấy địa chỉ token account của người nhận cho Token-2022
  const receiverTokenAccount = await getAssociatedTokenAddress2022(
    mintAddress,
    receiverAddress,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  // 1. Tìm whitelist PDA
  const [whitelistPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('white_list'), mintAddress.toBuffer()],
    TRANSFER_HOOK_PROGRAM_ID
  )

  // 2. Tìm extraAccountMetaList PDA
  const [extraAccountMetaListPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('extra-account-metas'), mintAddress.toBuffer()],
    TRANSFER_HOOK_PROGRAM_ID
  )

  // Khởi tạo wallet theo cách trong app/api/create-pool/route.ts
  const wallet = {
    publicKey: adminKeypair.publicKey,
    signTransaction: async <T extends Transaction | anchor.web3.VersionedTransaction>(
      tx: T
    ): Promise<T> => {
      if (tx instanceof Transaction) {
        tx.partialSign(adminKeypair)
      }
      return tx
    },
    signAllTransactions: async <T extends Transaction | anchor.web3.VersionedTransaction>(
      txs: T[]
    ): Promise<T[]> => {
      return txs.map(tx => {
        if (tx instanceof Transaction) {
          tx.partialSign(adminKeypair)
        }
        return tx
      })
    },
  }

  // Tạo provider với wallet đã khởi tạo
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' })

  const program = new anchor.Program(transferHookIdl, provider)

  // ====================== TRANSACTION 1: KHỞI TẠO EXTRAACCOUNTMETALIST ======================

  // Kiểm tra xem ExtraAccountMetaList đã tồn tại chưa
  const extraAccountMetaListInfo = await connection.getAccountInfo(extraAccountMetaListPDA)

  if (!extraAccountMetaListInfo) {
    // Tạo transaction để khởi tạo ExtraAccountMetaList
    const initTransaction = new Transaction()

    // Thêm instruction để khởi tạo ExtraAccountMetaList
    const initExtraAccountMetaListInstruction = await program.methods
      .initializeExtraAccountMetaList()
      .accountsPartial({
        payer: adminKeypair.publicKey,
        extraAccountMetaList: extraAccountMetaListPDA,
        mint: mintAddress,
        systemProgram: SystemProgram.programId,
        whiteList: whitelistPDA,
      })
      .instruction()

    initTransaction.add(initExtraAccountMetaListInstruction)

    // Gửi và xác nhận transaction khởi tạo
    await sendAndConfirmTransaction(connection, initTransaction, [adminKeypair], {
      skipPreflight: true,
      commitment: 'confirmed',
    })
  }

  // ====================== TRANSACTION 2: THÊM VÀO WHITELIST VÀ CHUYỂN TOKEN ======================

  // Tạo transaction mới để thêm vào whitelist và chuyển token
  const transferTransaction = new Transaction()

  // Kiểm tra xem token account của người nhận đã tồn tại chưa
  const receiverTokenAccountInfo = await connection.getAccountInfo(receiverTokenAccount)
  if (!receiverTokenAccountInfo) {
    // Nếu chưa tồn tại, thêm instruction để tạo token account
    transferTransaction.add(
      createAssociatedTokenAccountInstruction2022(
        adminKeypair.publicKey, // Payer
        receiverTokenAccount, // Associated token account address
        receiverAddress, // Owner of token account
        mintAddress, // Token mint
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    )
  }

  // Thêm người nhận vào whitelist
  const addToWhitelistInstruction = await program.methods
    .addToWhitelist()
    .accountsPartial({
      newAccount: receiverAddress, // Thêm owner vào whitelist
      mint: mintAddress,
      whiteList: whitelistPDA,
      signer: adminKeypair.publicKey,
    })
    .instruction()

  transferTransaction.add(addToWhitelistInstruction)

  // Thêm instruction để chuyển token với transfer hook
  const bigIntAmount = BigInt(amount * 10 ** decimals)

  const transferInstruction = await createTransferCheckedWithTransferHookInstruction(
    connection,
    adminTokenAccount, // Source
    mintAddress, // Mint
    receiverTokenAccount, // Destination
    adminKeypair.publicKey, // Authority (owner of source)
    bigIntAmount, // Amount
    decimals, // Decimals
    [], // Extra signers
    'confirmed', // Commitment
    TOKEN_2022_PROGRAM_ID // Program ID
  )

  transferTransaction.add(transferInstruction)

  // Gửi và xác nhận transaction chuyển token
  const transferSignature = await sendAndConfirmTransaction(
    connection,
    transferTransaction,
    [adminKeypair],
    { skipPreflight: true, commitment: 'confirmed' }
  )

  return transferSignature
}

export async function POST(request: NextRequest) {
  try {
    const { publicKey, tokenSymbol } = await request.json()

    if (!publicKey) {
      return NextResponse.json({ error: 'Địa chỉ ví không hợp lệ' }, { status: 400 })
    }

    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )

    let responseMessage = ''
    let signature = ''

    const adminKeypair = getAdminKeypair()
    const receiverPublicKey = new PublicKey(publicKey)

    // Xử lý các loại token khác nhau
    switch (tokenSymbol) {
      case 'USDC':
        // Airdrop USDC (SPL token)
        signature = await airdropSPLToken(
          connection,
          adminKeypair,
          receiverPublicKey,
          USDC_MINT,
          AIRDROP_AMOUNTS.USDC,
          6 // USDC có 6 decimals
        )
        responseMessage = `Đã gửi ${AIRDROP_AMOUNTS.USDC} USDC vào ví của bạn thành công! Signature: ${signature}`
        break

      case 'wSOL':
        // Airdrop Wrapped SOL
        signature = await airdropSPLToken(
          connection,
          adminKeypair,
          receiverPublicKey,
          WSOL_MINT,
          AIRDROP_AMOUNTS.wSOL,
          9 // Wrapped SOL có 9 decimals
        )
        responseMessage = `Đã gửi ${AIRDROP_AMOUNTS.wSOL} wSOL (Wrapped SOL) vào ví của bạn thành công! Signature: ${signature}`
        break

      case 'TK22':
        // Airdrop Token 2022 (không còn dùng mock)
        signature = await airdropToken2022(
          connection,
          adminKeypair,
          receiverPublicKey,
          TK22_MINT,
          AIRDROP_AMOUNTS.TK22,
          9 // Giả sử Token 2022 có 9 decimals (điều chỉnh nếu cần)
        )
        responseMessage = `Đã gửi ${AIRDROP_AMOUNTS.TK22} Token 2022 (TK22) vào ví của bạn thành công! Signature: ${signature}`
        break

      case 'HOOK':
        // Airdrop Transfer Hook Token
        signature = await airdropTransferHookToken(
          connection,
          adminKeypair,
          receiverPublicKey,
          HOOK_MINT,
          AIRDROP_AMOUNTS.HOOK,
          9 // Decimals cho Transfer Hook Token
        )
        responseMessage = `Đã gửi ${AIRDROP_AMOUNTS.HOOK} Transfer Hook Token (HOOK) vào ví của bạn thành công! Signature: ${signature}`
        break

      default:
        responseMessage = `Không hỗ trợ airdrop token ${tokenSymbol}`
        return NextResponse.json({ error: responseMessage }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: responseMessage,
      tokenType: getTokenType(tokenSymbol),
      signature: signature || undefined,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: `Có lỗi xảy ra khi xử lý airdrop: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    )
  }
}

// Hàm trả về thông tin về loại token
function getTokenType(symbol: string) {
  switch (symbol) {
    case 'USDC':
      return {
        type: 'spl',
        standard: 'Token Program',
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        mintAddress: USDC_MINT.toString(),
      }
    case 'wSOL':
      return {
        type: 'wrapped',
        standard: 'Token Program',
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        wrappedAsset: 'SOL',
        mintAddress: WSOL_MINT.toString(),
      }
    case 'TK22':
      return {
        type: 'spl-token-2022',
        standard: 'Token-2022 Program',
        programId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
        mintAddress: TK22_MINT.toString(),
      }
    case 'HOOK':
      return {
        type: 'spl-token-2022-hook',
        standard: 'Token-2022 Program with Transfer Hook',
        programId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
        transferHook: true,
        transferHookProgramId: TRANSFER_HOOK_PROGRAM_ID.toString(),
        mintAddress: HOOK_MINT.toString(),
      }
    default:
      return { type: 'unknown' }
  }
}
