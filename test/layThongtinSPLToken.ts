import { Connection, PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, getMint } from '@solana/spl-token'
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js'
import { Metadata } from '@metaplex-foundation/mpl-token-metadata'

// Kết nối đến Solana devnet
const connection = new Connection('https://api.devnet.solana.com', 'confirmed')

// Khởi tạo Metaplex instance
const metaplex = Metaplex.make(connection)

// Hàm lấy thông tin chi tiết của SPL token với metadata chính xác
async function getTokenInfo(tokenAddress: string) {
  try {
    const mintPublicKey = new PublicKey(tokenAddress)

    // Lấy thông tin mint
    const mintInfo = await getMint(connection, mintPublicKey)

    // Lấy metadata sử dụng Metaplex
    let tokenMetadata = null
    let metadataJson = null

    try {
      // Lấy metadata account
      const metadataAddress = await getMetadataAddress(mintPublicKey)
      const metadataAccount = await connection.getAccountInfo(metadataAddress)

      if (metadataAccount) {
        // Sử dụng Metaplex để lấy metadata thay vì deserialize trực tiếp
        const nft = await metaplex.nfts().findByMint({ mintAddress: mintPublicKey })

        tokenMetadata = {
          key: nft.address.toString(),
          updateAuthority: nft.updateAuthorityAddress.toString(),
          mint: nft.mint.address.toString(),
          data: {
            name: nft.name,
            symbol: nft.symbol,
            uri: nft.uri,
            sellerFeeBasisPoints: nft.sellerFeeBasisPoints,
            creators:
              nft.creators?.map(
                (creator: {
                  address: { toString: () => string }
                  verified: boolean
                  share: number
                }) => ({
                  address: creator.address.toString(),
                  verified: creator.verified ? 1 : 0,
                  share: creator.share,
                })
              ) || [],
          },
          primarySaleHappened: nft.primarySaleHappened ? 1 : 0,
          isMutable: nft.isMutable ? 1 : 0,
          editionNonce: null,
          tokenStandard: null,
          collection: nft.collection
            ? {
                verified: nft.collection.verified ? 1 : 0,
                key: nft.collection.address.toString(),
              }
            : null,
          uses: nft.uses
            ? {
                useMethod: nft.uses.useMethod,
                remaining: nft.uses.remaining,
                total: nft.uses.total,
              }
            : null,
        }

        // Lấy thông tin JSON từ URI nếu có
        if (tokenMetadata.data.uri) {
          try {
            const response = await fetch(tokenMetadata.data.uri)
            if (response.ok) {
              metadataJson = await response.json()
            }
          } catch (error) {
            console.log('Không thể lấy JSON metadata từ URI:', error)
          }
        }
      }
    } catch (error) {
      console.log('Lỗi khi lấy metadata:', error)
    }

    // Tổng hợp thông tin
    const tokenInfo = {
      // Thông tin cơ bản từ mint
      address: tokenAddress,
      decimals: mintInfo.decimals,
      supply: mintInfo.supply.toString(),
      mintAuthority: mintInfo.mintAuthority?.toString() || null,
      freezeAuthority: mintInfo.freezeAuthority?.toString() || null,
      isInitialized: mintInfo.isInitialized,

      // Metadata từ Metaplex
      metadata: tokenMetadata,

      // Thông tin từ JSON metadata (nếu có)
      jsonMetadata: metadataJson,

      // Thông tin dễ đọc
      name: tokenMetadata?.data?.name || 'Unknown',
      symbol: tokenMetadata?.data?.symbol || 'Unknown',
      image: metadataJson?.image || null,
      description: metadataJson?.description || null,
      external_url: metadataJson?.external_url || null,
      attributes: metadataJson?.attributes || [],
    }

    return tokenInfo
  } catch (error) {
    console.error('Lỗi khi lấy thông tin token:', error)
    throw error
  }
}

// Hàm tính toán địa chỉ metadata
async function getMetadataAddress(mintPublicKey: PublicKey) {
  const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

  const [metadataAddress] = await PublicKey.findProgramAddress(
    [Buffer.from('metadata'), METADATA_PROGRAM_ID.toBuffer(), mintPublicKey.toBuffer()],
    METADATA_PROGRAM_ID
  )

  return metadataAddress
}

// Hàm lấy danh sách token accounts của một wallet
async function getTokenAccountsByOwner(walletAddress: string) {
  try {
    const walletPublicKey = new PublicKey(walletAddress)

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPublicKey, {
      programId: TOKEN_PROGRAM_ID,
    })

    const tokenList = []

    for (const tokenAccount of tokenAccounts.value) {
      const mintAddress = tokenAccount.account.data.parsed.info.mint
      const balance = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount

      if (balance > 0) {
        try {
          const tokenInfo = await getTokenInfo(mintAddress)
          tokenList.push({
            ...tokenInfo,
            balance: balance,
            tokenAccount: tokenAccount.pubkey.toString(),
          })
        } catch (error) {
          console.log(`Lỗi khi lấy thông tin token ${mintAddress}:`, error)
        }
      }
    }

    return tokenList
  } catch (error) {
    console.error('Lỗi khi lấy token accounts:', error)
    throw error
  }
}

// Hàm sử dụng Metaplex SDK (cách khác)
async function getTokenInfoWithMetaplex(tokenAddress: string) {
  try {
    const mintPublicKey = new PublicKey(tokenAddress)

    // Lấy NFT/Token sử dụng Metaplex SDK
    const nft = await metaplex.nfts().findByMint({ mintAddress: mintPublicKey })

    return {
      address: tokenAddress,
      name: nft.name,
      symbol: nft.symbol,
      uri: nft.uri,
      image: nft.json?.image,
      description: nft.json?.description,
      attributes: nft.json?.attributes || [],
      creators:
        nft.creators?.map(creator => ({
          address: creator.address.toString(),
          verified: creator.verified,
          share: creator.share,
        })) || [],
      sellerFeeBasisPoints: nft.sellerFeeBasisPoints,
      primarySaleHappened: nft.primarySaleHappened,
      isMutable: nft.isMutable,
      updateAuthority: nft.updateAuthorityAddress.toString(),
      mint: nft.mint.address.toString(),
      collection: nft.collection,
      uses: nft.uses,
    }
  } catch (error) {
    console.error('Lỗi khi lấy thông tin với Metaplex SDK:', error)
    throw error
  }
}

// Ví dụ sử dụng
async function main() {
  try {
    // Thay thế bằng địa chỉ token thực tế trên devnet
    const tokenAddress = 'BFR68SCH16jfXkgWxaY4ZAE4y1KNUxhE9baag8YeZEBj' // Token USDC từ ví dụ

    console.log('Đang lấy thông tin token...')
    const tokenInfo = await getTokenInfo(tokenAddress)

    console.log('\n=== THÔNG TIN TOKEN ===')
    console.log('Địa chỉ:', tokenInfo.address)
    console.log('Tên:', tokenInfo.name)
    console.log('Symbol:', tokenInfo.symbol)
    console.log('Decimals:', tokenInfo.decimals)
    console.log('Total Supply:', tokenInfo.supply)
    console.log('Mint Authority:', tokenInfo.mintAuthority)
    console.log('Freeze Authority:', tokenInfo.freezeAuthority)

    if (tokenInfo.metadata) {
      console.log('\n=== METADATA CHI TIẾT ===')
      console.log('Key:', tokenInfo.metadata.key)
      console.log('Update Authority:', tokenInfo.metadata.updateAuthority)
      console.log('Mint:', tokenInfo.metadata.mint)
      console.log('Name:', tokenInfo.metadata.data.name)
      console.log('Symbol:', tokenInfo.metadata.data.symbol)
      console.log('URI:', tokenInfo.metadata.data.uri)
      console.log('Seller Fee Basis Points:', tokenInfo.metadata.data.sellerFeeBasisPoints)
      console.log('Primary Sale Happened:', tokenInfo.metadata.primarySaleHappened)
      console.log('Is Mutable:', tokenInfo.metadata.isMutable)
      console.log('Edition Nonce:', tokenInfo.metadata.editionNonce)
      console.log('Token Standard:', tokenInfo.metadata.tokenStandard)

      if (tokenInfo.metadata.data.creators.length > 0) {
        console.log('Creators:')
        tokenInfo.metadata.data.creators.forEach((creator: any, index: number) => {
          console.log(`  Creator ${index + 1}:`)
          console.log(`    Address: ${creator.address}`)
          console.log(`    Verified: ${creator.verified}`)
          console.log(`    Share: ${creator.share}`)
        })
      }

      if (tokenInfo.metadata.collection) {
        console.log('Collection:', tokenInfo.metadata.collection)
      }

      if (tokenInfo.metadata.uses) {
        console.log('Uses:', tokenInfo.metadata.uses)
      }
    }

    if (tokenInfo.jsonMetadata) {
      console.log('\n=== JSON METADATA ===')
      console.log('Image:', tokenInfo.jsonMetadata.image)
      console.log('Description:', tokenInfo.jsonMetadata.description)
      console.log('External URL:', tokenInfo.jsonMetadata.external_url)
      if (tokenInfo.jsonMetadata.attributes) {
        console.log('Attributes:', tokenInfo.jsonMetadata.attributes)
      }
    }

    // Thử với Metaplex SDK
    console.log('\n=== SỬ DỤNG METAPLEX SDK ===')
    try {
      const metaplexInfo = await getTokenInfoWithMetaplex(tokenAddress)
      console.log('Metaplex SDK Result:', JSON.stringify(metaplexInfo, null, 2))
    } catch (error) {
      console.log('Lỗi với Metaplex SDK:', error)
    }
  } catch (error) {
    console.error('Lỗi:', error)
  }
}

// Chạy ví dụ
main()

// Export các hàm để sử dụng
module.exports = {
  getTokenInfo,
  getTokenInfoWithMetaplex,
  getTokenAccountsByOwner,
  connection,
}
