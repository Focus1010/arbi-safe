import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are ArbiSafe, an expert DeFi strategy simulator agent on Arbitrum. You help users simulate and evaluate DeFi strategies before they execute them with real money.

You have access to real onchain data. When a user describes a strategy, extract these parameters:
- fromToken (USDC, USDT, or WETH)
- toToken (ARB, WETH, GMX)  
- amountUSD (number)
- action (swap or lp)
- protocol (camelot, gmx, uniswap, aave)

When you have enough information, output a special JSON block at the END of your response in this exact format:
<simulate>
{"fromToken":"USDC","toToken":"ARB","amountUSD":200,"action":"swap","protocol":"camelot"}
</simulate>

If you don't have enough info yet, ask the user for the missing details in a friendly conversational way.

Always be concise, use emojis sparingly, and speak like a knowledgeable DeFi friend — not a robot. 
After a simulation runs, interpret the results for the user in plain English. Highlight risks, opportunities, and give a clear recommendation: proceed, proceed with caution, or avoid.`;

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
