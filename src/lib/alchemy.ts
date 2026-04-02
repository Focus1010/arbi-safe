import { ethers } from 'ethers';

const ALCHEMY_RPC_URL = process.env.ALCHEMY_RPC_URL || 'https://arb-mainnet.g.alchemy.com/v2/demo';
const ETH_PRICE_USD = 3500; // Will be fetched dynamically in production

export interface GasData {
  gasPriceWei: string;
  gasPriceGwei: string;
  estimatedSwapCostEth: string;
  estimatedSwapCostUsd: string;
  timestamp: number;
}

export interface SwapSimulation {
  fromToken: string;
  toToken: string;
  amountIn: string;
  estimatedAmountOut: string;
  priceImpact: string;
  gasCostEth: string;
  gasCostUsd: string;
  route?: string;
}

/**
 * Get current gas price from Alchemy RPC
 */
export async function getGasData(): Promise<GasData | null> {
  try {
    const provider = new ethers.JsonRpcProvider(ALCHEMY_RPC_URL);
    
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.1', 'gwei');
    
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    // Estimate swap cost (400k gas units for typical swap)
    const SWAP_GAS_UNITS = 400000;
    const totalCostWei = gasPrice * BigInt(SWAP_GAS_UNITS);
    const totalCostEth = parseFloat(ethers.formatEther(totalCostWei));
    const totalCostUsd = totalCostEth * ETH_PRICE_USD;
    
    return {
      gasPriceWei: gasPrice.toString(),
      gasPriceGwei: gasPriceGwei.toFixed(2),
      estimatedSwapCostEth: totalCostEth.toFixed(6),
      estimatedSwapCostUsd: totalCostUsd.toFixed(2),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Alchemy gas fetch error:', error);
    return null;
  }
}

/**
 * Basic swap simulation using Alchemy
 * In production, this would use 0x API or similar for real quotes
 */
export async function simulateSwap(
  fromToken: string,
  toToken: string,
  amountUsd: number
): Promise<SwapSimulation | null> {
  try {
    // For now, placeholder logic - in production use 0x API
    // This simulates a basic swap with 0.5% price impact for small amounts
    // and increasing impact for larger amounts
    
    const gasData = await getGasData();
    if (!gasData) {
      return null;
    }
    
    // Simple simulation: assume $1 = 1 unit for simplicity
    // In production, fetch real price from DexScreener
    const estimatedAmountOut = (amountUsd * 0.995).toString(); // 0.5% fee
    const priceImpact = Math.min(amountUsd / 10000, 5).toFixed(2); // Simulated impact
    
    return {
      fromToken,
      toToken,
      amountIn: amountUsd.toString(),
      estimatedAmountOut,
      priceImpact,
      gasCostEth: gasData.estimatedSwapCostEth,
      gasCostUsd: gasData.estimatedSwapCostUsd,
      route: `${fromToken} → ${toToken}`,
    };
  } catch (error) {
    console.error('Swap simulation error:', error);
    return null;
  }
}

/**
 * Estimate LP position
 * Placeholder for future 0x or dedicated LP simulation
 */
export async function simulateLP(
  tokenA: string,
  tokenB: string,
  amountUsd: number
): Promise<{
  tokenA: string;
  tokenB: string;
  amountA: string;
  amountB: string;
  estimatedLPShare: string;
  aprEstimate: string;
  gasCostUsd: string;
} | null> {
  try {
    const gasData = await getGasData();
    if (!gasData) {
      return null;
    }
    
    // Placeholder: 50/50 split
    const halfAmount = (amountUsd / 2).toFixed(2);
    
    return {
      tokenA,
      tokenB,
      amountA: halfAmount,
      amountB: halfAmount,
      estimatedLPShare: '~0.01%',
      aprEstimate: '15-30%',
      gasCostUsd: (parseFloat(gasData.estimatedSwapCostUsd) * 1.5).toFixed(2), // LP costs more gas
    };
  } catch (error) {
    console.error('LP simulation error:', error);
    return null;
  }
}

/**
 * Get token balance via Alchemy
 */
export async function getTokenBalance(
  address: string,
  tokenAddress: string
): Promise<string | null> {
  try {
    const provider = new ethers.JsonRpcProvider(ALCHEMY_RPC_URL);
    
    // ERC20 balanceOf call
    const abi = ['function balanceOf(address) view returns (uint256)'];
    const contract = new ethers.Contract(tokenAddress, abi, provider);
    
    const balance = await contract.balanceOf(address);
    return balance.toString();
  } catch (error) {
    console.error('Balance fetch error:', error);
    return null;
  }
}
