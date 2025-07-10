export interface Token {
  mint: string
  symbol: string
  name: string
  balance?: number
  decimals: number
  addess?: string
  extension?: string[]
  type?: string
  price?: string
  verified?: boolean
}
