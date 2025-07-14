'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Globe, Moon, Sun, Wallet, Copy, ExternalLink } from 'lucide-react'
import { useTheme } from '@/lib/contexts/theme-context'
import { useLanguage } from '@/lib/contexts/language-context'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { toast } from 'sonner'
import Image from 'next/image'

export function Header() {
  const { theme, setTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()
  const { connected, publicKey, disconnect } = useWallet()
  const { setVisible } = useWalletModal()

  const address = publicKey?.toBase58()

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      toast.success('Address copied to clipboard!')
    }
  }

  const handleConnectWallet = async () => {
    try {
      setVisible(true)
    } catch (error) {
      toast.error('Failed to open wallet selector')
    }
  }

  const handleDisconnect = () => {
    disconnect()
    toast.success('Wallet disconnected')
  }

  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10"></div>
          <div>
            <h1 className="text-xl font-semibold">MoonDex</h1>
            <p className="text-sm text-muted-foreground">Solana Network</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
          <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
          Connected
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        {/* Language Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Globe className="h-4 w-4 mr-2" />
              {language.toUpperCase()}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setLanguage('en')}>English</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('vi')}>Tiếng Việt</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('zh')}>中文</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        {/* Wallet Connection */}
        {connected && address ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-transparent">
                <Wallet className="h-4 w-4" />
                {address.slice(0, 4)}...{address.slice(-4)}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyAddress}>
                <Copy className="h-4 w-4 mr-2" />
                {t('wallet.copy')}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('wallet.explorer')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDisconnect}>
                {t('wallet.disconnect')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button className="gap-2" onClick={handleConnectWallet}>
            <Wallet className="h-4 w-4" />
            {t('wallet.connect')}
          </Button>
        )}
      </div>
    </header>
  )
}
