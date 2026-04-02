import { simulateStrategy } from './simulate';

async function testSimulate() {
  console.log('🧪 Testing simulateStrategy\n');
  console.log('='.repeat(60));

  // Test 1: Simple swap
  console.log('\n📊 Test 1: USDC → WETH Swap ($1000)');
  console.log('-'.repeat(60));
  const swapResult = await simulateStrategy({
    fromToken: 'USDC',
    toToken: 'WETH',
    amountUSD: 1000,
    action: 'swap',
    protocol: 'uniswap',
  });

  console.log(`From: ${swapResult.fromAmount.toFixed(4)} ${swapResult.fromToken}`);
  console.log(`To: ${swapResult.toAmount.toFixed(6)} ${swapResult.toToken} ($${swapResult.toAmountUSD.toFixed(2)})`);
  console.log(`Slippage: ${swapResult.slippagePercent}%`);
  console.log(`Gas Cost: $${swapResult.gasCostUSD.toFixed(4)}`);
  console.log(`Net Profit: $${swapResult.netProfitUSD.toFixed(2)}`);
  console.log(`Trust Score: ${swapResult.trustScore}/100 (${swapResult.trustTier})`);
  console.log(`Degen Score: ${swapResult.degenScore}/100 - ${swapResult.degenLabel}`);
  console.log('\nStress Tests:');
  swapResult.stressTests.forEach((test) => {
    console.log(`  ${test.label}: $${test.portfolioValueUSD.toFixed(2)} (PnL: $${test.pnlUSD.toFixed(2)})`);
  });
  console.log('\nWarnings:');
  swapResult.warnings.forEach((w) => console.log(`  ${w}`));

  // Test 2: LP position
  console.log('\n\n🏊 Test 2: USDC → WETH LP ($5000) on Camelot');
  console.log('-'.repeat(60));
  const lpResult = await simulateStrategy({
    fromToken: 'USDC',
    toToken: 'WETH',
    amountUSD: 5000,
    action: 'lp',
    protocol: 'camelot',
  });

  console.log(`From: ${lpResult.fromAmount.toFixed(4)} ${lpResult.fromToken}`);
  console.log(`To: ${lpResult.toAmount.toFixed(6)} ${lpResult.toToken}`);
  console.log(`LP APR: ${lpResult.lpAPR}%`);
  console.log(`Daily Earnings: $${lpResult.dailyEarningsUSD?.toFixed(4)}`);
  console.log(`Weekly Earnings: $${lpResult.weeklyEarningsUSD?.toFixed(2)}`);
  console.log(`Trust Score: ${lpResult.trustScore}/100 (${lpResult.trustTier})`);
  console.log(`Degen Score: ${lpResult.degenScore}/100 - ${lpResult.degenLabel}`);
  console.log('\nWarnings:');
  lpResult.warnings.forEach((w) => console.log(`  ${w}`));

  // Test 3: High-risk degen play
  console.log('\n\n🎰 Test 3: USDC → ARB Swap ($8000) on Unknown Protocol');
  console.log('-'.repeat(60));
  const degenResult = await simulateStrategy({
    fromToken: 'USDC',
    toToken: 'ARB',
    amountUSD: 8000,
    action: 'swap',
    protocol: 'randomdefi',
  });

  console.log(`From: ${degenResult.fromAmount.toFixed(4)} ${degenResult.fromToken}`);
  console.log(`To: ${degenResult.toAmount.toFixed(4)} ${degenResult.toToken} ($${degenResult.toAmountUSD.toFixed(2)})`);
  console.log(`Trust Score: ${degenResult.trustScore}/100 (${degenResult.trustTier})`);
  console.log(`Degen Score: ${degenResult.degenScore}/100 - ${degenResult.degenLabel}`);
  console.log('\nWarnings:');
  degenResult.warnings.forEach((w) => console.log(`  ${w}`));

  console.log('\n' + '='.repeat(60));
  console.log('✨ All simulation tests completed!');
  console.log(`Simulated at: ${swapResult.simulatedAt}`);
}

testSimulate().catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
