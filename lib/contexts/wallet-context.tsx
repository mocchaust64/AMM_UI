'use client'

import type React from 'react'
import { createContext, useContext, useState, useEffect } from 'react'

type WalletType = 'phantom' | 'solflare' | 'backpack' | null

type WalletContextType = {
  isConnected: boolean
  walletType: WalletType
  address: string | null
  balance: number
  connect: (type: WalletType) => Promise<void>
  disconnect: () => void
  publicKey: string | null
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

// Định nghĩa kiểu cho các ví mà không mở rộng Window interface
type PhantomWallet = {
  isPhantom?: boolean
  connect: () => Promise<{ publicKey: { toString: () => string } }>
  disconnect: () => Promise<void>
  on: (event: string, callback: () => void) => void
  publicKey: { toString: () => string } | null
}

type SolflareWallet = {
  isConnected: boolean
  connect: () => Promise<{ publicKey: { toString: () => string } }>
  disconnect: () => Promise<void>
  publicKey: { toString: () => string } | null
}

type BackpackWallet = {
  isConnected: boolean
  connect: () => Promise<{ publicKey: { toString: () => string } }>
  disconnect: () => Promise<void>
  publicKey: { toString: () => string } | null
}

// Hàm helper để truy cập các ví một cách an toàn
const getPhantomWallet = (): PhantomWallet | undefined =>
  (window as unknown as { solana?: PhantomWallet }).solana
const getSolflareWallet = (): SolflareWallet | undefined =>
  (window as unknown as { solflare?: SolflareWallet }).solflare
const getBackpackWallet = (): BackpackWallet | undefined =>
  (window as unknown as { backpack?: BackpackWallet }).backpack

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [walletType, setWalletType] = useState<WalletType>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState(0)
  const [publicKey, setPublicKey] = useState<string | null>(null)

  useEffect(() => {
    // Check if wallet was previously connected
    const savedWallet = localStorage.getItem('connectedWallet') as WalletType
    const savedAddress = localStorage.getItem('walletAddress')

    if (savedWallet && savedAddress) {
      // Try to reconnect automatically
      reconnectWallet(savedWallet)
    }
  }, [])

  const reconnectWallet = async (type: WalletType) => {
    try {
      if (type === 'phantom') {
        const phantom = getPhantomWallet()
        if (phantom?.isPhantom && phantom.publicKey) {
          const publicKeyStr = phantom.publicKey.toString()
          setWalletType(type)
          setAddress(publicKeyStr)
          setPublicKey(publicKeyStr)
          setIsConnected(true)
          setBalance(Math.random() * 100) // Mock balance for now
        }
      }
    } catch (error) {
      console.error('Failed to reconnect wallet:', error)
      // Clear saved data if reconnection fails
      localStorage.removeItem('connectedWallet')
      localStorage.removeItem('walletAddress')
    }
  }

  const connect = async (type: WalletType) => {
    try {
      let walletAddress = ''
      let publicKeyStr = ''
      let phantomResponse
      let solflareResponse
      let backpackResponse

      switch (type) {
        case 'phantom': {
          const phantom = getPhantomWallet()
          if (!phantom?.isPhantom) {
            window.open('https://phantom.app/', '_blank')
            throw new Error('Phantom wallet not found. Please install Phantom.')
          }

          phantomResponse = await phantom.connect()
          publicKeyStr = phantomResponse.publicKey.toString()
          walletAddress = publicKeyStr
          break
        }

        case 'solflare': {
          const solflare = getSolflareWallet()
          if (!solflare) {
            window.open('https://solflare.com/', '_blank')
            throw new Error('Solflare wallet not found. Please install Solflare.')
          }

          solflareResponse = await solflare.connect()
          publicKeyStr = solflareResponse.publicKey.toString()
          walletAddress = publicKeyStr
          break
        }

        case 'backpack': {
          const backpack = getBackpackWallet()
          if (!backpack) {
            window.open('https://backpack.app/', '_blank')
            throw new Error('Backpack wallet not found. Please install Backpack.')
          }

          backpackResponse = await backpack.connect()
          publicKeyStr = backpackResponse.publicKey.toString()
          walletAddress = publicKeyStr
          break
        }

        default:
          throw new Error('Unsupported wallet type')
      }

      setWalletType(type)
      setAddress(walletAddress)
      setPublicKey(publicKeyStr)
      setIsConnected(true)
      setBalance(Math.random() * 100) // Mock balance - in real app, fetch from blockchain

      localStorage.setItem('connectedWallet', type!)
      localStorage.setItem('walletAddress', walletAddress)

      // Listen for account changes (Phantom specific)
      if (type === 'phantom') {
        const phantom = getPhantomWallet()
        if (phantom) {
          phantom.on('accountChanged', () => {
            disconnect()
          })
        }
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      throw error
    }
  }

  const disconnect = async () => {
    try {
      // Disconnect from the actual wallet
      if (walletType === 'phantom') {
        const phantom = getPhantomWallet()
        if (phantom) await phantom.disconnect()
      } else if (walletType === 'solflare') {
        const solflare = getSolflareWallet()
        if (solflare) await solflare.disconnect()
      } else if (walletType === 'backpack') {
        const backpack = getBackpackWallet()
        if (backpack) await backpack.disconnect()
      }
    } catch (error) {
      console.error('Error disconnecting from wallet:', error)
    }

    // Clear local state
    setIsConnected(false)
    setWalletType(null)
    setAddress(null)
    setPublicKey(null)
    setBalance(0)

    localStorage.removeItem('connectedWallet')
    localStorage.removeItem('walletAddress')
  }

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        walletType,
        address,
        balance,
        connect,
        disconnect,
        publicKey,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
