/**
 * Terminal-style response formatter for ArbiSafe
 * Creates concise, bold, actionable output
 */

export interface TokenPriceDisplay {
  symbol: string;
  name: string;
  price: string;
  liquidity: string;
  change24h: string;
  verified: boolean;
}

export interface TerminalOutput {
  header: string;
  body: string[];
  verdict: string;
}

/**
 * Format token price data in terminal style
 */
export function formatTokenPrice(data: {
  token: {
    symbol: string;
    name: string;
    address: string;
    verified: boolean;
  };
  price: {
    priceUsd: string;
    liquidityUsd: string;
    priceChange24h: string;
    confidence: number;
  } | null;
  error?: string;
}): string {
  if (data.error || !data.price) {
    return `❌ Unable to verify ${data.token.symbol}

${data.error || 'No price data available.'}`;
  }

  const price = parseFloat(data.price.priceUsd);
  const liquidity = parseFloat(data.price.liquidityUsd);
  const change = parseFloat(data.price.priceChange24h);
  
  const changeEmoji = change >= 0 ? '🟢' : '🔴';
  const changeStr = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  
  // Verdict based on confidence
  let verdict = '⚠️ PROCEED CAREFULLY';
  if (data.price.confidence > 0.7 && liquidity > 100000) {
    verdict = '✅ PROCEED';
  } else if (data.price.confidence < 0.3 || liquidity < 10000) {
    verdict = '❌ AVOID';
  }

  return `${data.token.symbol} (Arbitrum)
━━━━━━━━━━━━━━━━━━━━━
💰 Price: $${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
💧 Liquidity: $${(liquidity / 1000).toFixed(1)}K
${changeEmoji} 24h: ${changeStr}
✓ Verified: ${data.token.verified ? 'Yes' : 'No'}

${verdict}`;
}

/**
 * Format token comparison
 */
export function formatTokenComparison(
  tokenA: { symbol: string; price?: { priceUsd: string; priceChange24h: string } },
  tokenB: { symbol: string; price?: { priceUsd: string; priceChange24h: string } }
): string {
  const priceA = tokenA.price ? parseFloat(tokenA.price.priceUsd) : 0;
  const priceB = tokenB.price ? parseFloat(tokenB.price.priceUsd) : 0;
  
  const changeA = tokenA.price ? parseFloat(tokenA.price.priceChange24h) : 0;
  const changeB = tokenB.price ? parseFloat(tokenB.price.priceChange24h) : 0;
  
  return `⚖️  COMPARISON
━━━━━━━━━━━━━━━━━━━━━
${tokenA.symbol}: $${priceA.toLocaleString()} (${changeA >= 0 ? '+' : ''}${changeA.toFixed(2)}%)
${tokenB.symbol}: $${priceB.toLocaleString()} (${changeB >= 0 ? '+' : ''}${changeB.toFixed(2)}%)
━━━━━━━━━━━━━━━━━━━━━
Winner: ${Math.abs(changeA) > Math.abs(changeB) ? tokenA.symbol : tokenB.symbol} (${Math.abs(changeA) > Math.abs(changeB) ? changeA.toFixed(2) : changeB.toFixed(2)}%)`;
}

/**
 * Format market overview
 */
export function formatMarketOverview(data: {
  totalVolume24h: number;
  topTokens: Array<{
    symbol: string;
    price: number;
    change24h: number;
  }>;
}): string {
  const volumeInM = (data.totalVolume24h / 1_000_000).toFixed(2);
  
  let output = `📊 ARBITRUM MARKET
━━━━━━━━━━━━━━━━━━━━━
24h Volume: $${volumeInM}M

Top Movers:`;

  data.topTokens.slice(0, 5).forEach((token, i) => {
    const emoji = token.change24h >= 0 ? '🟢' : '🔴';
    output += `\n${i + 1}. ${token.symbol}: $${token.price.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${emoji} ${token.change24h >= 0 ? '+' : ''}${token.change24h.toFixed(2)}%`;
  });

  return output;
}

/**
 * Format top gainers/losers
 */
export function formatTopMovers(
  movers: Array<{ symbol: string; change24h: number; price: number }>,
  type: 'gainers' | 'losers'
): string {
  const title = type === 'gainers' ? '🚀 TOP GAINERS' : '🔻 TOP LOSERS';
  
  let output = `${title} (24h)
━━━━━━━━━━━━━━━━━━━━━`;

  movers.slice(0, 5).forEach((token, i) => {
    output += `\n${i + 1}. ${token.symbol}: +${token.change24h.toFixed(2)}% ($${token.price.toLocaleString(undefined, { maximumFractionDigits: 4 })})`;
  });

  return output;
}

/**
 * Format gas fees
 */
export function formatGasFees(gasData: {
  gasPrice: string;
  gasPriceGwei: number;
  estimatedCostUSD: number;
}): string {
  return `⛽ GAS FEES
━━━━━━━━━━━━━━━━━━━━━
Price: ${gasData.gasPriceGwei.toFixed(2)} Gwei
Swap Cost: ~$${gasData.estimatedCostUSD.toFixed(2)}`;
}

/**
 * Format simulation result
 */
export function formatSimulation(data: {
  fromToken: string;
  toToken: string;
  amountIn: number;
  amountOut: number;
  priceImpact: number;
  gasCostUSD: number;
  slippage: number;
}): string {
  const impactEmoji = data.priceImpact < 1 ? '✅' : data.priceImpact < 3 ? '⚠️' : '❌';
  
  return `🔄 SIMULATION
━━━━━━━━━━━━━━━━━━━━━
Swap: ${data.amountIn} ${data.fromToken} → ${data.amountOut.toFixed(4)} ${data.toToken}
Impact: ${impactEmoji} ${data.priceImpact.toFixed(2)}%
Slippage: ${data.slippage.toFixed(2)}%
Gas: $${data.gasCostUSD.toFixed(2)}

${data.priceImpact < 3 ? '✅ PROCEED' : '⚠️ PROCEED CAREFULLY'}`;
}

/**
 * Format error in terminal style
 */
export function formatError(message: string): string {
  return `❌ ERROR
━━━━━━━━━━━━━━━━━━━━━
${message}

Unable to verify this token with high confidence.`;
}
