import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
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

const SYSTEM_PROMPT = `You are ArbiSafe, an expert AI agent for simulating DeFi strategies on Arbitrum. You're sharp, direct, and speak like a knowledgeable crypto-native friend.

When a user asks about buying or swapping tokens, or wants to simulate a strategy:
1. First check the token price to see if it has enough liquidity
2. Check gas fees to give accurate cost estimates  
3. If the user mentions an amount, call simulateStrategy with the appropriate parameters

Always use the available tools/functions rather than making up data. Be concise and give clear verdicts.`;

// Tool definitions for Groq
const TOOLS: any[] = [
  {
    type: 'function',
    function: {
      name: 'checkTokenPrice',
      description: 'Get real-time price, volume, and liquidity for any token on Arbitrum',
      parameters: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'Token ticker (e.g., USDC, ARB, GMX) or contract address (0x...)' }
        },
        required: ['token']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'checkGasFees',
      description: 'Get current Arbitrum gas prices and estimated transaction costs',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'simulateStrategy',
      description: 'Run a DeFi strategy simulation (swap or LP) with real onchain data',
      parameters: {
        type: 'object',
        properties: {
          fromToken: { type: 'string', description: 'Token to swap from (e.g., USDC)' },
          toToken: { type: 'string', description: 'Token to swap to (e.g., GMX)' },
          amountUSD: { type: 'number', description: 'Amount in USD to simulate' },
          action: { type: 'string', enum: ['swap', 'lp'], description: 'Type of strategy' },
          protocol: { type: 'string', description: 'Protocol to use (camelot, gmx, uniswap)' }
        },
        required: ['fromToken', 'toToken', 'amountUSD', 'action', 'protocol']
      }
    }
  },
  {
    type: 'function',
    function: {
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
    }
  },
  {
    type: 'function',
    function: {
      name: 'checkProtocolSafety',
      description: 'Check trust score and safety metrics for a DeFi protocol',
      parameters: {
        type: 'object',
        properties: {
          protocol: { type: 'string', description: 'Protocol name (e.g., Camelot, GMX, Aave)' }
        },
        required: ['protocol']
      }
    }
  },
  {
    type: 'function',
    function: {
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
    }
  },
  {
    type: 'function',
    function: {
      name: 'getArbitrumMarketOverview',
      description: 'Get top tokens by volume and overall market sentiment',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getTopGainers',
      description: 'Get the top 5 tokens with the biggest price increases',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getTopLosers',
      description: 'Get the top 5 tokens with the biggest price drops',
      parameters: { type: 'object', properties: {} }
    }
  }
];

async function executeTool(name: string, args: any) {
  console.log(`Executing tool: ${name} with args:`, args);
  
  try {
    switch (name) {
      case 'checkTokenPrice':
        return await checkTokenPrice(args.token);
      case 'checkGasFees':
        return await checkGasFees();
      case 'simulateStrategy':
        const result = await simulateStrategy(args);
        return { data: result, error: null };
      case 'compareTokens':
        return await compareTokens(args.tokenA, args.tokenB);
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
      default:
        return { data: null, error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    return { data: null, error: `Failed to execute ${name}: ${error instanceof Error ? error.message : 'Unknown error'}` };
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

    // Clean messages to only include valid properties for Groq API
    const cleanMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
      ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
    }));

    // Build message array for Groq
    const groqMessages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...cleanMessages,
    ];

    // If simulation results are provided, append interpretation request
    if (simulationResult) {
      groqMessages.push({
        role: 'user',
        content: `[SIMULATION RESULTS - interpret for the user in 2-3 sentences, be specific with numbers and give a clear yes/no recommendation]:
${JSON.stringify(simulationResult, null, 2)}`,
      });
    }

    // First call to get tool calls
    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: groqMessages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1024,
    });

    const assistantMessage = completion.choices[0]?.message;
    
    // Check if there are tool calls
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Add assistant message to conversation
      groqMessages.push(assistantMessage);

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const { name, arguments: argsString } = toolCall.function;
        let args;
        try {
          args = JSON.parse(argsString);
        } catch {
          args = {};
        }

        const toolResult = await executeTool(name, args);
        
        // Add tool result to conversation
        groqMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Second call to get final response
      const finalCompletion = await groq.chat.completions.create({
        model: 'llama3-8b-8192',
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 1024,
      });

      const finalResponse = finalCompletion.choices[0]?.message?.content || '';
      
      // Check for simulation block in final response
      let simulationParams = null;
      const simulateMatch = finalResponse.match(/<simulate>([\s\S]*?)<\/simulate>/);
      if (simulateMatch) {
        try {
          simulationParams = JSON.parse(simulateMatch[1].trim());
        } catch {
          // Invalid JSON, ignore
        }
      }

      return NextResponse.json({
        response: finalResponse,
        simulationParams,
      });
    }

    // No tool calls, just return the response
    const response = assistantMessage?.content || '';
    
    // Check for simulation block
    let simulationParams = null;
    const simulateMatch = response.match(/<simulate>([\s\S]*?)<\/simulate>/);
    if (simulateMatch) {
      try {
        simulationParams = JSON.parse(simulateMatch[1].trim());
      } catch {
        // Invalid JSON, ignore
      }
    }

    return NextResponse.json({
      response,
      simulationParams,
    });

  } catch (error) {
    console.error('Agent API error:', error);
    return NextResponse.json(
      { error: 'Agent temporarily unavailable' },
      { status: 500 }
    );
  }
}
