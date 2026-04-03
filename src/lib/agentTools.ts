import { resolveToken, getTokenMetadata, getTokenByTicker } from './tokens';
import { getTokenPrice, searchTokenOnDexScreener } from './api/price';
import { getTrustScore } from './api/trust';
import { getGasEstimate } from './api/gas';
import { getPoolData } from './api/pool';

export interface TokenPriceResult {
  symbol: string;
  name: string;
  priceUSD: number;
  change24h: number;
  volume24h: number;
  liquidity: number;
  pairAddress: string;
  dexscreenerUrl: string;
  confidence: number; // Data reliability score 0-1
}

export async function checkTokenPrice(tokenInput: string): Promise<{ data: TokenPriceResult | null; error: string | null }> {
  try {
    let address = resolveToken(tokenInput);
    
    // If not in registry, try searching DexScreener for the ticker
    if (!address && !tokenInput.toLowerCase().startsWith('0x')) {
      const searchResults = await searchTokenOnDexScreener(tokenInput);
      if (searchResults && searchResults.length > 0) {
        // Use the best match (highest liquidity)
        address = searchResults[0].address;
      }
    }
    
    // If it's an address, use it directly
    if (!address && tokenInput.toLowerCase().startsWith('0x') && tokenInput.length === 42) {
      address = tokenInput;
    }
    
    if (!address) {
      return { 
        data: null, 
        error: `Token "${tokenInput}" not found. Try using a verified ticker (e.g., ARB, GMX, MAGIC) or contract address (0x...)` 
      };
    }

    const priceData = await getTokenPrice(address);
    const metadata = await getTokenMetadata(address);

    if (!priceData && !metadata) {
      return { data: null, error: `No trading data found for ${tokenInput} on Arbitrum` };
    }

    const pairAddress = priceData?.pairAddress || metadata?.pairAddress || '';
    const confidence = priceData?.confidence || 0;
    
    return {
      data: {
        symbol: priceData?.symbol || metadata?.symbol || tokenInput.toUpperCase(),
        name: metadata?.name || priceData?.symbol || tokenInput.toUpperCase(),
        priceUSD: priceData ? parseFloat(priceData.priceUsd) : (metadata?.price || 0),
        change24h: priceData ? parseFloat(priceData.priceChange24h) : 0,
        volume24h: priceData ? parseFloat(priceData.volume24h) : (metadata?.volume24h || 0),
        liquidity: priceData ? parseFloat(priceData.liquidityUsd) : (metadata?.liquidity || 0),
        pairAddress,
        dexscreenerUrl: pairAddress ? `https://dexscreener.com/arbitrum/${pairAddress}` : `https://dexscreener.com/arbitrum/${address}`,
        confidence,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: `Error checking token price: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

export interface TokenComparison {
  tokenA: TokenPriceResult;
  tokenB: TokenPriceResult;
  betterLiquidity: 'A' | 'B' | 'equal';
}

export async function compareTokens(tokenA: string, tokenB: string): Promise<{ data: TokenComparison | null; error: string | null }> {
  try {
    const [resultA, resultB] = await Promise.all([
      checkTokenPrice(tokenA),
      checkTokenPrice(tokenB),
    ]);

    if (resultA.error || !resultA.data) {
      return { data: null, error: resultA.error || `Failed to get data for ${tokenA}` };
    }
    if (resultB.error || !resultB.data) {
      return { data: null, error: resultB.error || `Failed to get data for ${tokenB}` };
    }

    const liquidityA = resultA.data.liquidity;
    const liquidityB = resultB.data.liquidity;

    let betterLiquidity: 'A' | 'B' | 'equal';
    if (liquidityA > liquidityB * 1.1) betterLiquidity = 'A';
    else if (liquidityB > liquidityA * 1.1) betterLiquidity = 'B';
    else betterLiquidity = 'equal';

    return {
      data: {
        tokenA: resultA.data,
        tokenB: resultB.data,
        betterLiquidity,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: `Error comparing tokens: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

export interface ProtocolSafetyResult {
  protocol: string;
  contractAddress?: string;
  score: number;
  tier: string;
  reasons: string[];
}

export async function checkProtocolSafety(protocolName: string, contractAddress?: string): Promise<{ data: ProtocolSafetyResult | null; error: string | null }> {
  try {
    const trustData = await getTrustScore(protocolName);
    
    if (!trustData) {
      return { data: null, error: `No trust data available for ${protocolName}` };
    }

    return {
      data: {
        protocol: protocolName,
        contractAddress,
        score: trustData.score,
        tier: trustData.tier,
        reasons: trustData.reasons,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: `Error checking protocol safety: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

export interface GasFeesResult {
  gwei: number;
  swapCostUSD: number;
  lpAddCostUSD: number;
  contractDeployCostUSD: number;
  label: string;
}

export async function checkGasFees(): Promise<{ data: GasFeesResult | null; error: string | null }> {
  try {
    const gasEstimate = await getGasEstimate();
    
    if (!gasEstimate) {
      return { data: null, error: 'Failed to fetch gas estimate' };
    }

    const gwei = parseFloat(gasEstimate.gasPriceGwei);
    const swapCostUSD = parseFloat(gasEstimate.estimatedSwapCostUsd);
    
    let label: string;
    if (gwei < 0.1) label = 'Fees are very low ✅';
    else if (gwei < 0.5) label = 'Fees are moderate ⚠️';
    else label = 'Fees are high 🚨';

    return {
      data: {
        gwei,
        swapCostUSD,
        lpAddCostUSD: swapCostUSD * 1.5,
        contractDeployCostUSD: swapCostUSD * 3,
        label,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: `Error checking gas fees: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

export interface PoolInfoResult {
  poolAddress: string;
  tvlUSD: number;
  volume24h: number;
  feeTier: string;
  txns24h: { buys: number; sells: number };
}

export async function getPoolInfo(tokenA: string, tokenB: string): Promise<{ data: PoolInfoResult | null; error: string | null }> {
  try {
    const addressA = resolveToken(tokenA);
    const addressB = resolveToken(tokenB);

    if (!addressA || !addressB) {
      return { data: null, error: 'One or both tokens not found' };
    }

    const poolData = await getPoolData(tokenA, tokenB, addressA, addressB);
    
    if (!poolData) {
      return { data: null, error: `No pool data found for ${tokenA}/${tokenB}` };
    }

    return {
      data: {
        poolAddress: poolData.poolAddress,
        tvlUSD: parseFloat(poolData.tvlUSD),
        volume24h: parseFloat(poolData.volume24h),
        feeTier: poolData.feeTier,
        txns24h: poolData.txns24h,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: `Error getting pool info: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

export interface MarketToken {
  symbol: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
}

export interface MarketOverviewResult {
  topTokens: MarketToken[];
  sentiment: string;
}

export async function getArbitrumMarketOverview(): Promise<{ data: MarketOverviewResult | null; error: string | null }> {
  try {
    const response = await fetch('https://api.dexscreener.com/latest/dex/search?q=arbitrum', {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return { data: null, error: 'Failed to fetch market data from DexScreener' };
    }

    const data = await response.json();
    
    if (!data.pairs || !Array.isArray(data.pairs)) {
      return { data: null, error: 'Invalid market data format' };
    }

    const arbitrumPairs = data.pairs
      .filter((pair: any) => pair.chainId === 'arbitrum')
      .sort((a: any, b: any) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
      .slice(0, 5);

    const topTokens: MarketToken[] = arbitrumPairs.map((pair: any) => ({
      symbol: pair.baseToken?.symbol || 'Unknown',
      price: parseFloat(pair.priceUsd) || 0,
      volume24h: pair.volume?.h24 || 0,
      priceChange24h: pair.priceChange?.h24 || 0,
    }));

    const avgChange = topTokens.reduce((sum, t) => sum + t.priceChange24h, 0) / topTokens.length;
    
    let sentiment: string;
    if (avgChange > 5) sentiment = '🟢 Bullish';
    else if (avgChange < -5) sentiment = '🔴 Bearish';
    else sentiment = '🟡 Neutral';

    return {
      data: { topTokens, sentiment },
      error: null,
    };
  } catch (error) {
    return { data: null, error: `Error getting market overview: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}
