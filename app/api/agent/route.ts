import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { lookupToken, TokenData } from '@/lib/api/price';
import { simulateStrategy } from '@/lib/simulate';

// Initialize both AI clients
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const gemini = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// ============================================================================
// ERROR HANDLING HELPERS
// ============================================================================

function getErrorResponse(err: any): { response: string; status?: number } {
  const errorMessage = err?.message || err?.toString() || '';
  
  // Check for specific error patterns
  if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
    return { 
      response: "I'm getting too many requests right now. Try again in 30 seconds." 
    };
  }
  
  if (errorMessage.toLowerCase().includes('quota')) {
    return { 
      response: "Daily request limit reached. Try again tomorrow or contact support." 
    };
  }
  
  // Check for API key issues
  if (!process.env.GEMINI_API_KEY && errorMessage.toLowerCase().includes('gemini')) {
    return { response: "Gemini API key not configured. Contact support." };
  }
  
  if (!process.env.GROQ_API_KEY && errorMessage.toLowerCase().includes('groq')) {
    return { response: "Groq API key not configured. Contact support." };
  }
  
  // Generic error
  return { response: "ArbiSafe's brain is having a moment. Try again in a few seconds." };
}

function needsStructuredExtraction(message: string): boolean {
  const lowerMsg = message.toLowerCase();
  
  // Question patterns that should go to Gemini (asking vs requesting)
  const questionPrefixes = [
    'can i ', 'could i ', 'should i ', 'what are ', 'what is ', 'how do ', 
    'how does ', 'how can ', 'explain ', 'tell me about ', 'what about '
  ];
  const isAskingQuestion = questionPrefixes.some(prefix => lowerMsg.startsWith(prefix));
  
  // Action keywords that indicate a simulation/transaction request
  const actionKeywords = [
    'swap', 'trade', 'buy', 'sell', 'lp', 'pool', 
    'farm', 'yield', 'bridge', 'simulate'
  ];
  const hasActionKeyword = actionKeywords.some(keyword => lowerMsg.includes(keyword));
  
  // Dollar amount patterns: $300, 300 USDC, $500, etc.
  const amountPattern = /\$?\d+\s*(?:USD|USDC|USDT|ETH|ARB|DAI)?|\d+\s*(?:USD|USDC|USDT|ETH|ARB|DAI)/i;
  const hasAmount = amountPattern.test(message);
  
  // If it has BOTH action keyword AND amount, it's a simulation request → Groq
  if (hasActionKeyword && hasAmount) {
    return true;
  }
  
  // If asking a general question (no action/amount), send to Gemini
  if (isAskingQuestion) {
    // Exception: /price command should still go to Groq for data
    if (message.startsWith('/price')) return true;
    // Exception: contract address lookup
    if (/0x[a-fA-F0-9]{40}/.test(message)) return true;
    return false;
  }
  
  // Check for action keywords without question prefix
  const educationalContext = ['risks of', 'explain', 'what is', 'how does'];
  const hasEducationalContext = educationalContext.some(ctx => lowerMsg.includes(ctx));
  
  if (!hasEducationalContext && hasActionKeyword) {
    return true;
  }
  
  // Check for contract address (0x followed by 40 hex chars)
  if (/0x[a-fA-F0-9]{40}/.test(message)) {
    return true;
  }
  
  // Check for slash commands
  if (message.startsWith('/simulate') || message.startsWith('/lp') || message.startsWith('/price')) {
    return true;
  }
  
  return false;
}

const GEMINI_SYSTEM_INSTRUCTION = `You are ArbiSafe, an expert DeFi assistant and onchain strategy advisor for Arbitrum. You have deep knowledge of DeFi protocols, tokenomics, market dynamics, yield strategies, smart contract risks, and the broader crypto ecosystem.

You answer questions naturally and intelligently — like a knowledgeable crypto-native friend. You explain complex DeFi concepts clearly. You discuss market conditions, protocol comparisons, risk/reward tradeoffs, tokenomics, and strategy ideas.

You are NOT a robot. You have opinions. You can say things like "honestly, I think..." or "from what I've seen..." You are direct and concise.

When users ask about simulating a specific trade or checking live data, tell them you'll run the numbers and that they can describe their strategy. But for general DeFi questions — just answer intelligently.

Never make up current prices or live data. For anything requiring live onchain data, say you'll need to run a simulation or check the chain.`;

const GROQ_SYSTEM_PROMPT = `You are ArbiSafe, an expert AI agent for simulating DeFi strategies on Arbitrum. You're sharp, direct, and speak like a knowledgeable crypto-native friend — not a corporate chatbot. You use light humor, you're honest about risks, and you give clear recommendations.

You have real-time access to Arbitrum onchain data. When users describe a strategy, extract simulation parameters and trigger a simulation.

PARAMETER EXTRACTION RULES:
- fromToken: what they're swapping FROM (the payment token). Default to USDC if unclear. Can be a ticker (USDC) or contract address (0x...)
- toToken: what they're swapping TO (the token they want to receive). Can be a ticker or CA
- amountUSD: the dollar amount they're spending. Extract the number before the "of" or the currency they're using to pay
- action: 'swap' for simple swaps, 'lp' if they mention liquidity, LP, yield, farming
- protocol: camelot (default for most swaps on Arbitrum), gmx (for perps/leveraged), uniswap, aave (for lending)

COMMON PATTERN EXAMPLES:
- "buy $300 of ARB" → fromToken: "USDC", toToken: "ARB", amountUSD: 300
- "swap 500 USDC to ZRO" → fromToken: "USDC", toToken: "ZRO", amountUSD: 500
- "buy ARB with 300 USDC" → fromToken: "USDC", toToken: "ARB", amountUSD: 300
- "swap ETH for GMX" → fromToken: "ETH", toToken: "GMX", amountUSD: (ask if not specified)
- "lp $1000 USDC/WETH" → fromToken: "USDC", toToken: "WETH", amountUSD: 1000, action: "lp"

When you have all parameters, output EXACTLY this at the end of your response (these tags are invisible to users - they trigger the simulation):
<simulate>
{"fromToken":"USDC","toToken":"ARB","amountUSD":500,"action":"swap","protocol":"camelot"}
</simulate>

IMPORTANT: NEVER show the raw <simulate> tags in your visible response text to the user. The tags should only appear at the very end and be completely invisible. Speak naturally without mentioning any XML tags.

RESPONSE STYLE:
- Confirm what you understood before simulating: 'Got it — simulating X for you...'
- After simulation results come in, interpret them in 3-5 sentences
- Lead with the key number (how much they get)
- Comment on slippage, trust score, and degen score
- End with a clear verdict: ✅ Looks solid / ⚠️ Proceed carefully / 🚨 High risk

DISCLAIMER: Always end your first message with a small disclaimer line.

If someone asks about a contract address directly (0x...), acknowledge you'll look it up via DexScreener.
If someone asks a general DeFi question (not a simulation), answer it directly and helpfully.
Never make up token prices or protocol data — only reference what the simulation returns.`;

// ============================================================================
// HANDLER A — Gemini (General Conversation)
// ============================================================================

async function handleWithGemini(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  simulationResult?: any
): Promise<{ response: string; model: 'gemini' }> {
  // Convert messages to Gemini format
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' as const : 'user' as const,
    parts: [{ text: m.content }],
  }));
  
  const currentMessage = messages[messages.length - 1]?.content || '';
  
  // Build content parts
  const contentParts: any[] = [];
  
  // Add system instruction as context
  contentParts.push({ text: `${GEMINI_SYSTEM_INSTRUCTION}\n\nUser message: ${currentMessage}` });
  
  // If simulation results provided, add them
  if (simulationResult) {
    contentParts.push({
      text: `\n\n[SIMULATION RESULTS - interpret these for the user in 3-5 sentences, lead with key numbers, comment on slippage/trust/degen, end with verdict]:\n${JSON.stringify(simulationResult, null, 2)}`,
    });
  }
  
  // Start chat with history
  const chat = gemini.startChat({
    history,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  });
  
  const result = await chat.sendMessage(contentParts);
  const response = result.response.text();
  
  return { response, model: 'gemini' };
}

// ============================================================================
// HANDLER B — Groq (Structured DeFi Tasks)
// ============================================================================

async function handleWithGroq(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  simulationResult?: any
): Promise<{ response: string; simulationParams: any | null; model: 'groq' }> {
  // Build message array for Groq
  const groqMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: GROQ_SYSTEM_PROMPT },
    ...messages,
  ];
  
  // If simulation results are provided, inject as hidden context
  if (simulationResult) {
    groqMessages.push({
      role: 'user',
      content: `[SIMULATION RESULTS - interpret these for the user in 3-5 sentences, lead with key numbers, comment on slippage/trust/degen, end with verdict]:\n${JSON.stringify(simulationResult, null, 2)}`,
    });
  }
  
  const completion = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: groqMessages,
    temperature: 0.7,
    max_tokens: 1024,
  });
  
  let assistantResponse = completion.choices[0]?.message?.content || '';
  
  // Parse <simulate> block if present and strip it from response
  let simulationParams = null;
  const simulateMatch = assistantResponse.match(/<simulate>([\s\S]*?)<\/simulate>/);
  
  if (simulateMatch) {
    try {
      simulationParams = JSON.parse(simulateMatch[1].trim());
    } catch {
      console.warn('Failed to parse simulation parameters');
    }
    // Remove the <simulate> block from the visible response
    assistantResponse = assistantResponse.replace(/<simulate>[\s\S]*?<\/simulate>/, '').trim();
  }
  
  return { response: assistantResponse, simulationParams, model: 'groq' };
}

// ============================================================================
// PRICE LOOKUP — Real-time DexScreener data (prevents hallucination)
// ============================================================================

function isPriceQuestion(message: string): string | null {
  const lowerMsg = message.toLowerCase();
  
  // Price question patterns
  const pricePatterns = [
    /what is the price of (\w+)/i,
    /what['']?s the price of (\w+)/i,
    /price of (\w+)/i,
    /how much is (\w+) worth/i,
    /(\w+) price/i,
  ];
  
  for (const pattern of pricePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
  }
  
  return null;
}

async function fetchRealPrice(tokenSymbol: string): Promise<{ data: TokenData | null; error: string | null }> {
  try {
    const tokenData = await lookupToken(tokenSymbol);
    
    if (!tokenData) {
      return { 
        data: null, 
        error: `Could not find ${tokenSymbol} on Arbitrum via DexScreener.` 
      };
    }
    
    return { data: tokenData, error: null };
  } catch (error) {
    console.error('Price lookup error:', error);
    return { 
      data: null, 
      error: 'Failed to fetch price data from DexScreener.' 
    };
  }
}

// ============================================================================
// GET HEALTH CHECK
// ============================================================================

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    gemini: !!process.env.GEMINI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    arbiscan: !!process.env.ARBISCAN_API_KEY,
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}

// ============================================================================
// MAIN POST HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  // Check for missing env vars at start
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set');
  }
  if (!process.env.GROQ_API_KEY) {
    console.error('GROQ_API_KEY is not set');
  }
  
  try {
    const { messages, simulationResult } = await request.json();

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages must be an array' },
        { status: 400 }
      );
    }
    
    // Get the last user message for routing
    const lastUserMessage = messages
      .filter((m: any) => m.role === 'user')
      .pop()?.content || '';

    // CHECK FOR PRICE QUESTIONS FIRST — Always fetch real data
    const priceToken = isPriceQuestion(lastUserMessage);
    if (priceToken && !simulationResult) {
      console.log(`🔍 Price question detected for: ${priceToken}`);
      const priceResult = await fetchRealPrice(priceToken);
      
      if (priceResult.data) {
        const token = priceResult.data;
        const change = parseFloat(token.priceChange24h);
        const changeEmoji = change >= 0 ? '🟢' : '🔴';
        const changeSign = change >= 0 ? '+' : '';
        
        return NextResponse.json({
          response: `${token.symbol}: $${token.priceUsd.toFixed(4)} ${changeEmoji} ${changeSign}${change.toFixed(2)}% (24h)\nLiq: $${(parseFloat(token.liquidity) / 1e6).toFixed(2)}M | Vol: $${(parseFloat(token.volume24h) / 1e6).toFixed(2)}M`,
          priceResult: token,
          simulationParams: null,
          model: 'dexscreener',
        });
      } else {
        return NextResponse.json({
          response: priceResult.error || `No price data found for ${priceToken} on Arbitrum.`,
          simulationParams: null,
          model: 'dexscreener',
        });
      }
    }

    // Route to appropriate handler for non-price questions
    const useGroq = needsStructuredExtraction(lastUserMessage) || simulationResult;
    
    let response: string;
    let simulationParams: any = null;
    let model: 'gemini' | 'groq';

    if (useGroq) {
      // Use Groq for structured tasks
      try {
        const groqResult = await handleWithGroq(messages, simulationResult);
        response = groqResult.response;
        simulationParams = groqResult.simulationParams;
        model = groqResult.model;
        
        // If simulation params extracted, execute the simulation
        if (simulationParams) {
          console.log('🎯 Executing simulation with params:', simulationParams);
          try {
            const simResult = await simulateStrategy(simulationParams);
            
            // Send simulation results back to Groq for interpretation
            const finalResult = await handleWithGroq(
              [...messages, { role: 'assistant', content: response }],
              simResult
            );
            response = finalResult.response;
          } catch (simError) {
            console.error('Simulation execution error:', simError);
            response += '\n\n⚠️ I extracted your strategy but couldn\'t run the simulation. Try again with different tokens or amounts.';
          }
        }
      } catch (groqError) {
        console.error('Groq API error:', groqError);
        
        // Check for specific error types
        const errorResponse = getErrorResponse(groqError);
        if (errorResponse.response.includes('Groq API key not configured')) {
          return NextResponse.json({
            response: errorResponse.response,
            simulationParams: null,
            model: 'groq',
          });
        }
        
        // Fallback to Gemini
        try {
          const geminiResult = await handleWithGemini(messages, simulationResult);
          response = geminiResult.response + '\n\n*(Note: Fell back to Gemini due to Groq error)*';
          model = 'gemini';
        } catch (geminiError) {
          console.error('Gemini fallback error:', geminiError);
          const geminiErrorResponse = getErrorResponse(geminiError);
          return NextResponse.json({
            response: geminiErrorResponse.response,
            simulationParams: null,
            model: 'gemini',
          });
        }
      }
    } else {
      // Use Gemini for general conversation
      try {
        const geminiResult = await handleWithGemini(messages, simulationResult);
        response = geminiResult.response;
        model = geminiResult.model;
      } catch (geminiError) {
        console.error('Gemini API error:', geminiError);
        
        // Check for specific Gemini errors
        const errorResponse = getErrorResponse(geminiError);
        if (errorResponse.response.includes('Gemini API key not configured')) {
          return NextResponse.json({
            response: errorResponse.response,
            simulationParams: null,
            model: 'gemini',
          });
        }
        
        // Try Groq fallback automatically
        try {
          console.log('Attempting Groq fallback after Gemini failure...');
          const groqResult = await handleWithGroq(messages, simulationResult);
          response = groqResult.response + '\n\n*(Note: Fell back to Groq due to Gemini error)*';
          simulationParams = groqResult.simulationParams;
          model = 'groq';
        } catch (groqError) {
          console.error('Groq fallback error:', groqError);
          
          // Both failed
          return NextResponse.json({
            response: "Both AI services are temporarily unavailable. Try again in a moment.",
            simulationParams: null,
            model: 'groq',
          });
        }
      }
    }

    return NextResponse.json({
      response,
      simulationParams,
      model,
    });

  } catch (error) {
    console.error('Agent error:', error);
    
    // Check for missing API keys
    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
      return NextResponse.json({
        response: "AI services not configured. Contact support.",
        simulationParams: null,
        model: 'gemini',
      });
    }
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        response: "Gemini API key not configured. Contact support.",
        simulationParams: null,
        model: 'gemini',
      });
    }
    
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({
        response: "Groq API key not configured. Contact support.",
        simulationParams: null,
        model: 'groq',
      });
    }
    
    // Check for specific error patterns
    const errorResponse = getErrorResponse(error);
    return NextResponse.json({
      response: errorResponse.response,
      simulationParams: null,
      model: 'gemini',
    });
  }
}
