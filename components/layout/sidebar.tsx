'use client'

import { Button } from '@/components/ui/button'
import { LifeBuoy, ArrowLeftRight, Droplets } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/contexts/language-context'

const navigation = [
  { name: 'nav.swap', href: '/swap', icon: ArrowLeftRight },
  { name: 'nav.liquidity', href: '/liquidity', icon: Droplets },
]

export function Sidebar() {
  const pathname = usePathname()
  const { t } = useLanguage()

  return (
    <aside className="w-64 border-r bg-background/50 backdrop-blur">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="relative h-8 w-8">
          <Image
            src="/logo.png"
            alt="MoonDex Logo"
            width={32}
            height={32}
            className="object-contain"
            priority
          />
        </div>
        <span className="font-bold text-xl">MoonDex</span>
      </div>

      {/* <div className="p-12"> */}
      {/* <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tokens, pools..." className="pl-10 bg-background/50" />
        </div> */}
      {/* </div> */}

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
        </div>
      </div>
    </aside>
  )
}
