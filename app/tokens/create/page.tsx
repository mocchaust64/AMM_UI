'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CommonLayout } from '@/components/common-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Coins,
  FileText,
  Info,
  Webhook,
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
  X,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { uploadImageAndGetUrl } from '@/lib/utils/pinata'

interface TokenData {
  name: string
  symbol: string
  decimals: string
  supply: string
  description: string
  image: File | null
  imageUrl: string
  imageBase64?: string
  extensionOptions: Record<string, any>
  websiteUrl: string
  twitterUrl: string
  telegramUrl: string
  discordUrl: string
}

export default function CreateToken() {
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [selectedExtensions, setSelectedExtensions] = useState<string[]>([
    'metadata',
    'metadata-pointer',
    'transfer-hook',
  ])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, Record<string, string>>>(
    {}
  )
  const [formErrors, setFormErrors] = useState<{
    name?: string
    symbol?: string
    decimals?: string
    supply?: string
    image?: string
  }>({})

  const [tokenData, setTokenData] = useState<TokenData>({
    name: '',
    symbol: '',
    decimals: '9',
    supply: '1000000',
    description: '',
    image: null,
    imageUrl: '',
    extensionOptions: {
      'transfer-hook': {
        'program-id': '12BZr6af3s7qf7GGmhBvMd46DWmVNhHfXmCwftfMk1mZ',
      },
    },
    websiteUrl: '',
    twitterUrl: '',
    telegramUrl: '',
    discordUrl: '',
  })

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 500)
  }, [])

  const handleExtensionChange = (extension: string) => {
    if (extension === 'metadata' || extension === 'metadata-pointer') {
      return
    }

    if (selectedExtensions.includes(extension)) {
      setSelectedExtensions(selectedExtensions.filter(e => e !== extension))
    } else {
      setSelectedExtensions([...selectedExtensions, extension])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setTokenData(prev => ({ ...prev, [name]: value }))
  }

  const handleImageUpload = async (file: File) => {
    if (!file) return

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast.error('Image size exceeds 5MB limit')
      return
    }

    try {
      setUploadingImage(true)
      setFormErrors(prev => ({ ...prev, image: undefined }))

      const reader = new FileReader()
      reader.onload = e => {
        setTokenData(prev => ({
          ...prev,
          image: file,
          imageBase64: e.target?.result as string,
        }))
      }
      reader.readAsDataURL(file)

      const imageUrl = await uploadImageAndGetUrl(file)

      if (imageUrl) {
        setTokenData(prev => ({
          ...prev,
          image: file,
          imageUrl,
        }))
      } else {
        toast.error('Failed to upload image')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Error uploading image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleExtensionOptionChange = (
    extension: string,
    optionId: string,
    value: string | number
  ) => {
    setTokenData(prev => ({
      ...prev,
      extensionOptions: {
        ...prev.extensionOptions,
        [extension]: {
          ...(prev.extensionOptions?.[extension] || {}),
          [optionId]: value,
        },
      },
    }))
  }

  const validateTokenData = (): boolean => {
    const errors: Record<string, Record<string, string>> = {}
    const basicErrors: Record<string, string> = {}

    // Validate basic info
    if (!tokenData.name) basicErrors.name = 'Name is required'
    if (!tokenData.symbol) basicErrors.symbol = 'Symbol is required'
    if (!tokenData.decimals) basicErrors.decimals = 'Decimals is required'
    if (!tokenData.supply) basicErrors.supply = 'Supply is required'

    // Add validation for transfer hook if selected
    if (
      selectedExtensions.includes('transfer-hook') &&
      (!tokenData.extensionOptions?.['transfer-hook'] ||
        !tokenData.extensionOptions?.['transfer-hook']['program-id'])
    ) {
      errors['transfer-hook'] = { 'program-id': 'Program ID is required' }
    }

    // Set errors
    if (Object.keys(basicErrors).length > 0) {
      errors.basic = basicErrors
    }

    const isValid = Object.keys(errors).length === 0
    setValidationErrors(errors)

    if (!isValid) {
      if (Object.keys(basicErrors).length > 0) {
        toast.error('Please enter all required token information')
      } else {
        toast.error('Please enter all required extension information')
      }
    }

    return isValid
  }

  // Handle create token
  const handleCreateToken = async () => {
    if (!validateTokenData()) return

    try {
      const dataToSave = {
        ...tokenData,
        selectedExtensions,
      }

      // Save to localStorage
      localStorage.setItem('tokenData', JSON.stringify(dataToSave))

      // Navigate to review page
      router.push('/tokens/create/review')
    } catch (error) {
      console.error('Error saving token data:', error)
      toast.error('An error occurred while saving token data')
    }
  }

  // Check if using whitelist hook
  const isUsingWhitelistHook =
    selectedExtensions.includes('transfer-hook') &&
    tokenData.extensionOptions?.['transfer-hook']?.['program-id'] ===
      '12BZr6af3s7qf7GGmhBvMd46DWmVNhHfXmCwftfMk1mZ'

  // Extensions available
  const tokenExtensions = [
    {
      id: 'metadata',
      name: 'Metadata',
      description: 'Store token information such as name, symbol, and image',
      required: true,
      icon: FileText,
    },
    {
      id: 'metadata-pointer',
      name: 'Metadata Pointer',
      description: 'Reference to off-chain metadata',
      required: true,
      icon: Info,
    },
    {
      id: 'transfer-hook',
      name: 'Transfer Hook',
      description: 'Execute logic when transferring tokens',
      icon: Webhook,
      options: [
        {
          id: 'program-id',
          label: 'Program ID',
          type: 'text',
          placeholder: 'Enter Transfer Hook Program ID',
          required: true,
        },
      ],
    },
  ]

  return (
    <CommonLayout>
      <main className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Create New Token</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/tokens')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Tokens
            </Button>
          </div>

          {/* Improved main card */}
          <Card>
            <CardHeader className="bg-muted/50 border-b">
              <CardTitle className="text-xl font-semibold">Token Information</CardTitle>
              <CardDescription>
                Enter basic information and configure extensions for your token
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-8">
                {/* Basic information */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Basic Information</h3>
                  </div>

                  <div className="grid gap-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="name" className="text-sm font-medium">
                          Token Name
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="Example: Moon Token"
                          value={tokenData.name}
                          onChange={handleInputChange}
                          className={`mt-1.5 ${validationErrors.basic?.name ? 'border-red-500' : ''}`}
                        />
                        {validationErrors.basic?.name && (
                          <p className="text-red-500 text-xs mt-1">{validationErrors.basic.name}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="symbol" className="text-sm font-medium">
                          Symbol
                        </Label>
                        <Input
                          id="symbol"
                          name="symbol"
                          placeholder="Example: MOON"
                          value={tokenData.symbol}
                          onChange={handleInputChange}
                          className={`mt-1.5 ${validationErrors.basic?.symbol ? 'border-red-500' : ''}`}
                        />
                        {validationErrors.basic?.symbol && (
                          <p className="text-red-500 text-xs mt-1">
                            {validationErrors.basic.symbol}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="decimals" className="text-sm font-medium">
                          Decimals
                        </Label>
                        <Input
                          id="decimals"
                          name="decimals"
                          placeholder="9"
                          value={tokenData.decimals}
                          onChange={handleInputChange}
                          className={`mt-1.5 ${validationErrors.basic?.decimals ? 'border-red-500' : ''}`}
                        />
                        {validationErrors.basic?.decimals && (
                          <p className="text-red-500 text-xs mt-1">
                            {validationErrors.basic.decimals}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="supply" className="text-sm font-medium">
                          Total Supply
                        </Label>
                        <Input
                          id="supply"
                          name="supply"
                          placeholder="1000000"
                          value={tokenData.supply}
                          onChange={handleInputChange}
                          className={`mt-1.5 ${validationErrors.basic?.supply ? 'border-red-500' : ''}`}
                        />
                        {validationErrors.basic?.supply && (
                          <p className="text-red-500 text-xs mt-1">
                            {validationErrors.basic.supply}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-sm font-medium">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        name="description"
                        placeholder="Describe your token"
                        value={tokenData.description}
                        onChange={handleInputChange}
                        rows={3}
                        className="mt-1.5"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="websiteUrl" className="text-sm font-medium">
                          Website URL (Optional)
                        </Label>
                        <Input
                          id="websiteUrl"
                          name="websiteUrl"
                          placeholder="https://your-website.com"
                          value={tokenData.websiteUrl}
                          onChange={handleInputChange}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="twitterUrl" className="text-sm font-medium">
                          Twitter URL (Optional)
                        </Label>
                        <Input
                          id="twitterUrl"
                          name="twitterUrl"
                          placeholder="https://twitter.com/yourusername"
                          value={tokenData.twitterUrl}
                          onChange={handleInputChange}
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Token Image */}
                <div className="space-y-5 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Token Image</h3>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <div className="mt-2 w-full max-w-[200px]">
                      {tokenData.imageUrl ? (
                        <div className="relative w-full aspect-square rounded-full border overflow-hidden bg-muted/30">
                          <img
                            src={tokenData.imageUrl}
                            alt="Token preview"
                            className="w-full h-full object-cover"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full"
                            onClick={() =>
                              setTokenData(prev => ({
                                ...prev,
                                imageUrl: '',
                                imageBase64: '',
                                image: null,
                              }))
                            }
                          >
                            <span className="sr-only">Remove</span>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-full p-12 text-center hover:border-primary/50 transition-all w-full aspect-square flex flex-col items-center justify-center">
                          <ImageIcon className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                          <div className="space-y-2">
                            <div className="font-medium">
                              {uploadingImage ? 'Uploading...' : 'Upload image'}
                            </div>
                            <div className="text-xs text-muted-foreground">PNG, JPG up to 5MB</div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={uploadingImage}
                              onClick={() => document.getElementById('file-upload')?.click()}
                            >
                              {uploadingImage ? 'Uploading...' : 'Select File'}
                            </Button>
                            <input
                              id="file-upload"
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={e => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  handleImageUpload(file)
                                }
                              }}
                              disabled={uploadingImage}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Token Extensions */}
                <div className="space-y-6 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-4">
                    <Coins className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Token Extensions</h3>
                  </div>

                  <div className="space-y-6">
                    {tokenExtensions.map(ext => (
                      <div
                        key={ext.id}
                        className={`p-4 rounded-lg border ${
                          selectedExtensions.includes(ext.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-muted'
                        }`}
                      >
                        <div className="flex justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-full ${selectedExtensions.includes(ext.id) ? 'bg-primary/10' : 'bg-muted'}`}
                            >
                              <ext.icon
                                className={`h-4 w-4 ${selectedExtensions.includes(ext.id) ? 'text-primary' : 'text-muted-foreground'}`}
                              />
                            </div>
                            <h4 className="font-medium">{ext.name}</h4>
                          </div>

                          {!ext.required && (
                            <div className="flex items-center">
                              <button
                                type="button"
                                className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 transition-colors ${
                                  selectedExtensions.includes(ext.id)
                                    ? 'border-primary bg-primary'
                                    : 'border-muted bg-muted'
                                }`}
                                onClick={() => handleExtensionChange(ext.id)}
                              >
                                <span
                                  className={`relative inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                    selectedExtensions.includes(ext.id)
                                      ? 'translate-x-4'
                                      : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">{ext.description}</p>

                        {selectedExtensions.includes(ext.id) &&
                          ext.options &&
                          ext.options.length > 0 && (
                            <div className="mt-4 pl-3 border-l-2 border-primary/30 space-y-3">
                              {ext.options.map(option => (
                                <div key={option.id} className="space-y-1">
                                  <Label className="text-xs">{option.label}</Label>

                                  <Input
                                    type={option.type}
                                    placeholder={option.placeholder}
                                    value={tokenData.extensionOptions?.[ext.id]?.[option.id] || ''}
                                    onChange={e =>
                                      handleExtensionOptionChange(ext.id, option.id, e.target.value)
                                    }
                                    className={`text-sm h-8 ${
                                      validationErrors[ext.id]?.[option.id] ? 'border-red-500' : ''
                                    }`}
                                  />

                                  {validationErrors[ext.id]?.[option.id] && (
                                    <p className="text-red-500 text-xs">
                                      {validationErrors[ext.id][option.id]}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                        {/* Special notification for whitelist hook */}
                        {ext.id === 'transfer-hook' &&
                          selectedExtensions.includes(ext.id) &&
                          tokenData.extensionOptions?.[ext.id]?.['program-id'] ===
                            '12BZr6af3s7qf7GGmhBvMd46DWmVNhHfXmCwftfMk1mZ' && (
                            <Alert className="mt-3 bg-blue-900/20 text-blue-400 border-blue-800/50">
                              <Info className="h-4 w-4" />
                              <AlertTitle className="text-sm font-medium">
                                Automatic Whitelist
                              </AlertTitle>
                              <AlertDescription className="text-xs">
                                Your wallet address will be automatically added to the whitelist
                                during token creation. This allows your wallet to transfer tokens
                                without restrictions.
                              </AlertDescription>
                            </Alert>
                          )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 flex justify-end">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="lg"
                          className="gap-2"
                          onClick={handleCreateToken}
                          disabled={uploadingImage}
                        >
                          {uploadingImage ? (
                            <>
                              <span className="animate-spin mr-2">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <circle cx="12" cy="12" r="10" />
                                  <path d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
                                </svg>
                              </span>
                              Uploading Image...
                            </>
                          ) : (
                            <>
                              <ArrowRight className="h-4 w-4" />
                              Continue to Review
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {uploadingImage
                          ? 'Please wait while image is uploading'
                          : 'Review your token details before creating'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </CommonLayout>
  )
}
