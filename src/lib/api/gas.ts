import { ethers } from 'ethers';

const ARBITRUM_RPC_URL = 'https://arb1.arbitrum.io/rpc';
const ETH_PRICE_USD = 3500;
const SWAP_GAS_UNITS = 400000;

export interface GasEstimate {
  gasPriceGwei: string;
  estimatedSwapCostUsd: string;
}

export async function getGasEstimate(): Promise<GasEstimate | null> {
  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC_URL);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.1', 'gwei');

    const gasPriceGwei = ethers.formatUnits(gasPrice, 'gwei');

    const totalCostWei = gasPrice * BigInt(SWAP_GAS_UNITS);
    const totalCostEth = parseFloat(ethers.formatEther(totalCostWei));
    const estimatedSwapCostUsd = (totalCostEth * ETH_PRICE_USD).toFixed(2);

    return {
      gasPriceGwei,
      estimatedSwapCostUsd,
    };
  } catch (error) {
    console.error('Gas estimation error:', error);
    return null;
  }
}
