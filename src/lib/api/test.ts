import { getTokenPrice, TOKENS } from './price';
import { getPoolData, getSwapQuote } from './pool';
import { getGasEstimate } from './gas';
import { getTrustScore } from './trust';
import { simulateStrategy } from '../simulate';

async function runTests() {
  console.log('🧪 Running ArbiSafe API Tests\n');
  console.log('=' .repeat(50));

  // Test 1: getTokenPrice for ARB
  console.log('\n📊 Test 1: getTokenPrice (ARB)');
  console.log('-'.repeat(50));
  const arbPrice = await getTokenPrice(TOKENS.ARB);
  if (arbPrice) {
    console.log('✅ ARB Token Price:');
    console.log(`   Price: $${parseFloat(arbPrice.priceUsd).toFixed(4)}`);
    console.log(`   Symbol: ${arbPrice.symbol}`);
    console.log(`   Liquidity: $${parseFloat(arbPrice.liquidityUsd).toLocaleString()}`);
    console.log(`   24h Volume: $${parseFloat(arbPrice.volume24h).toLocaleString()}`);
  } else {
    console.log('❌ Failed to fetch ARB price');
  }

  // Test 2: getTokenPrice for USDC
  console.log('\n📊 Test 2: getTokenPrice (USDC)');
  console.log('-'.repeat(50));
  const usdcPrice = await getTokenPrice(TOKENS.USDC);
  if (usdcPrice) {
    console.log('✅ USDC Token Price:');
    console.log(`   Price: $${parseFloat(usdcPrice.priceUsd).toFixed(4)}`);
    console.log(`   Symbol: ${usdcPrice.symbol}`);
    console.log(`   Liquidity: $${parseFloat(usdcPrice.liquidityUsd).toLocaleString()}`);
    console.log(`   24h Volume: $${parseFloat(usdcPrice.volume24h).toLocaleString()}`);
  } else {
    console.log('❌ Failed to fetch USDC price');
  }

  // Test 3: getPoolData for WETH/USDC using DexScreener
  console.log('\n🏊 Test 3: getPoolData (WETH/USDC via DexScreener)');
  console.log('-'.repeat(50));
  const poolData = await getPoolData('WETH', 'USDC', TOKENS.WETH, TOKENS.USDC);
  if (poolData) {
    console.log('✅ Pool Data:');
    console.log(`   Pool Address: ${poolData.poolAddress}`);
    console.log(`   TVL USD: $${parseFloat(poolData.tvlUSD).toLocaleString()}`);
    console.log(`   Fee Tier: ${poolData.feeTier}`);
    console.log(`   Price USD: $${poolData.priceUsd}`);
    console.log(`   Volume 24h: $${parseFloat(poolData.volume24h).toLocaleString()}`);
    console.log(`   Transactions 24h: ${poolData.txns24h.buys} buys, ${poolData.txns24h.sells} sells`);
  } else {
    console.log('❌ Failed to fetch pool data');
  }

  // Test 4: getSwapQuote for $1000 USDC to WETH
  console.log('\n💱 Test 4: getSwapQuote ($1000 USDC → WETH)');
  console.log('-'.repeat(50));
  const amountInUSD = 1000;
  const usdcPriceNum = parseFloat(usdcPrice?.priceUsd || '1');
  const wethPrice = await getTokenPrice(TOKENS.WETH);
  const wethPriceNum = parseFloat(wethPrice?.priceUsd || '3500');
  const swapQuote = await getSwapQuote(TOKENS.USDC, TOKENS.WETH, amountInUSD, usdcPriceNum, wethPriceNum);
  if (swapQuote) {
    console.log('✅ Swap Quote:');
    console.log(`   Amount In: $${amountInUSD}`);
    console.log(`   Expected Output: ${swapQuote.expectedOutput} WETH`);
    console.log(`   Actual Output (after slippage): ${swapQuote.actualOutput} WETH`);
    console.log(`   Slippage: ${swapQuote.slippagePercent}%`);
    console.log(`   Pool Liquidity: $${parseFloat(swapQuote.liquidityUSD).toLocaleString()}`);
  } else {
    console.log('❌ Failed to fetch swap quote');
  }

  // Test 5: getGasEstimate
  console.log('\n⛽ Test 5: getGasEstimate');
  console.log('-'.repeat(50));
  const gasEstimate = await getGasEstimate();
  if (gasEstimate) {
    console.log('✅ Gas Estimate:');
    console.log(`   Gas Price: ${parseFloat(gasEstimate.gasPriceGwei).toFixed(4)} gwei`);
    console.log(`   Estimated Swap Cost: $${gasEstimate.estimatedSwapCostUsd}`);
  } else {
    console.log('❌ Failed to fetch gas estimate');
  }

  // Test 6: getTrustScore for Camelot
  console.log('\n🛡️  Test 6: getTrustScore (Camelot)');
  console.log('-'.repeat(50));
  const camelotTrust = await getTrustScore('camelot');
  if (camelotTrust) {
    console.log('✅ Camelot Trust Score:');
    console.log(`   Score: ${camelotTrust.score}/100`);
    console.log(`   Tier: ${camelotTrust.tier}`);
    console.log('   Reasons:');
    camelotTrust.reasons.forEach((reason, i) => {
      console.log(`     ${i + 1}. ${reason}`);
    });
  } else {
    console.log('❌ Failed to fetch trust score');
  }

  // Test 7: getTrustScore for unknown protocol with address
  console.log('\n🛡️  Test 7: getTrustScore (Unknown Protocol with Address)');
  console.log('-'.repeat(50));
  const unknownTrust = await getTrustScore(
    'UnknownDeFi',
    '0x912CE59144191C1204E64559FE8253a0e49E6548' // ARB token as example
  );
  if (unknownTrust) {
    console.log('✅ Unknown Protocol Trust Score:');
    console.log(`   Score: ${unknownTrust.score}/100`);
    console.log(`   Tier: ${unknownTrust.tier}`);
    console.log('   Reasons:');
    unknownTrust.reasons.forEach((reason, i) => {
      console.log(`     ${i + 1}. ${reason}`);
    });
  } else {
    console.log('❌ Failed to fetch trust score');
  }

  // Test 8: getTrustScore for GMX
  console.log('\n🛡️  Test 8: getTrustScore (GMX)');
  console.log('-'.repeat(50));
  const gmxTrust = await getTrustScore('gmx');
  if (gmxTrust) {
    console.log('✅ GMX Trust Score:');
    console.log(`   Score: ${gmxTrust.score}/100`);
    console.log(`   Tier: ${gmxTrust.tier}`);
    console.log('   Reasons:');
    gmxTrust.reasons.forEach((reason, i) => {
      console.log(`     ${i + 1}. ${reason}`);
    });
  } else {
    console.log('❌ Failed to fetch trust score');
  }

  // SIMULATION TESTS
  console.log('\n\n🎮 SIMULATION TESTS');
  console.log('='.repeat(70));

  // Scenario 1 - Simple swap
  console.log('\n📊 Scenario 1: Simple Swap (USDC → ARB, $200, Camelot)');
  console.log('-'.repeat(70));
  const sim1 = await simulateStrategy({
    fromToken: 'USDC',
    toToken: 'ARB',
    amountUSD: 200,
    action: 'swap',
    protocol: 'camelot',
  });
  console.log('Swap Details:');
  console.log(`  From: ${sim1.fromAmount.toFixed(4)} ${sim1.fromToken}`);
  console.log(`  To: ${sim1.toAmount.toFixed(4)} ${sim1.toToken} ($${sim1.toAmountUSD.toFixed(2)})`);
  console.log(`  Slippage: ${sim1.slippagePercent}%`);
  console.log(`  Gas Cost: $${sim1.gasCostUSD.toFixed(4)}`);
  console.log(`  Net Profit: $${sim1.netProfitUSD.toFixed(2)}`);
  console.log('\nStress Tests:');
  sim1.stressTests.forEach((test) => {
    console.log(`  ${test.label}: $${test.portfolioValueUSD.toFixed(2)} (PnL: $${test.pnlUSD.toFixed(2)})`);
  });
  console.log(`\nTrust Score: ${sim1.trustScore}/100 (${sim1.trustTier})`);
  console.log(`Degen Score: ${sim1.degenScore}/100 - ${sim1.degenLabel}`);
  console.log('\nWarnings:');
  sim1.warnings.forEach((w) => console.log(`  ${w}`));
  console.log(`\nSimulated At: ${sim1.simulatedAt}`);

  // Scenario 2 - LP position
  console.log('\n\n🏊 Scenario 2: LP Position (USDC → WETH, $500, Camelot)');
  console.log('-'.repeat(70));
  const sim2 = await simulateStrategy({
    fromToken: 'USDC',
    toToken: 'WETH',
    amountUSD: 500,
    action: 'lp',
    protocol: 'camelot',
  });
  console.log('LP Details:');
  console.log(`  From: ${sim2.fromAmount.toFixed(4)} ${sim2.fromToken}`);
  console.log(`  To: ${sim2.toAmount.toFixed(6)} ${sim2.toToken}`);
  console.log(`  LP APR: ${sim2.lpAPR}%`);
  console.log(`  Daily Earnings: $${sim2.dailyEarningsUSD?.toFixed(4)}`);
  console.log(`  Weekly Earnings: $${sim2.weeklyEarningsUSD?.toFixed(2)}`);
  console.log(`  Gas Cost: $${sim2.gasCostUSD.toFixed(4)}`);
  console.log(`  Net Profit: $${sim2.netProfitUSD.toFixed(2)}`);
  console.log('\nStress Tests:');
  sim2.stressTests.forEach((test) => {
    console.log(`  ${test.label}: $${test.portfolioValueUSD.toFixed(2)} (PnL: $${test.pnlUSD.toFixed(2)})`);
  });
  console.log(`\nTrust Score: ${sim2.trustScore}/100 (${sim2.trustTier})`);
  console.log(`Degen Score: ${sim2.degenScore}/100 - ${sim2.degenLabel}`);
  console.log('\nWarnings:');
  sim2.warnings.forEach((w) => console.log(`  ${w}`));
  console.log(`\nSimulated At: ${sim2.simulatedAt}`);

  // Scenario 3 - Risky swap (trigger degen score)
  console.log('\n\n🎰 Scenario 3: Risky LP (USDC → ARB, $6000, Unknown Protocol)');
  console.log('-'.repeat(70));
  const sim3 = await simulateStrategy({
    fromToken: 'USDC',
    toToken: 'ARB',
    amountUSD: 6000,
    action: 'lp',
    protocol: 'unknownprotocol',
  });
  console.log('Risky Strategy Details:');
  console.log(`  From: ${sim3.fromAmount.toFixed(4)} ${sim3.fromToken}`);
  console.log(`  To: ${sim3.toAmount.toFixed(4)} ${sim3.toToken} ($${sim3.toAmountUSD.toFixed(2)})`);
  console.log(`  Slippage: ${sim3.slippagePercent}%`);
  console.log(`  Gas Cost: $${sim3.gasCostUSD.toFixed(4)}`);
  console.log(`  Net Profit: $${sim3.netProfitUSD.toFixed(2)}`);
  if (sim3.lpAPR) {
    console.log(`  LP APR: ${sim3.lpAPR}%`);
    console.log(`  Daily Earnings: $${sim3.dailyEarningsUSD?.toFixed(4)}`);
    console.log(`  Weekly Earnings: $${sim3.weeklyEarningsUSD?.toFixed(2)}`);
  }
  console.log('\nStress Tests:');
  sim3.stressTests.forEach((test) => {
    console.log(`  ${test.label}: $${test.portfolioValueUSD.toFixed(2)} (PnL: $${test.pnlUSD.toFixed(2)})`);
  });
  console.log(`\nTrust Score: ${sim3.trustScore}/100 (${sim3.trustTier})`);
  console.log(`Degen Score: ${sim3.degenScore}/100 - ${sim3.degenLabel}`);
  console.log('\nWarnings:');
  sim3.warnings.forEach((w) => console.log(`  ${w}`));
  console.log(`\nSimulated At: ${sim3.simulatedAt}`);

  console.log('\n' + '='.repeat(70));
  console.log('✨ All tests completed!');
}

runTests().catch((error) => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
