// Run with: npx ts-node --esm scripts/register-agent.ts

import { ethers } from 'ethers';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// ERC-8004 Identity Registry contract on Arbitrum Sepolia
const CONTRACT_ADDRESS = '0x8004A818BFB912233c491871b3d84c89A494BD9e';

// Minimal ABI for the mint function
const ABI = [
  {
    "name": "register",
    "type": "function",
    "inputs": [
      { "name": "agentURI", "type": "string" }
    ],
    "outputs": [{ "name": "agentId", "type": "uint256" }],
    "stateMutability": "nonpayable"
  }
];

const TOKEN_URI = 'https://arbisafe.vercel.app/agent.json';

async function main() {
  try {
    // Validate environment variables
    const privateKey = process.env.PRIVATE_KEY;
    const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc';

    if (!privateKey) {
      throw new Error('PRIVATE_KEY not found in .env.local. Please add it and try again.');
    }

    // Connect to Arbitrum Sepolia
    console.log('Connecting to Arbitrum Sepolia...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const walletAddress = wallet.address;

    console.log(`Using wallet: ${walletAddress}`);
    console.log(`RPC: ${rpcUrl}`);

    // Check balance
    const balance = await provider.getBalance(walletAddress);
    console.log(`Wallet balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === BigInt(0)) {
      console.warn('Warning: Wallet has zero balance. You may need testnet ETH.');
    }

    // Create contract instance
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    // Call mint()
    console.log('Calling mint() on ERC-8004 Identity Registry...');
    console.log(`  to: ${walletAddress}`);
    console.log(`  tokenURI: ${TOKEN_URI}`);

    const tx = await contract.register("https://arbisafe.vercel.app/agent.json");
    console.log(`Transaction sent: ${tx.hash}`);

    // Wait for confirmation
    console.log('Waiting for confirmation...');
    const receipt = await tx.wait();
    
    if (!receipt) {
      throw new Error('Transaction receipt is null');
    }

    // Get token ID from the transaction receipt
    // The mint function returns tokenId, which we can get from the logs
    const tokenId = receipt.logs[0]?.topics[3]; // Usually the tokenId is in the Transfer event
    const parsedTokenId = tokenId ? parseInt(tokenId, 16).toString() : 'unknown';

    console.log('\n=== Registration Successful! ===');
    console.log(`Transaction Hash: ${receipt.hash}`);
    console.log(`Token ID: ${parsedTokenId}`);
    console.log(`Arbiscan Sepolia: https://sepolia.arbiscan.io/tx/${receipt.hash}`);
    console.log('==============================\n');

    // Save to public/registration.json
    const registrationData = {
      tokenId: parsedTokenId,
      txHash: receipt.hash,
      arbiscanUrl: `https://sepolia.arbiscan.io/tx/${receipt.hash}`,
      registeredAt: new Date().toISOString(),
      walletAddress,
      tokenURI: TOKEN_URI,
      contractAddress: CONTRACT_ADDRESS,
      network: 'Arbitrum Sepolia'
    };

    const publicDir = path.join(process.cwd(), 'public');
    const outputPath = path.join(publicDir, 'registration.json');

    // Ensure public directory exists
    try {
      await fs.access(publicDir);
    } catch {
      await fs.mkdir(publicDir, { recursive: true });
    }

    await fs.writeFile(outputPath, JSON.stringify(registrationData, null, 2));
    console.log(`Registration data saved to: ${outputPath}`);

  } catch (error) {
    console.error('\n=== Registration Failed ===');
    
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      
      // Provide helpful hints for common errors
      if (error.message.includes('insufficient funds')) {
        console.error('\nHint: Your wallet needs Arbitrum Sepolia testnet ETH.');
        console.error('Get some from: https://faucet.arbitrum.io/ or https://sepoliafaucet.com/');
      } else if (error.message.includes('PRIVATE_KEY')) {
        console.error('\nHint: Create a .env.local file with:');
        console.error('  PRIVATE_KEY=your_private_key_here (without 0x prefix)');
        console.error('  ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc');
      } else if (error.message.includes('call revert') || error.message.includes('execution reverted')) {
        console.error('\nHint: The contract call reverted. The contract may:');
        console.error('  - Already have an agent registered for this wallet');
        console.error('  - Be paused or not deployed at this address');
        console.error('  - Require additional permissions');
      } else if (error.message.includes('could not coalesce error') || error.message.includes('bad response')) {
        console.error('\nHint: RPC connection issue. Try:');
        console.error('  - Checking your internet connection');
        console.error('  - Using a different RPC endpoint');
        console.error('  - The Arbitrum Sepolia network may be temporarily down');
      }
    } else {
      console.error('Unknown error:', error);
    }
    
    console.error('\nFull error details:');
    console.error(error);
    process.exit(1);
  }
}

main();
