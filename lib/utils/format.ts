import { useSettings } from '@/lib/contexts/settings-context'

export function useFormatNumber() {
  const { appearance } = useSettings()

  const formatNumber = (value: number): string => {
    const { numberFormat, decimalPlaces } = appearance

    switch (numberFormat) {
      case 'compact':
        return new Intl.NumberFormat('en-US', {
          notation: 'compact',
          maximumFractionDigits: 2,
        }).format(value)

      case 'scientific':
        return value.toExponential(2)

      default:
        return new Intl.NumberFormat('en-US', {
          maximumFractionDigits: decimalPlaces,
          minimumFractionDigits: Math.min(2, decimalPlaces),
        }).format(value)
    }
  }

  const formatCurrency = (value: number, currency = 'USD'): string => {
    const { numberFormat, decimalPlaces } = appearance

    if (numberFormat === 'compact') {
      return `$${formatNumber(value)}`
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: decimalPlaces,
      minimumFractionDigits: 2,
    }).format(value)
  }

  return { formatNumber, formatCurrency }
}
