import axios from 'axios';
import { TOKENS_REGISTRY } from '@/lib/tokens';

// Re-export for backward compatibility
export { TOKENS_REGISTRY };

// Keep minimal TOKENS export for backward compatibility
export const TOKENS = {
  ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
  USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
  USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
} as const;

// Unified token data structure from DexScreener
export interface TokenData {
  address: string;
  symbol: string;
  name: string;
  priceUsd: number;
  priceChange24h: string;
  volume24h: string;
  liquidity: string;
  pairAddress: string;
  dexId: string;
  confidence: number;
}

// Legacy interface for backward compatibility
export interface TokenPriceData {
  priceUsd: string;
  symbol: string;
  liquidityUsd: string;
  volume24h: string;
  priceChange24h: string;
  pairAddress: string;
  dexId: string;
  confidence: number;
}

const DEXSCREENER_TOKENS_URL = 'https://api.dexscreener.com/latest/dex/tokens';
const DEXSCREENER_SEARCH_URL = 'https://api.dexscreener.com/latest/dex/search';

/**
 * CORE FUNCTION: lookupToken
 * Single source of truth for ALL token lookups
 * NEVER trust LLM knowledge - always fetch from DexScreener
 */
export async function lookupToken(input: string): Promise<TokenData | null> {
  const normalizedInput = input.trim();
  
  // Check if it's a contract address (0x...)
  const isContractAddress = /^0x[a-fA-F0-9]{40}$/i.test(normalizedInput);
  
  if (isContractAddress) {
    return await lookupByAddress(normalizedInput.toLowerCase());
  } else {
    return await lookupBySymbol(normalizedInput.toUpperCase());
  }
}

/**
 * Lookup by contract address
 */
async function lookupByAddress(address: string): Promise<TokenData | null> {
  try {
    const response = await axios.get(`${DEXSCREENER_TOKENS_URL}/${address}`, {
      timeout: 10000,
    });

    const pairs = response.data?.pairs;

    if (!pairs || pairs.length === 0) {
      console.error(`Token not found on Arbitrum: ${address}`);
      return null;
    }

    // Filter Arbitrum pairs where the queried address is actually in the pair
    // PRIORITY: Pairs where queried token is BASE (so priceUsd is correct)
    const arbitrumPairs = pairs.filter((p: any) => {
      if (p.chainId !== 'arbitrum') return false;
      
      const baseAddr = p.baseToken?.address?.toLowerCase();
      const quoteAddr = p.quoteToken?.address?.toLowerCase();
      
      return baseAddr === address || quoteAddr === address;
    });

    if (arbitrumPairs.length === 0) {
      console.error(`Token not found on Arbitrum: ${address}`);
      return null;
    }

    // Sort: prioritize pairs where queried token is BASE (priceUsd is directly usable)
    // Then by liquidity
    const sortedPairs = arbitrumPairs.sort((a: any, b: any) => {
      const aBase = a.baseToken?.address?.toLowerCase() === address;
      const bBase = b.baseToken?.address?.toLowerCase() === address;
      
      // Prioritize base token matches
      if (aBase && !bBase) return -1;
      if (!aBase && bBase) return 1;
      
      // Then sort by liquidity
      return parseFloat(b.liquidity?.usd || 0) - parseFloat(a.liquidity?.usd || 0);
    });

    const bestPair = sortedPairs[0];
    const liquidity = parseFloat(bestPair.liquidity?.usd || 0);
    const volume = parseFloat(bestPair.volume?.h24 || 0);
    
    // Determine which token matches our queried address
    const baseAddr = bestPair.baseToken?.address?.toLowerCase();
    const quoteAddr = bestPair.quoteToken?.address?.toLowerCase();
    
    let tokenSymbol: string;
    let tokenName: string;
    let tokenPriceUsd: number;
    
    if (baseAddr === address) {
      // Token is base: priceUsd is directly usable
      tokenSymbol = bestPair.baseToken?.symbol || '';
      tokenName = bestPair.baseToken?.name || '';
      tokenPriceUsd = parseFloat(bestPair.priceUsd) || 0;
    } else if (quoteAddr === address) {
      // Token is quote: calculate price as 1/priceNative
      // priceNative = base token price in quote units
      // So quote token price = 1 / priceNative
      tokenSymbol = bestPair.quoteToken?.symbol || '';
      tokenName = bestPair.quoteToken?.name || '';
      const priceNative = parseFloat(bestPair.priceNative) || 1;
      tokenPriceUsd = priceNative > 0 ? (1 / priceNative) * parseFloat(bestPair.priceUsd) : 1;
    } else {
      console.error('Address mismatch after filtering - this should not happen');
      return null;
    }
    
    // Calculate confidence score (0-1)
    const liquidityScore = Math.min(liquidity / 100000, 1) * 0.6;
    const volumeScore = Math.min(volume / 10000, 1) * 0.4;
    const confidence = liquidityScore + volumeScore;

    return {
      address: address,
      symbol: tokenSymbol,
      name: tokenName,
      priceUsd: tokenPriceUsd,
      priceChange24h: bestPair.priceChange?.h24 || '0',
      volume24h: bestPair.volume?.h24 || '0',
      liquidity: bestPair.liquidity?.usd || '0',
      pairAddress: bestPair.pairAddress,
      dexId: bestPair.dexId,
      confidence,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('DexScreener API error:', error.message);
    } else {
      console.error('Unexpected error in lookupByAddress:', error);
    }
    return null;
  }
}

/**
 * Lookup by symbol/ticker
 */
async function lookupBySymbol(symbol: string): Promise<TokenData | null> {
  // First check TOKENS_REGISTRY for known address
  const registryEntry = TOKENS_REGISTRY[symbol];
  
  if (registryEntry) {
    // Use the address from registry and do address lookup
    return await lookupByAddress(registryEntry.address.toLowerCase());
  }
  
  // Not in registry - search DexScreener
  try {
    const response = await axios.get(
      `${DEXSCREENER_SEARCH_URL}?q=${encodeURIComponent(symbol)}`,
      { timeout: 10000 }
    );

    const pairs = response.data?.pairs;
    if (!pairs || !Array.isArray(pairs)) {
      console.error(`Token ${symbol} not found on Arbitrum`);
      return null;
    }

    // Filter Arbitrum pairs where symbol matches base or quote
    const matchingPairs = pairs.filter((p: any) => {
      if (p.chainId !== 'arbitrum') return false;
      
      const baseSymbol = p.baseToken?.symbol?.toUpperCase();
      const quoteSymbol = p.quoteToken?.symbol?.toUpperCase();
      
      return baseSymbol === symbol || quoteSymbol === symbol;
    });

    if (matchingPairs.length === 0) {
      console.error(`Token ${symbol} not found on Arbitrum`);
      return null;
    }

    // Sort by liquidity
    const sortedPairs = matchingPairs.sort((a: any, b: any) => 
      parseFloat(b.liquidity?.usd || 0) - parseFloat(a.liquidity?.usd || 0)
    );

    const bestPair = sortedPairs[0];
    const liquidity = parseFloat(bestPair.liquidity?.usd || 0);
    const volume = parseFloat(bestPair.volume?.h24 || 0);
    
    // Determine which token matches our queried symbol
    const baseSymbol = bestPair.baseToken?.symbol?.toUpperCase();
    const quoteSymbol = bestPair.quoteToken?.symbol?.toUpperCase();
    
    let tokenAddress: string;
    let tokenSymbol: string;
    let tokenName: string;
    
    if (baseSymbol === symbol) {
      tokenAddress = bestPair.baseToken?.address || '';
      tokenSymbol = bestPair.baseToken?.symbol || '';
      tokenName = bestPair.baseToken?.name || '';
    } else if (quoteSymbol === symbol) {
      tokenAddress = bestPair.quoteToken?.address || '';
      tokenSymbol = bestPair.quoteToken?.symbol || '';
      tokenName = bestPair.quoteToken?.name || '';
    } else {
      console.error('Symbol mismatch after filtering - this should not happen');
      return null;
    }
    
    // Calculate confidence
    const liquidityScore = Math.min(liquidity / 100000, 1) * 0.6;
    const volumeScore = Math.min(volume / 10000, 1) * 0.4;
    const confidence = liquidityScore + volumeScore;

    return {
      address: tokenAddress.toLowerCase(),
      symbol: tokenSymbol,
      name: tokenName,
      priceUsd: parseFloat(bestPair.priceUsd) || 0,
      priceChange24h: bestPair.priceChange?.h24 || '0',
      volume24h: bestPair.volume?.h24 || '0',
      liquidity: bestPair.liquidity?.usd || '0',
      pairAddress: bestPair.pairAddress,
      dexId: bestPair.dexId,
      confidence,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('DexScreener search error:', error.message);
    } else {
      console.error('Unexpected error in lookupBySymbol:', error);
    }
    return null;
  }
}

/**
 * Format token data for display
 * Returns clean string: "{symbol} ({name}) — ${price} | 24h: {change}% | Vol: ${volume} | Liq: ${liquidity}"
 */
export function formatTokenData(token: TokenData): string {
  const price = token.priceUsd.toFixed(4);
  const change = parseFloat(token.priceChange24h).toFixed(2);
  const volume = formatCurrency(parseFloat(token.volume24h));
  const liquidity = formatCurrency(parseFloat(token.liquidity));
  
  return `${token.symbol} (${token.name}) — $${price} | 24h: ${change}% | Vol: $${volume} | Liq: $${liquidity}`;
}

/**
 * Format large numbers to readable currency
 */
function formatCurrency(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
  return value.toFixed(2);
}

/**
 * DEPRECATED: Use lookupToken instead
 * Kept for backward compatibility - now delegates to lookupToken
 */
export async function getTokenPrice(tokenAddress: string): Promise<TokenPriceData | null> {
  const token = await lookupToken(tokenAddress);
  
  if (!token) return null;
  
  return {
    priceUsd: token.priceUsd.toString(),
    symbol: token.symbol,
    liquidityUsd: token.liquidity,
    volume24h: token.volume24h,
    priceChange24h: token.priceChange24h,
    pairAddress: token.pairAddress,
    dexId: token.dexId,
    confidence: token.confidence,
  };
}

/**
 * DEPRECATED: Use lookupToken instead
 * Kept for backward compatibility
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
  const token = await lookupToken(query);
  
  if (!token) return null;
  
  return [{
    address: token.address,
    symbol: token.symbol,
    name: token.name,
    price: token.priceUsd,
    liquidity: parseFloat(token.liquidity),
    volume24h: parseFloat(token.volume24h),
    priceChange24h: parseFloat(token.priceChange24h),
  }];
}
