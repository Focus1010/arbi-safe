import { NextRequest, NextResponse } from 'next/server';
import { simulateStrategy, SimulateInput } from '@/lib/simulate';

export async function POST(request: NextRequest) {
  try {
    const body: SimulateInput = await request.json();
    
    // Validate required fields
    if (!body.fromToken || !body.toToken || !body.amountUSD || !body.action || !body.protocol) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await simulateStrategy(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      { error: 'Simulation failed' },
      { status: 500 }
    );
  }
}
