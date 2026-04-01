import { NextRequest, NextResponse } from 'next/server';
import { simulateStrategy, SimulateInput } from '@/lib/simulate';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate all fields present
    const requiredFields = ['fromToken', 'toToken', 'amountUSD', 'action', 'protocol'];
    for (const field of requiredFields) {
      if (!(field in body)) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }
    }

    const { fromToken, toToken, amountUSD, action, protocol } = body;

    // Validate amountUSD is a positive number
    if (typeof amountUSD !== 'number' || amountUSD <= 0) {
      return NextResponse.json(
        { error: 'amountUSD must be a positive number' },
        { status: 400 }
      );
    }

    // Validate action is "swap" or "lp"
    if (action !== 'swap' && action !== 'lp') {
      return NextResponse.json(
        { error: 'action must be "swap" or "lp"' },
        { status: 400 }
      );
    }

    // Prepare input for simulateStrategy
    const input: SimulateInput = {
      fromToken,
      toToken,
      amountUSD,
      action,
      protocol,
    };

    // Call simulateStrategy
    const result = await simulateStrategy(input);

    // Return result as JSON
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Simulation failed', details: err.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'ArbiSafe Simulator',
    version: '1.0.0',
  });
}
