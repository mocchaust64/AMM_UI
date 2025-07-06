import { TokenInfo } from '@solana/spl-token-registry';

export class TokenService {
    private static tokenList: TokenInfo[] = []
    private static isInitialized = false;

    static async initialize() {
        if (this.isInitialized) {
         
            return;
        }
 
     
        try {
         
            const response = await fetch('https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json');
            const data = await response.json();
            
            // Lọc chỉ lấy các token trên devnet
            this.tokenList = data.tokens ? data.tokens.filter((token: TokenInfo) => 
                token.chainId === 103 // 103 là chainId của Solana Devnet
            ) : [];
            
        
        } catch (error) {
            console.error('Failed to initialize TokenService:', error);
            // Fallback to common tokens on devnet

            this.tokenList = [
                {
                    chainId: 103, // Devnet
                    address: 'So11111111111111111111111111111111111111112',
                    symbol: 'SOL',
                    name: 'Solana',
                    decimals: 9,
                    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
                    tags: ['native']
                },
                {
                    chainId: 103, // Devnet
                    address: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
                    symbol: 'USDC',
                    name: 'USD Coin (Devnet)',
                    decimals: 6,
                    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
                    tags: ['stablecoin']
                }
            ];
            this.isInitialized = true;
        }
    }

    static async getTokenInfo(mintAddress: string): Promise<TokenInfo | undefined> {
        if (!this.isInitialized) { 
            await this.initialize();
        }

        const tokenInfo = this.tokenList.find(token => token.address === mintAddress);
      
        return tokenInfo;
    }

    // Thêm method mới để lấy tất cả token
    static async getAllTokens(): Promise<TokenInfo[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }
    
        return this.tokenList;
    }
}