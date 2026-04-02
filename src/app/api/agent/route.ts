import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { resolveToken } from '@/lib/tokenResolver';
import { fetchDexScreenerPrice, fetchTopMovers, fetchMarketOverview } from '@/lib/priceFetcher';
import { getGasData, simulateSwap, simulateLP } from '@/lib/alchemy';
import { getTrustScore } from '@/lib/api/trust';
import { simulateStrategy } from '@/lib/simulate';
import { parseInput, formatParsedInput } from '@/lib/inputParser';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// CONTROLLED REASONING SYSTEM PROMPT
// Brief reasoning allowed, then facts only
const SYSTEM_PROMPT = `You are ArbiSafe. A sharp, live DeFi terminal for Arbitrum.

DATA FLOW (you MUST follow this):
1. User asks question
2. You call tools to get data (Moralis for identity, DexScreener for prices, Alchemy for gas)
3. You respond with brief context (1 line) + clean data output

RULES:
- Brief reasoning OK: "Fetching ARB price..." or "Comparing tokens..."
- Then: RAW DATA ONLY
- NO guessing, NO "I think", NO "maybe", NO speculation
- NO long explanations
- NO self-corrections
- If tools fail: "Unable to verify this token with high confidence."

FORBIDDEN (never say):
- "I think" / "maybe" / "possibly" / "probably"
- "wait" / "actually" / "let me" / "I'll"
- "it appears" / "it looks like" / "I believe"
- "could be" / "might be"

CORRECT OUTPUT:
Fetching ARB price...
ARB (Arbitrum)
Price: $1.23
Liquidity: $12.4M
24h: +3.2%

WRONG OUTPUT:
"I think ARB is probably around $1.20, let me check that for you... Actually it looks like $1.23 based on what I'm seeing."

BE BRIEF. BE FACTUAL. BE USEFUL.`;

// Tool definitions for Groq - updated for new architecture
const TOOLS: any[] = [
  {
    type: 'function',
    function: {
      name: 'resolveAndPrice',
      description: 'Resolve token identity via Moralis, then fetch price from DexScreener. Use this for ALL token price queries.',
      parameters: {
        type: 'object',
        properties: {
          tokenInput: { 
            type: 'string', 
            description: 'Token symbol (e.g., GMX) or contract address (0x...)' 
          }
        },
        required: ['tokenInput']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'compareTokens',
      description: 'Compare two tokens side by side with verified prices',
      parameters: {
        type: 'object',
        properties: {
          tokenA: { type: 'string', description: 'First token symbol or address' },
          tokenB: { type: 'string', description: 'Second token symbol or address' }
        },
        required: ['tokenA', 'tokenB']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'checkGasFees',
      description: 'Get current Arbitrum gas prices',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'simulateStrategy',
      description: 'Run DeFi strategy simulation with real onchain data',
      parameters: {
        type: 'object',
        properties: {
          fromToken: { type: 'string', description: 'Token to swap from' },
          toToken: { type: 'string', description: 'Token to swap to' },
          amountUSD: { type: 'number', description: 'Amount in USD' },
          action: { type: 'string', enum: ['swap', 'lp'], description: 'swap or lp' },
          protocol: { type: 'string', description: 'Protocol name' }
        },
        required: ['fromToken', 'toToken', 'amountUSD', 'action', 'protocol']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'simulateSwap',
      description: 'Simulate a token swap with real gas estimates from Alchemy',
      parameters: {
        type: 'object',
        properties: {
          fromToken: { type: 'string', description: 'Token to swap from (symbol or address)' },
          toToken: { type: 'string', description: 'Token to swap to (symbol or address)' },
          amountUSD: { type: 'number', description: 'Amount in USD to swap' }
        },
        required: ['fromToken', 'toToken', 'amountUSD']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'simulateLP',
      description: 'Simulate a liquidity pool position',
      parameters: {
        type: 'object',
        properties: {
          tokenA: { type: 'string', description: 'First token (symbol or address)' },
          tokenB: { type: 'string', description: 'Second token (symbol or address)' },
          amountUSD: { type: 'number', description: 'Total USD amount to provide as liquidity' }
        },
        required: ['tokenA', 'tokenB', 'amountUSD']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'checkProtocolSafety',
      description: 'Check protocol trust score',
      parameters: {
        type: 'object',
        properties: {
          protocol: { type: 'string', description: 'Protocol name (e.g., Camelot, GMX)' }
        },
        required: ['protocol']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getMarketOverview',
      description: 'Get Arbitrum market overview with top tokens',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getTopGainers',
      description: 'Get top 5 gaining tokens on Arbitrum',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getTopLosers',
      description: 'Get top 5 losing tokens on Arbitrum',
      parameters: { type: 'object', properties: {} }
    }
  }
];

// NEW: Resolve + Price tool using Moralis + DexScreener
async function resolveAndPrice(tokenInput: string) {
  // Step 1: Resolve token via Moralis (token identity)
  const resolveResult = await resolveToken(tokenInput);
  
  if (resolveResult.error || !resolveResult.token) {
    return {
      data: null,
      error: resolveResult.error || 'Unable to verify token.'
    };
  }
  
  const token = resolveResult.token;
  
  // Step 2: Fetch price via DexScreener (price only)
  const priceResult = await fetchDexScreenerPrice(token.address);
  
  if (priceResult.error || !priceResult.data) {
    return {
      data: {
        token: {
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          chainId: token.chainId,
          verified: token.verified
        },
        price: null,
        error: priceResult.error || 'No price data available.'
      },
      error: null
    };
  }
  
  return {
    data: {
      token: {
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        chainId: token.chainId,
        verified: token.verified
      },
      price: priceResult.data,
      error: null
    },
    error: null
  };
}

// Compare tokens using new pipeline
async function compareTokens(tokenA: string, tokenB: string) {
  const [resultA, resultB] = await Promise.all([
    resolveAndPrice(tokenA),
    resolveAndPrice(tokenB)
  ]);
  
  if (resultA.error || !resultA.data?.token) {
    return { data: null, error: resultA.error || `Failed to resolve ${tokenA}` };
  }
  if (resultB.error || !resultB.data?.token) {
    return { data: null, error: resultB.error || `Failed to resolve ${tokenB}` };
  }
  
  return {
    data: {
      tokenA: resultA.data,
      tokenB: resultB.data
    },
    error: null
  };
}

// Tool executor
async function executeTool(name: string, args: any) {
  console.log(`Executing tool: ${name} with args:`, args);
  
  try {
    switch (name) {
      case 'resolveAndPrice':
        return await resolveAndPrice(args.tokenInput);
      case 'compareTokens':
        return await compareTokens(args.tokenA, args.tokenB);
      case 'checkGasFees':
        const gasData = await getGasData();
        return { 
          data: gasData ? {
            gasPriceGwei: gasData.gasPriceGwei,
            estimatedCostUSD: parseFloat(gasData.estimatedSwapCostUsd)
          } : null, 
          error: gasData ? null : 'Unable to fetch gas fees.' 
        };
      case 'simulateSwap':
        const swapResult = await simulateSwap(args.fromToken, args.toToken, args.amountUSD);
        return { data: swapResult, error: swapResult ? null : 'Simulation failed.' };
      case 'simulateLP':
        const lpResult = await simulateLP(args.tokenA, args.tokenB, args.amountUSD);
        return { data: lpResult, error: lpResult ? null : 'LP simulation failed.' };
      case 'simulateStrategy':
        const result = await simulateStrategy(args);
        return { data: result, error: null };
      case 'checkProtocolSafety':
        return await getTrustScore(args.protocol);
      case 'getMarketOverview':
        return await fetchMarketOverview();
      case 'getTopGainers':
        const gainers = await fetchTopMovers('gainers');
        return { data: gainers, error: null };
      case 'getTopLosers':
        const losers = await fetchTopMovers('losers');
        return { data: losers, error: null };
      default:
        return { data: null, error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    return { data: null, error: 'Unable to process request.' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages, simulationResult } = await request.json();

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    // Clean messages
    const cleanMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
      ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
    }));

    const groqMessages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...cleanMessages,
    ];

    if (simulationResult) {
      groqMessages.push({
        role: 'user',
        content: `[SIMULATION DATA - FORMAT TERMINAL RESPONSE]:
${JSON.stringify(simulationResult, null, 2)}`,
      });
    }

    // First call with tools
    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: groqMessages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.1, // LOW temperature for deterministic responses
      max_tokens: 512,  // SHORT responses - terminal style
    });

    const assistantMessage = completion.choices[0]?.message;
    
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      groqMessages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        const { name, arguments: argsString } = toolCall.function;
        let args;
        try {
          args = JSON.parse(argsString);
        } catch {
          args = {};
        }

        const toolResult = await executeTool(name, args);
        
        groqMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Second call for formatted response
      const finalCompletion = await groq.chat.completions.create({
        model: 'llama3-8b-8192',
        messages: groqMessages,
        temperature: 0.1,
        max_tokens: 512,
      });

      return NextResponse.json({
        response: finalCompletion.choices[0]?.message?.content || 'Unable to process.',
        simulationParams: null,
      });
    }

    return NextResponse.json({
      response: assistantMessage?.content || 'Unable to process.',
      simulationParams: null,
    });

  } catch (error) {
    console.error('Agent API error:', error);
    return NextResponse.json(
      { error: 'Unable to process request.' },
      { status: 500 }
    );
  }
}
