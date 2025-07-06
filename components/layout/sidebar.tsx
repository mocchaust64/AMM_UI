'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  BarChart3,
  Globe,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  Wallet,
  ArrowLeftRight,
  Droplets,
  TrendingUp,
  PieChart,
  Search,
  Coins,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/contexts/language-context'

const navigation = [
  { name: 'nav.dashboard', href: '/', icon: LayoutDashboard },
  { name: 'nav.swap', href: '/swap', icon: ArrowLeftRight },
  { name: 'nav.liquidity', href: '/liquidity', icon: Droplets },
  { name: 'nav.farming', href: '/farming', icon: TrendingUp },
  { name: 'nav.trading', href: '/trading', icon: BarChart3 },
  { name: 'nav.portfolio', href: '/portfolio', icon: PieChart },
  { name: 'nav.analytics', href: '/analytics', icon: Globe },
  { name: 'nav.tokens', href: '/tokens', icon: Coins },
]

export function Sidebar() {
  const pathname = usePathname()
  const { t } = useLanguage()

  return (
    <aside className="w-64 border-r bg-background/50 backdrop-blur">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Wallet className="h-6 w-6 text-primary" />
        <span className="font-bold text-xl">MoonDex</span>
      </div>

      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tokens, pools..." className="pl-10 bg-background/50" />
        </div>
      </div>

      <nav className="space-y-1 px-2">
        {navigation.map(item => {
          const isActive = pathname === item.href
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-3"
              >
                <item.icon className="h-4 w-4" />
                {t(item.name)}
              </Button>
            </Link>
          )
        })}
      </nav>

      <div className="mt-8 px-2">
        <div className="space-y-1">
          <Link href="/support">
            <Button variant="ghost" className="w-full justify-start gap-3">
              <LifeBuoy className="h-4 w-4" />
              {t('nav.support')}
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost" className="w-full justify-start gap-3">
              <Settings className="h-4 w-4" />
              {t('nav.settings')}
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  )
}
