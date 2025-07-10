import { useEffect, useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { RaydiumCpSwap } from '../idl/types/raydium_cp_swap'
import idl from '../idl/raydium_cp_swap.json'

export function useAnchorProvider() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [provider, setProvider] = useState<anchor.AnchorProvider | null>(null)
  const [program, setProgram] = useState<Program<RaydiumCpSwap> | null>(null)

  useEffect(() => {
    if (wallet && connection && wallet.publicKey) {
      try {
        // Tạo custom wallet adapter tương thích với Anchor
        const anchorWallet = {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction!,
          signAllTransactions: wallet.signAllTransactions!,
        }

        // Tạo provider từ wallet và connection
        const newProvider = new anchor.AnchorProvider(connection, anchorWallet, {
          commitment: 'confirmed',
        })
        setProvider(newProvider)

        // Tạo program từ provider và IDL
        const newProgram = new anchor.Program(idl, newProvider) as Program<RaydiumCpSwap>
        setProgram(newProgram)
      } catch (error) {
        console.error('Lỗi khi khởi tạo Anchor Provider:', error)
      }
    }
  }, [wallet, connection])

  return { provider, program }
}
