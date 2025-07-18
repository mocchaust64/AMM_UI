'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { TokenData } from '@/hooks/useWalletTokens'
import { getDetailTokenExtensions } from '@/lib/service/tokenService'
import { Connection, PublicKey } from '@solana/web3.js'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'

// Mở rộng TokenData để bao gồm các trường từ GitHub token
interface ExtendedTokenData extends TokenData {
  description?: string
  uri?: string
  externalUrl?: string
  supply?: string
  metadata?: Record<string, unknown>
}

interface TokenExtensionDialogProps {
  token: ExtendedTokenData | undefined
  isOpen: boolean
  onClose: () => void
}

// Định nghĩa kiểu dữ liệu cho thông tin extension
interface TokenExtensionInfo {
  isToken2022?: boolean
  extensions?: string[]
  transferHook?: {
    authority: string
    programId: string
  } | null
  error?: string
}

const TRANSFER_HOOK_PROGRAM_ID = '12BZr6af3s7qf7GGmhBvMd46DWmVNhHfXmCwftfMk1mZ'

export function TokenExtensionDialog({ token, isOpen, onClose }: TokenExtensionDialogProps) {
  const [extensionInfo, setExtensionInfo] = useState<TokenExtensionInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [whitelist, setWhitelist] = useState<string[]>([])
  const [loadingWhitelist, setLoadingWhitelist] = useState(false)
  const [whitelistError, setWhitelistError] = useState<string | null>(null)

  // Fetch extension info when dialog opens
  useEffect(() => {
    async function fetchTokenExtensions() {
      if (!isOpen || !token || token.mint === 'SOL') {
        setExtensionInfo(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const extensions = await getDetailTokenExtensions(token.mint)
        setExtensionInfo(extensions)

        // If it has TransferHook and programId is TRANSFER_HOOK_PROGRAM_ID, fetch the whitelist
        if (extensions?.transferHook?.programId === TRANSFER_HOOK_PROGRAM_ID) {
          fetchWhitelist(token.mint)
        }
      } catch (err: unknown) {
        console.error('Error fetching token extension info:', err)
        setError(err instanceof Error ? err.message : 'Could not fetch extension information')
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      fetchTokenExtensions()
    }
  }, [isOpen, token])

  // Function to fetch whitelist addresses
  async function fetchWhitelist(mint: string) {
    if (mint === 'SOL') return

    setLoadingWhitelist(true)
    setWhitelistError(null)

    try {
      // Calculate PDA for whitelist
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
      const mintPublicKey = new PublicKey(mint)
      const transferHookProgramId = new PublicKey(TRANSFER_HOOK_PROGRAM_ID)

      const [whitelistPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('white_list'), mintPublicKey.toBuffer()],
        transferHookProgramId
      )

      // Get whitelist account data
      const whitelistAccount = await connection.getAccountInfo(whitelistPDA)

      if (!whitelistAccount) {
        setWhitelist([])
        return
      }

      // Parse whitelist data
      const data = whitelistAccount.data
      const possibleAddresses: string[] = []

      // Start from byte 16 (after discriminator and counter)
      let offset = 16
      while (offset + 32 <= data.length) {
        // Get next 32 bytes as address
        const addressBytes = data.slice(offset, offset + 32)

        // Check if it's all zeros
        const isAllZeros = addressBytes.every(byte => byte === 0)

        if (!isAllZeros) {
          try {
            const address = new PublicKey(addressBytes)
            possibleAddresses.push(address.toString())
          } catch {
            // Not a valid address, skip
          }
        }

        offset += 32
      }

      setWhitelist(possibleAddresses)
    } catch (err: unknown) {
      console.error('Error fetching whitelist:', err)
      setWhitelistError(err instanceof Error ? err.message : 'Could not fetch whitelist')
      setWhitelist([])
    } finally {
      setLoadingWhitelist(false)
    }
  }

  // Hiển thị thông tin token
  const renderContent = () => {
    if (!token) {
      return <div>No token information available</div>
    }

    if (token.mint === 'SOL') {
      return <div className="py-4 text-center">SOL is a native token and has no extensions</div>
    }

    return (
      <ScrollArea className="h-[60vh] pr-4">
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Basic Information</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p>{token.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Symbol</p>
                <p>{token.symbol}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Decimals</p>
                <p>{token.decimals}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Balance</p>
                <p>{token.balance.toLocaleString()}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Mint Address</p>
                <p className="font-mono text-sm break-all">{token.mint}</p>
              </div>
              {token.address && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Token Account Address</p>
                  <p className="font-mono text-sm break-all">{token.address}</p>
                </div>
              )}
              {token.description && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm">{token.description}</p>
                </div>
              )}
              {token.uri && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Metadata URI</p>
                  <p className="font-mono text-xs break-all">{token.uri}</p>
                </div>
              )}
              {token.supply && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Supply</p>
                  <p>{token.supply}</p>
                </div>
              )}
            </div>
          </div>

          {/* Extensions */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Loading extension information...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-md">
              <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          ) : !extensionInfo ? (
            <div>
              <h3 className="text-lg font-medium mb-2">Extensions</h3>
              <p className="text-muted-foreground">Unable to fetch token extensions</p>
            </div>
          ) : (
            <>
              {/* Extensions List */}
              <div>
                <h3 className="text-lg font-medium mb-2">Extensions</h3>
                {extensionInfo.extensions && extensionInfo.extensions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {extensionInfo.extensions.map((ext: string, index: number) => (
                      <Badge key={index} className="text-sm px-3 py-1">
                        {ext}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No extensions found</p>
                )}
              </div>

              {/* Transfer Hook Details */}
              {extensionInfo.transferHook && (
                <div className="space-y-3">
                  <h3 className="text-lg font-medium">Transfer Hook</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Authority</p>
                      <p className="font-mono text-sm break-all">
                        {extensionInfo.transferHook.authority}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Program ID</p>
                      <p className="font-mono text-sm break-all">
                        {extensionInfo.transferHook.programId}
                      </p>
                    </div>
                  </div>

                  {/* Whitelist if programId is 12BZr6af3s7qf7GGmhBvMd46DWmVNhHfXmCwftfMk1mZ */}
                  {extensionInfo.transferHook.programId === TRANSFER_HOOK_PROGRAM_ID && (
                    <div className="mt-4">
                      <h3 className="text-lg font-medium mb-2">Whitelist Addresses</h3>
                      {loadingWhitelist ? (
                        <div className="flex items-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span>Loading whitelist...</span>
                        </div>
                      ) : whitelistError ? (
                        <p className="text-red-500 text-sm">{whitelistError}</p>
                      ) : whitelist.length === 0 ? (
                        <p className="text-muted-foreground">No whitelist addresses found</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Address</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {whitelist.map((address, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-mono text-xs break-all">
                                  {address}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Metadata */}
          {token.metadata && Object.keys(token.metadata).length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-2">Additional Metadata</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(token.metadata)
                    .filter(
                      ([key]) => !['name', 'symbol', 'description', 'image', 'uri'].includes(key)
                    )
                    .map(([key, value], index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{key}</TableCell>
                        <TableCell className="break-all">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </ScrollArea>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Token Details: {token?.symbol || 'N/A'}</DialogTitle>
        </DialogHeader>

        {renderContent()}
      </DialogContent>
    </Dialog>
  )
}
