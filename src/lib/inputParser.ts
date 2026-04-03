/**
 * Smart Input Parser for ArbiSafe
 * Handles flexible user input: contract addresses, symbols, natural language
 */

export type IntentType = 
  | 'price' 
  | 'compare' 
  | 'simulate' 
  | 'lp' 
  | 'gas' 
  | 'safe' 
  | 'pool' 
  | 'market' 
  | 'help' 
  | 'clear' 
  | 'unknown';

export interface ParsedInput {
  intent: IntentType;
  tokens: string[];
  amount?: number;
  action?: 'swap' | 'lp';
  protocol?: string;
  raw: string;
}

// Known token symbols on Arbitrum (for quick matching)
const KNOWN_TOKENS = new Set([
  'ETH', 'WETH', 'USDC', 'USDT', 'DAI', 'ARB', 'GMX', 'MAGIC', 
  'LINK', 'UNI', 'AAVE', 'CRV', 'CVX', 'PENDLE', 'RDNT', 'GRAIL',
  'GNS', 'FRAX', 'WBTC', 'BTC', 'SOL', 'MATIC', 'COMP', 'SNX',
  'YFI', 'BAL', 'SUSHI', '1INCH', 'LDO', 'FXS', 'STG', 'JOE'
]);

// Intent detection patterns
const INTENT_PATTERNS: Array<{ intent: IntentType; patterns: RegExp[] }> = [
  {
    intent: 'price',
    patterns: [
      /(?:price|worth|value|cost|how much).*(?:of|is|for)?\s+(?:this\s+)?(?:ca|contract|token)?/i,
      /(?:what|how).*(?:price|worth|value)/i,
      /^\/(?:price|p)\s+/i,
    ],
  },
  {
    intent: 'compare',
    patterns: [
      /(?:compare|vs|versus|against|and|between).*(?:and|vs)/i,
      /(?:diff|difference).*(?:between)/i,
      /^\/(?:compare|cmp)\s+/i,
    ],
  },
  {
    intent: 'simulate',
    patterns: [
      /(?:simulate|swap|trade|exchange|buy|sell).*(?:for|to|into)/i,
      /(?:should i|can i|what if i).*(?:swap|trade|buy|sell)/i,
      /(?:worth of|value of).*\$/i,
      /^\/(?:simulate|sim|swap)\s+/i,
    ],
  },
  {
    intent: 'lp',
    patterns: [
      /(?:lp|pool|liquidity|provide|add liquidity)/i,
      /(?:pool|position).*(?:for|between)/i,
      /^\/(?:lp|pool)\s+/i,
    ],
  },
  {
    intent: 'gas',
    patterns: [
      /(?:gas|fee|cost|transaction cost)/i,
      /(?:how much|what).*(?:gas|fee)/i,
      /^\/(?:gas|g)\s*$/i,
    ],
  },
  {
    intent: 'safe',
    patterns: [
      /(?:safe|safety|trust|audit|verified|security).*(?:protocol|contract|token)?/i,
      /(?:is|how).*(?:safe|secure|risky)/i,
      /^\/(?:safe|trust)\s+/i,
    ],
  },
  {
    intent: 'pool',
    patterns: [
      /(?:pool|pair).*(?:info|data|depth|liquidity)/i,
      /(?:liquidity).*(?:pool|pair)/i,
      /^\/(?:pool)\s+/i,
    ],
  },
  {
    intent: 'market',
    patterns: [
      /(?:market|overview|trending|top|market cap)/i,
      /(?:what|how).*(?:market|doing)/i,
      /^\/(?:market|m)\s*$/i,
    ],
  },
  {
    intent: 'help',
    patterns: [
      /^(?:help|commands|what can you do|\?)$/i,
      /^\/(?:help|h)\s*$/i,
    ],
  },
  {
    intent: 'clear',
    patterns: [
      /^(?:clear|reset|new chat|start over)$/i,
      /^\/(?:clear|clr)\s*$/i,
    ],
  },
];

/**
 * Extract contract address from text
 */
function extractContractAddress(text: string): string | null {
  const match = text.match(/0x[a-fA-F0-9]{40}/);
  return match ? match[0].toLowerCase() : null;
}

/**
 * Extract token symbols from text
 */
function extractTokenSymbols(text: string): string[] {
  const symbols: string[] = [];
  const words = text.toUpperCase().split(/[^a-zA-Z0-9]/);
  
  for (const word of words) {
    if (KNOWN_TOKENS.has(word) && !symbols.includes(word)) {
      symbols.push(word);
    }
  }
  
  return symbols;
}

/**
 * Extract amount (USD or token amount) from text
 */
function extractAmount(text: string): number | undefined {
  // Match patterns like "$200", "200 USDC", "200", "$200 worth"
  const patterns = [
    /\$(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)\s*(?:USD|USDC|USDT|DAI)/i,
    /(\d+(?:\.\d+)?)\s*(?:worth|of)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  
  return undefined;
}

/**
 * Extract protocol name from text
 */
function extractProtocol(text: string): string | undefined {
  const protocols = [
    { name: 'camelot', patterns: [/camelot/i, /grail/i] },
    { name: 'gmx', patterns: [/gmx/i] },
    { name: 'uniswap', patterns: [/uniswap/i, /uni/i] },
    { name: 'sushiswap', patterns: [/sushiswap/i, /sushi/i] },
    { name: 'balancer', patterns: [/balancer/i, /bal/i] },
    { name: 'curve', patterns: [/curve/i, /crv/i] },
    { name: 'aave', patterns: [/aave/i] },
    { name: 'radiant', patterns: [/radiant/i, /rdnt/i] },
  ];
  
  for (const protocol of protocols) {
    for (const pattern of protocol.patterns) {
      if (pattern.test(text)) {
        return protocol.name;
      }
    }
  }
  
  return undefined;
}

/**
 * Main parse function - understands user intent and extracts parameters
 */
export function parseInput(input: string): ParsedInput {
  const raw = input.trim();
  const normalized = raw.toLowerCase();
  
  // Check for slash command first
  if (raw.startsWith('/')) {
    const parts = raw.slice(1).split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    // Map slash commands to intents
    const commandMap: Record<string, IntentType> = {
      'price': 'price', 'p': 'price',
      'compare': 'compare', 'cmp': 'compare',
      'simulate': 'simulate', 'sim': 'simulate', 'swap': 'simulate',
      'lp': 'lp', 'pool': 'pool',
      'gas': 'gas', 'g': 'gas',
      'safe': 'safe', 'trust': 'safe',
      'market': 'market', 'm': 'market',
      'help': 'help', 'h': 'help',
      'clear': 'clear', 'clr': 'clear',
    };
    
    const intent = commandMap[command] || 'unknown';
    
    return {
      intent,
      tokens: args.filter(arg => arg.length > 0),
      raw,
    };
  }
  
  // Detect intent from natural language
  let detectedIntent: IntentType = 'unknown';
  
  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(raw)) {
        detectedIntent = intent;
        break;
      }
    }
    if (detectedIntent !== 'unknown') break;
  }
  
  // Extract tokens (CA + symbols)
  const tokens: string[] = [];
  
  // Check for contract address
  const ca = extractContractAddress(raw);
  if (ca) {
    tokens.push(ca);
  }
  
  // Check for symbols
  const symbols = extractTokenSymbols(raw);
  for (const symbol of symbols) {
    if (!tokens.includes(symbol)) {
      tokens.push(symbol);
    }
  }
  
  // Extract amount for simulations
  const amount = extractAmount(raw);
  
  // Extract protocol
  const protocol = extractProtocol(raw);
  
  // Determine action type
  let action: 'swap' | 'lp' | undefined;
  if (detectedIntent === 'simulate' || /(?:swap|trade|buy|sell|exchange)/i.test(raw)) {
    action = 'swap';
  } else if (detectedIntent === 'lp' || /(?:lp|pool|liquidity)/i.test(raw)) {
    action = 'lp';
  }
  
  return {
    intent: detectedIntent,
    tokens,
    amount,
    action,
    protocol,
    raw,
  };
}

/**
 * Format parsed input for logging/debugging
 */
export function formatParsedInput(parsed: ParsedInput): string {
  return `Intent: ${parsed.intent}
Tokens: ${parsed.tokens.join(', ') || 'none'}
${parsed.amount ? `Amount: $${parsed.amount}` : ''}
${parsed.action ? `Action: ${parsed.action}` : ''}
${parsed.protocol ? `Protocol: ${parsed.protocol}` : ''}`;
}
