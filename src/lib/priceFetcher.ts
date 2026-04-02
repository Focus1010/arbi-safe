import axios from 'axios';
import { ethers } from 'ethers';

const DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest/dex/tokens';

// Stable tokens for pair prioritization
const STABLE_QUOTE_TOKENS = new Set([
  '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8', // USDC
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', // USDT
  '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', // WETH
].map(a => a.toLowerCase()));

// Filter thresholds
const MIN_LIQUIDITY_USD = 100000;      // $100k minimum
const MIN_VOLUME_24H = 10000;          // $10k minimum
const CONFIDENCE_LIQUIDITY_BASELINE = 500000; // $500k for 100% score
const CONFIDENCE_VOLUME_BASELINE = 50000;     // $50k for 100% score
const MIN_CONFIDENCE_THRESHOLD = 0.4;  // Reject if below 40%

export interface PriceData {
  priceUsd: string;
  liquidityUsd: string;
  volume24h: string;
  priceChange24h: string;
  pairAddress: string;
  dexId: string;
  confidence: number;
}

export interface PriceResult {
  data: PriceData | null;
  error: string | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate and normalize Ethereum address
 */
function validateAddress(address: string): { valid: boolean; normalized: string | null; error?: string } {
  const trimmed = address.trim();
  
  if (!trimmed) {
    return { valid: false, normalized: null, error: 'Address is required' };
  }
  
  if (!ethers.isAddress(trimmed)) {
    return { valid: false, normalized: null, error: 'Invalid Ethereum address format' };
  }
  
  return { valid: true, normalized: trimmed.toLowerCase() };
}

/**
 * Check if pair has sufficient quality metrics
 */
function isValidPair(pair: any, targetAddress: string): boolean {
  // Must be Arbitrum
  if (pair.chainId !== 'arbitrum') return false;
  
  // Token must be in pair
  const baseAddr = pair.baseToken?.address?.toLowerCase();
  const quoteAddr = pair.quoteToken?.address?.toLowerCase();
  if (baseAddr !== targetAddress && quoteAddr !== targetAddress) return false;
  
  // Must have valid price
  const priceUsd = parseFloat(pair.priceUsd);
  if (!priceUsd || priceUsd <= 0) return false;
  
  // Minimum liquidity
  const liquidity = parseFloat(pair.liquidity?.usd || 0);
  if (liquidity < MIN_LIQUIDITY_USD) return false;
  
  // Minimum volume
  const volume = parseFloat(pair.volume?.h24 || 0);
  if (volume < MIN_VOLUME_24H) return false;
  
  return true;
}

/**
 * Check if pair has stable quote token (higher priority)
 */
function isStablePair(pair: any): boolean {
  const quoteAddr = pair.quoteToken?.address?.toLowerCase();
  return STABLE_QUOTE_TOKENS.has(quoteAddr);
}

/**
 * Calculate confidence score (0-1)
 * Weight: 70% liquidity, 30% volume
 */
function calculateConfidence(liquidity: number, volume: number): number {
  const liquidityScore = Math.min(liquidity / CONFIDENCE_LIQUIDITY_BASELINE, 1) * 0.7;
  const volumeScore = Math.min(volume / CONFIDENCE_VOLUME_BASELINE, 1) * 0.3;
  return Math.min(Math.max(liquidityScore + volumeScore, 0), 1);
}

/**
 * Determine if target token is base or quote in pair
 */
function getTokenPosition(pair: any, targetAddress: string): 'base' | 'quote' | null {
  const baseAddr = pair.baseToken?.address?.toLowerCase();
  const quoteAddr = pair.quoteToken?.address?.toLowerCase();
  
  if (baseAddr === targetAddress) return 'base';
  if (quoteAddr === targetAddress) return 'quote';
  return null;
}

/**
 * Extract correct price for the target token
 */
function extractPrice(pair: any, position: 'base' | 'quote'): number {
  const priceUsd = parseFloat(pair.priceUsd) || 0;
  
  if (position === 'base') {
    // priceUsd is directly the base token price
    return priceUsd;
  } else {
    // For quote token: calculate from priceNative
    // priceNative = how many quote tokens per 1 base token
    // quote price = (1 / priceNative) * base price
    const priceNative = parseFloat(pair.priceNative) || 1;
    if (priceNative <= 0) return 0;
    return (1 / priceNative) * priceUsd;
  }
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Fetch price data from DexScreener with strict filtering
 */
export async function fetchDexScreenerPrice(contractAddress: string): Promise<PriceResult> {
  try {
    // 1. Validate input
    const validation = validateAddress(contractAddress);
    if (!validation.valid) {
      return { data: null, error: validation.error };
    }
    
    const targetAddress = validation.normalized!;
    
    // 2. Fetch from API
    const response = await axios.get(`${DEXSCREENER_API_URL}/${targetAddress}`, {
      timeout: 10000,
    });
    
    const pairs = response.data?.pairs;
    if (!pairs || !Array.isArray(pairs) || pairs.length === 0) {
      return { data: null, error: 'No trading pairs found for this token' };
    }
    
    // 3. Filter valid pairs (immutable)
    const validPairs = pairs.filter((p: any) => isValidPair(p, targetAddress));
    
    if (validPairs.length === 0) {
      return { 
        data: null, 
        error: `No valid Arbitrum pairs found. Minimum requirements: $${MIN_LIQUIDITY_USD.toLocaleString()} liquidity, $${MIN_VOLUME_24H.toLocaleString()} volume.` 
      };
    }
    
    // 4. Sort with priority: stable pairs first, then by liquidity
    const sortedPairs = [...validPairs].sort((a: any, b: any) => {
      const aStable = isStablePair(a) ? 1 : 0;
      const bStable = isStablePair(b) ? 1 : 0;
      
      // Prioritize stable pairs
      if (aStable !== bStable) return bStable - aStable;
      
      // Then by liquidity
      const aLiquidity = parseFloat(a.liquidity?.usd || 0);
      const bLiquidity = parseFloat(b.liquidity?.usd || 0);
      return bLiquidity - aLiquidity;
    });
    
    // 5. Select best pair
    const bestPair = sortedPairs[0];
    
    // 6. Determine token position and extract correct price
    const position = getTokenPosition(bestPair, targetAddress);
    if (!position) {
      return { data: null, error: 'Token not found in selected pair' };
    }
    
    const tokenPrice = extractPrice(bestPair, position);
    if (tokenPrice <= 0) {
      return { data: null, error: 'Unable to determine valid price' };
    }
    
    // 7. Get token metadata
    const tokenMeta = position === 'base' ? bestPair.baseToken : bestPair.quoteToken;
    
    // 8. Calculate confidence
    const liquidity = parseFloat(bestPair.liquidity?.usd || 0);
    const volume = parseFloat(bestPair.volume?.h24 || 0);
    const confidence = calculateConfidence(liquidity, volume);
    
    if (confidence < MIN_CONFIDENCE_THRESHOLD) {
      return { 
        data: null, 
        error: 'Low confidence market data. Insufficient liquidity.' 
      };
    }
    
    // 9. Return consistent data
    return {
      data: {
        priceUsd: tokenPrice.toFixed(6),
        liquidityUsd: bestPair.liquidity?.usd || '0',
        volume24h: bestPair.volume?.h24 || '0',
        priceChange24h: bestPair.priceChange?.h24 || '0',
        pairAddress: bestPair.pairAddress,
        dexId: bestPair.dexId,
        confidence: Math.round(confidence * 100) / 100, // 2 decimal places
      },
      error: null,
    };
    
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('DexScreener API error:', error.message);
      return { data: null, error: `API error: ${error.message}` };
    }
    console.error('Unexpected error in fetchDexScreenerPrice:', error);
    return { data: null, error: 'Unable to fetch price data' };
  }
}

/**
 * Get top gainers/losers with strict filtering
 */
export async function fetchTopMovers(type: 'gainers' | 'losers'): Promise<any[]> {
  try {
    const response = await axios.get(
      'https://api.dexscreener.com/latest/dex/search?q=arbitrum',
      { timeout: 10000 }
    );
    
    const pairs = response.data?.pairs || [];
    
    // Strict filtering
    const validPairs = pairs.filter((p: any) => {
      if (p.chainId !== 'arbitrum') return false;
      if (!p.priceChange?.h24) return false;
      
      const liquidity = parseFloat(p.liquidity?.usd || 0);
      if (liquidity < 200000) return false; // $200k min
      
      const volume = parseFloat(p.volume?.h24 || 0);
      if (volume < 100000) return false; // $100k min
      
      return true;
    });
    
    // Sort by price change
    const sorted = [...validPairs].sort((a: any, b: any) => {
      const changeA = parseFloat(a.priceChange.h24);
      const changeB = parseFloat(b.priceChange.h24);
      return type === 'gainers' ? changeB - changeA : changeA - changeB;
    });
    
    // Deduplicate by ADDRESS (not symbol)
    const seen = new Set<string>();
    const topMovers = [];
    
    for (const pair of sorted) {
      const address = pair.baseToken?.address?.toLowerCase();
      if (!address || seen.has(address)) continue;
      
      seen.add(address);
      topMovers.push({
        address,
        symbol: pair.baseToken?.symbol,
        name: pair.baseToken?.name,
        price: parseFloat(pair.priceUsd),
        change24h: parseFloat(pair.priceChange.h24),
        volume: parseFloat(pair.volume?.h24 || 0),
        liquidity: parseFloat(pair.liquidity?.usd || 0),
      });
      
      if (topMovers.length >= 5) break;
    }
    
    return topMovers;
    
  } catch (error) {
    console.error('Error fetching top movers:', error);
    return [];
  }
}

/**
 * Get market overview with high-quality filters
 */
export async function fetchMarketOverview(): Promise<any> {
  try {
    const response = await axios.get(
      'https://api.dexscreener.com/latest/dex/search?q=arbitrum',
      { timeout: 10000 }
    );
    
    const pairs = response.data?.pairs || [];
    
    // Filter high-quality pairs only
    const validPairs = pairs.filter((p: any) => {
      if (p.chainId !== 'arbitrum') return false;
      
      const liquidity = parseFloat(p.liquidity?.usd || 0);
      if (liquidity < 200000) return false; // $200k min
      
      const volume = parseFloat(p.volume?.h24 || 0);
      if (volume < 50000) return false; // $50k min
      
      return true;
    });
    
    // Calculate total volume
    const totalVolume = validPairs.reduce((sum: number, p: any) => 
      sum + parseFloat(p.volume?.h24 || 0), 0
    );
    
    // Get unique top tokens by volume
    const seen = new Set<string>();
    const topTokens = [];
    
    const sortedByVolume = [...validPairs].sort((a: any, b: any) =>
      parseFloat(b.volume?.h24 || 0) - parseFloat(a.volume?.h24 || 0)
    );
    
    for (const pair of sortedByVolume) {
      const address = pair.baseToken?.address?.toLowerCase();
      if (!address || seen.has(address)) continue;
      
      seen.add(address);
      topTokens.push({
        address,
        symbol: pair.baseToken?.symbol,
        name: pair.baseToken?.name,
        price: parseFloat(pair.priceUsd),
        volume24h: parseFloat(pair.volume?.h24 || 0),
        change24h: parseFloat(pair.priceChange?.h24 || 0),
      });
      
      if (topTokens.length >= 10) break;
    }
    
    return {
      totalVolume24h: totalVolume,
      topTokens,
      pairCount: validPairs.length,
    };
    
  } catch (error) {
    console.error('Error fetching market overview:', error);
    return { totalVolume24h: 0, topTokens: [], pairCount: 0 };
  }
}
