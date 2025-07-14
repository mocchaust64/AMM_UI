'use client'

import { ReactNode, useMemo } from 'react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'

// Cần import CSS cho modal
import '@solana/wallet-adapter-react-ui/styles.css'

export function SolanaProviders({ children }: { children: ReactNode }) {
  // Bạn có thể chọn network dựa trên biến môi trường hoặc thiết lập cấu hình
  const network = WalletAdapterNetwork.Devnet

  // Bạn cũng có thể sử dụng URL tùy chỉnh thay vì clusterApiUrl
  // const endpoint = "https://api.devnet.solana.com";
  const endpoint = useMemo(() => clusterApiUrl(network), [network])

  // Thiết lập các wallet adapters
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter(), new CoinbaseWalletAdapter()],
    []
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  )
}
