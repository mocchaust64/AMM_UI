"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export type Theme = "light" | "dark" | "system"
export type Language = "en" | "vi" | "zh"
export type Currency = "usd" | "eur" | "jpy"
export type NumberFormat = "standard" | "compact" | "scientific"
export type AccentColor = "blue" | "green" | "purple" | "orange" | "red"

interface ProfileSettings {
  username: string
  email: string
  bio: string
}

interface RegionSettings {
  language: Language
  currency: Currency
  timezone: string
}

interface SecuritySettings {
  transactionConfirmation: boolean
  autoLockWallet: boolean
  autoLockDuration: number
  hideSmallBalances: boolean
}

interface NotificationSettings {
  transactionNotifications: boolean
  priceAlerts: boolean
  farmingRewards: boolean
  securityAlerts: boolean
  marketingUpdates: boolean
  browserNotifications: boolean
  emailNotifications: boolean
}

interface AppearanceSettings {
  theme: Theme
  accentColor: AccentColor
  compactMode: boolean
  showAnimations: boolean
  numberFormat: NumberFormat
  decimalPlaces: number
  showUsdValues: boolean
}

interface AdvancedSettings {
  rpcEndpoint: string
  slippageTolerance: number
  transactionDeadline: number
  expertMode: boolean
  debugMode: boolean
  analytics: boolean
  crashReports: boolean
}

interface SettingsContextType {
  profile: ProfileSettings
  region: RegionSettings
  security: SecuritySettings
  notifications: NotificationSettings
  appearance: AppearanceSettings
  advanced: AdvancedSettings
  updateProfile: (profile: Partial<ProfileSettings>) => void
  updateRegion: (region: Partial<RegionSettings>) => void
  updateSecurity: (security: Partial<SecuritySettings>) => void
  updateNotifications: (notifications: Partial<NotificationSettings>) => void
  updateAppearance: (appearance: Partial<AppearanceSettings>) => void
  updateAdvanced: (advanced: Partial<AdvancedSettings>) => void
  resetSettings: () => void
  exportSettings: () => void
}

const defaultSettings = {
  profile: {
    username: "",
    email: "",
    bio: "",
  },
  region: {
    language: "en" as Language,
    currency: "usd" as Currency,
    timezone: "utc",
  },
  security: {
    transactionConfirmation: true,
    autoLockWallet: true,
    autoLockDuration: 30,
    hideSmallBalances: false,
  },
  notifications: {
    transactionNotifications: true,
    priceAlerts: true,
    farmingRewards: true,
    securityAlerts: true,
    marketingUpdates: false,
    browserNotifications: true,
    emailNotifications: false,
  },
  appearance: {
    theme: "dark" as Theme,
    accentColor: "blue" as AccentColor,
    compactMode: false,
    showAnimations: true,
    numberFormat: "standard" as NumberFormat,
    decimalPlaces: 6,
    showUsdValues: true,
  },
  advanced: {
    rpcEndpoint: "mainnet",
    slippageTolerance: 1.0,
    transactionDeadline: 20,
    expertMode: false,
    debugMode: false,
    analytics: true,
    crashReports: true,
  },
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ProfileSettings>(defaultSettings.profile)
  const [region, setRegion] = useState<RegionSettings>(defaultSettings.region)
  const [security, setSecurity] = useState<SecuritySettings>(defaultSettings.security)
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultSettings.notifications)
  const [appearance, setAppearance] = useState<AppearanceSettings>(defaultSettings.appearance)
  const [advanced, setAdvanced] = useState<AdvancedSettings>(defaultSettings.advanced)

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("MoonDex-settings")
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setProfile((prev) => ({ ...prev, ...parsed.profile }))
        setRegion((prev) => ({ ...prev, ...parsed.region }))
        setSecurity((prev) => ({ ...prev, ...parsed.security }))
        setNotifications((prev) => ({ ...prev, ...parsed.notifications }))
        setAppearance((prev) => ({ ...prev, ...parsed.appearance }))
        setAdvanced((prev) => ({ ...prev, ...parsed.advanced }))
      } catch (error) {
        console.error("Failed to load settings:", error)
      }
    }
  }, [])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    const settings = {
      profile,
      region,
      security,
      notifications,
      appearance,
      advanced,
    }
    localStorage.setItem("MoonDex-settings", JSON.stringify(settings))
  }, [profile, region, security, notifications, appearance, advanced])

  // Apply theme changes to document
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark")

    if (appearance.theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      root.classList.add(systemTheme)
    } else {
      root.classList.add(appearance.theme)
    }

    // Apply accent color
    root.style.setProperty("--primary", getAccentColorValue(appearance.accentColor))
  }, [appearance.theme, appearance.accentColor])

  const getAccentColorValue = (color: AccentColor): string => {
    const colors = {
      blue: "217 91% 60%",
      green: "142 76% 36%",
      purple: "262 83% 58%",
      orange: "25 95% 53%",
      red: "0 84% 60%",
    }
    return colors[color]
  }

  const updateProfile = (newProfile: Partial<ProfileSettings>) => {
    setProfile((prev) => ({ ...prev, ...newProfile }))
  }

  const updateRegion = (newRegion: Partial<RegionSettings>) => {
    setRegion((prev) => ({ ...prev, ...newRegion }))
  }

  const updateSecurity = (newSecurity: Partial<SecuritySettings>) => {
    setSecurity((prev) => ({ ...prev, ...newSecurity }))
  }

  const updateNotifications = (newNotifications: Partial<NotificationSettings>) => {
    setNotifications((prev) => ({ ...prev, ...newNotifications }))
  }

  const updateAppearance = (newAppearance: Partial<AppearanceSettings>) => {
    setAppearance((prev) => ({ ...prev, ...newAppearance }))
  }

  const updateAdvanced = (newAdvanced: Partial<AdvancedSettings>) => {
    setAdvanced((prev) => ({ ...prev, ...newAdvanced }))
  }

  const resetSettings = () => {
    setProfile(defaultSettings.profile)
    setRegion(defaultSettings.region)
    setSecurity(defaultSettings.security)
    setNotifications(defaultSettings.notifications)
    setAppearance(defaultSettings.appearance)
    setAdvanced(defaultSettings.advanced)
    localStorage.removeItem("MoonDex-settings")
  }

  const exportSettings = () => {
    const settings = {
      profile,
      region,
      security,
      notifications,
      appearance,
      advanced,
      exportDate: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `MoonDex-settings-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <SettingsContext.Provider
      value={{
        profile,
        region,
        security,
        notifications,
        appearance,
        advanced,
        updateProfile,
        updateRegion,
        updateSecurity,
        updateNotifications,
        updateAppearance,
        updateAdvanced,
        resetSettings,
        exportSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}
