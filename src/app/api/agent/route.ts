import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { parseCommand, COMMANDS_HELP } from '@/lib/commandParser';
import {
  checkTokenPrice,
  compareTokens,
  checkProtocolSafety,
  checkGasFees,
  getPoolInfo,
  getArbitrumMarketOverview,
  getTopGainers,
  getTopLosers,
} from '@/lib/agentTools';
import { simulateStrategy } from '@/lib/simulate';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are ArbiSafe, an expert AI agent for simulating DeFi strategies on Arbitrum. You're sharp, direct, and speak like a knowledgeable crypto-native friend — not a corporate chatbot.

You have access to real-time Arbitrum data through function calls. When users need information, call the appropriate function rather than making up data.

AVAILABLE FUNCTIONS:
- checkTokenPrice(token): Get price, volume, liquidity for any token
- compareTokens(tokenA, tokenB): Side-by-side comparison
- checkGasFees(): Current gas prices and costs
- checkProtocolSafety(protocol): Trust score and safety analysis
- getPoolInfo(tokenA, tokenB): Liquidity pool details
- getArbitrumMarketOverview(): Top tokens and market sentiment
- getTopGainers(): Biggest positive movers
- getTopLosers(): Biggest drops
- simulateStrategy(params): Run a swap or LP simulation

SLASH COMMANDS users can type:
/help - Show all commands
/price {token} - Get token price
/compare {A} {B} - Compare tokens
/gas - Check gas fees
/safe {protocol} - Check protocol safety
/pool {A} {B} - Pool info
/market - Market overview
/gainers - Top gainers
/losers - Top losers
/simulate {from} {to} {amount} - Direct simulation
/lp {from} {to} {amount} - LP simulation
/clear - Clear chat

When you call a function, wait for the results then interpret them naturally for the user. Be concise but informative.

For simulations, extract parameters and call simulateStrategy with:
- fromToken, toToken, amountUSD, action ('swap' or 'lp'), protocol ('camelot', 'gmx', etc.)

Always end with a clear verdict when presenting data.
Never make up prices or data - always use function results.`;

// Function definitions for Groq
const FUNCTIONS = [
  {
    name: 'checkTokenPrice',
    description: 'Get real-time price, volume, and liquidity for any token on Arbitrum',
    parameters: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Token ticker (e.g., USDC, ARB) or contract address (0x...)' }
      },
      required: ['token']
    }
  },
  {
    name: 'compareTokens',
    description: 'Compare two tokens side by side with prices, volumes, and liquidity',
    parameters: {
      type: 'object',
      properties: {
        tokenA: { type: 'string', description: 'First token ticker or CA' },
        tokenB: { type: 'string', description: 'Second token ticker or CA' }
      },
      required: ['tokenA', 'tokenB']
    }
  },
  {
    name: 'checkGasFees',
    description: 'Get current Arbitrum gas prices and estimated transaction costs',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'checkProtocolSafety',
    description: 'Check trust score and safety metrics for a DeFi protocol',
    parameters: {
      type: 'object',
      properties: {
        protocol: { type: 'string', description: 'Protocol name (e.g., Camelot, GMX, Aave)' }
      },
      required: ['protocol']
    }
  },
  {
    name: 'getPoolInfo',
    description: 'Get liquidity pool information for a token pair',
    parameters: {
      type: 'object',
      properties: {
        tokenA: { type: 'string', description: 'First token in the pair' },
        tokenB: { type: 'string', description: 'Second token in the pair' }
      },
      required: ['tokenA', 'tokenB']
    }
  },
  {
    name: 'getArbitrumMarketOverview',
    description: 'Get top tokens by volume and overall market sentiment',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'getTopGainers',
    description: 'Get the top 5 tokens with the biggest price increases',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'getTopLosers',
    description: 'Get the top 5 tokens with the biggest price drops',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'simulateStrategy',
    description: 'Run a DeFi strategy simulation (swap or LP) with real onchain data',
    parameters: {
      type: 'object',
      properties: {
        fromToken: { type: 'string', description: 'Token to swap from' },
        toToken: { type: 'string', description: 'Token to swap to' },
        amountUSD: { type: 'number', description: 'Amount in USD to simulate' },
        action: { type: 'string', enum: ['swap', 'lp'], description: 'Type of strategy' },
        protocol: { type: 'string', description: 'Protocol to use (camelot, gmx, uniswap, aave)' }
      },
      required: ['fromToken', 'toToken', 'amountUSD', 'action', 'protocol']
    }
  }
];

async function executeFunction(name: string, args: any) {
  switch (name) {
    case 'checkTokenPrice':
      return await checkTokenPrice(args.token);
    case 'compareTokens':
      return await compareTokens(args.tokenA, args.tokenB);
    case 'checkGasFees':
      return await checkGasFees();
    case 'checkProtocolSafety':
      return await checkProtocolSafety(args.protocol);
    case 'getPoolInfo':
      return await getPoolInfo(args.tokenA, args.tokenB);
    case 'getArbitrumMarketOverview':
      return await getArbitrumMarketOverview();
    case 'getTopGainers':
      return await getTopGainers();
    case 'getTopLosers':
      return await getTopLosers();
    case 'simulateStrategy':
      return { data: await simulateStrategy(args), error: null };
    default:
      return { data: null, error: 'Unknown function' };
  }
} 

export async function POST(request: NextRequest) {
  try {
    const { messages, simulationResult } = await request.json();

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages must be an array' },
        { status: 400 }
      );
    }

    // Build message array for Groq
    const groqMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages as Array<{ role: 'user' | 'assistant'; content: string }>,
    ];

    // If simulation results are provided, append interpretation request
    if (simulationResult) {
      groqMessages.push({
        role: 'user',
        content: `[SIMULATION COMPLETE - interpret these results for the user in 3-4 sentences, be specific about numbers, give a clear recommendation]:
${JSON.stringify(simulationResult, null, 2)}`,
      });
    }

    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: groqMessages,
      temperature: 0.7,
      max_tokens: 1024,
    });

    const assistantResponse = completion.choices[0]?.message?.content || '';

    // Parse <simulate> block if present
    let simulationParams = null;
    const simulateMatch = assistantResponse.match(/<simulate>([\s\S]*?)<\/simulate>/);
    
    if (simulateMatch) {
      try {
        simulationParams = JSON.parse(simulateMatch[1].trim());
      } catch {
        // Invalid JSON in simulate block, ignore
      }
    }

    return NextResponse.json({
      response: assistantResponse,
      simulationParams,
    });

  } catch (error) {
    console.error('Agent API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
