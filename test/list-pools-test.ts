// Convert imports from ESM to CommonJS
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'

// Define the program ID
const RAYDIUM_PROGRAM_ID = 'WFHgqbEBAESXYu9EWcnpDcLoG9L5kDyQJjCG3a5AGqL'

// Get AMM Config details
async function getAmmConfigDetails(program: Program<any>, ammConfigAddress: PublicKey) {
  try {
    console.log(`\n=== Chi tiết AMM Config: ${ammConfigAddress.toString()} ===`)

    const ammConfig = await (program.account as any).ammConfig.fetch(ammConfigAddress)

    console.log(`- Index: ${ammConfig.index}`)
    console.log(`- Trade fee rate: ${ammConfig.tradeFeeRate.toString()}`)
    console.log(`- Protocol fee rate: ${ammConfig.protocolFeeRate.toString()}`)
    console.log(`- Fund fee rate: ${ammConfig.fundFeeRate.toString()}`)
    console.log(`- Create pool fee: ${ammConfig.createPoolFee.toString()}`)
    console.log(`- Protocol owner: ${ammConfig.protocolOwner.toString()}`)
    console.log(`- Fund owner: ${ammConfig.fundOwner.toString()}`)

    return ammConfig
  } catch (error) {
    console.error(`Lỗi khi lấy thông tin AMM Config: ${error}`)
    return null
  }
}

// Get pools created by a specific wallet address
async function getPoolsByCreator(program: Program<any>, creatorAddress: PublicKey) {
  try {
    console.log(`\n=== Tìm kiếm pools được tạo bởi ${creatorAddress.toString()} ===`)

    const poolAccounts = await (program.account as any).poolState.all()
    const creatorPools = poolAccounts.filter(
      (pool: any) => pool.account.poolCreator.toString() === creatorAddress.toString()
    )

    console.log(`Tìm thấy ${creatorPools.length} pools từ địa chỉ này`)

    for (const pool of creatorPools) {
      console.log(`\nPool: ${pool.publicKey.toString()}`)
      console.log(`- AMM Config: ${pool.account.ammConfig.toString()}`)
      console.log(`- Token 0: ${pool.account.token0Mint.toString()}`)
      console.log(`- Token 1: ${pool.account.token1Mint.toString()}`)

      // Fetch token vault balances
      const connection = program.provider.connection
      try {
        const token0VaultInfo = await connection.getTokenAccountBalance(pool.account.token0Vault)
        console.log(
          `- Token 0 Balance: ${token0VaultInfo.value.uiAmount} (${token0VaultInfo.value.decimals} decimals)`
        )
      } catch (err) {
        console.log(`- Không thể lấy thông tin Token 0 vault`)
      }

      try {
        const token1VaultInfo = await connection.getTokenAccountBalance(pool.account.token1Vault)
        console.log(
          `- Token 1 Balance: ${token1VaultInfo.value.uiAmount} (${token1VaultInfo.value.decimals} decimals)`
        )
      } catch (err) {
        console.log(`- Không thể lấy thông tin Token 1 vault`)
      }
    }

    return creatorPools
  } catch (error) {
    console.error(`Lỗi khi tìm pools theo người tạo: ${error}`)
    return []
  }
}

// Tìm chính xác pool từ cặp token và AMM Config
async function findExactPool(
  program: Program<any>,
  token0Mint: PublicKey,
  token1Mint: PublicKey,
  ammConfigAddress: PublicKey
) {
  try {
    console.log(`\n=== Tìm pool chính xác từ cặp token và AMM Config: ===`)
    console.log(`Token A: ${token0Mint.toString()}`)
    console.log(`Token B: ${token1Mint.toString()}`)
    console.log(`AMM Config: ${ammConfigAddress.toString()}`)

    // Lấy tất cả pool từ chương trình
    const allPools = await (program.account as any).poolState.all()
    console.log(`Tổng số pool trong chương trình: ${allPools.length}`)

    // Lọc các pool khớp với cả token và AMM Config
    const matchingPools = allPools.filter((pool: any) => {
      const poolToken0 = pool.account.token0Mint.toString()
      const poolToken1 = pool.account.token1Mint.toString()
      const poolConfig = pool.account.ammConfig.toString()

      return (
        poolConfig === ammConfigAddress.toString() &&
        ((poolToken0 === token0Mint.toString() && poolToken1 === token1Mint.toString()) ||
          (poolToken0 === token1Mint.toString() && poolToken1 === token0Mint.toString()))
      )
    })

    console.log(`Tìm thấy ${matchingPools.length} pool phù hợp`)

    for (const pool of matchingPools) {
      console.log(`\n=== Thông tin pool: ${pool.publicKey.toString()} ===`)
      console.log(`- AMM Config: ${pool.account.ammConfig.toString()}`)
      console.log(`- Token 0: ${pool.account.token0Mint.toString()}`)
      console.log(`- Token 1: ${pool.account.token1Mint.toString()}`)

      // Lấy thông tin AMM Config
      const ammConfig = await getAmmConfigDetails(program, pool.account.ammConfig)

      // Lấy thông tin thanh khoản
      try {
        const token0VaultInfo = await program.provider.connection.getTokenAccountBalance(
          pool.account.token0Vault
        )
        console.log(
          `- Token 0 Balance: ${token0VaultInfo.value.uiAmount} (${token0VaultInfo.value.decimals} decimals)`
        )
      } catch (err) {
        console.log(`- Không thể lấy thông tin Token 0 vault`)
      }

      try {
        const token1VaultInfo = await program.provider.connection.getTokenAccountBalance(
          pool.account.token1Vault
        )
        console.log(
          `- Token 1 Balance: ${token1VaultInfo.value.uiAmount} (${token1VaultInfo.value.decimals} decimals)`
        )
      } catch (err) {
        console.log(`- Không thể lấy thông tin Token 1 vault`)
      }
    }

    return matchingPools.length > 0 ? matchingPools : null
  } catch (error) {
    console.error(`Lỗi khi tìm pool chính xác: ${error}`)
    return null
  }
}

async function main() {
  try {
    // Read keypair from ~/.config/solana/id.json
    const keypairPath = path.join(os.homedir(), '.config', 'solana', 'id.json')
    const secretKeyString = fs.readFileSync(keypairPath, { encoding: 'utf8' })
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString))
    const payer = Keypair.fromSecretKey(secretKey)

    console.log('Using wallet:', payer.publicKey.toString())

    // Connect to devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed')

    // Initialize provider
    const wallet = new anchor.Wallet(payer)
    const provider = new anchor.AnchorProvider(
      connection,
      wallet,
      anchor.AnchorProvider.defaultOptions()
    )
    anchor.setProvider(provider)

    // Read IDL from file
    const idlPath = path.join(__dirname, '../idl/raydium_cp_swap.json')
    const idlFile = fs.readFileSync(idlPath, 'utf8')
    const idl = JSON.parse(idlFile)

    // Initialize Program
    const programId = new PublicKey(RAYDIUM_PROGRAM_ID)
    idl.metadata.address = programId
    const program = new anchor.Program(idl, provider)

    // Check AMM Config details
    const ammConfigAddress = new PublicKey('5nWyCWXhJEaHmj8zJ1graq64dgfyX4oY7r7NZ3xxfozN')
    await getAmmConfigDetails(program, ammConfigAddress)

    // Định nghĩa cặp token cần tìm
    const token0Mint = new PublicKey('2UXrwB9X9FucFp5TnK9XRBSSbwev2RZ6Mh3YqUFMpLam')
    const token1Mint = new PublicKey('FRDW9EiY2hLpYQtWpBeDKfRzqQTjKousuiPp8sXeWayc')

    // Tìm chính xác pool từ cặp token và AMM Config
    await findExactPool(program, token0Mint, token1Mint, ammConfigAddress)

    // Các phương thức tìm kiếm khác - bỏ comment nếu cần
    // const creatorAddress = new PublicKey('FNXvxnF38je4vCXa1sg4th8jSYfKJ9bkhT3YudtRLR63');
    // const creatorPools = await getPoolsByCreator(program, creatorAddress);
    // const poolInfo = await findPoolByTokens(program, token0Mint, token1Mint);
  } catch (error) {
    console.error('Error:', error)
  }
}

// Run the main function
if (require.main === module) {
  main().then(
    () => process.exit(),
    err => {
      console.error(err)
      process.exit(-1)
    }
  )
}
