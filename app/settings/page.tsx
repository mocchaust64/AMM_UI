'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useSettings } from '@/lib/contexts/settings-context'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import {
  User,
  Shield,
  Palette,
  Globe,
  Wallet,
  Bell,
  Download,
  Trash2,
  AlertTriangle,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const {
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
  } = useSettings()

  const { connected, disconnect, wallet } = useWallet()
  const { setVisible } = useWalletModal()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const handleSaveProfile = () => {
    toast.success('Profile settings saved!')
  }

  const handleSaveRegion = () => {
    toast.success('Language & region settings saved!')
  }

  const handleDisconnectWallet = () => {
    disconnect()
    toast.success('Wallet disconnected')
  }

  const handleConnectWallet = () => {
    setVisible(true)
  }

  const handleResetSettings = () => {
    if (showResetConfirm) {
      resetSettings()
      setShowResetConfirm(false)
      toast.success('All settings have been reset to default')
    } else {
      setShowResetConfirm(true)
      setTimeout(() => setShowResetConfirm(false), 5000)
    }
  }

  const handleExportSettings = () => {
    exportSettings()
    toast.success('Settings exported successfully!')
  }

  const accentColors = [
    { name: 'blue', color: 'bg-blue-500', value: 'blue' },
    { name: 'green', color: 'bg-green-500', value: 'green' },
    { name: 'purple', color: 'bg-purple-500', value: 'purple' },
    { name: 'orange', color: 'bg-orange-500', value: 'orange' },
    { name: 'red', color: 'bg-red-500', value: 'red' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">Settings</h1>
              <p className="text-muted-foreground">
                Manage your account preferences and security settings
              </p>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
              <TabsList>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Profile Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={profile.username}
                          onChange={e => updateProfile({ username: e.target.value })}
                          placeholder="Enter username"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profile.email}
                          onChange={e => updateProfile({ email: e.target.value })}
                          placeholder="Enter email"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Input
                        id="bio"
                        value={profile.bio}
                        onChange={e => updateProfile({ bio: e.target.value })}
                        placeholder="Tell us about yourself"
                      />
                    </div>

                    <Button onClick={handleSaveProfile} className="gap-2">
                      <Save className="h-4 w-4" />
                      Save Changes
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Language & Region
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Language</Label>
                        <Select
                          value={region.language}
                          onValueChange={value => updateRegion({ language: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="vi">Tiếng Việt</SelectItem>
                            <SelectItem value="zh">中文</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Select
                          value={region.currency}
                          onValueChange={value => updateRegion({ currency: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="usd">USD ($)</SelectItem>
                            <SelectItem value="eur">EUR (€)</SelectItem>
                            <SelectItem value="jpy">JPY (¥)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Timezone</Label>
                      <Select
                        value={region.timezone}
                        onValueChange={value => updateRegion({ timezone: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="utc">UTC</SelectItem>
                          <SelectItem value="est">EST</SelectItem>
                          <SelectItem value="pst">PST</SelectItem>
                          <SelectItem value="jst">JST</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button onClick={handleSaveRegion} className="gap-2">
                      <Save className="h-4 w-4" />
                      Save Changes
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Connected Wallets
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {connected ? (
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                            <Wallet className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium">
                              {wallet?.adapter.name || 'Unknown Wallet'}
                            </h4>
                            <p className="text-sm text-muted-foreground">Connected</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Connected</Badge>
                          <Button size="sm" variant="outline" onClick={handleDisconnectWallet}>
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">No wallet connected</p>
                        <Button variant="outline" onClick={handleConnectWallet}>
                          Connect Wallet
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Security Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Transaction Confirmation</Label>
                        <p className="text-sm text-muted-foreground">
                          Require confirmation for all transactions
                        </p>
                      </div>
                      <Switch
                        checked={security.transactionConfirmation}
                        onCheckedChange={checked =>
                          updateSecurity({ transactionConfirmation: checked })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto-lock Wallet</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically disconnect after inactivity
                        </p>
                      </div>
                      <Switch
                        checked={security.autoLockWallet}
                        onCheckedChange={checked => updateSecurity({ autoLockWallet: checked })}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Auto-lock Duration</Label>
                      <Select
                        value={security.autoLockDuration.toString()}
                        onValueChange={value =>
                          updateSecurity({ autoLockDuration: Number.parseInt(value) })
                        }
                        disabled={!security.autoLockWallet}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="0">Never</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Hide Small Balances</Label>
                        <p className="text-sm text-muted-foreground">
                          Hide tokens with balance less than $1
                        </p>
                      </div>
                      <Switch
                        checked={security.hideSmallBalances}
                        onCheckedChange={checked => updateSecurity({ hideSmallBalances: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-500">
                      <AlertTriangle className="h-5 w-5" />
                      Danger Zone
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950/20">
                      <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                        Clear All Data
                      </h4>
                      <p className="text-sm text-red-600 dark:text-red-300 mb-3">
                        This will remove all your settings, preferences, and cached data. This
                        action cannot be undone.
                      </p>
                      <Button
                        variant={showResetConfirm ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={handleResetSettings}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {showResetConfirm ? 'Click again to confirm' : 'Clear All Data'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notification Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Transaction Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when transactions complete
                        </p>
                      </div>
                      <Switch
                        checked={notifications.transactionNotifications}
                        onCheckedChange={checked =>
                          updateNotifications({ transactionNotifications: checked })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Price Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Notifications for significant price changes
                        </p>
                      </div>
                      <Switch
                        checked={notifications.priceAlerts}
                        onCheckedChange={checked => updateNotifications({ priceAlerts: checked })}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Farming Rewards</Label>
                        <p className="text-sm text-muted-foreground">
                          Notifications when rewards are available
                        </p>
                      </div>
                      <Switch
                        checked={notifications.farmingRewards}
                        onCheckedChange={checked =>
                          updateNotifications({ farmingRewards: checked })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Security Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Important security notifications
                        </p>
                      </div>
                      <Switch
                        checked={notifications.securityAlerts}
                        onCheckedChange={checked =>
                          updateNotifications({ securityAlerts: checked })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Marketing Updates</Label>
                        <p className="text-sm text-muted-foreground">
                          News and feature announcements
                        </p>
                      </div>
                      <Switch
                        checked={notifications.marketingUpdates}
                        onCheckedChange={checked =>
                          updateNotifications({ marketingUpdates: checked })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Notification Methods</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Browser Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Show notifications in your browser
                        </p>
                      </div>
                      <Switch
                        checked={notifications.browserNotifications}
                        onCheckedChange={checked =>
                          updateNotifications({ browserNotifications: checked })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Send notifications to your email
                        </p>
                      </div>
                      <Switch
                        checked={notifications.emailNotifications}
                        onCheckedChange={checked =>
                          updateNotifications({ emailNotifications: checked })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="appearance" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Theme Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Theme</Label>
                      <Select
                        value={appearance.theme}
                        onValueChange={value => updateAppearance({ theme: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Accent Color</Label>
                      <div className="flex gap-2">
                        {accentColors.map(color => (
                          <button
                            key={color.value}
                            onClick={() => updateAppearance({ accentColor: color.value as any })}
                            className={`w-8 h-8 ${color.color} rounded-full border-2 ${
                              appearance.accentColor === color.value
                                ? 'border-foreground'
                                : 'border-transparent'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Compact Mode</Label>
                        <p className="text-sm text-muted-foreground">Reduce spacing and padding</p>
                      </div>
                      <Switch
                        checked={appearance.compactMode}
                        onCheckedChange={checked => updateAppearance({ compactMode: checked })}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show Animations</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable smooth transitions and animations
                        </p>
                      </div>
                      <Switch
                        checked={appearance.showAnimations}
                        onCheckedChange={checked => updateAppearance({ showAnimations: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Display Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Number Format</Label>
                      <Select
                        value={appearance.numberFormat}
                        onValueChange={value => updateAppearance({ numberFormat: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">1,234.56</SelectItem>
                          <SelectItem value="compact">1.23K</SelectItem>
                          <SelectItem value="scientific">1.23e3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Decimal Places</Label>
                      <Select
                        value={appearance.decimalPlaces.toString()}
                        onValueChange={value =>
                          updateAppearance({ decimalPlaces: Number.parseInt(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="6">6</SelectItem>
                          <SelectItem value="8">8</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show USD Values</Label>
                        <p className="text-sm text-muted-foreground">
                          Display USD equivalent for all tokens
                        </p>
                      </div>
                      <Switch
                        checked={appearance.showUsdValues}
                        onCheckedChange={checked => updateAppearance({ showUsdValues: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Advanced Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>RPC Endpoint</Label>
                      <Select
                        value={advanced.rpcEndpoint}
                        onValueChange={value => updateAdvanced({ rpcEndpoint: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mainnet">Mainnet Beta</SelectItem>
                          <SelectItem value="devnet">Devnet</SelectItem>
                          <SelectItem value="testnet">Testnet</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Slippage Tolerance (%)</Label>
                      <div className="flex gap-2">
                        {[0.1, 0.5, 1.0, 3.0].map(value => (
                          <Button
                            key={value}
                            size="sm"
                            variant={advanced.slippageTolerance === value ? 'default' : 'outline'}
                            onClick={() => updateAdvanced({ slippageTolerance: value })}
                          >
                            {value}%
                          </Button>
                        ))}
                        <Input
                          placeholder="Custom"
                          className="w-20"
                          type="number"
                          step="0.1"
                          value={advanced.slippageTolerance}
                          onChange={e =>
                            updateAdvanced({
                              slippageTolerance: Number.parseFloat(e.target.value) || 1.0,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Transaction Deadline</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          className="w-20"
                          type="number"
                          value={advanced.transactionDeadline}
                          onChange={e =>
                            updateAdvanced({
                              transactionDeadline: Number.parseInt(e.target.value) || 20,
                            })
                          }
                        />
                        <span className="text-sm text-muted-foreground">minutes</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Expert Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable advanced trading features
                        </p>
                      </div>
                      <Switch
                        checked={advanced.expertMode}
                        onCheckedChange={checked => updateAdvanced({ expertMode: checked })}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Debug Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Show additional debugging information
                        </p>
                      </div>
                      <Switch
                        checked={advanced.debugMode}
                        onCheckedChange={checked => updateAdvanced({ debugMode: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Data & Privacy</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Analytics</Label>
                        <p className="text-sm text-muted-foreground">
                          Help improve the platform by sharing usage data
                        </p>
                      </div>
                      <Switch
                        checked={advanced.analytics}
                        onCheckedChange={checked => updateAdvanced({ analytics: checked })}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Crash Reports</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically send crash reports
                        </p>
                      </div>
                      <Switch
                        checked={advanced.crashReports}
                        onCheckedChange={checked => updateAdvanced({ crashReports: checked })}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label>Export Data</Label>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleExportSettings}>
                          <Download className="h-4 w-4 mr-2" />
                          Export Settings
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Export Transactions
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  )
}
