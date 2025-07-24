'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Coins, Check, AlertCircle, ArrowLeft, ExternalLink, Info } from 'lucide-react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'sonner'
import { CommonLayout } from '@/components/common-layout'
import { createToken } from '@/lib/services/token-service'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface TokenCreationSuccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  signature: string
  tokenMint: string
  tokenData: any
}

function TokenCreationSuccessDialog(props: TokenCreationSuccessDialogProps) {
  const { open, onOpenChange, signature, tokenMint, tokenData } = props

  const solscanUrl = `https://solscan.io/tx/${signature}?cluster=devnet`
  const tokenUrl = `https://solscan.io/token/${tokenMint}?cluster=devnet`

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast.success(`${type} copied to clipboard`)
      },
      () => {
        toast.error('Unable to copy text')
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Check className="w-6 h-6 text-green-500" />
            Token Created Successfully
          </DialogTitle>
          <DialogDescription className="text-base">
            Your token has been successfully created on the Solana blockchain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <Alert variant="default" className="bg-green-900/20 text-green-400 border-green-800/50">
            <Check className="h-5 w-5 text-green-500" />
            <AlertTitle className="text-base font-medium">Token Created</AlertTitle>
            <AlertDescription className="text-sm">
              You have successfully created token {tokenData.name} ({tokenData.symbol}) with a total
              supply of {tokenData.supply}.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6">
            {/* Transaction ID */}
            <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-blue-500"
                  >
                    <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>
                    <line x1="16" y1="8" x2="2" y2="22"></line>
                    <line x1="17.5" y1="15" x2="9" y2="15"></line>
                  </svg>
                  Transaction
                </h3>
                <a
                  href={solscanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 flex items-center text-sm font-medium"
                >
                  View on Solscan <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
              <div
                className="bg-slate-800 p-3 rounded border border-slate-700 font-mono text-sm break-all cursor-pointer hover:bg-slate-700 transition-colors text-white"
                onClick={() => copyToClipboard(signature, 'Transaction signature')}
              >
                {signature}
                <div className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  Click to copy
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Token Info */}
              <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-purple-500"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M8 12h8"></path>
                      <path d="M12 16V8"></path>
                    </svg>
                    Token Information
                  </h3>
                </div>
                <div className="bg-slate-800 p-3 rounded border border-slate-700 text-sm">
                  <div className="flex items-center mb-3">
                    {tokenData.imageUrl ? (
                      <Avatar className="h-10 w-10 mr-3 rounded-full overflow-hidden">
                        <AvatarImage
                          src={tokenData.imageUrl}
                          alt={tokenData.name}
                          className="object-cover"
                        />
                        <AvatarFallback className="rounded-full">
                          {tokenData.symbol.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-10 w-10 bg-slate-700 rounded-full flex items-center justify-center text-sm mr-3">
                        {tokenData.symbol.slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-white">{tokenData.name}</p>
                      <p className="text-xs text-slate-300">{tokenData.symbol}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Supply:</span>
                      <span className="text-white">{tokenData.supply}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Decimals:</span>
                      <span className="text-white">{tokenData.decimals}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Token Mint */}
              <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-amber-500"
                    >
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                    Mint Address
                  </h3>
                  <a
                    href={tokenUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center text-sm font-medium"
                  >
                    View <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
                <div
                  className="bg-slate-800 p-3 rounded border border-slate-700 font-mono text-sm overflow-hidden text-ellipsis cursor-pointer hover:bg-slate-700 transition-colors text-white"
                  onClick={() => copyToClipboard(tokenMint, 'Mint Address')}
                >
                  <div className="truncate">{tokenMint}</div>
                  <div className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Click to copy
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Close
          </Button>
          <Button
            onClick={() => window.open(tokenUrl, '_blank')}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            View Token Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ReviewToken() {
  const router = useRouter()
  const { connection } = useConnection()
  const wallet = useWallet()

  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [creationError, setCreationError] = useState<string | null>(null)

  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [createdTokenMint, setCreatedTokenMint] = useState('')
  const [transactionSignature, setTransactionSignature] = useState('')

  const [tokenData, setTokenData] = useState<any>(null)
  const [selectedExtensions, setSelectedExtensions] = useState<string[]>([])

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedData = localStorage.getItem('tokenData')
        if (savedData) {
          const parsedData = JSON.parse(savedData)
          setTokenData(parsedData)
          setSelectedExtensions(parsedData.selectedExtensions || [])
        } else {
          router.push('/tokens/create')
        }
      }
    } catch (error) {
      console.error('Error loading token data:', error)
      toast.error('Error loading token data')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const handleConfirmCreate = async () => {
    if (!wallet.connected) {
      toast.error('Please connect your wallet to create a token')
      return
    }

    setIsCreating(true)
    setCreationError(null)

    try {
      const tokenDataForCreation = {
        name: tokenData.name,
        symbol: tokenData.symbol,
        decimals: tokenData.decimals,
        supply: tokenData.supply,
        description: tokenData.description || '',
        imageUrl: tokenData.imageUrl || '',
        extensionOptions: tokenData.extensionOptions || {},
        websiteUrl: tokenData.websiteUrl || '',
        twitterUrl: tokenData.twitterUrl || '',
        telegramUrl: tokenData.telegramUrl || '',
        discordUrl: tokenData.discordUrl || '',
      }

      const result = await createToken(connection, wallet, tokenDataForCreation, selectedExtensions)

      setCreatedTokenMint(result.mint)
      setTransactionSignature(result.signature)

      setShowSuccessDialog(true)

      localStorage.removeItem('tokenData')
    } catch (error: any) {
      console.error('Error creating token:', error)
      toast.error(`Error: ${error.message || 'Unable to create token'}`)
      setCreationError(error.message || 'Unable to create token')
    } finally {
      setIsCreating(false)
    }
  }

  const handleBack = () => {
    router.push('/tokens/create')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!tokenData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Token data not found. Please go back and create a new token.
          </AlertDescription>
          <Button onClick={() => router.push('/tokens/create')} className="mt-4" variant="outline">
            Go Back
          </Button>
        </Alert>
      </div>
    )
  }

  return (
    <CommonLayout>
      <div className="max-w-3xl mx-auto py-8 px-4">
        <Button variant="outline" onClick={handleBack} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Card className="shadow-md border-slate-700/50 bg-slate-900/20">
          <CardHeader className="bg-slate-900/50 border-b border-slate-700/50">
            <CardTitle className="text-xl font-semibold">Review Token Information</CardTitle>
            <CardDescription>Please review your token details before creation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Token info with better visual */}
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
              <div className="flex items-center mb-4">
                {tokenData.imageUrl ? (
                  <Avatar className="h-16 w-16 mr-4 rounded-full overflow-hidden">
                    <AvatarImage
                      src={tokenData.imageUrl}
                      alt={tokenData.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="rounded-full">
                      {tokenData.symbol.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-16 w-16 bg-gradient-to-br from-primary/30 to-primary-foreground/30 rounded-full flex items-center justify-center text-xl mr-4">
                    {tokenData.symbol.slice(0, 2)}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold">{tokenData.name}</h2>
                  <p className="text-muted-foreground">{tokenData.symbol}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Total Supply</div>
                  <div className="font-medium text-lg">{tokenData.supply}</div>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Decimals</div>
                  <div className="font-medium text-lg">{tokenData.decimals}</div>
                </div>
              </div>
            </div>

            {tokenData.description && (
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                <p className="text-sm">{tokenData.description}</p>
              </div>
            )}

            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Extensions</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedExtensions.length > 0 ? (
                  selectedExtensions.map(ext => (
                    <div
                      key={ext}
                      className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                    >
                      {ext}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No extensions</div>
                )}
              </div>
            </div>

            {/* Transfer Hook Details */}
            {selectedExtensions.includes('transfer-hook') &&
              tokenData.extensionOptions?.['transfer-hook']?.['program-id'] && (
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Transfer Hook Program ID
                  </h3>
                  <code className="text-xs bg-slate-900/50 p-2 rounded block mt-1 font-mono">
                    {tokenData.extensionOptions['transfer-hook']['program-id']}
                  </code>

                  {/* Add notification about whitelist for the specific transfer hook */}
                  {tokenData.extensionOptions['transfer-hook']['program-id'] ===
                    '12BZr6af3s7qf7GGmhBvMd46DWmVNhHfXmCwftfMk1mZ' && (
                    <Alert className="mt-3 bg-blue-900/20 text-blue-400 border-blue-800/50">
                      <Info className="h-4 w-4" />
                      <AlertTitle className="text-sm font-medium">Automatic Whitelist</AlertTitle>
                      <AlertDescription className="text-xs">
                        Your wallet address will be automatically added to the whitelist. This
                        allows your wallet to transfer tokens without restrictions.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

            {creationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{creationError}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between pt-6 border-t mt-6 border-slate-700/50">
              <Button variant="outline" onClick={handleBack} disabled={isCreating}>
                Edit
              </Button>
              <Button
                onClick={handleConfirmCreate}
                disabled={isCreating || !wallet.connected}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isCreating ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <Coins className="h-4 w-4" />
                    Confirm and Create Token
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Success Dialog */}
        <TokenCreationSuccessDialog
          open={showSuccessDialog}
          onOpenChange={setShowSuccessDialog}
          signature={transactionSignature}
          tokenMint={createdTokenMint}
          tokenData={tokenData}
        />
      </div>
    </CommonLayout>
  )
}
