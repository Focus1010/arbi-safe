import { getTokenPrice, TOKENS } from './api/price';
import { getPoolData, getSwapQuote } from './api/pool';
import { getGasEstimate } from './api/gas';
import { getTrustScore } from './api/trust';
import { resolveToken, getTokenMetadata, DexScreenerTokenMetadata } from './tokens';

export interface SimulateInput {
  fromToken: string;
  toToken: string;
  amountUSD: number;
  action: 'swap' | 'lp';
  protocol: string;
}

export interface StressTest {
  label: string;
  priceDropPercent: number;
  portfolioValueUSD: number;
  pnlUSD: number;
}

export interface ProfitScenario {
  label: string;
  priceGainPercent: number;
  portfolioValueUSD: number;
  pnlUSD: number;
}

export interface TokenMetadataOutput {
  symbol: string;
  name: string;
  liquidity: number;
  volume24h: number;
}

export interface SimulateOutput {
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  toAmountUSD: number;
  slippagePercent: number;
  gasCostUSD: number;
  netProfitUSD: number;
  lpAPR: number | null;
  dailyEarningsUSD: number | null;
  weeklyEarningsUSD: number | null;
  stressTests: StressTest[];
  profitScenarios: ProfitScenario[];
  trustScore: number;
  trustTier: string;
  trustReasons: string[];
  degenScore: number;
  degenLabel: string;
  warnings: string[];
  simulatedAt: string;
  toTokenMetadata: TokenMetadataOutput | null;
}

const STABLECOINS = ['USDC', 'USDT', 'DAI'];
const MAJOR_TOKENS = ['WETH', 'ETH', 'WBTC', 'BTC'];

function isVolatileToken(token: string): boolean {
  const upper = token.toUpperCase();
  return !STABLECOINS.includes(upper) && !MAJOR_TOKENS.includes(upper);
}

function getDegenLabel(score: number): string {
  if (score <= 25) return 'Smooth Brain 🧠';
  if (score <= 50) return 'Mid Curve 📈';
  if (score <= 75) return 'Degen 🎰';
  return 'Galaxy Brain 🌌';
}

function calculateLPAPR(tvlUSD: number): number {
  if (tvlUSD > 10_000_000) return 15;
  if (tvlUSD > 1_000_000) return 25;
  return 45;
}

export async function simulateStrategy(input: SimulateInput): Promise<SimulateOutput> {
  const warnings: string[] = [];
  let usedPriceFallback = false;

  // STEP 1: Resolve token inputs (ticker or address) and fetch prices
  let fromTokenPrice = 1;
  let toTokenPrice = 1;
  let fromTokenAddress = resolveToken(input.fromToken);
  let toTokenAddress = resolveToken(input.toToken);

  // Track original inputs for display
  const fromTokenDisplay = fromTokenAddress && input.fromToken.toLowerCase().startsWith('0x')
    ? `${input.fromToken.slice(0, 6)}...${input.fromToken.slice(-4)}`
    : input.fromToken.toUpperCase();
  const toTokenDisplay = toTokenAddress && input.toToken.toLowerCase().startsWith('0x')
    ? `${input.toToken.slice(0, 6)}...${input.toToken.slice(-4)}`
    : input.toToken.toUpperCase();

  try {
    if (fromTokenAddress) {
      const fromPriceData = await getTokenPrice(fromTokenAddress);
      if (fromPriceData) {
        fromTokenPrice = parseFloat(fromPriceData.priceUsd);
      } else {
        warnings.push(`⚠️ Price data unavailable for ${fromTokenDisplay} — using fallback`);
      }
    } else {
      warnings.push(`⚠️ ${fromTokenDisplay} not recognized — using fallback price of 1`);
    }

    if (toTokenAddress) {
      const toPriceData = await getTokenPrice(toTokenAddress);
      if (toPriceData) {
        toTokenPrice = parseFloat(toPriceData.priceUsd);
      } else {
        warnings.push(`⚠️ Price data unavailable for ${toTokenDisplay} — using fallback`);
      }
    } else {
      warnings.push(`⚠️ ${toTokenDisplay} not recognized — using fallback price of 1`);
    }
  } catch (error) {
    warnings.push('⚠️ Price API error — using fallback prices');
  }

  // STEP 2: Calculate swap
  let fromAmount = 0;
  let toAmount = 0;
  let toAmountUSD = 0;
  let slippagePercent = 0;

  try {
    fromAmount = input.amountUSD / fromTokenPrice;

    if (fromTokenAddress && toTokenAddress) {
      const quote = await getSwapQuote(
        fromTokenAddress,
        toTokenAddress,
        input.amountUSD,
        fromTokenPrice,
        toTokenPrice
      );

      if (quote) {
        toAmount = parseFloat(quote.actualOutput);
        slippagePercent = parseFloat(quote.slippagePercent);
      } else {
        // Fallback calculation using price-based mathematical estimate
        toAmount = input.amountUSD / toTokenPrice;
        usedPriceFallback = true;
      }
    } else {
      // Fallback if addresses not available
      toAmount = input.amountUSD / toTokenPrice;
      usedPriceFallback = true;
    }

    toAmountUSD = toAmount * toTokenPrice;
  } catch (error) {
    warnings.push('⚠️ Swap calculation error — using estimates');
    fromAmount = input.amountUSD / fromTokenPrice;
    toAmount = input.amountUSD / toTokenPrice;
    toAmountUSD = input.amountUSD;
    usedPriceFallback = true;
  }

  // Add subtle note if using price-based fallback (not scary warning)
  if (usedPriceFallback) {
    warnings.push('ℹ️ Using price-based estimate (live quote unavailable)');
  }

  // STEP 3: Gas
  let gasCostUSD = 0.05;
  try {
    const gasEstimate = await getGasEstimate();
    if (gasEstimate) {
      gasCostUSD = parseFloat(gasEstimate.estimatedSwapCostUsd);
    } else {
      warnings.push('⚠️ Gas estimate unavailable — using fallback $0.05');
    }
  } catch (error) {
    warnings.push('⚠️ Gas API error — using fallback $0.05');
  }

  // STEP 4: Net profit (fixed: only subtract gas, value is preserved in output token)
  const netProfitUSD = toAmountUSD - gasCostUSD;

  // STEP 5: LP calculations (only if action === "lp")
  let lpAPR: number | null = null;
  let dailyEarningsUSD: number | null = null;
  let weeklyEarningsUSD: number | null = null;

  if (input.action === 'lp') {
    try {
      if (fromTokenAddress && toTokenAddress) {
        const poolData = await getPoolData(
          input.fromToken,
          input.toToken,
          fromTokenAddress,
          toTokenAddress
        );

        if (poolData) {
          const tvlUSD = parseFloat(poolData.tvlUSD);
          lpAPR = calculateLPAPR(tvlUSD);
          dailyEarningsUSD = (input.amountUSD * lpAPR) / 365;
          weeklyEarningsUSD = dailyEarningsUSD * 7;
        } else {
          // Fallback APR estimation
          lpAPR = 25;
          dailyEarningsUSD = (input.amountUSD * lpAPR) / 365;
          weeklyEarningsUSD = dailyEarningsUSD * 7;
          warnings.push('⚠️ Pool data unavailable — using estimated 25% APR');
        }
      } else {
        lpAPR = 25;
        dailyEarningsUSD = (input.amountUSD * lpAPR) / 365;
        weeklyEarningsUSD = dailyEarningsUSD * 7;
        warnings.push('⚠️ Token addresses unavailable — using estimated 25% APR');
      }
    } catch (error) {
      lpAPR = 25;
      dailyEarningsUSD = (input.amountUSD * lpAPR) / 365;
      weeklyEarningsUSD = dailyEarningsUSD * 7;
      warnings.push('⚠️ Pool API error — using estimated 25% APR');
    }
  }

  // STEP 6: Stress tests (loss scenarios)
  const stressTests: StressTest[] = [
    {
      label: '-20% drop',
      priceDropPercent: 20,
      portfolioValueUSD: toAmount * (toTokenPrice * 0.8),
      pnlUSD: toAmount * (toTokenPrice * 0.8) - toAmountUSD,
    },
    {
      label: '-40% drop',
      priceDropPercent: 40,
      portfolioValueUSD: toAmount * (toTokenPrice * 0.6),
      pnlUSD: toAmount * (toTokenPrice * 0.6) - toAmountUSD,
    },
    {
      label: '-60% drop',
      priceDropPercent: 60,
      portfolioValueUSD: toAmount * (toTokenPrice * 0.4),
      pnlUSD: toAmount * (toTokenPrice * 0.4) - toAmountUSD,
    },
  ];

  // STEP 6b: Profit scenarios (gain scenarios)
  const profitScenarios: ProfitScenario[] = [
    {
      label: '+20% pump',
      priceGainPercent: 20,
      portfolioValueUSD: toAmount * (toTokenPrice * 1.2),
      pnlUSD: toAmount * (toTokenPrice * 1.2) - toAmountUSD,
    },
    {
      label: '+50% pump',
      priceGainPercent: 50,
      portfolioValueUSD: toAmount * (toTokenPrice * 1.5),
      pnlUSD: toAmount * (toTokenPrice * 1.5) - toAmountUSD,
    },
    {
      label: '+100% pump',
      priceGainPercent: 100,
      portfolioValueUSD: toAmount * (toTokenPrice * 2.0),
      pnlUSD: toAmount * (toTokenPrice * 2.0) - toAmountUSD,
    },
  ];

  // STEP 7: Trust score
  let trustScore = 50;
  let trustTier = 'Proceed Carefully';
  let trustReasons: string[] = ['Trust data unavailable'];

  try {
    const trustData = await getTrustScore(input.protocol);
    if (trustData) {
      trustScore = trustData.score;
      trustTier = trustData.tier;
      trustReasons = trustData.reasons;
    } else {
      warnings.push('⚠️ Trust score unavailable — using default values');
    }
  } catch (error) {
    warnings.push('⚠️ Trust API error — using default values');
  }

  // STEP 8: Degen score
  let degenScore = 0;

  if (input.amountUSD > 5000) {
    degenScore += 25;
  } else if (input.amountUSD > 1000) {
    degenScore += 15;
  }

  if (slippagePercent > 1) {
    degenScore += 20;
  } else if (slippagePercent > 0.5) {
    degenScore += 10;
  }

  if (input.action === 'lp') {
    degenScore += 10;
  }

  if (trustTier === 'Touch Grass Instead') {
    degenScore += 35;
  } else if (trustTier === 'Proceed Carefully') {
    degenScore += 15;
  }

  if (isVolatileToken(toTokenDisplay)) {
    degenScore += 10;
  }

  degenScore = Math.min(degenScore, 100);
  const degenLabel = getDegenLabel(degenScore);

  // STEP 9: Additional warnings
  if (slippagePercent > 1) {
    warnings.push('⚠️ High slippage detected — consider splitting your trade');
  }

  if (trustTier === 'Touch Grass Instead') {
    warnings.push('🚨 Low trust protocol — proceed with extreme caution');
  }

  if (input.amountUSD > 5000) {
    warnings.push('💸 Large position — consider dollar cost averaging');
  }

  // Fixed net loss warning: only if gas is more than 1% of trade
  if (gasCostUSD > toAmountUSD * 0.01) {
    warnings.push('📉 High gas cost relative to trade size');
  }

  if (lpAPR && lpAPR > 40) {
    warnings.push('🔥 High APR often means high impermanent loss risk');
  }

  // STEP 10: Fetch token metadata for toToken
  let toTokenMetadata: TokenMetadataOutput | null = null;
  if (toTokenAddress) {
    try {
      const metadata = await getTokenMetadata(toTokenAddress);
      if (metadata) {
        toTokenMetadata = {
          symbol: metadata.symbol,
          name: metadata.name,
          liquidity: metadata.liquidity,
          volume24h: metadata.volume24h,
        };
      }
    } catch (error) {
      // Silently fail - metadata is optional
    }
  }

  return {
    fromToken: fromTokenDisplay,
    toToken: toTokenDisplay,
    fromAmount,
    toAmount,
    toAmountUSD,
    slippagePercent,
    gasCostUSD,
    netProfitUSD,
    lpAPR,
    dailyEarningsUSD,
    weeklyEarningsUSD,
    stressTests,
    profitScenarios,
    trustScore,
    trustTier,
    trustReasons,
    degenScore,
    degenLabel,
    warnings,
    simulatedAt: new Date().toISOString(),
    toTokenMetadata,
  };
}
