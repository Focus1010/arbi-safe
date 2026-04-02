import axios from 'axios';
import { TOKENS_REGISTRY } from '@/lib/tokens';

// Export TOKENS for backward compatibility
export const TOKENS = {
  ARB: TOKENS_REGISTRY.ARB.address,
  USDC: TOKENS_REGISTRY.USDC.address,
  USDT: TOKENS_REGISTRY.USDT.address,
  WETH: TOKENS_REGISTRY.WETH.address,
  GMX: TOKENS_REGISTRY.GMX.address,
} as const;

export interface TokenPriceData {
  priceUsd: string;
  symbol: string;
  liquidityUsd: string;
  volume24h: string;
}

const DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest/dex/tokens';

export async function getTokenPrice(tokenAddress: string): Promise<TokenPriceData | null> {
  try {
    const response = await axios.get(`${DEXSCREENER_API_URL}/${tokenAddress}`, {
      timeout: 10000,
    });

    const pairs = response.data?.pairs;

    if (!pairs || pairs.length === 0) {
      return null;
    }

    const pair = pairs[0];

    return {
      priceUsd: pair.priceUsd || '0',
      symbol: pair.baseToken?.symbol || '',
      liquidityUsd: pair.liquidity?.usd || '0',
      volume24h: pair.volume?.h24 || '0',
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('DexScreener API error:', error.message);
    } else {
      console.error('Unexpected error fetching token price:', error);
    }
    return null;
  }
}
