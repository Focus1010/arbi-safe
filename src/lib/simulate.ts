import { getTokenPrice, TOKENS } from './api/price.ts';
import { getPoolData, getSwapQuote } from './api/pool.ts';
import { getGasEstimate } from './api/gas.ts';
import { getTrustScore } from './api/trust.ts';

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
  trustScore: number;
  trustTier: string;
  trustReasons: string[];
  degenScore: number;
  degenLabel: string;
  warnings: string[];
  simulatedAt: string;
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

  // STEP 1: Fetch prices
  let fromTokenPrice = 1;
  let toTokenPrice = 1;
  let fromTokenAddress = '';
  let toTokenAddress = '';

  try {
    const fromTokenKey = input.fromToken.toUpperCase() as keyof typeof TOKENS;
    const toTokenKey = input.toToken.toUpperCase() as keyof typeof TOKENS;

    if (fromTokenKey in TOKENS) {
      fromTokenAddress = TOKENS[fromTokenKey];
      const fromPriceData = await getTokenPrice(fromTokenAddress);
      if (fromPriceData) {
        fromTokenPrice = parseFloat(fromPriceData.priceUsd);
      } else {
        warnings.push(`⚠️ Price data unavailable for ${input.fromToken} — using fallback`);
      }
    } else {
      warnings.push(`⚠️ ${input.fromToken} not in known tokens — using fallback price of 1`);
    }

    if (toTokenKey in TOKENS) {
      toTokenAddress = TOKENS[toTokenKey];
      const toPriceData = await getTokenPrice(toTokenAddress);
      if (toPriceData) {
        toTokenPrice = parseFloat(toPriceData.priceUsd);
      } else {
        warnings.push(`⚠️ Price data unavailable for ${input.toToken} — using fallback`);
      }
    } else {
      warnings.push(`⚠️ ${input.toToken} not in known tokens — using fallback price of 1`);
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
        // Fallback calculation without slippage
        toAmount = input.amountUSD / toTokenPrice;
        warnings.push('⚠️ Swap quote unavailable — using estimate without slippage');
      }
    } else {
      // Fallback if addresses not available
      toAmount = input.amountUSD / toTokenPrice;
      warnings.push('⚠️ Token addresses unavailable — using estimate');
    }

    toAmountUSD = toAmount * toTokenPrice;
  } catch (error) {
    warnings.push('⚠️ Swap calculation error — using estimates');
    fromAmount = input.amountUSD / fromTokenPrice;
    toAmount = input.amountUSD / toTokenPrice;
    toAmountUSD = input.amountUSD;
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

  // STEP 4: Net profit
  const netProfitUSD = toAmountUSD - input.amountUSD - gasCostUSD;

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

  // STEP 6: Stress tests
  const stressTests: StressTest[] = [
    {
      label: '-20% drop',
      priceDropPercent: 20,
      portfolioValueUSD: toAmount * (toTokenPrice * 0.8),
      pnlUSD: toAmount * (toTokenPrice * 0.8) - input.amountUSD,
    },
    {
      label: '-40% drop',
      priceDropPercent: 40,
      portfolioValueUSD: toAmount * (toTokenPrice * 0.6),
      pnlUSD: toAmount * (toTokenPrice * 0.6) - input.amountUSD,
    },
    {
      label: '-60% drop',
      priceDropPercent: 60,
      portfolioValueUSD: toAmount * (toTokenPrice * 0.4),
      pnlUSD: toAmount * (toTokenPrice * 0.4) - input.amountUSD,
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

  if (isVolatileToken(input.toToken)) {
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

  if (netProfitUSD < 0) {
    warnings.push('📉 Strategy results in a net loss at current prices');
  }

  if (lpAPR && lpAPR > 40) {
    warnings.push('🔥 High APR often means high impermanent loss risk');
  }

  return {
    fromToken: input.fromToken,
    toToken: input.toToken,
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
    trustScore,
    trustTier,
    trustReasons,
    degenScore,
    degenLabel,
    warnings,
    simulatedAt: new Date().toISOString(),
  };
}
