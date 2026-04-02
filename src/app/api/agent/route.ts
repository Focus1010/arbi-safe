import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { resolveToken } from '@/lib/tokenResolver';
import { fetchDexScreenerPrice, fetchTopMovers, fetchMarketOverview } from '@/lib/priceFetcher';
import { getGasData, simulateSwap, simulateLP } from '@/lib/alchemy';
import { getTrustScore } from '@/lib/api/trust';
import { simulateStrategy } from '@/lib/simulate';
import { parseInput, formatParsedInput } from '@/lib/inputParser';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ZERO TRAINING KNOWLEDGE SYSTEM PROMPT
// The agent MUST NEVER use its training data for token prices, identity, or protocol data
const SYSTEM_PROMPT = `You are ArbiSafe, an onchain DeFi strategy simulator for Arbitrum. You are direct, sharp, and crypto-native.

CRITICAL RULES — NEVER BREAK THESE:
1. NEVER state a token price from your training data. You don't know current prices. Always say you'll look it up and trigger the appropriate action.
2. NEVER identify a contract address from memory. A CA like 0x13040... could be ANY token. Always look it up via DexScreener before making any claims about what it is.
3. NEVER make up or estimate prices. If data fetch fails, say 'I couldn't fetch live data for that token' — do NOT guess.
4. When a user gives you a contract address, your ONLY job is to confirm you're looking it up and output a <lookup> tag, not claim to know what it is.

WHEN USER GIVES A CONTRACT ADDRESS (starts with 0x, 42 chars):
- Say: 'Let me look up that contract on Arbitrum...'
- Output at end of response: <lookup>{contractAddress}</lookup>
- DO NOT say what token you think it is until after lookup data is returned

WHEN USER ASKS FOR A TOKEN PRICE:
- Say: 'Fetching live price from Arbitrum...'  
- Output at end: <price>{tokenSymbolOrAddress}</price>
- DO NOT state a price from memory

WHEN USER DESCRIBES A STRATEGY:
- Confirm what you understood
- Ask for missing info if needed (amount, protocol)
- When ready: output <simulate>{...json...}</simulate>

WHEN SIMULATION RESULTS ARE PROVIDED TO YOU:
- Interpret them confidently and specifically
- Lead with the key number (how much they get)
- Comment on slippage and trust score
- Give a clear verdict: ✅ Proceed / ⚠️ Careful / 🚨 Avoid
- Be concise — 3-5 sentences max

RESPONSE STYLE:
- Confirm before acting: 'Got it — doing X now'
- No corporate speak, no fluff
- Short sentences
- No excessive disclaimers (one per session max)
- Never repeat the same disclaimer twice

TAGS YOU CAN OUTPUT (always at end of response, never mid-sentence):
<lookup>0x...</lookup> — look up unknown contract address
<price>TOKEN</price> — fetch live price
<simulate>{json}</simulate> — run strategy simulation`;

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
