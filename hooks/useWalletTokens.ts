import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';

export interface TokenData {
  mint: string;
  symbol: string;
  name: string;
  icon?: string;
  balance: number;
  decimals: number;
  address?: string;
}

export function useWalletTokens() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTokens = async () => {
      if (!publicKey) {
        setTokens([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch token accounts owned by the wallet
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_2022_PROGRAM_ID }
        );

        // Map token accounts to token data
        const tokensData: TokenData[] = tokenAccounts.value.map(item => {
          const accountData = item.account.data.parsed.info;
          const mintAddress = accountData.mint;
          const balance = Number(accountData.tokenAmount.uiAmount);
          const decimals = accountData.tokenAmount.decimals;
          const tokenAccountAddress = item.pubkey.toString();

          return {
            mint: mintAddress,
            symbol: mintAddress.slice(0, 4), // Temporary, will be updated with actual metadata
            name: `Token ${mintAddress.slice(0, 6)}...${mintAddress.slice(-4)}`,
            balance,
            decimals,
            address: tokenAccountAddress,
          };
        });

        // Fetch SOL balance
        const solBalance = await connection.getBalance(publicKey);
        
        // Add SOL as a token
        const solToken: TokenData = {
          mint: 'SOL',
          symbol: 'SOL',
          name: 'Solana',
          balance: solBalance / 1e9, // Convert lamports to SOL
          decimals: 9,
          address: publicKey.toString(), // SOL address is the wallet address
        };

        if (isMounted) {
          setTokens([solToken, ...tokensData]);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error fetching wallet tokens:', err);
        if (isMounted) {
          setError(err.message || 'Failed to fetch wallet tokens');
          setLoading(false);
        }
      }
    };

    fetchTokens();

    return () => {
      isMounted = false;
    };
  }, [publicKey, connection]);

  return { tokens, loading, error };
}