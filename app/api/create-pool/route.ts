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

const TRANSFER_HOOK_PROGRAM_ID = new PublicKey('12BZr6af3s7qf7GGmhBvMd46DWmVNhHfXmCwftfMk1mZ')
const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112')

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
      token0HasTransferHook,
      token1HasTransferHook,
    } = body

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

    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )

    const poolKeypair = Keypair.generate()

    const programId = new PublicKey(idl.address)

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

    const serverKeypair = getServerKeypair()

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

    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })

    const program = new Program(idl, provider) as Program<RaydiumCpSwap>

    const tx = new Transaction()

    const modifyComputeUnitIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 800_000,
    })
    tx.add(modifyComputeUnitIx)

    try {
      const remainingAccounts = []

      const token0Info = await getDetailTokenExtensions(token0Mint)
      const token1Info = await getDetailTokenExtensions(token1Mint)

      const token0HasHook =
        token0HasTransferHook || (token0Info.isToken2022 && token0Info.transferHook)
      const token1HasHook =
        token1HasTransferHook || (token1Info.isToken2022 && token1Info.transferHook)

      const token0ProgramId = token0Info.isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
      const token1ProgramId = token1Info.isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID

      if (token0HasHook) {
        const [whitelistPDA_token0] = PublicKey.findProgramAddressSync(
          [Buffer.from('white_list'), new PublicKey(token0Mint).toBuffer()],
          TRANSFER_HOOK_PROGRAM_ID
        )
        const [extraAccountMetaListPDA_token0] = PublicKey.findProgramAddressSync(
          [Buffer.from('extra-account-metas'), new PublicKey(token0Mint).toBuffer()],
          TRANSFER_HOOK_PROGRAM_ID
        )

        remainingAccounts.push(
          { pubkey: TRANSFER_HOOK_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: extraAccountMetaListPDA_token0, isWritable: false, isSigner: false },
          { pubkey: whitelistPDA_token0, isWritable: true, isSigner: false }
        )
      }

      if (token1HasHook) {
        const [whitelistPDA_token1] = PublicKey.findProgramAddressSync(
          [Buffer.from('white_list'), new PublicKey(token1Mint).toBuffer()],
          TRANSFER_HOOK_PROGRAM_ID
        )
        const [extraAccountMetaListPDA_token1] = PublicKey.findProgramAddressSync(
          [Buffer.from('extra-account-metas'), new PublicKey(token1Mint).toBuffer()],
          TRANSFER_HOOK_PROGRAM_ID
        )

        remainingAccounts.push(
          { pubkey: TRANSFER_HOOK_PROGRAM_ID, isWritable: false, isSigner: false },
          { pubkey: extraAccountMetaListPDA_token1, isWritable: false, isSigner: false },
          { pubkey: whitelistPDA_token1, isWritable: true, isSigner: false }
        )
      }

      remainingAccounts.push({
        pubkey: new PublicKey(creatorPublicKey),
        isWritable: true,
        isSigner: true,
      })

      const creatorLpTokenAddressPubkey = getAssociatedTokenAddressSync(
        lpMintAddress,
        new PublicKey(creatorPublicKey),
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )

      const initializeIx = await program.methods
        .initialize(
          new BN(initAmount0),
          new BN(initAmount1),
          new BN(Math.floor(Date.now() / 1000) - 3600)
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

      tx.add(initializeIx)

      tx.feePayer = new PublicKey(creatorPublicKey)

      const { blockhash } = await connection.getLatestBlockhash('confirmed')
      tx.recentBlockhash = blockhash

      tx.sign(poolKeypair)

      const serializedTransaction = tx.serialize({ requireAllSignatures: false }).toString('base64')

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
        },
        token1: {
          mint: token1Mint,
          vault: vault1.toString(),
          isToken2022: token1Info.isToken2022,
          hasTransferHook: !!(token1Info.isToken2022 && token1Info.transferHook),
          isWrappedSol: token1Mint === WSOL_MINT.toString(),
          extensions: token1Info.extensions || [],
          initialAmount: initAmount1,
        },
        createdAt: new Date().toISOString(),
        createdBy: creatorPublicKey,
        network: process.env.SOLANA_NETWORK || 'devnet',
        status: 'active',
        txid: '',
      }

      return NextResponse.json({
        success: true,
        serializedTransaction,
        poolAddress: poolKeypair.publicKey.toString(),
        lpMintAddress: lpMintAddress.toString(),
        vault0: vault0.toString(),
        vault1: vault1.toString(),
        creatorLpTokenAddress: creatorLpTokenAddressPubkey.toString(),
        poolInfo,
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
