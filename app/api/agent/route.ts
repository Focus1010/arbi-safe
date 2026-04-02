import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are ArbiSafe, an expert AI agent for simulating DeFi strategies on Arbitrum. You're sharp, direct, and speak like a knowledgeable crypto-native friend — not a corporate chatbot. You use light humor, you're honest about risks, and you give clear recommendations.

You have real-time access to Arbitrum onchain data. When users describe a strategy, extract simulation parameters and trigger a simulation.

PARAMETER EXTRACTION RULES:
- fromToken: what they're swapping FROM. Default to USDC if unclear. Can be a ticker (USDC) or contract address (0x...)
- toToken: what they're swapping TO. Can be a ticker or CA
- amountUSD: the dollar amount. Ask if not specified.
- action: 'swap' for simple swaps, 'lp' if they mention liquidity, LP, yield, farming
- protocol: camelot (default for most swaps on Arbitrum), gmx (for perps/leveraged), uniswap, aave (for lending)

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

    // If simulation results are provided, inject as hidden context
    if (simulationResult) {
      groqMessages.push({
        role: 'user',
        content: `[SIMULATION RESULTS - interpret these for the user in 3-5 sentences, lead with key numbers, comment on slippage/trust/degen, end with verdict]:
${JSON.stringify(simulationResult, null, 2)}`,
      });
    }

    let assistantResponse: string;
    
    try {
      const completion = await groq.chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 1024,
      });

      assistantResponse = completion.choices[0]?.message?.content || '';
    } catch (groqError) {
      console.error('Groq API error:', groqError);
      // Fallback response if Groq fails
      return NextResponse.json({
        response: "ArbiSafe's brain is having a moment. Try again in a few seconds — the LLM might be warming up. 🛡️",
        simulationParams: null,
      });
    }

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

    return NextResponse.json({
      response: assistantResponse,
      simulationParams,
    });

  } catch (error) {
    console.error('Agent API error:', error);
    
    // Return graceful fallback instead of 500 error
    return NextResponse.json({
      response: "Something went wrong on my end. Give me a sec and try again — I'm still learning. 🛡️",
      simulationParams: null,
    });
  }
}
