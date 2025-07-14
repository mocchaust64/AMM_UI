'use client'

import type React from 'react'
import { createContext, useContext, useState, useEffect } from 'react'

type Language = 'en' | 'vi' | 'zh'

type LanguageContextType = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
  en: {
    'nav.swap': 'Swap',
    'nav.liquidity': 'Liquidity',
    'nav.support': 'Support',
    'wallet.connect': 'Connect Wallet',
    'wallet.disconnect': 'Disconnect',
    'wallet.copy': 'Copy Address',
    'wallet.explorer': 'View on Explorer',
    'swap.title': 'Token Swap',
    'swap.from': 'From',
    'swap.to': 'To',
    'swap.balance': 'Balance',
    'swap.rate': 'Rate',
    'swap.slippage': 'Slippage Tolerance',
    'swap.minimum': 'Minimum Received',
    'swap.route': 'Route',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
  },
  vi: {
    'nav.swap': 'Hoán đổi',
    'nav.liquidity': 'Thanh khoản',
    'nav.support': 'Hỗ trợ',
    'wallet.connect': 'Kết nối ví',
    'wallet.disconnect': 'Ngắt kết nối',
    'wallet.copy': 'Sao chép địa chỉ',
    'wallet.explorer': 'Xem trên Explorer',
    'swap.title': 'Hoán đổi Token',
    'swap.from': 'Từ',
    'swap.to': 'Đến',
    'swap.route': 'Đường dẫn',
    'common.loading': 'Đang tải...',
    'common.error': 'Lỗi',
    'common.success': 'Thành công',
  },
  zh: {
    'nav.swap': '交换',
    'nav.liquidity': '流动性',
    'nav.farming': '挖矿',
    'nav.support': '支持',
    'wallet.connect': '连接钱包',
    'wallet.disconnect': '断开连接',
    'wallet.copy': '复制地址',
    'wallet.explorer': '在浏览器中查看',
    'swap.title': '代币交换',
    'swap.from': '从',
    'swap.to': '到',
    'swap.balance': '余额',
    'swap.rate': '汇率',
    'swap.slippage': '滑点容忍度',
    'swap.minimum': '最少收到',
    'swap.route': '路径',
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
  },
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  useEffect(() => {
    // Always set to English regardless of stored preference
    localStorage.setItem('language', 'en')
  }, [])

  const handleSetLanguage = (lang: Language) => {
    localStorage.setItem('language', lang)
    setLanguage(lang)
  }

  const t = (key: string): string => {
    return translations[language][key as keyof (typeof translations)[typeof language]] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
