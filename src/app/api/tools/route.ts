import { NextResponse } from 'next/server';

export async function GET() {
  const tools = [
    {
      name: 'simulate_strategy',
      description: 'Simulates any swap or LP strategy on Arbitrum with real onchain data. Returns expected output, slippage, gas cost, stress test scenarios, and profit projections.',
      parameters: {
        fromToken: {
          type: 'string',
          description: 'Token to swap from (ticker or contract address)',
          required: true
        },
        toToken: {
          type: 'string',
          description: 'Token to swap to (ticker or contract address)',
          required: true
        },
        amountUSD: {
          type: 'number',
          description: 'Amount in USD to swap or provide as liquidity',
          required: true
        },
        action: {
          type: 'string',
          enum: ['swap', 'lp'],
          description: 'Type of action: swap or liquidity provision',
          required: true
        },
        protocol: {
          type: 'string',
          description: 'Protocol to use (camelot, gmx, uniswap, aave, etc.)',
          required: false
        }
      }
    },
    {
      name: 'check_price',
      description: 'Fetches real-time token price, volume, and liquidity from Arbitrum DEXes via DexScreener.',
      parameters: {
        token: {
          type: 'string',
          description: 'Token symbol (e.g., ARB, GMX) or contract address (0x...)',
          required: true
        }
      }
    },
    {
      name: 'check_protocol_safety',
      description: 'Scores any protocol or contract address on Arbitrum for safety using audit status, TVL, contract verification, and age.',
      parameters: {
        protocol: {
          type: 'string',
          description: 'Protocol name (e.g., camelot, gmx) or contract address (0x...)',
          required: true
        }
      }
    },
    {
      name: 'get_pool_info',
      description: 'Returns pool information for a token pair including liquidity, volume, and fee estimates.',
      parameters: {
        tokenA: {
          type: 'string',
          description: 'First token symbol or contract address',
          required: true
        },
        tokenB: {
          type: 'string',
          description: 'Second token symbol or contract address',
          required: true
        }
      }
    },
    {
      name: 'get_gas_fees',
      description: 'Returns current Arbitrum gas price and estimated transaction costs for swaps and LP operations.',
      parameters: {}
    },
    {
      name: 'get_market_overview',
      description: 'Returns top gainers, losers, and overall market sentiment on Arbitrum.',
      parameters: {}
    },
    {
      name: 'get_top_gainers',
      description: 'Returns top gaining tokens on Arbitrum in the last 24 hours.',
      parameters: {}
    },
    {
      name: 'get_top_losers',
      description: 'Returns top losing tokens on Arbitrum in the last 24 hours.',
      parameters: {}
    },
    {
      name: 'compare_tokens',
      description: 'Compares two tokens side by side with price, volume, liquidity, and performance metrics.',
      parameters: {
        tokenA: {
          type: 'string',
          description: 'First token symbol or contract address',
          required: true
        },
        tokenB: {
          type: 'string',
          description: 'Second token symbol or contract address',
          required: true
        }
      }
    }
  ];

  return NextResponse.json(tools, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
