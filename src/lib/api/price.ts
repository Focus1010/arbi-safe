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
  priceChange24h: string;
  pairAddress: string;
  dexId: string;
  confidence: number; // 0-1 score based on liquidity and volume
}

const DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest/dex/tokens';

/**
 * Get token price with 24h change and confidence score
 * Uses best pair selection based on liquidity
 */
export async function getTokenPrice(tokenAddress: string): Promise<TokenPriceData | null> {
  try {
    const response = await axios.get(`${DEXSCREENER_API_URL}/${tokenAddress}`, {
      timeout: 10000,
    });

    const pairs = response.data?.pairs;

    if (!pairs || pairs.length === 0) {
      return null;
    }

    const inputAddress = tokenAddress.toLowerCase();

    // Filter Arbitrum pairs where the queried address is actually in the pair
    const arbitrumPairs = pairs.filter((p: any) => {
      if (p.chainId !== 'arbitrum') return false;
      
      const baseAddr = p.baseToken?.address?.toLowerCase();
      const quoteAddr = p.quoteToken?.address?.toLowerCase();
      
      // Only include pairs where the queried address matches one of the tokens
      return baseAddr === inputAddress || quoteAddr === inputAddress;
    });

    if (arbitrumPairs.length === 0) return null;

    // Sort by liquidity to get most reliable pair
    const sortedPairs = arbitrumPairs.sort((a: any, b: any) => 
      (parseFloat(b.liquidity?.usd || 0) - parseFloat(a.liquidity?.usd || 0))
    );

    const bestPair = sortedPairs[0];
    const liquidity = parseFloat(bestPair.liquidity?.usd || 0);
    const volume = parseFloat(bestPair.volume?.h24 || 0);
    
    // Determine which token matches our queried address
    const baseAddr = bestPair.baseToken?.address?.toLowerCase();
    const quoteAddr = bestPair.quoteToken?.address?.toLowerCase();
    
    let tokenSymbol;
    if (baseAddr === inputAddress) {
      tokenSymbol = bestPair.baseToken?.symbol || '';
    } else if (quoteAddr === inputAddress) {
      tokenSymbol = bestPair.quoteToken?.symbol || '';
    } else {
      return null; // Should not happen due to filter above
    }
    
    // Calculate confidence score (0-1)
    // Based on liquidity threshold of $100k and volume of $10k
    const liquidityScore = Math.min(liquidity / 100000, 1) * 0.6;
    const volumeScore = Math.min(volume / 10000, 1) * 0.4;
    const confidence = liquidityScore + volumeScore;

    return {
      priceUsd: bestPair.priceUsd || '0',
      symbol: tokenSymbol,
      liquidityUsd: bestPair.liquidity?.usd || '0',
      volume24h: bestPair.volume?.h24 || '0',
      priceChange24h: bestPair.priceChange?.h24 || '0',
      pairAddress: bestPair.pairAddress,
      dexId: bestPair.dexId,
      confidence,
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

/**
 * Search for a token by symbol/name on DexScreener
 * Returns matching Arbitrum tokens
 */
export async function searchTokenOnDexScreener(query: string): Promise<Array<{
  address: string;
  symbol: string;
  name: string;
  price: number;
  liquidity: number;
  volume24h: number;
  priceChange24h: number;
}> | null> {
  try {
    const response = await axios.get(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
      { timeout: 10000 }
    );

    const pairs = response.data?.pairs;
    if (!pairs || !Array.isArray(pairs)) return null;

    // Filter for Arbitrum pairs with good liquidity
    const arbitrumPairs = pairs
      .filter((p: any) => 
        p.chainId === 'arbitrum' && 
        parseFloat(p.liquidity?.usd || 0) > 50000 // Min $50k liquidity
      )
      .sort((a: any, b: any) => 
        parseFloat(b.liquidity?.usd || 0) - parseFloat(a.liquidity?.usd || 0)
      )
      .slice(0, 5); // Top 5 results

    if (arbitrumPairs.length === 0) return null;

    // Map to token objects
    return arbitrumPairs.map((pair: any) => ({
      address: pair.baseToken?.address,
      symbol: pair.baseToken?.symbol,
      name: pair.baseToken?.name,
      price: parseFloat(pair.priceUsd) || 0,
      liquidity: parseFloat(pair.liquidity?.usd) || 0,
      volume24h: parseFloat(pair.volume?.h24) || 0,
      priceChange24h: parseFloat(pair.priceChange?.h24) || 0,
    }));
  } catch (error) {
    console.error('Error searching token:', error);
    return null;
  }
}
