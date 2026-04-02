import axios from 'axios';
import { TOKENS } from './price';

const DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest/dex';

export interface PoolData {
  poolAddress: string;
  tvlUSD: string;
  feeTier: string;
  priceNative: string;
  priceUsd: string;
  volume24h: string;
  txns24h: { buys: number; sells: number };
}

export interface SwapQuote {
  expectedOutput: string;
  actualOutput: string;
  slippagePercent: string;
  liquidityUSD: string;
}

function calculateSlippage(liquidityUSD: number): number {
  if (liquidityUSD > 5_000_000) return 0.1;
  if (liquidityUSD > 1_000_000) return 0.3;
  if (liquidityUSD > 100_000) return 0.8;
  return 2.0;
}

export async function getPoolData(
  tokenASymbol: string,
  tokenBSymbol: string,
  tokenAAddress: string,
  tokenBAddress: string
): Promise<PoolData | null> {
  try {
    const response = await axios.get(`${DEXSCREENER_API_URL}/tokens/${tokenAAddress}`, {
      timeout: 15000,
    });

    const pairs = response.data?.pairs;

    if (!pairs || pairs.length === 0) {
      console.warn(`No pairs found for ${tokenASymbol}`);
      return null;
    }

    // Filter for Arbitrum pairs that contain both tokens
    const arbitrumPairs = pairs.filter((pair: any) => {
      const isArbitrum = pair.chainId === 'arbitrum';
      const hasTokenA =
        pair.baseToken?.address?.toLowerCase() === tokenAAddress.toLowerCase() ||
        pair.quoteToken?.address?.toLowerCase() === tokenAAddress.toLowerCase();
      const hasTokenB =
        pair.baseToken?.address?.toLowerCase() === tokenBAddress.toLowerCase() ||
        pair.quoteToken?.address?.toLowerCase() === tokenBAddress.toLowerCase() ||
        pair.baseToken?.symbol?.toUpperCase() === tokenBSymbol.toUpperCase() ||
        pair.quoteToken?.symbol?.toUpperCase() === tokenBSymbol.toUpperCase();
      return isArbitrum && hasTokenA && hasTokenB;
    });

    if (arbitrumPairs.length === 0) {
      console.warn(`No Arbitrum pairs found for ${tokenASymbol}/${tokenBSymbol}`);
      return null;
    }

    // Sort by liquidity (highest first)
    arbitrumPairs.sort((a: any, b: any) => {
      const liquidityA = parseFloat(a.liquidity?.usd || '0');
      const liquidityB = parseFloat(b.liquidity?.usd || '0');
      return liquidityB - liquidityA;
    });

    const bestPair = arbitrumPairs[0];

    return {
      poolAddress: bestPair.pairAddress || '',
      tvlUSD: bestPair.liquidity?.usd || '0',
      feeTier: bestPair.feeTier ? `${(parseInt(bestPair.feeTier) / 10000).toFixed(2)}%` : 'Unknown',
      priceNative: bestPair.priceNative || '0',
      priceUsd: bestPair.priceUsd || '0',
      volume24h: bestPair.volume?.h24 || '0',
      txns24h: {
        buys: bestPair.txns?.h24?.buys || 0,
        sells: bestPair.txns?.h24?.sells || 0,
      },
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('DexScreener API error:', error.message);
    } else {
      console.error('Unexpected error fetching pool data:', error);
    }
    return null;
  }
}

export async function getSwapQuote(
  fromTokenAddress: string,
  toTokenAddress: string,
  amountInUSD: number,
  fromTokenPrice: number,
  toTokenPrice: number
): Promise<SwapQuote | null> {
  try {
    // Find the pool to determine liquidity and slippage
    const pool = await getPoolData(
      'FROM',
      'TO',
      fromTokenAddress,
      toTokenAddress
    );

    if (!pool) {
      console.warn('Could not find pool for slippage calculation');
      return null;
    }

    const liquidityUSD = parseFloat(pool.tvlUSD);
    const slippagePercent = calculateSlippage(liquidityUSD);

    // Calculate expected output (without slippage)
    const expectedOutput = amountInUSD / toTokenPrice;

    // Apply slippage to get actual output
    const slippageFactor = 1 - slippagePercent / 100;
    const actualOutput = expectedOutput * slippageFactor;

    return {
      expectedOutput: expectedOutput.toFixed(6),
      actualOutput: actualOutput.toFixed(6),
      slippagePercent: slippagePercent.toFixed(2),
      liquidityUSD: pool.tvlUSD,
    };
  } catch (error) {
    console.error('Error calculating swap quote:', error);
    return null;
  }
}

export { TOKENS };
