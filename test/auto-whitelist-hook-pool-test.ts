import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
} from '@solana/web3.js'
import {
  TOKEN_2022_PROGRAM_ID,
  mintTo,
  ExtensionType,
  getAccountLen,
  createInitializeTransferHookInstruction,
  createInitializeMintInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getMintLen,
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  createSyncNativeInstruction,
  getMint,
  getExtensionTypes,
} from '@solana/spl-token'
import * as anchor from '@coral-xyz/anchor'
import { Program, BN } from '@coral-xyz/anchor'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { RaydiumCpSwap } from '../idl/types/raydium_cp_swap'

// Constants
const TRANSFER_HOOK_PROGRAM_ID = new PublicKey('12BZr6af3s7qf7GGmhBvMd46DWmVNhHfXmCwftfMk1mZ')
const NATIVE_MINT = new PublicKey('So11111111111111111111111111111111111111112')

// Interface cho lỗi có logs
interface ErrorWithLogs extends Error {
  logs?: string[]
}

// Hàm delay giữa các giao dịch
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Hàm để chuyển số u16 thành bytes
function u16ToBytes(num: number) {
  const arr = new ArrayBuffer(2)
  const view = new DataView(arr)
  view.setUint16(0, num, false)
  return new Uint8Array(arr)
}

// Hàm để lấy PDA cho AMM Config
async function getAmmConfigAddress(
  index: number,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(
    [Buffer.from('amm_config'), u16ToBytes(index)],
    programId
  )
}

// Hàm để lấy PDA cho Pool
async function getPoolAddress(
  ammConfigAddress: PublicKey,
  token0: PublicKey,
  token1: PublicKey,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(
    [
      Buffer.from('pool_state_seed'),
      ammConfigAddress.toBuffer(),
      token0.toBuffer(),
      token1.toBuffer(),
    ],
    programId
  )
}

// Hàm để lấy PDA cho Authority
async function getAuthAddress(programId: PublicKey): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress([Buffer.from('vault_and_lp_mint_auth_seed')], programId)
}

// Hàm để lấy PDA cho LP Mint
async function getPoolLpMintAddress(
  poolAddress: PublicKey,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(
    [Buffer.from('pool_lp_mint'), poolAddress.toBuffer()],
    programId
  )
}

// Hàm để lấy PDA cho Pool Vault
async function getPoolVaultAddress(
  poolAddress: PublicKey,
  mintAddress: PublicKey,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(
    [Buffer.from('pool_vault'), poolAddress.toBuffer(), mintAddress.toBuffer()],
    programId
  )
}

// Hàm để lấy PDA cho Oracle
async function getOracleAddress(
  poolAddress: PublicKey,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(
    [Buffer.from('observation'), poolAddress.toBuffer()],
    programId
  )
}

// Hàm tạo token Token-2022 với transfer hook extension
async function createToken2022WithTransferHook(
  connection: Connection,
  payer: Keypair,
  decimals: number = 9
): Promise<{ mint: PublicKey; tokenAccount: PublicKey }> {
  console.log('\n=== Tạo token Token-2022 với Transfer Hook Extension ===')

  try {
    // Tạo một transaction mới
    const transaction = new Transaction()

    // Tính toán mint account size với extension
    const mintLen = getAccountLen([ExtensionType.TransferHook])

    // Tạo keypair cho mint
    const mintKeypair = Keypair.generate()
    const mint = mintKeypair.publicKey

    // Tạo account cho mint với space cho extension
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen)
    const createAccountInstruction = SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint,
      lamports,
      space: mintLen,
      programId: TOKEN_2022_PROGRAM_ID,
    })
    transaction.add(createAccountInstruction)

    // Initialize mint với transfer hook extension
    const initializeTransferHookInstruction = createInitializeTransferHookInstruction(
      mint,
      payer.publicKey,
      TRANSFER_HOOK_PROGRAM_ID,
      TOKEN_2022_PROGRAM_ID
    )
    transaction.add(initializeTransferHookInstruction)

    // Initialize mint
    const initializeMintInstruction = createInitializeMintInstruction(
      mint,
      decimals,
      payer.publicKey,
      payer.publicKey,
      TOKEN_2022_PROGRAM_ID
    )
    transaction.add(initializeMintInstruction)

    // Gửi transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer, mintKeypair],
      { skipPreflight: false, commitment: 'confirmed' }
    )

    // Lấy địa chỉ associated token account
    const associatedTokenAddress = getAssociatedTokenAddressSync(
      mint,
      payer.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    )

    // Tạo instruction để tạo associated token account
    const createAtaIx = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      associatedTokenAddress,
      payer.publicKey,
      mint,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )

    const createAtaTx = new Transaction().add(createAtaIx)

    // Gửi và xác nhận transaction
    await sendAndConfirmTransaction(connection, createAtaTx, [payer], {
      commitment: 'confirmed',
      skipPreflight: false,
    })

    // Mint tokens
    await mintTo(
      connection,
      payer,
      mint,
      associatedTokenAddress,
      payer.publicKey,
      1_000_000_000_000, // 1,000,000 tokens
      [],
      { skipPreflight: false, commitment: 'confirmed' },
      TOKEN_2022_PROGRAM_ID
    )

    const balance = await connection.getTokenAccountBalance(associatedTokenAddress)
    console.log('Số dư token account:', balance.value.uiAmount)

    return { mint, tokenAccount: associatedTokenAddress }
  } catch (error: unknown) {
    console.error('Lỗi khi tạo token với Transfer Hook:', error)
    throw error
  }
}

// Hàm tạo token Token-2022 thông thường không có transfer hook
async function createRegularToken2022(
  connection: Connection,
  payer: Keypair,
  decimals: number = 9
): Promise<{ mint: PublicKey; tokenAccount: PublicKey }> {
  console.log('\n=== Tạo token Token-2022 thông thường (không có Transfer Hook) ===')

  try {
    // Tạo một transaction mới
    const transaction = new Transaction()

    // Tạo keypair cho mint
    const mintKeypair = Keypair.generate()
    const mint = mintKeypair.publicKey

    // Tạo account cho mint
    const lamports = await connection.getMinimumBalanceForRentExemption(getMintLen([]))

    const createAccountInstruction = SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint,
      lamports,
      space: getMintLen([]),
      programId: TOKEN_2022_PROGRAM_ID,
    })
    transaction.add(createAccountInstruction)

    // Initialize mint
    const initializeMintInstruction = createInitializeMintInstruction(
      mint,
      decimals,
      payer.publicKey,
      payer.publicKey,
      TOKEN_2022_PROGRAM_ID
    )
    transaction.add(initializeMintInstruction)

    // Gửi transaction
    await sendAndConfirmTransaction(connection, transaction, [payer, mintKeypair], {
      skipPreflight: false,
      commitment: 'confirmed',
    })

    // Lấy địa chỉ associated token account
    const associatedTokenAddress = getAssociatedTokenAddressSync(
      mint,
      payer.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    )

    // Tạo instruction để tạo associated token account
    const createAtaIx = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      associatedTokenAddress,
      payer.publicKey,
      mint,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )

    const createAtaTx = new Transaction().add(createAtaIx)

    // Gửi và xác nhận transaction
    await sendAndConfirmTransaction(connection, createAtaTx, [payer], {
      commitment: 'confirmed',
      skipPreflight: false,
    })

    // Mint tokens
    await mintTo(
      connection,
      payer,
      mint,
      associatedTokenAddress,
      payer.publicKey,
      1_000_000_000_000, // 1,000,000 tokens
      [],
      { skipPreflight: false, commitment: 'confirmed' },
      TOKEN_2022_PROGRAM_ID
    )

    const balance = await connection.getTokenAccountBalance(associatedTokenAddress)
    console.log('Số dư token account:', balance.value.uiAmount)

    return { mint, tokenAccount: associatedTokenAddress }
  } catch (error: unknown) {
    console.error('Lỗi khi tạo token thông thường:', error)
    throw error
  }
}

// Hàm khởi tạo whitelist và thêm địa chỉ vào whitelist
async function initializeWhitelistAndAddAddress(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  addressToWhitelist: PublicKey
) {
  console.log(
    `\n=== Khởi tạo whitelist cho ${mint.toString().slice(0, 8)}... và thêm địa chỉ ${addressToWhitelist.toString().slice(0, 8)}... ===`
  )

  try {
    // Tạo connection đến Anchor Provider
    const wallet = new anchor.Wallet(payer)
    const provider = new anchor.AnchorProvider(
      connection,
      wallet,
      anchor.AnchorProvider.defaultOptions()
    )

    // Đọc IDL từ file cho Transfer Hook Program
    const transferHookIdlPath = path.join(__dirname, '../idl/transfer_hook.json')
    const transferHookIdlFile = fs.readFileSync(transferHookIdlPath, 'utf8')
    const transferHookIdl = JSON.parse(transferHookIdlFile)

    // Tạo Program instance cho Transfer Hook
    transferHookIdl.metadata.address = TRANSFER_HOOK_PROGRAM_ID
    const hookProgram = new anchor.Program(transferHookIdl, provider)

    // Tính PDA cho whitelist và ExtraAccountMetaList
    const [whitelistPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('white_list'), mint.toBuffer()],
      TRANSFER_HOOK_PROGRAM_ID
    )

    const [extraAccountMetaListPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('extra-account-metas'), mint.toBuffer()],
      TRANSFER_HOOK_PROGRAM_ID
    )

    // Kiểm tra xem tài khoản whitelist đã tồn tại chưa
    const whitelistAccount = await connection.getAccountInfo(whitelistPDA)
    if (!whitelistAccount) {
      // 1. Khởi tạo ExtraAccountMetaList
      const initializeExtraAccountMetaListIx = await hookProgram.methods
        .initializeExtraAccountMetaList()
        .accounts({
          payer: wallet.publicKey,
          extraAccountMetaList: extraAccountMetaListPDA,
          mint: mint,
          systemProgram: SystemProgram.programId,
          white_list: whitelistPDA,
        })
        .instruction()

      const tx = new Transaction().add(initializeExtraAccountMetaListIx)
      await sendAndConfirmTransaction(connection, tx, [payer], {
        skipPreflight: false,
        commitment: 'confirmed',
      })
    }

    // 2. Thêm địa chỉ vào whitelist
    const addToWhitelistIx = await hookProgram.methods
      .addToWhitelist()
      .accounts({
        newAccount: addressToWhitelist,
        mint: mint,
        white_list: whitelistPDA,
        signer: wallet.publicKey,
      })
      .instruction()

    const tx = new Transaction().add(addToWhitelistIx)
    await sendAndConfirmTransaction(connection, tx, [payer], {
      skipPreflight: false,
      commitment: 'confirmed',
    })

    console.log(
      `Đã thêm địa chỉ ${addressToWhitelist.toString().slice(0, 8)}... vào whitelist thành công`
    )
    return { whitelistPDA, extraAccountMetaListPDA }
  } catch (error: unknown) {
    console.error('Lỗi khi khởi tạo whitelist:', error)
    throw error
  }
}

// Hàm để log ra các địa chỉ trong whitelist
async function logWhitelistAddresses(connection: Connection, mint: PublicKey) {
  console.log(
    `\n=== Danh sách địa chỉ trong whitelist của token ${mint.toString().slice(0, 8)}... ===`
  )

  try {
    // Tính PDA cho whitelist
    const [whitelistPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('white_list'), mint.toBuffer()],
      TRANSFER_HOOK_PROGRAM_ID
    )

    // Lấy dữ liệu của tài khoản whitelist
    const whitelistAccount = await connection.getAccountInfo(whitelistPDA)

    if (!whitelistAccount) {
      console.log('Không tìm thấy tài khoản whitelist hoặc chưa được khởi tạo')
      return
    }

    console.log(`Whitelist PDA: ${whitelistPDA.toString()}`)

    // Đọc dữ liệu whitelist dưới dạng raw bytes
    // Chúng ta sẽ cố gắng tìm các địa chỉ có kích thước 32 bytes trong dữ liệu
    const data = whitelistAccount.data
    console.log(`Kích thước dữ liệu whitelist: ${data.length} bytes`)

    // Thử tìm các địa chỉ 32-byte sau đoạn dữ liệu đầu tiên
    // Anchor thường có 8 byte discriminator đầu tiên
    const possibleAddresses: string[] = []

    // Bắt đầu từ byte thứ 16 (sau discriminator và counter)
    let offset = 16
    while (offset + 32 <= data.length) {
      // Lấy 32 byte tiếp theo làm địa chỉ
      const addressBytes = data.slice(offset, offset + 32)

      // Kiểm tra xem có phải toàn số 0 không (trường hợp bộ nhớ chưa được sử dụng)
      const isAllZeros = addressBytes.every(byte => byte === 0)

      if (!isAllZeros) {
        try {
          const address = new PublicKey(addressBytes)
          possibleAddresses.push(address.toString())
        } catch (e) {
          // Không phải địa chỉ hợp lệ, bỏ qua
        }
      }

      offset += 32
    }

    if (possibleAddresses.length > 0) {
      console.log(`Tìm thấy ${possibleAddresses.length} địa chỉ tiềm năng trong whitelist:`)
      possibleAddresses.forEach((address, i) => {
        console.log(`Địa chỉ ${i + 1}: ${address}`)
      })
    } else {
      console.log('Không tìm thấy địa chỉ nào trong whitelist hoặc định dạng dữ liệu không đúng.')
    }

    return possibleAddresses
  } catch (error) {
    console.error('Lỗi khi đọc whitelist:', error)
    return []
  }
}

// Hàm để kiểm tra xem token có phải là token-2022 hay không
async function isToken2022(connection: Connection, mintAddress: PublicKey): Promise<boolean> {
  try {
    // Thử lấy thông tin từ SPL Token program
    await getMint(connection, mintAddress, undefined, TOKEN_PROGRAM_ID)
    return false // Nếu lấy được thông tin từ SPL Token program, đây là token thường
  } catch (error) {
    try {
      // Thử lấy thông tin từ Token-2022 program
      await getMint(connection, mintAddress, undefined, TOKEN_2022_PROGRAM_ID)
      return true // Nếu lấy được thông tin từ Token-2022 program, đây là token-2022
    } catch (error) {
      console.error('Lỗi khi kiểm tra loại token:', error)
      return false // Mặc định trả về false nếu không xác định được
    }
  }
}

// Hàm để kiểm tra xem token có transfer hook hay không
async function hasTransferHook(connection: Connection, mintAddress: PublicKey): Promise<boolean> {
  try {
    // Thử lấy thông tin từ Token-2022 program
    const mintInfo = await getMint(connection, mintAddress, undefined, TOKEN_2022_PROGRAM_ID)

    // Nếu không có TLV data, không có extensions
    if (!mintInfo.tlvData) {
      return false
    }

    // Kiểm tra các extensions
    const extensionTypes = getExtensionTypes(mintInfo.tlvData)
    return extensionTypes.includes(ExtensionType.TransferHook)
  } catch (error) {
    return false // Không phải token-2022 hoặc không có transfer hook
  }
}

// Hàm khởi tạo pool
async function initializePool(
  program: Program<RaydiumCpSwap>,
  ammConfigAddress: PublicKey,
  token0: PublicKey,
  token1: PublicKey,
  token0Account: PublicKey,
  token1Account: PublicKey,
  initAmount0: BN,
  initAmount1: BN,
  wallet: anchor.Wallet
) {
  console.log('\n=== Khởi tạo pool ===')

  try {
    // 1. Tạo keypair cho pool
    const poolKeypair = Keypair.generate()
    const poolAddress = poolKeypair.publicKey

    // 2. Lấy các PDA cần thiết
    const [auth] = await getAuthAddress(program.programId)
    const [lpMintAddress] = await getPoolLpMintAddress(poolAddress, program.programId)
    const [vault0] = await getPoolVaultAddress(poolAddress, token0, program.programId)
    const [vault1] = await getPoolVaultAddress(poolAddress, token1, program.programId)
    const [observationAddress] = await getOracleAddress(poolAddress, program.programId)

    // 3. LP token account cho creator
    const creatorLpTokenAddress = anchor.utils.token.associatedAddress({
      mint: lpMintAddress,
      owner: program.provider.publicKey!,
    })

    // 4. Log thông tin các địa chỉ PDAs đã tính
    console.log('Pool address:', poolAddress.toString())
    console.log('Authority address:', auth.toString())

    // 5. Xác định loại token và program ID tương ứng
    const connection = program.provider.connection
    const isToken0_2022 = await isToken2022(connection, token0)
    const isToken1_2022 = await isToken2022(connection, token1)

    const token0Program = isToken0_2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
    const token1Program = isToken1_2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID

    console.log(
      `Token0 (${token0.toString().slice(0, 8)}...): isToken2022=${isToken0_2022}, Program=${token0Program.toString().slice(0, 8)}...`
    )
    console.log(
      `Token1 (${token1.toString().slice(0, 8)}...): isToken2022=${isToken1_2022}, Program=${token1Program.toString().slice(0, 8)}...`
    )

    // 6. Kiểm tra transfer hook
    const token0HasTransferHook = isToken0_2022 && (await hasTransferHook(connection, token0))
    const token1HasTransferHook = isToken1_2022 && (await hasTransferHook(connection, token1))

    // Tạo danh sách remainingAccounts với các tài khoản bổ sung cần thiết cho transfer hook
    const remainingAccounts: { pubkey: PublicKey; isWritable: boolean; isSigner: boolean }[] = []

    // Chỉ thêm tài khoản transfer hook cho token có transfer hook
    if (token0HasTransferHook) {
      const [whitelistPDA_token0] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('white_list'), token0.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )
      const [extraAccountMetaListPDA_token0] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('extra-account-metas'), token0.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )

      // Thêm tài khoản cho token0
      remainingAccounts.push(
        { pubkey: TRANSFER_HOOK_PROGRAM_ID, isWritable: false, isSigner: false },
        { pubkey: extraAccountMetaListPDA_token0, isWritable: false, isSigner: false },
        { pubkey: whitelistPDA_token0, isWritable: true, isSigner: false }
      )

      console.log(`Token0 có transfer hook, đã thêm các tài khoản cần thiết`)
    }

    if (token1HasTransferHook) {
      const [whitelistPDA_token1] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('white_list'), token1.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )
      const [extraAccountMetaListPDA_token1] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('extra-account-metas'), token1.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )

      // Thêm tài khoản cho token1
      remainingAccounts.push(
        { pubkey: TRANSFER_HOOK_PROGRAM_ID, isWritable: false, isSigner: false },
        { pubkey: extraAccountMetaListPDA_token1, isWritable: false, isSigner: false },
        { pubkey: whitelistPDA_token1, isWritable: true, isSigner: false }
      )

      console.log(`Token1 có transfer hook, đã thêm các tài khoản cần thiết`)
    }

    // Thêm wallet vào danh sách remainingAccounts
    remainingAccounts.push({ pubkey: wallet.publicKey, isWritable: false, isSigner: true })

    // Khởi tạo pool
    const currentTime = Math.floor(Date.now() / 1000)

    // Tăng compute budget
    const modifyComputeUnit = ComputeBudgetProgram.setComputeUnitLimit({
      units: 800_000,
    })

    // Tạo instruction để khởi tạo pool
    const initializeIx = await program.methods
      .initialize(
        initAmount0,
        initAmount1,
        new BN(currentTime - 3600) // openTime trong quá khứ (1 giờ trước)
      )
      .accountsPartial({
        creator: program.provider.publicKey!,
        ammConfig: ammConfigAddress,
        poolState: poolAddress,
        authority: auth,
        token0Mint: token0,
        token1Mint: token1,
        lpMint: lpMintAddress,
        creatorToken0: token0Account,
        creatorToken1: token1Account,
        creatorLpToken: creatorLpTokenAddress,
        token0Vault: vault0,
        token1Vault: vault1,
        observationState: observationAddress,
        tokenProgram: TOKEN_PROGRAM_ID,
        token0Program: token0Program,
        token1Program: token1Program,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        createPoolFee: new PublicKey('2p3CiCssv21WeTyQDVZZL66UyXByJZd4oqrPyV7tz3qu'),
      })
      .remainingAccounts(remainingAccounts)
      .signers([poolKeypair])
      .instruction()

    // Tạo transaction
    const poolTx = new Transaction().add(modifyComputeUnit).add(initializeIx)

    // Ký transaction
    poolTx.feePayer = wallet.publicKey
    poolTx.recentBlockhash = (await program.provider.connection.getLatestBlockhash()).blockhash

    poolTx.sign(poolKeypair)
    if (!wallet.payer || !wallet.payer.secretKey) {
      throw new Error('Wallet payer invalid')
    }

    poolTx.partialSign(wallet.payer)

    // Gửi transaction
    const txid = await program.provider.connection.sendRawTransaction(poolTx.serialize(), {
      skipPreflight: false,
    })

    // Chờ xác nhận
    await program.provider.connection.confirmTransaction(txid, 'confirmed')

    console.log('\n=== Pool đã được khởi tạo thành công ===')
    console.log('Transaction signature:', txid)

    return { poolAddress, lpMintAddress, vault0, vault1 }
  } catch (error: unknown) {
    console.error('Lỗi khi khởi tạo pool:', error)
    if (error && typeof error === 'object' && 'logs' in error) {
      console.log('Lỗi chi tiết:', (error as ErrorWithLogs).logs)
    }
    throw error
  }
}

// Hàm thực hiện swap token
async function swapTokens(
  program: Program<RaydiumCpSwap>,
  poolAddress: PublicKey,
  inputToken: PublicKey,
  outputToken: PublicKey,
  inputTokenAccount: PublicKey,
  outputTokenAccount: PublicKey,
  amountIn: BN,
  minimumAmountOut: BN,
  wallet: anchor.Wallet,
  connection: Connection,
  payer: Keypair,
  hookTokenMint?: PublicKey // Đổi thành optional parameter
) {
  console.log('\n=== Thực hiện swap token ===')

  try {
    // Lấy các PDA cần thiết
    const [auth] = await getAuthAddress(program.programId)

    // Lấy thông tin pool state để biết chính xác token0_vault và token1_vault
    const poolState = await program.account.poolState.fetch(poolAddress)

    // Xác định input vault và output vault dựa trên token đầu vào
    let inputVault, outputVault
    if (inputToken.equals(poolState.token0Mint)) {
      inputVault = poolState.token0Vault
      outputVault = poolState.token1Vault
    } else {
      inputVault = poolState.token1Vault
      outputVault = poolState.token0Vault
    }

    // Lấy thông tin AMM Config từ pool
    const ammConfigAddress = poolState.ammConfig
    const observationAddress = poolState.observationKey

    // Xác định loại token và program ID tương ứng
    const isInputToken2022 = await isToken2022(connection, inputToken)
    const isOutputToken2022 = await isToken2022(connection, outputToken)

    const inputTokenProgram = isInputToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
    const outputTokenProgram = isOutputToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID

    console.log(
      `Input Token (${inputToken.toString().slice(0, 8)}...): isToken2022=${isInputToken2022}, Program=${inputTokenProgram.toString().slice(0, 8)}...`
    )
    console.log(
      `Output Token (${outputToken.toString().slice(0, 8)}...): isToken2022=${isOutputToken2022}, Program=${outputTokenProgram.toString().slice(0, 8)}...`
    )

    // Kiểm tra transfer hook
    const inputTokenHasTransferHook =
      isInputToken2022 && (await hasTransferHook(connection, inputToken))
    const outputTokenHasTransferHook =
      isOutputToken2022 && (await hasTransferHook(connection, outputToken))

    // Tạo danh sách remainingAccounts với các tài khoản bổ sung cần thiết cho transfer hook
    const remainingAccounts: { pubkey: PublicKey; isWritable: boolean; isSigner: boolean }[] = []

    // Chỉ thêm tài khoản transfer hook cho token có transfer hook
    if (inputTokenHasTransferHook) {
      const [extraAccountMetaListPDA_input] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('extra-account-metas'), inputToken.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )
      const [whitelistPDA_input] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('white_list'), inputToken.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )

      // Thêm các tài khoản cho input token
      remainingAccounts.push({
        pubkey: TRANSFER_HOOK_PROGRAM_ID,
        isWritable: false,
        isSigner: false,
      })
      remainingAccounts.push({
        pubkey: extraAccountMetaListPDA_input,
        isWritable: false,
        isSigner: false,
      })
      remainingAccounts.push({ pubkey: whitelistPDA_input, isWritable: true, isSigner: false })

      console.log(`Input token có transfer hook, đã thêm các tài khoản cần thiết`)
    }

    if (outputTokenHasTransferHook) {
      const [extraAccountMetaListPDA_output] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('extra-account-metas'), outputToken.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )
      const [whitelistPDA_output] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('white_list'), outputToken.toBuffer()],
        TRANSFER_HOOK_PROGRAM_ID
      )

      // Thêm các tài khoản cho output token
      remainingAccounts.push({
        pubkey: TRANSFER_HOOK_PROGRAM_ID,
        isWritable: false,
        isSigner: false,
      })
      remainingAccounts.push({
        pubkey: extraAccountMetaListPDA_output,
        isWritable: false,
        isSigner: false,
      })
      remainingAccounts.push({ pubkey: whitelistPDA_output, isWritable: true, isSigner: false })

      console.log(`Output token có transfer hook, đã thêm các tài khoản cần thiết`)
    }

    // Thêm wallet vào danh sách remainingAccounts
    remainingAccounts.push({ pubkey: wallet.publicKey, isWritable: false, isSigner: true })

    // Thêm log để kiểm tra các tài khoản
    console.log(
      'Danh sách remainingAccounts:',
      remainingAccounts.map(acc => acc.pubkey.toString().slice(0, 10) + '...')
    )

    // Tăng compute budget
    const modifyComputeUnit = ComputeBudgetProgram.setComputeUnitLimit({
      units: 800_000,
    })

    // Tạo transaction swap
    const swapIx = await program.methods
      .swapBaseInput(amountIn, minimumAmountOut)
      .accountsPartial({
        payer: wallet.publicKey,
        authority: auth,
        ammConfig: ammConfigAddress,
        poolState: poolAddress,
        inputTokenAccount: inputTokenAccount,
        outputTokenAccount: outputTokenAccount,
        inputVault: inputVault,
        outputVault: outputVault,
        inputTokenProgram: inputTokenProgram,
        outputTokenProgram: outputTokenProgram,
        inputTokenMint: inputToken,
        outputTokenMint: outputToken,
        observationState: observationAddress,
      })
      .remainingAccounts(remainingAccounts)
      .instruction()

    // Tạo và gửi transaction
    const swapTx = new Transaction().add(modifyComputeUnit).add(swapIx)

    // Ký và gửi transaction
    swapTx.feePayer = wallet.publicKey
    swapTx.recentBlockhash = (await program.provider.connection.getLatestBlockhash()).blockhash

    if (!wallet.payer || !wallet.payer.secretKey) {
      throw new Error('Wallet payer invalid')
    }

    swapTx.partialSign(wallet.payer)

    // Thêm skipPreflight=true để có thể xem thêm chi tiết lỗi
    const txid = await program.provider.connection.sendRawTransaction(swapTx.serialize(), {
      skipPreflight: false,
    })

    // Chờ xác nhận
    await program.provider.connection.confirmTransaction(txid, 'confirmed')

    console.log('\n=== Swap thành công ===')
    console.log('Transaction signature:', txid)

    // Lấy số dư sau khi swap
    const inputBalance = await program.provider.connection.getTokenAccountBalance(inputTokenAccount)
    const outputBalance =
      await program.provider.connection.getTokenAccountBalance(outputTokenAccount)

    console.log('Số dư input token sau swap:', inputBalance.value.uiAmount)
    console.log('Số dư output token sau swap:', outputBalance.value.uiAmount)

    return txid
  } catch (error: unknown) {
    console.error('Lỗi khi thực hiện swap:', error)
    if (error && typeof error === 'object' && 'logs' in error) {
      console.log('Lỗi chi tiết:', (error as ErrorWithLogs).logs)
    }
    throw error
  }
}

// Hàm tạo SPL token thông thường (không phải token-2022)
async function createStandardSplToken(
  connection: Connection,
  payer: Keypair,
  decimals: number = 9
): Promise<{ mint: PublicKey; tokenAccount: PublicKey }> {
  console.log('\n=== Tạo token SPL thông thường ===')

  try {
    // Tạo mint
    const mint = await createMint(
      connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      decimals,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    )

    // Tạo token account
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      payer.publicKey,
      false,
      'confirmed',
      undefined,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )

    // Mint tokens
    await mintTo(
      connection,
      payer,
      mint,
      tokenAccount.address,
      payer.publicKey,
      1_000_000_000_000, // 1,000,000 tokens
      [],
      { skipPreflight: false, commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    )

    const balance = await connection.getTokenAccountBalance(tokenAccount.address)
    console.log('Số dư SPL token:', balance.value.uiAmount)

    return { mint, tokenAccount: tokenAccount.address }
  } catch (error: unknown) {
    console.error('Lỗi khi tạo SPL token thông thường:', error)
    throw error
  }
}

// Hàm tạo wrapped SOL account
async function createWrappedSolAccount(
  connection: Connection,
  payer: Keypair,
  solAmount: number
): Promise<PublicKey> {
  console.log('\n=== Tạo Wrapped SOL account ===')
  try {
    // Sử dụng getOrCreateAssociatedTokenAccount thay vì tự tạo
    const ataAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      NATIVE_MINT,
      payer.publicKey,
      false,
      'confirmed',
      { skipPreflight: false },
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )

    // Chuyển SOL vào ATA rồi sync
    const lamports = solAmount * anchor.web3.LAMPORTS_PER_SOL
    const transaction = new Transaction()

    // Thêm instruction để chuyển SOL vào ATA
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: ataAccount.address,
        lamports,
      })
    )

    // Thêm SyncNative instruction
    transaction.add(createSyncNativeInstruction(ataAccount.address, TOKEN_PROGRAM_ID))

    await sendAndConfirmTransaction(connection, transaction, [payer])

    // Kiểm tra số dư sau khi sync
    await delay(2000) // Đợi 2 giây để chắc chắn số dư đã được cập nhật
    const balance = await connection.getTokenAccountBalance(ataAccount.address)
    console.log('Số dư Wrapped SOL:', balance.value.uiAmount)

    return ataAccount.address
  } catch (error) {
    console.error('Lỗi khi tạo Wrapped SOL account:', error)
    throw error
  }
}

// Hàm khởi tạo pool với token thông thường
async function initializeStandardPool(
  program: Program<RaydiumCpSwap>,
  ammConfigAddress: PublicKey,
  token0: PublicKey,
  token1: PublicKey,
  token0Account: PublicKey,
  token1Account: PublicKey,
  initAmount0: BN,
  initAmount1: BN,
  wallet: anchor.Wallet
) {
  console.log('\n=== Khởi tạo pool với token thông thường ===')

  try {
    // 1. Tạo keypair cho pool
    const poolKeypair = Keypair.generate()
    const poolAddress = poolKeypair.publicKey

    // 2. Lấy các PDA cần thiết
    const [auth] = await getAuthAddress(program.programId)
    const [lpMintAddress] = await getPoolLpMintAddress(poolAddress, program.programId)
    const [vault0] = await getPoolVaultAddress(poolAddress, token0, program.programId)
    const [vault1] = await getPoolVaultAddress(poolAddress, token1, program.programId)
    const [observationAddress] = await getOracleAddress(poolAddress, program.programId)

    // 3. LP token account cho creator
    const creatorLpTokenAddress = anchor.utils.token.associatedAddress({
      mint: lpMintAddress,
      owner: program.provider.publicKey!,
    })

    // 4. Log thông tin các địa chỉ PDAs đã tính
    console.log('Pool address:', poolAddress.toString())
    console.log('Authority address:', auth.toString())

    // Tăng compute budget
    const modifyComputeUnit = ComputeBudgetProgram.setComputeUnitLimit({
      units: 800_000,
    })

    // Xác định token programs dựa trên loại token (SOL hoặc SPL)
    const token0Program = TOKEN_PROGRAM_ID
    const token1Program = TOKEN_PROGRAM_ID

    // Tạo instruction để khởi tạo pool
    const initializeIx = await program.methods
      .initialize(
        initAmount0,
        initAmount1,
        new BN(Math.floor(Date.now() / 1000) - 3600) // openTime trong quá khứ (1 giờ trước)
      )
      .accountsPartial({
        creator: program.provider.publicKey!,
        ammConfig: ammConfigAddress,
        poolState: poolAddress,
        authority: auth,
        token0Mint: token0,
        token1Mint: token1,
        lpMint: lpMintAddress,
        creatorToken0: token0Account,
        creatorToken1: token1Account,
        creatorLpToken: creatorLpTokenAddress,
        token0Vault: vault0,
        token1Vault: vault1,
        observationState: observationAddress,
        tokenProgram: TOKEN_PROGRAM_ID,
        token0Program: token0Program,
        token1Program: token1Program,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        createPoolFee: new PublicKey('2p3CiCssv21WeTyQDVZZL66UyXByJZd4oqrPyV7tz3qu'),
      })
      .signers([poolKeypair])
      .instruction()

    // Tạo transaction
    const poolTx = new Transaction()
    poolTx.add(modifyComputeUnit)
    poolTx.add(initializeIx)

    // Ký transaction
    poolTx.feePayer = wallet.publicKey
    poolTx.recentBlockhash = (await program.provider.connection.getLatestBlockhash()).blockhash

    poolTx.sign(poolKeypair)
    if (!wallet.payer || !wallet.payer.secretKey) {
      throw new Error('Wallet payer invalid')
    }

    poolTx.partialSign(wallet.payer)

    // Gửi transaction
    const txid = await program.provider.connection.sendRawTransaction(poolTx.serialize(), {
      skipPreflight: false,
    })

    // Chờ xác nhận
    await program.provider.connection.confirmTransaction(txid, 'confirmed')

    console.log('\n=== Pool với token thông thường đã được khởi tạo thành công ===')
    console.log('Transaction signature:', txid)

    return { poolAddress, lpMintAddress, vault0, vault1 }
  } catch (error: unknown) {
    console.error('Lỗi khi khởi tạo pool với token thông thường:', error)
    if (error && typeof error === 'object' && 'logs' in error) {
      console.log('Lỗi chi tiết:', (error as ErrorWithLogs).logs)
    }
    throw error
  }
}

// Hàm thực hiện swap token thông thường
async function swapStandardTokens(
  program: Program<RaydiumCpSwap>,
  poolAddress: PublicKey,
  inputToken: PublicKey,
  outputToken: PublicKey,
  inputTokenAccount: PublicKey,
  outputTokenAccount: PublicKey,
  amountIn: BN,
  minimumAmountOut: BN,
  wallet: anchor.Wallet,
  connection: Connection,
  payer: Keypair
) {
  console.log('\n=== Thực hiện swap token thông thường ===')

  try {
    // Lấy các PDA cần thiết
    const [auth] = await getAuthAddress(program.programId)

    // Lấy thông tin pool state để biết chính xác token0_vault và token1_vault
    const poolState = await program.account.poolState.fetch(poolAddress)

    // Xác định input vault và output vault dựa trên token đầu vào
    let inputVault, outputVault
    if (inputToken.equals(poolState.token0Mint)) {
      inputVault = poolState.token0Vault
      outputVault = poolState.token1Vault
    } else {
      inputVault = poolState.token1Vault
      outputVault = poolState.token0Vault
    }

    // Lấy thông tin AMM Config từ pool
    const ammConfigAddress = poolState.ammConfig
    const observationAddress = poolState.observationKey

    // Xác định token programs dựa trên loại token (SOL hoặc SPL)
    const inputTokenProgram = TOKEN_PROGRAM_ID
    const outputTokenProgram = TOKEN_PROGRAM_ID

    // Tăng compute budget
    const modifyComputeUnit = ComputeBudgetProgram.setComputeUnitLimit({
      units: 800_000,
    })

    // Tạo transaction swap
    const swapIx = await program.methods
      .swapBaseInput(amountIn, minimumAmountOut)
      .accountsPartial({
        payer: wallet.publicKey,
        authority: auth,
        ammConfig: ammConfigAddress,
        poolState: poolAddress,
        inputTokenAccount: inputTokenAccount,
        outputTokenAccount: outputTokenAccount,
        inputVault: inputVault,
        outputVault: outputVault,
        inputTokenProgram: inputTokenProgram,
        outputTokenProgram: outputTokenProgram,
        inputTokenMint: inputToken,
        outputTokenMint: outputToken,
        observationState: observationAddress,
      })
      .instruction()

    // Tạo và gửi transaction
    const swapTx = new Transaction()
    swapTx.add(modifyComputeUnit)
    swapTx.add(swapIx)

    // Ký và gửi transaction
    swapTx.feePayer = wallet.publicKey
    swapTx.recentBlockhash = (await program.provider.connection.getLatestBlockhash()).blockhash

    if (!wallet.payer || !wallet.payer.secretKey) {
      throw new Error('Wallet payer invalid')
    }

    swapTx.partialSign(wallet.payer)

    const txid = await program.provider.connection.sendRawTransaction(swapTx.serialize(), {
      skipPreflight: false,
    })

    // Chờ xác nhận
    await program.provider.connection.confirmTransaction(txid, 'confirmed')

    console.log('\n=== Swap token thông thường thành công ===')
    console.log('Transaction signature:', txid)

    // Lấy số dư sau khi swap
    const inputBalance = await program.provider.connection.getTokenAccountBalance(inputTokenAccount)
    const outputBalance =
      await program.provider.connection.getTokenAccountBalance(outputTokenAccount)

    console.log('Số dư input token sau swap:', inputBalance.value.uiAmount)
    console.log('Số dư output token sau swap:', outputBalance.value.uiAmount)

    return txid
  } catch (error: unknown) {
    console.error('Lỗi khi thực hiện swap token thông thường:', error)
    if (error && typeof error === 'object' && 'logs' in error) {
      console.log('Lỗi chi tiết:', (error as ErrorWithLogs).logs)
    }
    throw error
  }
}

// Cập nhật hàm main để thêm các test case mới
async function main() {
  try {
    // TEST 1: Tạo pool với token có transfer hook
    console.log('=== TEST 1: TẠO POOL VỚI TOKEN CÓ TRANSFER HOOK (TỰ ĐỘNG WHITELIST) ===')

    // Đọc keypair từ file ~/.config/solana/id.json
    const keypairPath = path.join(os.homedir(), '.config', 'solana', 'id.json')
    const secretKeyString = fs.readFileSync(keypairPath, { encoding: 'utf8' })
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString))
    const payer = Keypair.fromSecretKey(secretKey)

    console.log('Payer:', payer.publicKey.toString())

    // Kết nối đến devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed')

    // Tạo token 1 với transfer hook
    const token1Result = await createToken2022WithTransferHook(connection, payer)

    // Tạo token 2 thường
    const token2Result = await createRegularToken2022(connection, payer)

    // Kiểm tra và sắp xếp token để đảm bảo token0 < token1
    let token0Mint, token1Mint, token0Account, token1Account
    let hookTokenMint // Mint của token có Transfer Hook

    if (token1Result.mint.toBuffer().compare(token2Result.mint.toBuffer()) < 0) {
      token0Mint = token1Result.mint
      token1Mint = token2Result.mint
      token0Account = token1Result.tokenAccount
      token1Account = token2Result.tokenAccount
      hookTokenMint = token1Result.mint
      console.log('Token0 (có transfer hook):', token0Mint.toString())
      console.log('Token1 (thông thường):', token1Mint.toString())
    } else {
      token0Mint = token2Result.mint
      token1Mint = token1Result.mint
      token0Account = token2Result.tokenAccount
      token1Account = token1Result.tokenAccount
      hookTokenMint = token1Result.mint
      console.log('Token0 (thông thường):', token0Mint.toString())
      console.log('Token1 (có transfer hook):', token1Mint.toString())
    }

    // Khởi tạo provider
    const wallet = new anchor.Wallet(payer)
    const provider = new anchor.AnchorProvider(
      connection,
      wallet,
      anchor.AnchorProvider.defaultOptions()
    )
    anchor.setProvider(provider)

    // Đọc IDL từ file
    const idlPath = path.join(__dirname, '../idl/raydium_cp_swap.json')
    const idlFile = fs.readFileSync(idlPath, 'utf8')
    const idl = JSON.parse(idlFile)

    // Program ID
    const programId = new PublicKey('WFHgqbEBAESXYu9EWcnpDcLoG9L5kDyQJjCG3a5AGqL')

    // Khởi tạo Program
    idl.metadata.address = programId
    const program = new anchor.Program(idl, provider) as anchor.Program<RaydiumCpSwap>

    try {
      // Sử dụng AMM Config có sẵn
      const ammConfigAddress = new PublicKey('5nWyCWXhJEaHmj8zJ1graq64dgfyX4oY7r7NZ3xxfozN')

      // Chỉ cần thêm wallet vào whitelist của token có transfer hook
      if (token0Mint.equals(hookTokenMint)) {
        await initializeWhitelistAndAddAddress(connection, payer, token0Mint, wallet.publicKey)
      } else {
        await initializeWhitelistAndAddAddress(connection, payer, token1Mint, wallet.publicKey)
      }

      // Kiểm tra whitelist trước khi tạo pool
      console.log('\n=== Whitelist trước khi khởi tạo pool ===')
      await logWhitelistAddresses(connection, hookTokenMint)

      // Khởi tạo pool (vault owner sẽ được tự động thêm vào whitelist bởi smart contract)
      const poolInfo = await initializePool(
        program,
        ammConfigAddress,
        token0Mint,
        token1Mint,
        token0Account,
        token1Account,
        new BN(5_000_000_000), // 5 token0 (với 9 decimal) thay vì 10
        new BN(5_000_000_000), // 5 token1 (với 9 decimal) thay vì 10
        wallet
      )

      console.log('=== HOÀN TẤT TẠO POOL VỚI TOKEN CÓ TRANSFER HOOK ===')

      // Kiểm tra whitelist sau khi tạo pool để xem vault đã được thêm vào chưa
      console.log('\n=== Whitelist sau khi khởi tạo pool ===')
      await logWhitelistAddresses(connection, hookTokenMint)

      // Đợi một chút trước khi thực hiện swap
      console.log('Đợi 5 giây trước khi thực hiện swap...')
      await delay(5000)

      // Thực hiện swap từ token0 sang token1
      console.log('\n=== BẮT ĐẦU TEST SWAP TOKEN0 -> TOKEN1 ===')
      await swapTokens(
        program,
        poolInfo.poolAddress,
        token0Mint,
        token1Mint,
        token0Account,
        token1Account,
        new BN(500_000_000), // Swap 0.5 token0
        new BN(450_000_000), // Minimum nhận lại 0.45 token1
        wallet,
        connection,
        payer,
        hookTokenMint // Mint của token có Transfer Hook
      )

      // Thực hiện swap ngược lại từ token1 sang token0
      console.log('\n=== BẮT ĐẦU TEST REVERSE SWAP TOKEN1 -> TOKEN0 ===')
      await swapTokens(
        program,
        poolInfo.poolAddress,
        token1Mint,
        token0Mint,
        token1Account,
        token0Account,
        new BN(450_000_000), // Swap 0.45 token1 (số lượng nhận được từ swap trước)
        new BN(400_000_000), // Minimum nhận lại 0.4 token0
        wallet,
        connection,
        payer,
        hookTokenMint // Mint của token có Transfer Hook
      )

      console.log('\n=== HOÀN TẤT TEST SWAP VỚI TOKEN CÓ TRANSFER HOOK ===')
      console.log('Smart contract đã tự động thêm vault vào whitelist')

      // TEST 2: Tạo pool với SOL và SPL token thông thường
      console.log('\n\n=== TEST 2: TẠO POOL VỚI SOL VÀ SPL TOKEN THÔNG THƯỜNG ===')

      // Tạo SPL token thông thường (không phải token-2022)
      const splTokenResult = await createStandardSplToken(connection, payer)
      console.log('SPL Token created:', splTokenResult.mint.toString())

      // SOL (Wrapped SOL) sẽ được sử dụng làm token thứ hai
      const wrappedSolMint = new PublicKey('So11111111111111111111111111111111111111112')

      // Tạo Wrapped SOL account với 2 SOL thay vì 10 SOL
      const wrappedSolAccount = await createWrappedSolAccount(connection, payer, 2)
      console.log('Wrapped SOL account:', wrappedSolAccount.toString())

      // Đợi để đảm bảo token balance đã được cập nhật
      console.log('Đợi 5 giây để đảm bảo số dư WSOL được cập nhật...')
      await delay(5000)

      // Sắp xếp token để đảm bảo token0 < token1
      let stdToken0Mint, stdToken1Mint, stdToken0Account, stdToken1Account

      if (splTokenResult.mint.toBuffer().compare(wrappedSolMint.toBuffer()) < 0) {
        stdToken0Mint = splTokenResult.mint
        stdToken1Mint = wrappedSolMint
        stdToken0Account = splTokenResult.tokenAccount
        stdToken1Account = wrappedSolAccount
        console.log('Standard Token0 (SPL):', stdToken0Mint.toString())
        console.log('Standard Token1 (SOL):', stdToken1Mint.toString())
      } else {
        stdToken0Mint = wrappedSolMint
        stdToken1Mint = splTokenResult.mint
        stdToken0Account = wrappedSolAccount
        stdToken1Account = splTokenResult.tokenAccount
        console.log('Standard Token0 (SOL):', stdToken0Mint.toString())
        console.log('Standard Token1 (SPL):', stdToken1Mint.toString())
      }

      // Khởi tạo pool với token thông thường - giảm số lượng token sử dụng
      const standardPoolInfo = await initializeStandardPool(
        program,
        ammConfigAddress,
        stdToken0Mint,
        stdToken1Mint,
        stdToken0Account,
        stdToken1Account,
        new BN(100_000_000), // Giảm xuống 0.1 token thay vì 0.5
        new BN(100_000_000), // Giảm xuống 0.1 token thay vì 0.5
        wallet
      )

      console.log('=== HOÀN TẤT TẠO POOL VỚI SOL VÀ SPL TOKEN THÔNG THƯỜNG ===')
      console.log('Standard Pool Address:', standardPoolInfo.poolAddress.toString())
      console.log('Standard LP Mint Address:', standardPoolInfo.lpMintAddress.toString())

      // Đợi một chút trước khi thực hiện swap
      console.log('Đợi 5 giây trước khi thực hiện swap token thông thường...')
      await delay(5000)

      // Thực hiện swap từ token0 sang token1
      console.log('\n=== BẮT ĐẦU TEST SWAP TOKEN THÔNG THƯỜNG TOKEN0 -> TOKEN1 ===')
      await swapStandardTokens(
        program,
        standardPoolInfo.poolAddress,
        stdToken0Mint,
        stdToken1Mint,
        stdToken0Account,
        stdToken1Account,
        new BN(50_000_000), // Swap 0.05 token0
        new BN(20_000_000), // Chấp nhận nhận lại ít nhất 0.02 token1
        wallet,
        connection,
        payer
      )

      // Thực hiện swap ngược lại từ token1 sang token0
      console.log('\n=== BẮT ĐẦU TEST REVERSE SWAP TOKEN THÔNG THƯỜNG TOKEN1 -> TOKEN0 ===')
      await swapStandardTokens(
        program,
        standardPoolInfo.poolAddress,
        stdToken1Mint,
        stdToken0Mint,
        stdToken1Account,
        stdToken0Account,
        new BN(20_000_000), // Swap 0.02 token1 (giả định nhận được từ swap trước)
        new BN(10_000_000), // Chấp nhận nhận lại ít nhất 0.01 token0
        wallet,
        connection,
        payer
      )

      console.log('\n=== HOÀN TẤT TEST SWAP VỚI TOKEN THÔNG THƯỜNG ===')

      // TEST 3: Tạo pool với 2 token-2022 không có transfer hook
      console.log('\n\n=== TEST 3: TẠO POOL VỚI 2 TOKEN-2022 KHÔNG CÓ TRANSFER HOOK ===')

      // Tạo 2 token-2022 không có transfer hook
      const regularToken2022A = await createRegularToken2022(connection, payer)
      const regularToken2022B = await createRegularToken2022(connection, payer)

      console.log('Token-2022 A (không có transfer hook):', regularToken2022A.mint.toString())
      console.log('Token-2022 B (không có transfer hook):', regularToken2022B.mint.toString())

      // Sắp xếp token để đảm bảo token0 < token1
      let reg0Mint, reg1Mint, reg0Account, reg1Account

      if (regularToken2022A.mint.toBuffer().compare(regularToken2022B.mint.toBuffer()) < 0) {
        reg0Mint = regularToken2022A.mint
        reg1Mint = regularToken2022B.mint
        reg0Account = regularToken2022A.tokenAccount
        reg1Account = regularToken2022B.tokenAccount
      } else {
        reg0Mint = regularToken2022B.mint
        reg1Mint = regularToken2022A.mint
        reg0Account = regularToken2022B.tokenAccount
        reg1Account = regularToken2022A.tokenAccount
      }

      console.log('Token-2022 (0):', reg0Mint.toString())
      console.log('Token-2022 (1):', reg1Mint.toString())

      // Khởi tạo pool với 2 token-2022 không có transfer hook
      try {
        const regularToken2022PoolInfo = await initializePool(
          program,
          ammConfigAddress,
          reg0Mint,
          reg1Mint,
          reg0Account,
          reg1Account,
          new BN(5_000_000_000), // 5 token0
          new BN(5_000_000_000), // 5 token1
          wallet
        )

        console.log('=== HOÀN TẤT TẠO POOL VỚI 2 TOKEN-2022 KHÔNG CÓ TRANSFER HOOK ===')
        console.log('Pool Address:', regularToken2022PoolInfo.poolAddress.toString())
        console.log('LP Mint Address:', regularToken2022PoolInfo.lpMintAddress.toString())

        // Swap giữa 2 token-2022 không có transfer hook
        await delay(5000)
        console.log('\n=== BẮT ĐẦU TEST SWAP GIỮA 2 TOKEN-2022 KHÔNG CÓ TRANSFER HOOK ===')
        await swapTokens(
          program,
          regularToken2022PoolInfo.poolAddress,
          reg0Mint,
          reg1Mint,
          reg0Account,
          reg1Account,
          new BN(500_000_000), // Swap 0.5 token0
          new BN(450_000_000), // Minimum nhận lại 0.45 token1
          wallet,
          connection,
          payer
        )

        // Thực hiện swap ngược chiều
        console.log('\n=== BẮT ĐẦU TEST REVERSE SWAP GIỮA 2 TOKEN-2022 KHÔNG CÓ TRANSFER HOOK ===')
        await swapTokens(
          program,
          regularToken2022PoolInfo.poolAddress,
          reg1Mint,
          reg0Mint,
          reg1Account,
          reg0Account,
          new BN(450_000_000), // Swap 0.45 token1 (nhận được từ swap trước)
          new BN(400_000_000), // Minimum nhận lại 0.4 token0
          wallet,
          connection,
          payer
        )

        console.log('\n=== HOÀN TẤT TEST SWAP GIỮA 2 TOKEN-2022 KHÔNG CÓ TRANSFER HOOK ===')
      } catch (error) {
        console.error('Lỗi khi tạo pool với 2 token-2022 không có transfer hook:', error)
      }

      // TEST 4: Tạo pool với 1 SPL token và 1 token-2022 có transfer hook
      console.log('\n\n=== TEST 4: TẠO POOL VỚI 1 SPL TOKEN VÀ 1 TOKEN-2022 CÓ TRANSFER HOOK ===')

      // Đã có sẵn splTokenResult từ TEST 2 và token1Result (có transfer hook) từ TEST 1

      // Sắp xếp token để đảm bảo token0 < token1
      let mixToken0Mint, mixToken1Mint, mixToken0Account, mixToken1Account
      let mixHookTokenMint

      if (splTokenResult.mint.toBuffer().compare(token1Result.mint.toBuffer()) < 0) {
        mixToken0Mint = splTokenResult.mint
        mixToken1Mint = token1Result.mint
        mixToken0Account = splTokenResult.tokenAccount
        mixToken1Account = token1Result.tokenAccount
        mixHookTokenMint = token1Result.mint
        console.log('Mixed Token0 (SPL):', mixToken0Mint.toString())
        console.log('Mixed Token1 (có transfer hook):', mixToken1Mint.toString())
      } else {
        mixToken0Mint = token1Result.mint
        mixToken1Mint = splTokenResult.mint
        mixToken0Account = token1Result.tokenAccount
        mixToken1Account = splTokenResult.tokenAccount
        mixHookTokenMint = token1Result.mint
        console.log('Mixed Token0 (có transfer hook):', mixToken0Mint.toString())
        console.log('Mixed Token1 (SPL):', mixToken1Mint.toString())
      }

      try {
        // Đảm bảo wallet đã được thêm vào whitelist của token có transfer hook
        await initializeWhitelistAndAddAddress(
          connection,
          payer,
          mixHookTokenMint,
          wallet.publicKey
        )

        // Khởi tạo pool với 1 SPL token và 1 token-2022 có transfer hook
        const mixedPoolInfo = await initializePool(
          program,
          ammConfigAddress,
          mixToken0Mint,
          mixToken1Mint,
          mixToken0Account,
          mixToken1Account,
          new BN(5_000_000_000), // 5 token0
          new BN(5_000_000_000), // 5 token1
          wallet
        )

        console.log('=== HOÀN TẤT TẠO POOL VỚI 1 SPL TOKEN VÀ 1 TOKEN-2022 CÓ TRANSFER HOOK ===')
        console.log('Pool Address:', mixedPoolInfo.poolAddress.toString())
        console.log('LP Mint Address:', mixedPoolInfo.lpMintAddress.toString())

        // Swap giữa SPL token và token-2022 có transfer hook
        await delay(5000)
        console.log('\n=== BẮT ĐẦU TEST SWAP GIỮA SPL TOKEN VÀ TOKEN-2022 CÓ TRANSFER HOOK ===')
        await swapTokens(
          program,
          mixedPoolInfo.poolAddress,
          mixToken0Mint,
          mixToken1Mint,
          mixToken0Account,
          mixToken1Account,
          new BN(500_000_000), // Swap 0.5 token0
          new BN(450_000_000), // Minimum nhận lại 0.45 token1
          wallet,
          connection,
          payer,
          mixHookTokenMint
        )

        // Thực hiện swap ngược chiều
        console.log(
          '\n=== BẮT ĐẦU TEST REVERSE SWAP GIỮA TOKEN-2022 CÓ TRANSFER HOOK VÀ SPL TOKEN ==='
        )
        await swapTokens(
          program,
          mixedPoolInfo.poolAddress,
          mixToken1Mint,
          mixToken0Mint,
          mixToken1Account,
          mixToken0Account,
          new BN(450_000_000), // Swap 0.45 token1 (nhận được từ swap trước)
          new BN(400_000_000), // Minimum nhận lại 0.4 token0
          wallet,
          connection,
          payer,
          mixHookTokenMint
        )

        console.log('\n=== HOÀN TẤT TEST SWAP GIỮA SPL TOKEN VÀ TOKEN-2022 CÓ TRANSFER HOOK ===')
      } catch (error) {
        console.error('Lỗi khi tạo pool với SPL token và token-2022 có transfer hook:', error)
      }

      // TEST 5: Tạo pool giữa Token-2022 có Transfer Hook và Wrapped SOL
      console.log('\n\n=== TEST 5: TẠO POOL GIỮA TOKEN-2022 CÓ TRANSFER HOOK VÀ WRAPPED SOL ===')

      // Tạo token-2022 với transfer hook
      const hook5TokenResult = await createToken2022WithTransferHook(connection, payer)
      console.log('Token-2022 có transfer hook:', hook5TokenResult.mint.toString())

      // Tạo Wrapped SOL account với 2 SOL
      const hook5WrappedSolAccount = await createWrappedSolAccount(connection, payer, 2)
      console.log('Wrapped SOL account:', hook5WrappedSolAccount.toString())

      // Wrapped SOL mint address
      const hook5WrappedSolMint = new PublicKey('So11111111111111111111111111111111111111112')

      // Đợi để đảm bảo token balance đã được cập nhật
      console.log('Đợi 5 giây để đảm bảo số dư được cập nhật...')
      await delay(5000)

      // Sắp xếp token để đảm bảo token0 < token1
      let hook5Token0Mint, hook5Token1Mint, hook5Token0Account, hook5Token1Account
      let hook5TokenMint

      if (hook5TokenResult.mint.toBuffer().compare(hook5WrappedSolMint.toBuffer()) < 0) {
        hook5Token0Mint = hook5TokenResult.mint
        hook5Token1Mint = hook5WrappedSolMint
        hook5Token0Account = hook5TokenResult.tokenAccount
        hook5Token1Account = hook5WrappedSolAccount
        hook5TokenMint = hook5TokenResult.mint
        console.log('Token0 (có transfer hook):', hook5Token0Mint.toString())
        console.log('Token1 (Wrapped SOL):', hook5Token1Mint.toString())
      } else {
        hook5Token0Mint = hook5WrappedSolMint
        hook5Token1Mint = hook5TokenResult.mint
        hook5Token0Account = hook5WrappedSolAccount
        hook5Token1Account = hook5TokenResult.tokenAccount
        hook5TokenMint = hook5TokenResult.mint
        console.log('Token0 (Wrapped SOL):', hook5Token0Mint.toString())
        console.log('Token1 (có transfer hook):', hook5Token1Mint.toString())
      }

      try {
        // Thêm wallet vào whitelist của token có transfer hook
        await initializeWhitelistAndAddAddress(connection, payer, hook5TokenMint, wallet.publicKey)

        // Kiểm tra whitelist trước khi tạo pool
        console.log('\n=== Whitelist trước khi khởi tạo pool ===')
        await logWhitelistAddresses(connection, hook5TokenMint)

        // Khởi tạo pool với token-2022 có transfer hook và Wrapped SOL
        const hookSolPoolInfo = await initializePool(
          program,
          ammConfigAddress,
          hook5Token0Mint,
          hook5Token1Mint,
          hook5Token0Account,
          hook5Token1Account,
          new BN(3_000_000_000), // 3 token0
          new BN(3_000_000_000), // 3 token1
          wallet
        )

        console.log('=== HOÀN TẤT TẠO POOL GIỮA TOKEN-2022 CÓ TRANSFER HOOK VÀ WRAPPED SOL ===')
        console.log('Pool Address:', hookSolPoolInfo.poolAddress.toString())
        console.log('LP Mint Address:', hookSolPoolInfo.lpMintAddress.toString())

        // Kiểm tra whitelist sau khi tạo pool
        console.log('\n=== Whitelist sau khi khởi tạo pool ===')
        await logWhitelistAddresses(connection, hook5TokenMint)

        // Đợi một chút trước khi thực hiện swap
        console.log('Đợi 5 giây trước khi thực hiện swap...')
        await delay(5000)

        // Swap từ token-2022 có transfer hook sang Wrapped SOL
        console.log('\n=== BẮT ĐẦU TEST SWAP TỪ TOKEN-2022 CÓ TRANSFER HOOK SANG WRAPPED SOL ===')
        
        // Xác định chiều swap dựa trên token nào là token0
        if (hook5Token0Mint.equals(hook5TokenMint)) {
          await swapTokens(
            program,
            hookSolPoolInfo.poolAddress,
            hook5Token0Mint,
            hook5Token1Mint,
            hook5Token0Account,
            hook5Token1Account,
            new BN(500_000_000), // Swap 0.5 token-2022
            new BN(450_000_000), // Minimum nhận lại 0.45 WSOL
            wallet,
            connection,
            payer,
            hook5TokenMint
          )
        } else {
          await swapTokens(
            program,
            hookSolPoolInfo.poolAddress,
            hook5Token1Mint,
            hook5Token0Mint,
            hook5Token1Account,
            hook5Token0Account,
            new BN(500_000_000), // Swap 0.5 token-2022
            new BN(450_000_000), // Minimum nhận lại 0.45 WSOL
            wallet,
            connection,
            payer,
            hook5TokenMint
          )
        }

        // Swap ngược từ Wrapped SOL sang token-2022 có transfer hook
        console.log('\n=== BẮT ĐẦU TEST SWAP TỪ WRAPPED SOL SANG TOKEN-2022 CÓ TRANSFER HOOK ===')
        
        // Xác định chiều swap dựa trên token nào là token0
        if (hook5Token0Mint.equals(hook5WrappedSolMint)) {
          await swapTokens(
            program,
            hookSolPoolInfo.poolAddress,
            hook5Token0Mint,
            hook5Token1Mint,
            hook5Token0Account,
            hook5Token1Account,
            new BN(450_000_000), // Swap 0.45 WSOL
            new BN(400_000_000), // Minimum nhận lại 0.4 token-2022
            wallet,
            connection,
            payer,
            hook5TokenMint
          )
        } else {
          await swapTokens(
            program,
            hookSolPoolInfo.poolAddress,
            hook5Token1Mint,
            hook5Token0Mint,
            hook5Token1Account,
            hook5Token0Account,
            new BN(450_000_000), // Swap 0.45 WSOL
            new BN(400_000_000), // Minimum nhận lại 0.4 token-2022
            wallet,
            connection,
            payer,
            hook5TokenMint
          )
        }

        console.log('\n=== HOÀN TẤT TEST SWAP GIỮA TOKEN-2022 CÓ TRANSFER HOOK VÀ WRAPPED SOL ===')
      } catch (error) {
        console.error('Lỗi khi tạo pool giữa Token-2022 có transfer hook và Wrapped SOL:', error)
        if (error && typeof error === 'object' && 'logs' in error) {
          console.log('Lỗi chi tiết:', (error as ErrorWithLogs).logs)
        }
      }
    } catch (error) {
      console.error('Lỗi khi thực hiện test:', error)
    }
  } catch (error: unknown) {
    console.error('Lỗi:', error)
  }
}

// Chạy main nếu được gọi trực tiếp
if (require.main === module) {
  main()
}
