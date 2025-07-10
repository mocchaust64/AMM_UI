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

interface TokenExtensionDialogProps {
  token: TokenData | undefined
  isOpen: boolean
  onClose: () => void
}

const TRANSFER_HOOK_PROGRAM_ID = '12BZr6af3s7qf7GGmhBvMd46DWmVNhHfXmCwftfMk1mZ'

export function TokenExtensionDialog({ token, isOpen, onClose }: TokenExtensionDialogProps) {
  const [extensionInfo, setExtensionInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [whitelist, setWhitelist] = useState<string[]>([])
  const [loadingWhitelist, setLoadingWhitelist] = useState(false)
  const [whitelistError, setWhitelistError] = useState<string | null>(null)

  // Fetch extension info when dialog opens
  useEffect(() => {
    async function fetchTokenExtensions() {
      if (!isOpen || !token || token.mint === 'SOL' || !token.isToken2022) {
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
      } catch (err: any) {
        console.error('Error fetching token extension info:', err)
        setError(err.message || 'Could not fetch extension information')
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
          } catch (e) {
            // Not a valid address, skip
          }
        }

        offset += 32
      }

      setWhitelist(possibleAddresses)
    } catch (err: any) {
      console.error('Error fetching whitelist:', err)
      setWhitelistError(err.message || 'Could not fetch whitelist')
      setWhitelist([])
    } finally {
      setLoadingWhitelist(false)
    }
  }

  // Hiển thị thông báo phù hợp nếu token không phải token-2022
  const renderContent = () => {
    if (!token) {
      return <div>No token information available</div>
    }

    if (token.mint === 'SOL') {
      return <div className="py-4 text-center">SOL is a native token and has no extensions</div>
    }

    if (!token.isToken2022) {
      return (
        <div className="py-4 text-center">Standard SPL Token doesn&apos;t support extensions</div>
      )
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
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span>Loading whitelist...</span>
                        </div>
                      ) : whitelistError ? (
                        <p className="text-red-500">{whitelistError}</p>
                      ) : whitelist.length === 0 ? (
                        <p className="text-muted-foreground">No addresses found in whitelist</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">#</TableHead>
                              <TableHead>Address</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {whitelist.map((address, index) => (
                              <TableRow key={index}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell className="font-mono text-sm">{address}</TableCell>
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
