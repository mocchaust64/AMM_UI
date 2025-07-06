'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { toast } from 'sonner'
import { TokenSelect } from '@/components/TokenSelect'
import { useWalletTokens } from '@/hooks/useWalletTokens'
import { usePoolCreation } from '@/hooks/usePoolCreation'
import { Check, ExternalLink } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface CreatePoolDialogProps {
  _open: boolean
  onOpenChange: (_open: boolean) => void
}

interface SuccessDialogProps {
  _open: boolean
  onOpenChange: (_open: boolean) => void
  txid: string
  poolAddress: string
  lpMintAddress: string
}

function SuccessDialog(props: SuccessDialogProps) {
  const { _open: open, onOpenChange, txid, poolAddress, lpMintAddress } = props

  // Dựa vào môi trường để tạo link phù hợp (ở đây dùng devnet)
  const solscanUrl = `https://solscan.io/tx/${txid}?cluster=devnet`
  const poolUrl = `https://solscan.io/account/${poolAddress}?cluster=devnet`
  const lpMintUrl = `https://solscan.io/token/${lpMintAddress}?cluster=devnet`

  // Hàm sao chép vào clipboard
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast.success(`${type} copied to clipboard`)
      },
      () => {
        toast.error('Could not copy text')
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Check className="w-6 h-6 text-green-500" />
            Pool Created Successfully
          </DialogTitle>
          <DialogDescription className="text-base">
            Your liquidity pool has been created successfully and is now available on the Solana
            blockchain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <Alert variant="default" className="bg-green-900/20 text-green-400 border-green-800/50">
            <Check className="h-5 w-5 text-green-500" />
            <AlertTitle className="text-base font-medium">Transaction Confirmed</AlertTitle>
            <AlertDescription className="text-sm">
              Your transaction has been successfully confirmed on the Solana blockchain.
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
                onClick={() => copyToClipboard(txid, 'Transaction ID')}
              >
                {txid}
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
              {/* Pool Address */}
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
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                    Pool Address
                  </h3>
                  <a
                    href={poolUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center text-sm font-medium"
                  >
                    View <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
                <div
                  className="bg-slate-800 p-3 rounded border border-slate-700 font-mono text-sm overflow-hidden text-ellipsis cursor-pointer hover:bg-slate-700 transition-colors text-white"
                  onClick={() => copyToClipboard(poolAddress, 'Pool address')}
                >
                  <div className="truncate">{poolAddress}</div>
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

              {/* LP Token */}
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
                      <circle cx="12" cy="12" r="10"></circle>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    LP Token
                  </h3>
                  <a
                    href={lpMintUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center text-sm font-medium"
                  >
                    View <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
                <div
                  className="bg-slate-800 p-3 rounded border border-slate-700 font-mono text-sm overflow-hidden text-ellipsis cursor-pointer hover:bg-slate-700 transition-colors text-white"
                  onClick={() => copyToClipboard(lpMintAddress, 'LP token address')}
                >
                  <div className="truncate">{lpMintAddress}</div>
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
            onClick={() => window.open(poolUrl, '_blank')}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            View Pool Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CreatePoolDialog(props: CreatePoolDialogProps) {
  const { _open: open, onOpenChange } = props
  const { connected: isConnected } = useWallet()
  const { setVisible } = useWalletModal()
  const { tokens } = useWalletTokens()
  const { createPool, error: poolCreationError } = usePoolCreation()

  const [poolType, setPoolType] = useState<'standard' | 'custom'>('standard')
  const [tokenAMint, setTokenAMint] = useState('')
  const [tokenBMint, setTokenBMint] = useState('')
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  const [creatingPool, setCreatingPool] = useState(false)

  // Thêm state cho dialog thành công
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [createdPoolInfo, setCreatedPoolInfo] = useState<{
    txid: string
    poolAddress: string
    lpMintAddress: string
  } | null>(null)

  useEffect(() => {
    if (poolCreationError) {
      toast.error(`Pool creation error: ${poolCreationError}`)
    }
  }, [poolCreationError])

  const tokenA = tokens.find(token => token.mint === tokenAMint)
  const tokenB = tokens.find(token => token.mint === tokenBMint)

  const handleConnectWallet = async () => {
    try {
      setVisible(true)
    } catch (error) {
      toast.error('Failed to open wallet selector. Please try again.')
    }
  }

  const handleCreatePool = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    try {
      setCreatingPool(true)

      const tokenA = tokens.find(t => t.mint === tokenAMint)
      const tokenB = tokens.find(t => t.mint === tokenBMint)

      if (!tokenA || !tokenB) {
        toast.error('Token accounts not found')
        return
      }

      if (!tokenA.address || !tokenB.address) {
        toast.error('Token account addresses not found')
        return
      }

      const decimalsA = tokenA.decimals
      const decimalsB = tokenB.decimals

      const parsedAmountA = parseFloat(amountA) * Math.pow(10, decimalsA)
      const parsedAmountB = parseFloat(amountB) * Math.pow(10, decimalsB)

      const result = await createPool({
        token0Mint: tokenAMint,
        token1Mint: tokenBMint,
        token0Account: tokenA.address,
        token1Account: tokenB.address,
        initAmount0: parsedAmountA.toString(),
        initAmount1: parsedAmountB.toString(),
      })

      // Lưu thông tin pool đã tạo và hiển thị dialog thành công
      setCreatedPoolInfo({
        txid: result.txid,
        poolAddress: result.poolAddress,
        lpMintAddress: result.lpMintAddress,
      })

      // Đóng dialog tạo pool
      onOpenChange(false)

      // Mở dialog thành công
      setSuccessDialogOpen(true)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create pool')
    } finally {
      setCreatingPool(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Liquidity Pool</DialogTitle>
            <DialogDescription>
              Create a new liquidity pool to enable trading between two tokens
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={poolType}
            onValueChange={value => setPoolType(value as 'standard' | 'custom')}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="standard">Standard Pool</TabsTrigger>
              <TabsTrigger value="custom">Custom Pool</TabsTrigger>
            </TabsList>

            <TabsContent value="standard" className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tokenA">Token A</Label>
                  <TokenSelect
                    value={tokenAMint}
                    onChange={value => setTokenAMint(value)}
                    excludeToken={tokenBMint}
                    placeholder="Select token A"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tokenB">Token B</Label>
                  <TokenSelect
                    value={tokenBMint}
                    onChange={value => setTokenBMint(value)}
                    excludeToken={tokenAMint}
                    placeholder="Select token B"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amountA">Amount A</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="amountA"
                      type="number"
                      placeholder="0.0"
                      value={amountA}
                      onChange={e => setAmountA(e.target.value)}
                    />
                    {tokenA && (
                      <Badge variant="outline" className="whitespace-nowrap">
                        Balance: {tokenA.balance.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amountB">Amount B</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="amountB"
                      type="number"
                      placeholder="0.0"
                      value={amountB}
                      onChange={e => setAmountB(e.target.value)}
                    />
                    {tokenB && (
                      <Badge variant="outline" className="whitespace-nowrap">
                        Balance: {tokenB.balance.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customTokenA">Custom Token A Address</Label>
                  <Input
                    id="customTokenA"
                    placeholder="Enter token mint address"
                    value={tokenAMint}
                    onChange={e => setTokenAMint(e.target.value)}
                    disabled={creatingPool}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customTokenB">Custom Token B Address</Label>
                  <Input
                    id="customTokenB"
                    placeholder="Enter token mint address"
                    value={tokenBMint}
                    onChange={e => setTokenBMint(e.target.value)}
                    disabled={creatingPool}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customAmountA">Amount A</Label>
                  <Input
                    id="customAmountA"
                    type="number"
                    placeholder="0.0"
                    value={amountA}
                    onChange={e => setAmountA(e.target.value)}
                    disabled={creatingPool}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customAmountB">Amount B</Label>
                  <Input
                    id="customAmountB"
                    type="number"
                    placeholder="0.0"
                    value={amountB}
                    onChange={e => setAmountB(e.target.value)}
                    disabled={creatingPool}
                  />
                </div>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Advanced Settings</h4>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {tokenAMint && tokenBMint && amountA && amountB && (
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-medium mb-3">Pool Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Pool Type:</span>
                    <Badge variant={poolType === 'standard' ? 'default' : 'secondary'}>
                      {poolType === 'standard' ? 'Standard' : 'Custom'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Tokens:</span>
                    <span>
                      {tokenA?.symbol || tokenAMint.slice(0, 6)} /{' '}
                      {tokenB?.symbol || tokenBMint.slice(0, 6)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Initial Liquidity:</span>
                    <span>
                      {amountA} {tokenA?.symbol || ''} + {amountB} {tokenB?.symbol || ''}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creatingPool}>
              Cancel
            </Button>
            {!isConnected ? (
              <Button onClick={handleConnectWallet} className="w-full">
                Connect Wallet
              </Button>
            ) : (
              <Button
                onClick={handleCreatePool}
                className="w-full"
                disabled={creatingPool || !tokenAMint || !tokenBMint || !amountA || !amountB}
              >
                {creatingPool ? 'Creating Pool...' : 'Create Pool'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {createdPoolInfo && (
        <SuccessDialog
          _open={successDialogOpen}
          onOpenChange={setSuccessDialogOpen}
          txid={createdPoolInfo.txid}
          poolAddress={createdPoolInfo.poolAddress}
          lpMintAddress={createdPoolInfo.lpMintAddress}
        />
      )}
    </>
  )
}
