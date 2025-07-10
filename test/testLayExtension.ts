import { Connection, PublicKey } from '@solana/web3.js'
import {
  getMint,
  getExtensionTypes,
  getTransferHook,
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
} from '@solana/spl-token'

// Hàm chính để lấy các extension và chi tiết Transfer Hook của token
async function getTokenExtensionsWithTransferHook(mintAddress: string) {
  try {
    // Kết nối với mạng Solana (devnet trong trường hợp này)
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed')

    // Chuyển mint address thành PublicKey
    const mintPublicKey = new PublicKey(mintAddress)

    // Lấy thông tin tài khoản mint
    const mintInfo = await getMint(connection, mintPublicKey, undefined, TOKEN_2022_PROGRAM_ID)

    // Lấy danh sách các extension
    const extensionTypes = getExtensionTypes(mintInfo.tlvData)

    // In ra các extension
    console.log(
      'Token Extensions:',
      extensionTypes.map(type => ExtensionType[type])
    )

    // Kiểm tra xem TransferHook có trong danh sách extension hay không
    if (extensionTypes.includes(ExtensionType.TransferHook)) {
      // Lấy chi tiết Transfer Hook
      const transferHookData = getTransferHook(mintInfo)
      if (transferHookData) {
        console.log('Transfer Hook Details:')
        console.log(
          `- Authority: ${transferHookData.authority ? transferHookData.authority.toBase58() : 'None'}`
        )
        console.log(
          `- Program ID: ${transferHookData.programId ? transferHookData.programId.toBase58() : 'None'}`
        )
      } else {
        console.log('No Transfer Hook data available.')
      }
    } else {
      console.log('No Transfer Hook extension found for this token.')
    }

    return extensionTypes
  } catch (error) {
    console.error('Lỗi khi lấy thông tin extension:', error)
    throw error
  }
}

// Ví dụ sử dụng
const mintAddress = 'FRDW9EiY2hLpYQtWpBeDKfRzqQTjKousuiPp8sXeWayc' // Mint address bạn cung cấp
getTokenExtensionsWithTransferHook(mintAddress)
  .then(extensions => {
    console.log(
      'Hoàn tất kiểm tra extensions:',
      extensions.map(type => ExtensionType[type])
    )
  })
  .catch(error => {
    console.error('Lỗi:', error)
  })
