import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useState } from 'react'
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'
import { RaydiumCpSwap } from '../idl/types/raydium_cp_swap'
import idl from '../idl/raydium_cp_swap.json'
import { toast } from '@/components/ui/use-toast'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'

// Constant
const TRANSFER_HOOK_PROGRAM_ID = new PublicKey('12BZr6af3s7qf7GGmhBvMd46DWmVNhHfXmCwftfMk1mZ')

// Hàm kiểm tra chuỗi có phải định dạng base58 hợp lệ
const isValidBase58 = (value: string): boolean => {
  try {
    new PublicKey(value)
    return true
  } catch (error) {
    console.error(`Invalid base58 string: ${value}`, error)
    return false
  }
}

// Hàm phân tích transaction log để tìm lỗi thiếu tài khoản cụ thể
const extractMissingAccountError = (logs: string[] | undefined): string | null => {
  if (!logs || !logs.length) return null

  for (const log of logs) {
    // Tìm lỗi thiếu tài khoản
    if (
      log.includes('Instruction references an unknown account') ||
      log.includes('An account required by the instruction is missing')
    ) {
      // Tìm địa chỉ tài khoản thiếu trong message
      const match = log.match(/(\w{32,44})/)
      if (match && match[1]) {
        return `Thiếu tài khoản: ${match[1]}`
      }
      return 'Thiếu tài khoản cần thiết trong transaction'
    }
  }
  return null
}

// Hàm kiểm tra token có transfer hook không
async function hasTransferHook(
  connection: anchor.web3.Connection,
  mintAddress: PublicKey
): Promise<boolean> {
  try {
    // Kiểm tra PDA
    const [extraAccountMetaListPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('extra-account-metas'), mintAddress.toBuffer()],
      TRANSFER_HOOK_PROGRAM_ID
    )

    const [whitelistPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('white_list'), mintAddress.toBuffer()],
      TRANSFER_HOOK_PROGRAM_ID
    )

    // Kiểm tra xem các PDA có tồn tại không
    const extraAccountMetaListInfo = await connection.getAccountInfo(extraAccountMetaListPDA)
    const whitelistInfo = await connection.getAccountInfo(whitelistPDA)

    return !!(extraAccountMetaListInfo || whitelistInfo)
  } catch (error) {
    console.error('Error checking for transfer hook:', error)
    return false
  }
}

// Thêm thông báo thành công về việc tự động whitelist
function displayTransferHookSuccess(token: string) {
  toast({
    title: 'Tự động whitelist thành công',
    description: `Vault đã được tự động thêm vào whitelist của token ${token.slice(0, 8)}...`,
  })
}

// Hàm so sánh hai PublicKey
function comparePublicKeys(a: PublicKey, b: PublicKey): number {
  const aBuf = a.toBuffer()
  const bBuf = b.toBuffer()

  for (let i = 0; i < 32; i++) {
    const diff = aBuf[i] - bBuf[i]
    if (diff !== 0) return diff
  }

  return 0
}

// Hàm để lấy link Solscan dựa trên network
function getSolscanLink(txid: string): string {
  // Mặc định sử dụng devnet
  const network = 'devnet'
  return `https://solscan.io/tx/${txid}?cluster=${network}`
}

export function usePoolCreation() {
  const { connection } = useConnection()
  const { publicKey, signTransaction } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Hàm đơn giản hóa để tạo pool trực tiếp
  const createPool = async ({
    token0Mint,
    token1Mint,
    token0Account,
    token1Account,
    initAmount0,
    initAmount1,
  }: {
    token0Mint: string
    token1Mint: string
    token0Account: string
    token1Account: string
    initAmount0: string
    initAmount1: string
  }) => {
    if (!publicKey || !signTransaction) {
      throw new Error('Wallet not connected')
    }

    setLoading(true)
    setError(null)
    let txid = '' // Khai báo txid ở ngoài try/catch để có thể truy cập từ catch block

    try {
      // Kiểm tra địa chỉ hợp lệ
      if (!isValidBase58(token0Mint)) {
        throw new Error(`Token0 mint address không hợp lệ: ${token0Mint}`)
      }
      if (!isValidBase58(token1Mint)) {
        throw new Error(`Token1 mint address không hợp lệ: ${token1Mint}`)
      }
      if (!isValidBase58(token0Account)) {
        throw new Error(`Token0 account address không hợp lệ: ${token0Account}`)
      }
      if (!isValidBase58(token1Account)) {
        throw new Error(`Token1 account address không hợp lệ: ${token1Account}`)
      }

      // Tạo PublicKey từ chuỗi
      const token0MintPubkey = new PublicKey(token0Mint)
      const token1MintPubkey = new PublicKey(token1Mint)
      const token0AccountPubkey = new PublicKey(token0Account)
      const token1AccountPubkey = new PublicKey(token1Account)

      // Đảm bảo đúng thứ tự token0 < token1
      let finalToken0Mint = token0MintPubkey
      let finalToken1Mint = token1MintPubkey
      let finalToken0Account = token0AccountPubkey
      let finalToken1Account = token1AccountPubkey
      let finalInitAmount0 = initAmount0
      let finalInitAmount1 = initAmount1

      // So sánh PublicKey để đảm bảo token0 < token1
      const compareResult = comparePublicKeys(token0MintPubkey, token1MintPubkey)
      if (compareResult > 0) {
        // Nếu token0 > token1, swap chúng
        finalToken0Mint = token1MintPubkey
        finalToken1Mint = token0MintPubkey
        finalToken0Account = token1AccountPubkey
        finalToken1Account = token0AccountPubkey
        finalInitAmount0 = initAmount1
        finalInitAmount1 = initAmount0
      }

      // Check if tokens have transfer hook
      const token0HasHook = await hasTransferHook(connection, finalToken0Mint)
      const token1HasHook = await hasTransferHook(connection, finalToken1Mint)

      // Hiển thị thông báo về việc phát hiện token với transfer hook
      if (token0HasHook || token1HasHook) {
        toast({
          title: 'Phát hiện Token với Transfer Hook',
          description:
            'Smart contract sẽ tự động thêm vault vào whitelist trong quá trình tạo pool.',
        })
      }

      // Khởi tạo Anchor Wallet
      const wallet = {
        publicKey,
        signTransaction,
        signAllTransactions: async <T extends Transaction | VersionedTransaction>(
          txs: T[]
        ): Promise<T[]> => {
          return Promise.all(txs.map(tx => signTransaction(tx)))
        },
      }

      // Khởi tạo Anchor Provider
      const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' })
      anchor.setProvider(provider)

      // Khởi tạo Program
      const program = new anchor.Program(idl, provider) as anchor.Program<RaydiumCpSwap>

      // Sử dụng AMM Config có sẵn
      const ammConfigAddress = new PublicKey('5nWyCWXhJEaHmj8zJ1graq64dgfyX4oY7r7NZ3xxfozN')

      // Tạo một pool keypair tạm thời để tính toán LP token address
      const tempPoolKeypair = anchor.web3.Keypair.generate()
      const [lpMintAddress] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('pool_lp_mint'), tempPoolKeypair.publicKey.toBuffer()],
        program.programId
      )

      const creatorLpTokenAddress = PublicKey.findProgramAddressSync(
        [publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), lpMintAddress.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )[0]

      // Gọi API để tạo và ký transaction với pool keypair - thêm thông tin về transfer hook
      const response = await fetch('/api/create-pool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token0Mint: finalToken0Mint.toString(),
          token1Mint: finalToken1Mint.toString(),
          token0Account: finalToken0Account.toString(),
          token1Account: finalToken1Account.toString(),
          initAmount0: finalInitAmount0,
          initAmount1: finalInitAmount1,
          creatorPublicKey: publicKey.toString(),
          ammConfigAddress: ammConfigAddress.toString(),
          creatorLpTokenAddress: creatorLpTokenAddress.toString(),
          // Thêm thông tin về transfer hook
          token0HasTransferHook: token0HasHook,
          token1HasTransferHook: token1HasHook,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'API request failed')
      }

      const apiResponse = await response.json()

      if (!apiResponse.success || !apiResponse.serializedTransaction) {
        throw new Error('API returned an invalid response')
      }
      // Deserialize transaction từ base64
      const serializedTransaction = Buffer.from(apiResponse.serializedTransaction, 'base64')
      const transaction = Transaction.from(serializedTransaction)

      // Ký transaction với wallet của người dùng
      const signedTransaction = await signTransaction(transaction)

      // Gửi transaction đã ký đến Solana
      txid = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: true, // Sử dụng skipPreflight=true để có thể xem thêm chi tiết lỗi
        maxRetries: 3,
      })

      console.log('🔄 Transaction đã được gửi:', txid)
      console.log('🔍 Kiểm tra transaction tại:', getSolscanLink(txid))

      // Chờ xác nhận
      try {
        const confirmation = await connection.confirmTransaction(txid, 'confirmed')

        if (confirmation.value.err) {
          // Nếu có lỗi trong xác nhận, lấy logs để phân tích
          const txInfo = await connection.getTransaction(txid, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          })

          const logMessages = txInfo?.meta?.logMessages || []

          console.error('❌ Transaction thất bại. Transaction hash:', txid)
          console.error('🔍 Link Solscan:', getSolscanLink(txid))
          console.error('📝 Log messages:', logMessages)

          // Phân tích lỗi cụ thể
          const missingAccountError = extractMissingAccountError(logMessages)
          if (missingAccountError) {
            throw new Error(`${missingAccountError}. Xem chi tiết tại: ${getSolscanLink(txid)}`)
          }

          throw new Error(
            `Transaction thất bại: ${JSON.stringify(confirmation.value.err)}. Vui lòng kiểm tra chi tiết tại: ${getSolscanLink(txid)}`
          )
        }

        // Hiển thị thông báo riêng cho transfer hook nếu có
        if (token0HasHook) {
          displayTransferHookSuccess(finalToken0Mint.toString())
        }
        if (token1HasHook) {
          displayTransferHookSuccess(finalToken1Mint.toString())
        }

        // Transaction đã xác nhận thành công, upload pool lên GitHub
        if (apiResponse.poolInfo) {
          try {
            // Cập nhật txid trong poolInfo
            const poolInfoWithTxid = {
              ...apiResponse.poolInfo,
              txid, // Thêm transaction ID
              status: 'active',
            }

            // Gọi API để upload lên GitHub
            const uploadResponse = await fetch('/api/upload-pool-to-github', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(poolInfoWithTxid),
            })

            if (!uploadResponse.ok) {
              console.error('Failed to upload pool to GitHub:', await uploadResponse.json())
            }
          } catch (uploadError) {
            console.error('Error uploading pool to GitHub:', uploadError)
          }
        }
      } catch (confirmError: any) {
        // Lấy thông tin chi tiết về transaction để debug
        try {
          const txInfo = await connection.getTransaction(txid, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          })

          const logMessages = txInfo?.meta?.logMessages || []

          console.error('❌ Lỗi xác nhận transaction. Transaction hash:', txid)
          console.error('🔍 Link Solscan:', getSolscanLink(txid))
          console.error('📝 Log messages:', logMessages)

          // Phân tích lỗi cụ thể
          const missingAccountError = extractMissingAccountError(logMessages)
          if (missingAccountError) {
            throw new Error(`${missingAccountError}. Xem chi tiết tại: ${getSolscanLink(txid)}`)
          }

          // Kiểm tra cụ thể hơn về lỗi transfer hook
          if (logMessages.length > 0) {
            const transferHookErrorLog = logMessages.find(
              log => log.includes('Transfer Hook Program') || log.includes('transfer hook')
            )

            if (transferHookErrorLog) {
              throw new Error(
                `Lỗi transfer hook: ${transferHookErrorLog}. Xem chi tiết tại: ${getSolscanLink(txid)}`
              )
            }
          }
        } catch (txInfoError) {
          console.error('Error fetching transaction info:', txInfoError)
        }

        throw new Error(
          `Lỗi xác nhận transaction: ${confirmError.message}. Kiểm tra tại: ${getSolscanLink(txid)}`
        )
      }

      // Tạo kết quả
      const result = {
        txid,
        poolAddress: apiResponse.poolAddress,
        lpMintAddress: apiResponse.lpMintAddress,
        vault0: apiResponse.vault0,
        vault1: apiResponse.vault1,
      }

      // Hiển thị thông báo thành công
      toast({
        title: 'Pool created successfully!',
        description: `Transaction ID: ${txid.slice(0, 8)}...${txid.slice(-8)}`,
      })

      setLoading(false)
      return result
    } catch (err: any) {
      // Hiển thị thông báo lỗi với link Solscan nếu có txid
      if (txid) {
        const solscanLink = getSolscanLink(txid)
        console.error('❌ Transaction thất bại:', err.message)
        console.error('🔍 Link Solscan:', solscanLink)

        toast({
          variant: 'destructive',
          title: 'Tạo pool thất bại',
          description: (
            <div>
              <p>{err.message}</p>
              <p>
                Transaction hash: {txid.slice(0, 8)}...{txid.slice(-8)}
              </p>
              <a
                href={solscanLink}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-500"
              >
                Xem chi tiết trên Solscan
              </a>
            </div>
          ),
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Tạo pool thất bại',
          description: err.message || 'Đã xảy ra lỗi không xác định',
        })
      }

      setError(err.message || 'Đã xảy ra lỗi không xác định')
      setLoading(false)
      throw err
    }
  }

  return {
    createPool,
    loading,
    error,
  }
}
