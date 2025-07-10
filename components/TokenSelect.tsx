import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useWalletTokens } from '@/hooks/useWalletTokens'
import { ChevronDown } from 'lucide-react'

export interface TokenSelectProps {
  value: string
  onChange: (value: string) => void
  excludeToken?: string
  disabled?: boolean
  placeholder?: string
  includeSol?: boolean
}

export function TokenSelect({
  value,
  onChange,
  excludeToken,
  disabled = false,
  placeholder = 'Select token',
  includeSol = false,
}: TokenSelectProps) {
  const { tokens } = useWalletTokens({ includeSol })

  const selectedToken = tokens.find(token => token.mint === value)
  const filteredTokens = tokens.filter(token => token.mint !== excludeToken)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between" disabled={disabled}>
          <div className="flex items-center gap-2">{selectedToken?.symbol || placeholder}</div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {filteredTokens.map(token => (
          <DropdownMenuItem
            key={token.mint}
            onSelect={() => onChange(token.mint)}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="font-medium">{token.symbol}</div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
