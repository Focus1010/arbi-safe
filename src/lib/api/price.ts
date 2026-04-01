import axios from 'axios';

export const TOKENS = {
  ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1c0b69FCbb9',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
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
