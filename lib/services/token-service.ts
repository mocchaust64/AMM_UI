import { TokenBuilder, TransferFeeToken } from 'solana-token-extension-boost'
import {
  Transaction,
  SystemProgram,
  PublicKey,
  Connection,
  TransactionInstruction,
  Commitment,
  ConnectionConfig,
} from '@solana/web3.js'
import { WalletContextState } from '@solana/wallet-adapter-react'
import { toast } from 'sonner'
import { pinJSONToIPFS, pinImageFromBase64, ipfsToHTTP } from '@/lib/utils/pinata'

export interface TokenData {
  name: string
  symbol: string
  decimals: string | number
  supply: string | number
  description?: string
  imageBase64?: string | null
  imageUrl?: string | null
  extensionOptions?: Record<string, any>
  websiteUrl?: string
  twitterUrl?: string
  telegramUrl?: string
  discordUrl?: string
}

export interface TokenCreationResult {
  mint: string
  signature: string
  metadataUri?: string
}

/**
 * Create token with metadata and extensions - All in one transaction
 * @param connection Solana connection
 * @param wallet Wallet context
 * @param tokenData Token data
 * @param selectedExtensions Selected extensions
 * @returns Token creation result
 */
export async function createToken(
  connection: Connection,
  wallet: WalletContextState,
  tokenData: TokenData,
  selectedExtensions: string[]
): Promise<TokenCreationResult> {
  if (!wallet.publicKey) {
    throw new Error('Ví chưa được kết nối')
  }

  // Biến để lưu thông tin transfer hook
  let transferHookProgramId: PublicKey | null = null
  let isWhitelistHook = false

  // BƯỚC 1: Xử lý thông tin ảnh và metadata
  let imageUri = ''
  let imageHttpUrl = ''

  // Xử lý tải ảnh lên IPFS trước khi tạo metadata
  if (tokenData.imageBase64) {
    try {
      // Chuẩn bị data base64
      let base64Data = tokenData.imageBase64
      if (!base64Data.startsWith('data:image')) {
        base64Data = `data:image/png;base64,${base64Data}`
      }

      // Tải ảnh lên IPFS và nhận URI
      imageUri = await pinImageFromBase64(base64Data)

      // Chuyển đổi thành URL HTTP
      imageHttpUrl = ipfsToHTTP(imageUri)
    } catch (error) {
      console.error('Lỗi khi tải ảnh lên IPFS:', error)
    }
  } else if (tokenData.imageUrl) {
    imageHttpUrl = tokenData.imageUrl
    // Đảm bảo URL đã là HTTP
    if (!imageHttpUrl.startsWith('http')) {
      if (imageHttpUrl.startsWith('ipfs://')) {
        imageHttpUrl = ipfsToHTTP(imageHttpUrl)
      } else {
        imageHttpUrl = `https://gateway.pinata.cloud/ipfs/${imageHttpUrl}`
      }
    }
  }

  // BƯỚC 2: Tạo metadata với URL hình ảnh đã tải lên
  const metadataBase: Record<string, any> = {
    name: tokenData.name,
    symbol: tokenData.symbol,
    description: tokenData.description || '',
    seller_fee_basis_points: 0,
    attributes: [
      { trait_type: 'Decimals', value: tokenData.decimals },
      { trait_type: 'Supply', value: tokenData.supply },
    ],
  }

  // Thêm các trường bổ sung
  if (tokenData.websiteUrl && tokenData.websiteUrl.trim() !== '') {
    metadataBase.external_url = tokenData.websiteUrl
  }

  // Thêm properties với creators
  metadataBase.properties = {
    category: 'image',
    creators: [
      {
        address: wallet.publicKey.toString(),
        share: 100,
      },
    ],
  }

  // Thêm collection
  metadataBase.collection = {
    name: tokenData.name,
    family: 'Token-2022',
  }

  // Chỉ thêm image vào metadata khi có URL hợp lệ
  if (imageHttpUrl && imageHttpUrl.trim() !== '') {
    metadataBase.image = imageHttpUrl
  }

  // BƯỚC 3: Tải metadata lên IPFS
  let metadataUri = ''
  try {
    // Tải metadata lên IPFS
    const ipfsUri = await pinJSONToIPFS(metadataBase)

    // Chuyển URI thành URL HTTP
    metadataUri = ipfsToHTTP(ipfsUri)

    // Log để kiểm tra nội dung metadata
  } catch (error) {
    console.error('Lỗi khi tải metadata lên IPFS:', error)
    // Fallback URL
    metadataUri = `https://arweave.net/${tokenData.name.toLowerCase()}-${tokenData.symbol.toLowerCase()}`
  }

  // BƯỚC 4: Tạo kết nối đã cấu hình
  const connectionConfig: ConnectionConfig = {
    commitment: 'confirmed' as Commitment,
    confirmTransactionInitialTimeout: 60000,
  }

  const enhancedConnection = new Connection(connection.rpcEndpoint, connectionConfig)

  // BƯỚC 5: Tạo metadata đơn giản (onchain)
  const additionalMetadata: Record<string, string> = {}

  if (tokenData.description) additionalMetadata['description'] = tokenData.description
  if (tokenData.websiteUrl) additionalMetadata['website'] = tokenData.websiteUrl
  if (tokenData.twitterUrl) additionalMetadata['twitter'] = tokenData.twitterUrl
  if (tokenData.telegramUrl) additionalMetadata['telegram'] = tokenData.telegramUrl
  if (tokenData.discordUrl) additionalMetadata['discord'] = tokenData.discordUrl

  // BƯỚC 6: Tính toán số lượng token để mint
  const decimals =
    typeof tokenData.decimals === 'string' ? parseInt(tokenData.decimals) : tokenData.decimals

  const supplyAmount =
    typeof tokenData.supply === 'string' ? parseFloat(tokenData.supply) : tokenData.supply

  // Tính toán số lượng token với decimals
  const mintAmount = BigInt(Math.floor(supplyAmount * Math.pow(10, decimals)))

  // BƯỚC 7: Sử dụng TokenBuilder để tạo token
  const tokenBuilder = new TokenBuilder(enhancedConnection).setTokenInfo(decimals, wallet.publicKey)

  // BƯỚC 8: Thêm các extensions theo cấu hình
  for (const extensionId of selectedExtensions) {
    // Thêm metadata
    if (extensionId === 'metadata' || extensionId === 'metadata-pointer') {
      tokenBuilder.addTokenMetadata(
        tokenData.name,
        tokenData.symbol,
        metadataUri,
        additionalMetadata
      )
    }

    // Thêm transfer hook nếu được chọn
    else if (extensionId === 'transfer-hook' && tokenData.extensionOptions?.['transfer-hook']) {
      // Lấy địa chỉ chương trình transfer hook từ input
      transferHookProgramId = new PublicKey(
        tokenData.extensionOptions['transfer-hook']['program-id'] ||
          '12BZr6af3s7qf7GGmhBvMd46DWmVNhHfXmCwftfMk1mZ'
      )

      // Thêm extension TransferHook
      tokenBuilder.addTransferHook(transferHookProgramId)

      // Kiểm tra xem đây có phải hook whitelist không
      isWhitelistHook =
        transferHookProgramId.toString() === '12BZr6af3s7qf7GGmhBvMd46DWmVNhHfXmCwftfMk1mZ'
    }
  }

  // BƯỚC 9: Tạo token instruction và signers
  const {
    instructions: createInstructions,
    signers,
    mint,
  } = await tokenBuilder.createTokenInstructions(wallet.publicKey)

  // BƯỚC 11: Tạo transaction
  toast.loading('Đang chuẩn bị tạo token...', { id: 'creating-token' })

  try {
    // Tạo transaction đầu tiên để tạo token
    const createTransaction = new Transaction()
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
    createTransaction.recentBlockhash = blockhash
    createTransaction.feePayer = wallet.publicKey

    // Thêm các instructions để tạo token
    createInstructions.forEach(ix => createTransaction.add(ix))

    // Thêm các signers (nếu có)
    if (signers.length > 0) {
      createTransaction.partialSign(...signers)
    }

    // Gửi transaction đầu tiên để tạo token
    const createSignature = await wallet.sendTransaction(createTransaction, connection, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    })

    // Chờ xác nhận giao dịch
    await connection.confirmTransaction(
      {
        blockhash,
        lastValidBlockHeight,
        signature: createSignature,
      },
      'confirmed'
    )

    toast.loading('Token created, minting initial amount...', { id: 'creating-token' })

    // Đợi blockchain cập nhật
    await new Promise(resolve => setTimeout(resolve, 2000))

    // BƯỚC 12: Tạo token instance để mint
    const token = new TransferFeeToken(connection, mint, {
      feeBasisPoints: 0,
      maxFee: BigInt(0),
      transferFeeConfigAuthority: wallet.publicKey,
      withdrawWithheldAuthority: wallet.publicKey,
    })

    // BƯỚC 13: Chuẩn bị transaction thứ hai
    const combinedTransaction = new Transaction()
    const mintBlockhashInfo = await connection.getLatestBlockhash('confirmed')
    combinedTransaction.recentBlockhash = mintBlockhashInfo.blockhash
    combinedTransaction.feePayer = wallet.publicKey

    // Lấy instructions để mint token
    const { instructions: mintInstructions } = await token.createAccountAndMintToInstructions(
      wallet.publicKey, // owner
      wallet.publicKey, // payer
      mintAmount, // amount
      wallet.publicKey // mintAuthority
    )

    // Thêm mint instructions
    mintInstructions.forEach(ix => combinedTransaction.add(ix))

    // Thêm instructions whitelist nếu cần
    if (isWhitelistHook && transferHookProgramId) {
      toast.loading('Đang chuẩn bị khởi tạo whitelist...', { id: 'creating-token' })

      // Tính PDA cho whitelist và ExtraAccountMetaList
      const [whitelistPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('white_list'), mint.toBuffer()],
        transferHookProgramId
      )

      const [extraAccountMetaListPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('extra-account-metas'), mint.toBuffer()],
        transferHookProgramId
      )

      // Tạo instruction để khởi tạo ExtraAccountMetaList
      const initializeDiscriminator = Buffer.from([43, 34, 13, 49, 167, 88, 235, 235])
      const initializeIx = new TransactionInstruction({
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // payer
          { pubkey: extraAccountMetaListPDA, isSigner: false, isWritable: true }, // extraAccountMetaList
          { pubkey: mint, isSigner: false, isWritable: false }, // mint
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // systemProgram
          { pubkey: whitelistPDA, isSigner: false, isWritable: true }, // whiteList
        ],
        programId: transferHookProgramId,
        data: initializeDiscriminator,
      })

      // Thêm instruction khởi tạo whitelist
      combinedTransaction.add(initializeIx)

      // Tạo instruction để thêm địa chỉ người tạo vào whitelist
      const addToWhitelistDiscriminator = Buffer.from([157, 211, 52, 54, 144, 81, 5, 55])
      const addToWhitelistIx = new TransactionInstruction({
        keys: [
          { pubkey: wallet.publicKey, isSigner: false, isWritable: false }, // newAccount
          { pubkey: mint, isSigner: false, isWritable: false }, // mint
          { pubkey: whitelistPDA, isSigner: false, isWritable: true }, // whiteList
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // signer
        ],
        programId: transferHookProgramId,
        data: addToWhitelistDiscriminator,
      })

      // Thêm instruction thêm địa chỉ vào whitelist
      combinedTransaction.add(addToWhitelistIx)
    }

    // BƯỚC 14: Gửi transaction thứ hai và chờ xác nhận
    toast.loading('Đang thực hiện mint token và khởi tạo whitelist...', { id: 'creating-token' })

    const combinedSignature = await wallet.sendTransaction(combinedTransaction, connection, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    })

    await connection.confirmTransaction(
      {
        blockhash: mintBlockhashInfo.blockhash,
        lastValidBlockHeight: mintBlockhashInfo.lastValidBlockHeight,
        signature: combinedSignature,
      },
      'confirmed'
    )

    toast.dismiss('creating-token')
    toast.success('Tạo token thành công!')

    // BƯỚC 15: Trả về kết quả
    return {
      mint: mint.toString(),
      signature: createSignature,
      metadataUri: metadataUri,
    }
  } catch (error: any) {
    toast.dismiss('creating-token')
    toast.error(`Lỗi khi tạo token: ${error.message || 'Không xác định'}`)

    console.error('Lỗi khi tạo token:', error)
    if (error.logs) {
      console.error('Error logs:', error.logs)
    }
    throw error
  }
}

/**
 * Khởi tạo whitelist cho Transfer Hook và thêm địa chỉ người dùng vào whitelist
 * @param connection Solana connection
 * @param wallet Wallet context
 * @param mint Địa chỉ mint của token
 * @param transferHookProgramId Program ID của Transfer Hook
 * @returns Chữ ký giao dịch hoặc mã lỗi
 */
export async function initializeTransferHookWhitelist(
  connection: Connection,
  wallet: WalletContextState,
  mint: PublicKey,
  transferHookProgramId: PublicKey
): Promise<string> {
  try {
    if (!wallet.publicKey) {
      throw new Error('Ví chưa được kết nối')
    }

    // Tính PDA cho whitelist và ExtraAccountMetaList
    const [whitelistPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('white_list'), mint.toBuffer()],
      transferHookProgramId
    )

    const [extraAccountMetaListPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('extra-account-metas'), mint.toBuffer()],
      transferHookProgramId
    )

    // Kiểm tra xem tài khoản whitelist đã tồn tại chưa
    let whitelistAccount
    try {
      whitelistAccount = await connection.getAccountInfo(whitelistPDA)
    } catch {
      whitelistAccount = null
    }

    // Nếu chưa tồn tại, tạo ExtraAccountMetaList và Whitelist
    if (!whitelistAccount) {
      try {
        // Tạo instruction để khởi tạo ExtraAccountMetaList
        const initializeDiscriminator = Buffer.from([43, 34, 13, 49, 167, 88, 235, 235])

        const initializeIx = new TransactionInstruction({
          keys: [
            { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // payer
            { pubkey: extraAccountMetaListPDA, isSigner: false, isWritable: true }, // extraAccountMetaList
            { pubkey: mint, isSigner: false, isWritable: false }, // mint
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // systemProgram
            { pubkey: whitelistPDA, isSigner: false, isWritable: true }, // whiteList
          ],
          programId: transferHookProgramId,
          data: initializeDiscriminator,
        })

        // Tạo và gửi transaction
        const initTx = new Transaction()
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
        initTx.recentBlockhash = blockhash
        initTx.feePayer = wallet.publicKey
        initTx.add(initializeIx)

        // Hiển thị thông báo
        toast.loading('Đang khởi tạo whitelist...', { id: 'init-whitelist' })

        // Gửi transaction để người dùng ký
        const signature = await wallet.sendTransaction(initTx, connection)

        // Đợi xác nhận
        await connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          'confirmed'
        )

        toast.dismiss('init-whitelist')
        toast.success('Khởi tạo whitelist thành công!')

        // Đợi một chút để đảm bảo blockchain đã cập nhật
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error: any) {
        console.error('Lỗi khi khởi tạo ExtraAccountMetaList:', error)
        toast.dismiss('init-whitelist')
        toast.error('Lỗi khi khởi tạo whitelist')
        if (error.message && error.message.includes('User rejected')) {
          return 'user-rejected'
        }
        // Nếu lỗi không phải do người dùng từ chối, tiếp tục thực hiện bước tiếp theo
      }
    }

    // Thêm địa chỉ người tạo vào whitelist
    try {
      const addToWhitelistDiscriminator = Buffer.from([157, 211, 52, 54, 144, 81, 5, 55])

      const addToWhitelistIx = new TransactionInstruction({
        keys: [
          { pubkey: wallet.publicKey, isSigner: false, isWritable: false }, // newAccount (địa chỉ cần thêm vào whitelist)
          { pubkey: mint, isSigner: false, isWritable: false }, // mint
          { pubkey: whitelistPDA, isSigner: false, isWritable: true }, // whiteList
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // signer
        ],
        programId: transferHookProgramId,
        data: addToWhitelistDiscriminator,
      })

      // Tạo và gửi transaction
      const addTx = new Transaction()
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      addTx.recentBlockhash = blockhash
      addTx.feePayer = wallet.publicKey
      addTx.add(addToWhitelistIx)

      toast.loading('Đang thêm địa chỉ vào whitelist...', { id: 'add-to-whitelist' })

      // Gửi transaction để người dùng ký
      const addSignature = await wallet.sendTransaction(addTx, connection)

      // Đợi xác nhận
      await connection.confirmTransaction(
        {
          signature: addSignature,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed'
      )

      toast.dismiss('add-to-whitelist')
      toast.success('Địa chỉ đã được thêm vào whitelist!')

      return addSignature
    } catch (error: any) {
      console.error('Lỗi khi thêm địa chỉ vào whitelist:', error)
      toast.dismiss('add-to-whitelist')
      toast.error('Lỗi khi thêm địa chỉ vào whitelist')
      if (error.message && error.message.includes('User rejected')) {
        return 'user-rejected'
      }
      return 'whitelist-initialization-skipped'
    }
  } catch (error) {
    console.error('Lỗi khi khởi tạo transfer hook whitelist:', error)
    toast.error('Lỗi khi khởi tạo transfer hook whitelist')
    return 'whitelist-initialization-failed'
  }
}

/**
 * Thêm một địa chỉ mới vào whitelist
 * @param connection Solana connection
 * @param wallet Wallet context
 * @param mint Địa chỉ mint của token
 * @param transferHookProgramId Program ID của Transfer Hook
 * @param addressToAdd Địa chỉ cần thêm vào whitelist
 * @returns Chữ ký giao dịch hoặc mã lỗi
 */
export async function addAddressToWhitelist(
  connection: Connection,
  wallet: WalletContextState,
  mint: PublicKey,
  transferHookProgramId: PublicKey,
  addressToAdd: PublicKey
): Promise<string> {
  try {
    if (!wallet.publicKey) {
      throw new Error('Ví chưa được kết nối')
    }

    // Tính PDA cho whitelist
    const [whitelistPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('white_list'), mint.toBuffer()],
      transferHookProgramId
    )

    // Kiểm tra xem tài khoản whitelist có tồn tại không
    const whitelistAccount = await connection.getAccountInfo(whitelistPDA)
    if (!whitelistAccount) {
      throw new Error('Whitelist chưa được khởi tạo cho token này')
    }

    // Thêm địa chỉ mới vào whitelist

    const addToWhitelistDiscriminator = Buffer.from([157, 211, 52, 54, 144, 81, 5, 55])

    const addToWhitelistIx = new TransactionInstruction({
      keys: [
        { pubkey: addressToAdd, isSigner: false, isWritable: false }, // newAccount (địa chỉ cần thêm vào whitelist)
        { pubkey: mint, isSigner: false, isWritable: false }, // mint
        { pubkey: whitelistPDA, isSigner: false, isWritable: true }, // whiteList
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // signer
      ],
      programId: transferHookProgramId,
      data: addToWhitelistDiscriminator,
    })

    // Tạo và gửi transaction
    const addTx = new Transaction()
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
    addTx.recentBlockhash = blockhash
    addTx.feePayer = wallet.publicKey
    addTx.add(addToWhitelistIx)

    toast.loading('Đang thêm địa chỉ vào whitelist...', { id: 'add-address-to-whitelist' })

    // Gửi transaction để người dùng ký
    const addSignature = await wallet.sendTransaction(addTx, connection)

    // Đợi xác nhận
    await connection.confirmTransaction(
      {
        signature: addSignature,
        blockhash,
        lastValidBlockHeight,
      },
      'confirmed'
    )

    toast.dismiss('add-address-to-whitelist')
    toast.success('Địa chỉ đã được thêm vào whitelist!')

    return addSignature
  } catch (error: any) {
    console.error('Lỗi khi thêm địa chỉ vào whitelist:', error)
    toast.dismiss('add-address-to-whitelist')
    toast.error(`Lỗi: ${error.message || 'Không thể thêm địa chỉ vào whitelist'}`)
    if (error.message && error.message.includes('User rejected')) {
      return 'user-rejected'
    }
    return 'add-to-whitelist-failed'
  }
}
