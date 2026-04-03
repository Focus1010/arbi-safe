import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { getTrustScore } from '@/lib/api/trust';
import { simulateStrategy } from '@/lib/simulate';
import { lookupToken, TokenData } from '@/lib/api/price';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Tag parsing helpers
const LOOKUP_TAG_REGEX = /<lookup>(0x[a-fA-F0-9]{40})<\/lookup>/;
const PRICE_TAG_REGEX = /<price>([^<]+)<\/price>/;
const SIMULATE_TAG_REGEX = /<simulate>([^<]+)<\/simulate>/;

function parseLookupTag(text: string): string | null {
  const match = text.match(LOOKUP_TAG_REGEX);
  return match ? match[1].toLowerCase() : null;
}

function parsePriceTag(text: string): string | null {
  const match = text.match(PRICE_TAG_REGEX);
  return match ? match[1].trim() : null;
}

function parseSimulateTag(text: string): string | null {
  const match = text.match(SIMULATE_TAG_REGEX);
  return match ? match[1] : null;
}

function stripAllTags(text: string): string {
  return text
    .replace(LOOKUP_TAG_REGEX, '')
    .replace(PRICE_TAG_REGEX, '')
    .replace(SIMULATE_TAG_REGEX, '')
    .trim();
}

// DEXSCREENER-ONLY SYSTEM PROMPT
// Hackathon Mode: Minimal, fast, deterministic. NO external data sources.
const SYSTEM_PROMPT = `You are ArbiSafe, a strict DeFi terminal for Arbitrum. DexScreener is your ONLY source of truth.

CRITICAL RULES - BREAKING ANY WILL CAUSE ERRORS:
- If the user message contains a contract address (0x followed by exactly 40 hex chars), you MUST output ONLY the <lookup> tag. Do not add any other text before or after the tag in that response.
- NEVER guess or invent a token name, symbol, or description. You know nothing until the lookup tool returns data.
- Never say "it corresponds to" or make up what the token is.
- After lookup data is provided in the next turn, then you can describe it using ONLY the returned data.

EXACT FLOW FOR CA:
User pastes 0x... → Your response must end with: <lookup>0x...</lookup>
No other explanation in the first response.

For price or strategy questions, use the appropriate tags at the end.

Response style: Short, direct, terminal-like. No fluff.`;

// Tool definitions for Groq - DexScreener ONLY
const TOOLS: any[] = [
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
  }
];

// Tool executor
async function executeTool(name: string, args: any) {
  console.log(`Executing tool: ${name} with args:`, args);
  
  try {
    switch (name) {
      case 'simulateStrategy':
        const result = await simulateStrategy(args);
        return { data: result, error: null };
      case 'checkProtocolSafety':
        return await getTrustScore(args.protocol);
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

        // AUTO-DETECT RAW CONTRACT ADDRESS (fixes the main bug)
    const lastUserMessage = messages
      .filter((m: any) => m.role === 'user')
      .pop()?.content || '';

    const caMatch = lastUserMessage.match(/0x[a-fA-F0-9]{40}/i);
    if (caMatch && !simulationResult) {
      const rawCA = caMatch[0].toLowerCase();
      console.log('🔍 Auto-detected CA in user message:', rawCA);

      // Force lookup immediately
      const lookupResult = await lookupToken(rawCA);

      if (lookupResult) {
        return NextResponse.json({
          response: `✅ Found on Arbitrum\n\n${lookupResult.symbol} (${lookupResult.name})\nPrice: $${lookupResult.priceUsd.toFixed(6)}\n24h: ${parseFloat(lookupResult.priceChange24h).toFixed(2)}%\nLiq: $${(parseFloat(lookupResult.liquidity) / 1e6).toFixed(2)}M`,
          lookupResult,
        });
      } else {
        return NextResponse.json({
          response: "❌ No liquidity found on Arbitrum for this address.\nDouble-check the CA or try a different token.",
        });
      }
    }

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
        content: `[SIMULATION DATA - FORMAT TERMINAL RESPONSE]:\n${JSON.stringify(simulationResult, null, 2)}`,
      });
    }

    // First call with tools
    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: groqMessages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.1,
      max_tokens: 512,
    });

    let assistantMessage = completion.choices[0]?.message;
    let responseText = assistantMessage?.content || '';
    
    let lookupResult: TokenData | null = null;
    let priceResult: TokenData | null = null;
    let simulationParams: object | null = null;

    // Handle tool calls (existing behavior)
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

      // Second call for formatted response after tool execution
      const finalCompletion = await groq.chat.completions.create({
        model: 'llama3-8b-8192',
        messages: groqMessages,
        temperature: 0.1,
        max_tokens: 512,
      });

      responseText = finalCompletion.choices[0]?.message?.content || '';
    }

    // STRICT LOOKUP FOR CONTRACT ADDRESSES (prevents hallucination)
    let lookupAddress = parseLookupTag(responseText);

    // Auto-detect raw CA from last user message if no tag
    if (!lookupAddress) {
      const lastUserMsg = messages
        .filter((m: any) => m.role === 'user')
        .pop()?.content || '';
      const caMatch = lastUserMsg.match(/0x[a-fA-F0-9]{40}/i);
      if (caMatch) {
        lookupAddress = caMatch[0].toLowerCase();
      }
    }

    if (lookupAddress) {
      lookupResult = await lookupToken(lookupAddress);

      // Force a very strict interpretation prompt
      const interpretationPrompt = lookupResult 
        ? `You have real DexScreener data for address ${lookupAddress}:\n\nSymbol: ${lookupResult.symbol}\nName: ${lookupResult.name}\nPrice: $${lookupResult.priceUsd.toFixed(6)}\n24h change: ${parseFloat(lookupResult.priceChange24h).toFixed(2)}%\nLiquidity: $${(parseFloat(lookupResult.liquidity)/1e6).toFixed(2)}M\nVolume 24h: $${(parseFloat(lookupResult.volume24h)/1e6).toFixed(2)}M\n\nRespond with ONLY these facts. Do not invent any other name, description, or token identity. Tell the user the real symbol and name, then ask what they want to do (swap, LP, etc.). Be short.`
        : `No liquidity or pair found on Arbitrum for ${lookupAddress}. Tell the user exactly that and suggest double-checking the address.`;

      groqMessages.push({ role: 'assistant', content: responseText });
      groqMessages.push({ role: 'user', content: interpretationPrompt });

      const lookupCompletion = await groq.chat.completions.create({
        model: 'llama3-8b-8192',
        messages: groqMessages,
        temperature: 0.0,   // <-- Lower temperature = less creativity
        max_tokens: 300,
      });

      responseText = lookupCompletion.choices[0]?.message?.content || 'Lookup completed.';
    }

    // Check for <price> tag - fetch price data and ask Groq to interpret
    const priceToken = parsePriceTag(responseText);
    if (priceToken && !lookupAddress) { // Skip if already handled lookup
      priceResult = await lookupToken(priceToken);
      
      groqMessages.push({
        role: 'assistant',
        content: responseText,
      });
      
      if (priceResult) {
        groqMessages.push({
          role: 'user',
          content: `Price data for ${priceResult.symbol}: $${priceResult.priceUsd.toFixed(4)}, 24h change: ${parseFloat(priceResult.priceChange24h).toFixed(2)}%, volume: $${(parseFloat(priceResult.volume24h) / 1e6).toFixed(2)}M, liquidity: $${(parseFloat(priceResult.liquidity) / 1e6).toFixed(2)}M. Interpret this naturally for the user.`,
        });
      } else {
        groqMessages.push({
          role: 'user',
          content: `I couldn't find live price data for ${priceToken} on Arbitrum. Tell the user this.`,
        });
      }
      
      const priceCompletion = await groq.chat.completions.create({
        model: 'llama3-8b-8192',
        messages: groqMessages,
        temperature: 0.1,
        max_tokens: 512,
      });
      
      responseText = priceCompletion.choices[0]?.message?.content || '';
    }

    // Check for <simulate> tag - parse simulation params (existing behavior)
    const simulateJson = parseSimulateTag(responseText);
    if (simulateJson) {
      try {
        simulationParams = JSON.parse(simulateJson);
      } catch {
        simulationParams = null;
      }
    }

    // Strip all tags from final response
    const cleanResponse = stripAllTags(responseText);

    return NextResponse.json({
      response: cleanResponse,
      simulationParams,
      lookupResult,
      priceResult,
    });

  } catch (error) {
    console.error('Agent API error:', error);
    return NextResponse.json(
      { error: 'Unable to process request.' },
      { status: 500 }
    );
  }
}
