import axios from 'axios';

const DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest/dex/tokens';

export interface PriceData {
  priceUsd: string;
  liquidityUsd: string;
  volume24h: string;
  priceChange24h: string;
  pairAddress: string;
  dexId: string;
  confidence: number; // 0-1 score based on liquidity
}

export interface PriceResult {
  data: PriceData | null;
  error: string | null;
}

/**
 * Fetch price data from DexScreener ONLY
 * Uses verified contract address from Token Resolver
 * 
 * Rules:
 * - Only fetches price, never token identity
 * - Must have verified address first
 * - No guessing, no fallback
 */
export async function fetchDexScreenerPrice(contractAddress: string): Promise<PriceResult> {
  try {
    const response = await axios.get(`${DEXSCREENER_API_URL}/${contractAddress}`, {
      timeout: 10000,
    });

    const pairs = response.data?.pairs;

    if (!pairs || pairs.length === 0) {
      return {
        data: null,
        error: 'No trading pairs found for this token on Arbitrum.',
      };
    }

    const inputAddress = contractAddress.toLowerCase();

    // Filter Arbitrum pairs where the token is actually in the pair
    const arbitrumPairs = pairs.filter((p: any) => {
      if (p.chainId !== 'arbitrum') return false;
      
      const baseAddr = p.baseToken?.address?.toLowerCase();
      const quoteAddr = p.quoteToken?.address?.toLowerCase();
      
      return baseAddr === inputAddress || quoteAddr === inputAddress;
    });

    if (arbitrumPairs.length === 0) {
      return {
        data: null,
        error: 'Token not trading on Arbitrum.',
      };
    }

    // Sort by liquidity to get most reliable pair
    const sortedPairs = arbitrumPairs.sort((a: any, b: any) => 
      (parseFloat(b.liquidity?.usd || 0) - parseFloat(a.liquidity?.usd || 0))
    );

    const bestPair = sortedPairs[0];
    const liquidity = parseFloat(bestPair.liquidity?.usd || 0);
    const volume = parseFloat(bestPair.volume?.h24 || 0);
    
    // Calculate confidence score (0-1)
    // Based on liquidity threshold of $100k and volume of $10k
    const liquidityScore = Math.min(liquidity / 100000, 1) * 0.6;
    const volumeScore = Math.min(volume / 10000, 1) * 0.4;
    const confidence = liquidityScore + volumeScore;

    return {
      data: {
        priceUsd: bestPair.priceUsd || '0',
        liquidityUsd: bestPair.liquidity?.usd || '0',
        volume24h: bestPair.volume?.h24 || '0',
        priceChange24h: bestPair.priceChange?.h24 || '0',
        pairAddress: bestPair.pairAddress,
        dexId: bestPair.dexId,
        confidence,
      },
      error: null,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('DexScreener API error:', error.message);
    } else {
      console.error('Unexpected error fetching price:', error);
    }
    return {
      data: null,
      error: 'Unable to fetch price data.',
    };
  }
}

/**
 * Get top gainers/losers from DexScreener
 */
export async function fetchTopMovers(type: 'gainers' | 'losers'): Promise<any[]> {
  try {
    // Use DexScreener search for Arbitrum tokens with volume
    const response = await axios.get(
      'https://api.dexscreener.com/latest/dex/search?q=arbitrum',
      { timeout: 10000 }
    );

    const pairs = response.data?.pairs || [];
    
    // Filter Arbitrum pairs with valid price change
    const arbitrumPairs = pairs.filter((p: any) => 
      p.chainId === 'arbitrum' && 
      p.priceChange?.h24 &&
      parseFloat(p.liquidity?.usd || 0) > 50000 // Min $50k liquidity
    );

    // Sort by price change
    const sorted = arbitrumPairs.sort((a: any, b: any) => {
      const changeA = parseFloat(a.priceChange.h24);
      const changeB = parseFloat(b.priceChange.h24);
      return type === 'gainers' ? changeB - changeA : changeA - changeB;
    });

    // Return top 5 unique tokens
    const seen = new Set();
    const topMovers = [];
    
    for (const pair of sorted) {
      const symbol = pair.baseToken?.symbol;
      if (symbol && !seen.has(symbol)) {
        seen.add(symbol);
        topMovers.push({
          symbol,
          name: pair.baseToken?.name,
          address: pair.baseToken?.address,
          price: parseFloat(pair.priceUsd),
          change24h: parseFloat(pair.priceChange.h24),
          volume: parseFloat(pair.volume?.h24 || 0),
          liquidity: parseFloat(pair.liquidity?.usd || 0),
        });
        if (topMovers.length >= 5) break;
      }
    }

    return topMovers;
  } catch (error) {
    console.error('Error fetching top movers:', error);
    return [];
  }
}

/**
 * Get market overview from DexScreener
 */
export async function fetchMarketOverview(): Promise<any> {
  try {
    const response = await axios.get(
      'https://api.dexscreener.com/latest/dex/search?q=arbitrum',
      { timeout: 10000 }
    );

    const pairs = response.data?.pairs || [];
    const arbitrumPairs = pairs.filter((p: any) => p.chainId === 'arbitrum');
    
    // Calculate total volume
    const totalVolume = arbitrumPairs.reduce((sum: number, p: any) => 
      sum + parseFloat(p.volume?.h24 || 0), 0
    );

    // Get unique tokens
    const seen = new Set();
    const topTokens = [];
    
    const sortedByVolume = arbitrumPairs.sort((a: any, b: any) =>
      parseFloat(b.volume?.h24 || 0) - parseFloat(a.volume?.h24 || 0)
    );

    for (const pair of sortedByVolume) {
      const symbol = pair.baseToken?.symbol;
      if (symbol && !seen.has(symbol)) {
        seen.add(symbol);
        topTokens.push({
          symbol,
          name: pair.baseToken?.name,
          address: pair.baseToken?.address,
          price: parseFloat(pair.priceUsd),
          volume24h: parseFloat(pair.volume?.h24 || 0),
          change24h: parseFloat(pair.priceChange?.h24 || 0),
        });
        if (topTokens.length >= 10) break;
      }
    }

    return {
      totalVolume24h: totalVolume,
      topTokens,
      pairCount: arbitrumPairs.length,
    };
  } catch (error) {
    console.error('Error fetching market overview:', error);
    return { totalVolume24h: 0, topTokens: [], pairCount: 0 };
  }
}
