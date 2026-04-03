interface CommandResult {
  command: string | null;
  [key: string]: any;
}

export const COMMANDS_HELP = [
  { command: "/price {token}", description: "Get real-time price for any token or CA" },
  { command: "/compare {tokenA} {tokenB}", description: "Compare two tokens side by side" },
  { command: "/gas", description: "Check current Arbitrum gas fees" },
  { command: "/safe {protocol}", description: "Check if a protocol or contract is safe" },
  { command: "/pool {tokenA} {tokenB}", description: "Get liquidity pool info for a pair" },
  { command: "/market", description: "Arbitrum market overview and sentiment" },
  { command: "/simulate {from} {to} {amount}", description: "Run a swap simulation directly" },
  { command: "/lp {from} {to} {amount}", description: "Simulate an LP position" },
  { command: "/clear", description: "Clear chat history" },
];

export function parseCommand(input: string): CommandResult {
  const trimmed = input.trim();

  if (!trimmed.startsWith('/')) {
    return { command: null };
  }

  const parts = trimmed.split(' ').filter(p => p.length > 0);
  const command = parts[0].toLowerCase();

  switch (command) {
    case '/help':
      return { command: 'help' };

    case '/price':
      if (parts.length < 2) {
        return { command: 'unknown', input: trimmed };
      }
      return { command: 'price', token: parts[1] };

    case '/compare':
      if (parts.length < 3) {
        return { command: 'unknown', input: trimmed };
      }
      return { command: 'compare', tokenA: parts[1], tokenB: parts[2] };

    case '/gas':
      return { command: 'gas' };

    case '/safe':
      if (parts.length < 2) {
        return { command: 'unknown', input: trimmed };
      }
      return { command: 'safe', input: parts.slice(1).join(' ') };

    case '/pool':
      if (parts.length < 3) {
        return { command: 'unknown', input: trimmed };
      }
      return { command: 'pool', tokenA: parts[1], tokenB: parts[2] };

    case '/market':
      return { command: 'market' };

    case '/simulate':
      if (parts.length < 4) {
        return { command: 'unknown', input: trimmed };
      }
      const amountUSD = parseFloat(parts[3]);
      if (isNaN(amountUSD) || amountUSD <= 0) {
        return { command: 'unknown', input: trimmed };
      }
      return { command: 'simulate', fromToken: parts[1], toToken: parts[2], amountUSD };

    case '/lp':
      if (parts.length < 4) {
        return { command: 'unknown', input: trimmed };
      }
      const lpAmountUSD = parseFloat(parts[3]);
      if (isNaN(lpAmountUSD) || lpAmountUSD <= 0) {
        return { command: 'unknown', input: trimmed };
      }
      return { command: 'lp', fromToken: parts[1], toToken: parts[2], amountUSD: lpAmountUSD };

    case '/clear':
      return { command: 'clear' };

    default:
      return { command: 'unknown', input: trimmed };
  }
}
