'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getDetailTokenExtensions } from '@/lib/service/tokenService'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

interface TokenExtensionInfoProps {
  tokenMint: string | undefined
}

export function TokenExtensionInfo({ tokenMint }: TokenExtensionInfoProps) {
  const [extensionInfo, setExtensionInfo] = useState<TokenExtensionDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    async function fetchTokenExtensions() {
      if (!tokenMint || tokenMint === 'SOL') {
        setExtensionInfo(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const extensions = await getDetailTokenExtensions(tokenMint)
        setExtensionInfo(extensions)
      } catch (err: unknown) {
        console.error('Lỗi khi lấy thông tin token extension:', err)
        setError(err instanceof Error ? err.message : 'Không thể lấy thông tin extension')
      } finally {
        setLoading(false)
      }
    }

    if (isExpanded) {
      fetchTokenExtensions()
    }
  }, [tokenMint, isExpanded])

  if (!tokenMint || tokenMint === 'SOL') {
    return null
  }

  return (
    <div className="mt-2">
      <Button
        variant="ghost"
        size="sm"
        className="w-full flex justify-between items-center p-2 h-8 text-xs"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>Thông tin Token Extension</span>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {isExpanded && (
        <Card className="w-full mt-2">
          <CardContent className="p-3">
            {loading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-xs">Đang tải...</span>
              </div>
            ) : error ? (
              <div className="text-xs text-red-500 py-1">{error}</div>
            ) : !extensionInfo ? (
              <div className="text-xs text-muted-foreground py-1">
                Token này không có extension hoặc không phải Token-2022
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <h4 className="text-xs font-medium mb-1">Extensions:</h4>
                  <div className="flex flex-wrap gap-1">
                    {extensionInfo.extensions && extensionInfo.extensions.length > 0 ? (
                      extensionInfo.extensions.map((ext: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {ext}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Không có extension</span>
                    )}
                  </div>
                </div>

                {extensionInfo.transferHook && (
                  <div>
                    <h4 className="text-xs font-medium mb-1">Transfer Hook:</h4>
                    <div className="text-xs space-y-1">
                      <div className="grid grid-cols-3 gap-1">
                        <span className="text-muted-foreground">Authority:</span>
                        <span className="font-mono text-[10px] col-span-2 truncate">
                          {extensionInfo.transferHook.authority}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <span className="text-muted-foreground">Program ID:</span>
                        <span className="font-mono text-[10px] col-span-2 truncate">
                          {extensionInfo.transferHook.programId}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
