// Free API for crypto prices
const COINGECKO_API = "https://api.coingecko.com/api/v3"

export interface TokenPrice {
  id: string
  symbol: string
  name: string
  current_price: number
  price_change_24h: number
  price_change_percentage_24h: number
  market_cap: number
  volume_24h: number
}

export async function getTokenPrices(tokens: string[]): Promise<TokenPrice[]> {
  try {
    const response = await fetch(
      `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=${tokens.join(",")}&order=market_cap_desc&per_page=100&page=1&sparkline=false`,
    )

    if (!response.ok) {
      throw new Error("Failed to fetch prices")
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching token prices:", error)
    return []
  }
}

export async function getTokenPrice(tokenId: string): Promise<number> {
  try {
    const response = await fetch(`${COINGECKO_API}/simple/price?ids=${tokenId}&vs_currencies=usd`)

    if (!response.ok) {
      throw new Error("Failed to fetch price")
    }

    const data = await response.json()
    return data[tokenId]?.usd || 0
  } catch (error) {
    console.error("Error fetching token price:", error)
    return 0
  }
}

export async function getSwapRate(fromToken: string, toToken: string, amount: number) {
  try {
    // Mock swap calculation using real prices
    const fromPrice = await getTokenPrice(fromToken)
    const toPrice = await getTokenPrice(toToken)

    if (fromPrice && toPrice) {
      const rate = fromPrice / toPrice
      const outputAmount = amount * rate
      const slippage = 0.005 // 0.5% slippage
      const minimumReceived = outputAmount * (1 - slippage)

      return {
        rate,
        outputAmount,
        minimumReceived,
        priceImpact: 0.1, // Mock price impact
        route: "Jupiter Aggregator",
      }
    }

    return null
  } catch (error) {
    console.error("Error calculating swap rate:", error)
    return null
  }
}
