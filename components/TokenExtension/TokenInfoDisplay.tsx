'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { TokenData } from '@/hooks/useWalletTokens'
import { ExternalLink, Loader2, Info } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getDetailTokenExtensions } from '@/lib/service/tokenService'
import { TokenExtensionDialog } from './TokenExtensionDialog'

// Định nghĩa kiểu dữ liệu cho thông tin extension
interface TokenExtensionDetails {
  isToken2022?: boolean
  extensions?: string[]
  transferHook?: {
    authority: string
    programId: string
  } | null
  error?: string
}

interface TokenInfoDisplayProps {
  token?: TokenData | null
  title?: string
}

export function TokenIconDisplay({
  token,
}: {
  token: { symbol: string; icon: string; name?: string }
}) {
  return (
    <div className="flex items-center space-x-2">
      <div className="h-full w-full overflow-hidden bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
        {token.icon ? (
          <Image
            src={token.icon}
            alt={token.symbol}
            width={32}
            height={32}
            className="w-full h-full object-cover app-logo"
          />
        ) : (
          <div className="text-white font-semibold text-xs">{token.symbol.slice(0, 2)}</div>
        )}
      </div>
    </div>
  )
}

export function TokenInfoDisplay({ token }: TokenInfoDisplayProps) {
  const [extensionInfo, setExtensionInfo] = useState<TokenExtensionDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    async function fetchTokenExtensions() {
      if (!token || token.mint === 'SOL' || !token.isToken2022) {
        setExtensionInfo(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const extensions = await getDetailTokenExtensions(token.mint)
        setExtensionInfo(extensions)
      } catch (err: unknown) {
        console.error('Error fetching token extensions:', err)
        setError(err instanceof Error ? err.message : 'Could not fetch extension information')
      } finally {
        setLoading(false)
      }
    }

    // Only find extensions for token-2022
    if (token && token.mint !== 'SOL' && token.isToken2022) {
      fetchTokenExtensions()
    } else {
      setExtensionInfo(null)
      setLoading(false)
      setError(null)
    }
  }, [token])

  if (!token) {
    return (
      <Card className="p-4 flex items-center justify-center text-muted-foreground">
        No token selected
      </Card>
    )
  }

  // Function to shorten address
  const shortenAddress = (address: string) => {
    if (!address || address === 'SOL') return address
    return `${address.slice(0, 6)}...${address.slice(-6)}`
  }

  return (
    <Card className="bg-background border-0 shadow-md p-4 rounded-xl">
      <div className="flex items-center space-x-4">
        <div className="h-12 w-12 rounded-full overflow-hidden bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
          {token.icon ? (
            <Image
              src={token.icon}
              alt={token.symbol}
              width={48}
              height={48}
              className="w-full h-full object-cover app-logo"
            />
          ) : (
            <div className="text-white font-semibold text-lg">{token.symbol.slice(0, 2)}</div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">{token.symbol}</h3>
            {token.isToken2022 && (
              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                Token 2022
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{token.name}</p>

          <div className="mt-1 flex items-center gap-2">
            <a
              href={`https://solscan.io/token/${token.mint === 'SOL' ? 'So11111111111111111111111111111111111111112' : token.mint}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
            >
              <span>{shortenAddress(token.mint)}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <div className="text-xl font-bold">{token.balance.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">~${(token.balance * 10).toFixed(2)}</div>

          {token.mint !== 'SOL' && (
            <Button
              variant="ghost"
              size="sm"
              className="px-2 h-8 mt-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
              onClick={() => setDialogOpen(true)}
            >
              <Info className="h-4 w-4 mr-1" />
              Details
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="bg-muted/50 p-2 rounded-md">
          <span className="text-muted-foreground">Decimals:</span> {token.decimals}
        </div>
        <div className="bg-muted/50 p-2 rounded-md">
          <span className="text-muted-foreground">Type:</span>{' '}
          {token.isToken2022 ? 'Token-2022' : 'SPL Token'}
        </div>
      </div>

      {/* Chỉ hiển thị phần Extensions cho token-2022 */}
      {token.isToken2022 && token.mint !== 'SOL' && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium mb-2">Extensions</h4>
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
          </div>

          {error ? (
            <p className="text-xs text-red-500">{error}</p>
          ) : extensionInfo?.extensions && extensionInfo.extensions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {extensionInfo.extensions.map((ext: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs py-0.5">
                  {ext}
                </Badge>
              ))}
            </div>
          ) : (
            !loading && <p className="text-xs text-muted-foreground">No extensions found</p>
          )}
        </div>
      )}

      {/* Dialog to display detailed information */}
      <TokenExtensionDialog
        token={token}
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </Card>
  )
}
