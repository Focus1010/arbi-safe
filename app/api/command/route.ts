import { NextRequest, NextResponse } from 'next/server';
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
import { COMMANDS_HELP } from '@/lib/commandParser';
import { simulateStrategy } from '@/lib/simulate';

export async function POST(request: NextRequest) {
  try {
    const { command, params } = await request.json();

    switch (command) {
      case 'help':
        return NextResponse.json({ type: 'help', data: COMMANDS_HELP });

      case 'price': {
        const result = await checkTokenPrice(params.token);
        if (result.error) {
          return NextResponse.json({ type: 'error', message: result.error }, { status: 400 });
        }
        return NextResponse.json({ type: 'price', data: result.data });
      }

      case 'compare': {
        const result = await compareTokens(params.tokenA, params.tokenB);
        if (result.error) {
          return NextResponse.json({ type: 'error', message: result.error }, { status: 400 });
        }
        return NextResponse.json({ type: 'compare', data: result.data });
      }

      case 'gas': {
        const result = await checkGasFees();
        if (result.error) {
          return NextResponse.json({ type: 'error', message: result.error }, { status: 400 });
        }
        return NextResponse.json({ type: 'gas', data: result.data });
      }

      case 'safe': {
        const result = await checkProtocolSafety(params.input);
        if (result.error) {
          return NextResponse.json({ type: 'error', message: result.error }, { status: 400 });
        }
        return NextResponse.json({ type: 'safe', data: result.data });
      }

      case 'pool': {
        const result = await getPoolInfo(params.tokenA, params.tokenB);
        if (result.error) {
          return NextResponse.json({ type: 'error', message: result.error }, { status: 400 });
        }
        return NextResponse.json({ type: 'pool', data: result.data });
      }

      case 'market': {
        const result = await getArbitrumMarketOverview();
        if (result.error) {
          return NextResponse.json({ type: 'error', message: result.error }, { status: 400 });
        }
        return NextResponse.json({ type: 'market', data: result.data });
      }

      case 'gainers': {
        const result = await getTopGainers();
        if (result.error) {
          return NextResponse.json({ type: 'error', message: result.error }, { status: 400 });
        }
        return NextResponse.json({ type: 'gainers', data: result.data });
      }

      case 'losers': {
        const result = await getTopLosers();
        if (result.error) {
          return NextResponse.json({ type: 'error', message: result.error }, { status: 400 });
        }
        return NextResponse.json({ type: 'losers', data: result.data });
      }

      case 'simulate': {
        const result = await simulateStrategy({
          fromToken: params.fromToken,
          toToken: params.toToken,
          amountUSD: params.amountUSD,
          action: 'swap',
          protocol: params.protocol || 'camelot',
        });
        return NextResponse.json({ type: 'simulation', data: result });
      }

      case 'lp': {
        const result = await simulateStrategy({
          fromToken: params.fromToken,
          toToken: params.toToken,
          amountUSD: params.amountUSD,
          action: 'lp',
          protocol: params.protocol || 'camelot',
        });
        return NextResponse.json({ type: 'simulation', data: result });
      }

      case 'unknown':
        return NextResponse.json(
          { type: 'error', message: 'Unknown command. Type /help to see available commands.' },
          { status: 400 }
        );

      default:
        return NextResponse.json(
          { type: 'error', message: 'Unknown command. Type /help to see available commands.' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Command API error:', error);
    return NextResponse.json(
      { type: 'error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
