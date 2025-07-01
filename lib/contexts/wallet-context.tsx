"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type WalletType = "phantom" | "solflare" | "backpack" | null

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

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean
      connect: () => Promise<{ publicKey: { toString: () => string } }>
      disconnect: () => Promise<void>
      on: (event: string, callback: () => void) => void
      publicKey: { toString: () => string } | null
    }
    solflare?: {
      isConnected: boolean
      connect: () => Promise<{ publicKey: { toString: () => string } }>
      disconnect: () => Promise<void>
      publicKey: { toString: () => string } | null
    }
    backpack?: {
      isConnected: boolean
      connect: () => Promise<{ publicKey: { toString: () => string } }>
      disconnect: () => Promise<void>
      publicKey: { toString: () => string } | null
    }
  }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [walletType, setWalletType] = useState<WalletType>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState(0)
  const [publicKey, setPublicKey] = useState<string | null>(null)

  useEffect(() => {
    // Check if wallet was previously connected
    const savedWallet = localStorage.getItem("connectedWallet") as WalletType
    const savedAddress = localStorage.getItem("walletAddress")

    if (savedWallet && savedAddress) {
      // Try to reconnect automatically
      reconnectWallet(savedWallet)
    }
  }, [])

  const reconnectWallet = async (type: WalletType) => {
    try {
      if (type === "phantom" && window.solana?.isPhantom) {
        if (window.solana.publicKey) {
          const publicKeyStr = window.solana.publicKey.toString()
          setWalletType(type)
          setAddress(publicKeyStr)
          setPublicKey(publicKeyStr)
          setIsConnected(true)
          setBalance(Math.random() * 100) // Mock balance for now
        }
      }
    } catch (error) {
      console.error("Failed to reconnect wallet:", error)
      // Clear saved data if reconnection fails
      localStorage.removeItem("connectedWallet")
      localStorage.removeItem("walletAddress")
    }
  }

  const connect = async (type: WalletType) => {
    try {
      let walletAddress = ""
      let publicKeyStr = ""

      switch (type) {
        case "phantom":
          if (!window.solana?.isPhantom) {
            window.open("https://phantom.app/", "_blank")
            throw new Error("Phantom wallet not found. Please install Phantom.")
          }

          const phantomResponse = await window.solana.connect()
          publicKeyStr = phantomResponse.publicKey.toString()
          walletAddress = publicKeyStr
          break

        case "solflare":
          if (!window.solflare) {
            window.open("https://solflare.com/", "_blank")
            throw new Error("Solflare wallet not found. Please install Solflare.")
          }

          const solflareResponse = await window.solflare.connect()
          publicKeyStr = solflareResponse.publicKey.toString()
          walletAddress = publicKeyStr
          break

        case "backpack":
          if (!window.backpack) {
            window.open("https://backpack.app/", "_blank")
            throw new Error("Backpack wallet not found. Please install Backpack.")
          }

          const backpackResponse = await window.backpack.connect()
          publicKeyStr = backpackResponse.publicKey.toString()
          walletAddress = publicKeyStr
          break

        default:
          throw new Error("Unsupported wallet type")
      }

      setWalletType(type)
      setAddress(walletAddress)
      setPublicKey(publicKeyStr)
      setIsConnected(true)
      setBalance(Math.random() * 100) // Mock balance - in real app, fetch from blockchain

      localStorage.setItem("connectedWallet", type!)
      localStorage.setItem("walletAddress", walletAddress)

      // Listen for account changes (Phantom specific)
      if (type === "phantom" && window.solana) {
        window.solana.on("accountChanged", () => {
          disconnect()
        })
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error)
      throw error
    }
  }

  const disconnect = async () => {
    try {
      // Disconnect from the actual wallet
      if (walletType === "phantom" && window.solana) {
        await window.solana.disconnect()
      } else if (walletType === "solflare" && window.solflare) {
        await window.solflare.disconnect()
      } else if (walletType === "backpack" && window.backpack) {
        await window.backpack.disconnect()
      }
    } catch (error) {
      console.error("Error disconnecting from wallet:", error)
    }

    // Clear local state
    setIsConnected(false)
    setWalletType(null)
    setAddress(null)
    setPublicKey(null)
    setBalance(0)

    localStorage.removeItem("connectedWallet")
    localStorage.removeItem("walletAddress")
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
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}
