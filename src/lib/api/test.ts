import { getTokenPrice, TOKENS } from './price.ts';
import { getPoolData, getSwapQuote } from './pool.ts';
import { getGasEstimate } from './gas.ts';
import { getTrustScore } from './trust.ts';

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

  console.log('\n' + '='.repeat(50));
  console.log('✨ All tests completed!');
}

runTests().catch((error) => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
