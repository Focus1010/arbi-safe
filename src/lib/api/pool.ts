import axios from 'axios';
import { TOKENS } from './price';

const DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest/dex';

// Uniswap V2 fee tier (0.3%)
const FEE_NUMERATOR = 997;
const FEE_DENOMINATOR = 1000;

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
  priceImpact: string;
  liquidityUSD: string;
  route: string;
}

// ============================================================================
// RESERVE ESTIMATION FROM POOL DATA
// ============================================================================

/**
 * Estimate pool reserves from TVL and token price
 * For a pool: reserveUSD = liquidityUsd / 2 (50/50 split assumption)
 * reserveToken = reserveUSD / tokenPriceUSD
 */
function estimateReserves(
  liquidityUSD: number,
  fromTokenPrice: number,
  toTokenPrice: number
): { reserveIn: number; reserveOut: number } {
  const reserveUSD = liquidityUSD / 2;
  
  // Reserve of input token (in token units)
  const reserveIn = reserveUSD / fromTokenPrice;
  
  // Reserve of output token (in token units)
  const reserveOut = reserveUSD / toTokenPrice;
  
  return { reserveIn, reserveOut };
}

// ============================================================================
// AMM CONSTANT PRODUCT FORMULA (x * y = k)
// ============================================================================

/**
 * Calculate output amount using constant product formula with fee
 * amountInWithFee = amountIn * 0.997 (0.3% fee to LPs)
 * amountOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee)
 */
function calculateAMMSwap(
  amountIn: number,
  reserveIn: number,
  reserveOut: number
): { amountOut: number; amountInWithFee: number } {
  // Apply 0.3% fee
  const amountInWithFee = amountIn * (FEE_NUMERATOR / FEE_DENOMINATOR);
  
  // Constant product: x * y = k
  // New reserveIn = reserveIn + amountInWithFee
  // New reserveOut = k / newReserveIn
  // amountOut = reserveOut - newReserveOut
  const numerator = reserveOut * amountInWithFee;
  const denominator = reserveIn + amountInWithFee;
  const amountOut = numerator / denominator;
  
  return { amountOut, amountInWithFee };
}

/**
 * Calculate realistic slippage and price impact
 * 
 * Slippage = (expectedOut - actualOut) / expectedOut
 * ExpectedOut = amountIn / priceRatio (spot price execution)
 * 
 * Price Impact = (actualPrice - spotPrice) / spotPrice
 * Where actualPrice = amountIn / amountOut
 */
function calculateSlippageAndImpact(
  amountIn: number,
  amountOut: number,
  fromTokenPrice: number,
  toTokenPrice: number
): { slippagePercent: number; priceImpact: number } {
  // Expected output at spot price (no slippage)
  const expectedOut = (amountIn * fromTokenPrice) / toTokenPrice;
  
  // Slippage: how much less you get vs spot price
  const slippagePercent = expectedOut > 0 
    ? ((expectedOut - amountOut) / expectedOut) * 100 
    : 0;
  
  // Price impact: how much the trade moves the price
  const spotPrice = fromTokenPrice / toTokenPrice;
  const executionPrice = amountOut > 0 ? amountIn / amountOut : spotPrice;
  const priceImpact = spotPrice > 0 
    ? ((executionPrice - spotPrice) / spotPrice) * 100 
    : 0;
  
  return { 
    slippagePercent: Math.max(0, slippagePercent), 
    priceImpact: Math.max(0, priceImpact) 
  };
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
  toTokenPrice: number,
  fromTokenSymbol?: string,
  toTokenSymbol?: string
): Promise<SwapQuote | null> {
  try {
    // Find the best pool for this token pair
    const pool = await getPoolData(
      fromTokenSymbol || 'FROM',
      toTokenSymbol || 'TO',
      fromTokenAddress,
      toTokenAddress
    );

    if (!pool) {
      console.warn('Could not find pool for AMM calculation');
      return null;
    }

    const liquidityUSD = parseFloat(pool.tvlUSD);
    
    // Validate we have valid prices
    if (fromTokenPrice <= 0 || toTokenPrice <= 0) {
      console.warn('Invalid token prices for AMM calculation');
      return null;
    }

    // 1. Estimate pool reserves from TVL
    const { reserveIn, reserveOut } = estimateReserves(
      liquidityUSD,
      fromTokenPrice,
      toTokenPrice
    );

    // Validate reserves are meaningful
    if (reserveIn <= 0 || reserveOut <= 0) {
      console.warn('Invalid reserve estimates');
      return null;
    }

    // 2. Convert input amount from USD to token units
    const amountInTokens = amountInUSD / fromTokenPrice;

    // 3. Apply constant product formula with fee
    const { amountOut } = calculateAMMSwap(amountInTokens, reserveIn, reserveOut);

    // 4. Calculate slippage and price impact
    const { slippagePercent, priceImpact } = calculateSlippageAndImpact(
      amountInTokens,
      amountOut,
      fromTokenPrice,
      toTokenPrice
    );

    // 5. Calculate expected output at spot price (for reference)
    const expectedOutput = (amountInTokens * fromTokenPrice) / toTokenPrice;

    // Build route string
    const route = `${fromTokenSymbol || 'Token'} → ${toTokenSymbol || 'Token'}`;

    return {
      expectedOutput: expectedOutput.toFixed(6),
      actualOutput: amountOut.toFixed(6),
      slippagePercent: slippagePercent.toFixed(2),
      priceImpact: priceImpact.toFixed(2),
      liquidityUSD: pool.tvlUSD,
      route,
    };
  } catch (error) {
    console.error('Error calculating AMM swap quote:', error);
    return null;
  }
}

export { TOKENS };
