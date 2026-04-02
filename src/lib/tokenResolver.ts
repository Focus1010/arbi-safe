import Moralis from 'moralis';

// Initialize Moralis
let moralisInitialized = false;

export async function initMoralis() {
  if (moralisInitialized) return;
  
  if (!process.env.MORALIS_API_KEY) {
    throw new Error('MORALIS_API_KEY not set');
  }
  
  await Moralis.start({
    apiKey: process.env.MORALIS_API_KEY,
  });
  
  moralisInitialized = true;
}

// Known token registry for Arbitrum (verified contracts only)
const KNOWN_TOKENS: Record<string, { address: string; symbol: string; name: string; decimals: number }> = {
  // Major Stablecoins
  USDC: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
  DAI: { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
  FRAX: { address: '0x17FC002b466eEc40FaE1A22796806dBC86E70b92', symbol: 'FRAX', name: 'Frax', decimals: 18 },
  
  // Wrapped & Native
  WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
  ETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
  WBTC: { address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8 },
  
  // Arbitrum Ecosystem
  ARB: { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', symbol: 'ARB', name: 'Arbitrum', decimals: 18 },
  
  // DeFi Blue Chips
  GMX: { address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a', symbol: 'GMX', name: 'GMX', decimals: 18 },
  GNS: { address: '0x18c11FD286C5EC11c8b90038B22b53D6e947bE12', symbol: 'GNS', name: 'Gains Network', decimals: 18 },
  GRAIL: { address: '0x3d9907F9d368D9019f5C0cEea933A0003E3154a0', symbol: 'GRAIL', name: 'Camelot Token', decimals: 18 },
  PENDLE: { address: '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8', symbol: 'PENDLE', name: 'Pendle', decimals: 18 },
  MAGIC: { address: '0x539bdE0d7Dbd336b79148AA742883198BBF60342', symbol: 'MAGIC', name: 'MAGIC', decimals: 18 },
  RDNT: { address: '0x3082CC23568eA640225c2467353dD40e26537D1F', symbol: 'RDNT', name: 'Radiant', decimals: 18 },
  
  // Additional popular tokens
  LINK: { address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', symbol: 'LINK', name: 'Chainlink', decimals: 18 },
  UNI: { address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0', symbol: 'UNI', name: 'Uniswap', decimals: 18 },
  AAVE: { address: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196', symbol: 'AAVE', name: 'Aave', decimals: 18 },
  CRV: { address: '0x11cDb42B0EB46D95f990BeDD3655f843101aD5B5', symbol: 'CRV', name: 'Curve DAO', decimals: 18 },
  CVX: { address: '0xaAFcFD42c99507315eD5d44057eEFf6edAb2e7C6', symbol: 'CVX', name: 'Convex Finance', decimals: 18 },
};

// Session cache for resolved tokens
const sessionCache: Map<string, ResolvedToken> = new Map();

export interface ResolvedToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  source: 'registry' | 'moralis';
  verified: boolean;
}

export interface ResolveResult {
  token: ResolvedToken | null;
  error: string | null;
}

/**
 * Resolve token input to verified token data
 * Uses Moralis for ERC20 metadata validation
 */
export async function resolveToken(input: string): Promise<ResolveResult> {
  const normalizedInput = input.trim().toUpperCase();
  const cacheKey = normalizedInput;
  
  // Check session cache first
  if (sessionCache.has(cacheKey)) {
    return { token: sessionCache.get(cacheKey)!, error: null };
  }
  
  // Check if it's a contract address
  const isAddress = /^0x[a-fA-F0-9]{40}$/.test(input);
  
  if (isAddress) {
    return await resolveByAddress(input.toLowerCase());
  } else {
    return await resolveBySymbol(normalizedInput);
  }
}

/**
 * Resolve token by contract address using Moralis
 */
async function resolveByAddress(address: string): Promise<ResolveResult> {
  try {
    await initMoralis();
    
    // Check if it's a known token first
    const knownEntry = Object.entries(KNOWN_TOKENS).find(
      ([, data]) => data.address.toLowerCase() === address
    );
    
    if (knownEntry) {
      const [, data] = knownEntry;
      const token: ResolvedToken = {
        address: data.address,
        symbol: data.symbol,
        name: data.name,
        decimals: data.decimals,
        chainId: 42161, // Arbitrum
        source: 'registry',
        verified: true,
      };
      sessionCache.set(address, token);
      return { token, error: null };
    }
    
    // Query Moralis for token metadata
    const response = await Moralis.EvmApi.token.getTokenMetadata({
      chain: '0xa4b1', // Arbitrum
      addresses: [address],
    });
    
    const metadata = response.raw[0];
    
    if (!metadata || !metadata.symbol) {
      return {
        token: null,
        error: 'Token not found on Arbitrum. Unable to verify contract.',
      };
    }
    
    const token: ResolvedToken = {
      address: address,
      symbol: metadata.symbol,
      name: metadata.name || metadata.symbol,
      decimals: typeof metadata.decimals === 'number' ? metadata.decimals : 18,
      chainId: 42161,
      source: 'moralis',
      verified: true,
    };
    
    sessionCache.set(address, token);
    sessionCache.set(metadata.symbol.toUpperCase(), token);
    
    return { token, error: null };
    
  } catch (error) {
    console.error('Moralis token resolution error:', error);
    return {
      token: null,
      error: 'Unable to verify token. Please check the contract address.',
    };
  }
}

/**
 * Resolve token by symbol using known registry
 */
async function resolveBySymbol(symbol: string): Promise<ResolveResult> {
  const knownToken = KNOWN_TOKENS[symbol];
  
  if (knownToken) {
    const token: ResolvedToken = {
      address: knownToken.address,
      symbol: knownToken.symbol,
      name: knownToken.name,
      decimals: knownToken.decimals,
      chainId: 42161,
      source: 'registry',
      verified: true,
    };
    sessionCache.set(symbol, token);
    return { token, error: null };
  }
  
  return {
    token: null,
    error: `Token "${symbol}" not recognized. Try using the contract address (0x...) or a verified ticker.`,
  };
}

/**
 * Get cached token by address or symbol
 */
export function getCachedToken(key: string): ResolvedToken | undefined {
  return sessionCache.get(key.toUpperCase()) || sessionCache.get(key.toLowerCase());
}

/**
 * Clear session cache
 */
export function clearTokenCache(): void {
  sessionCache.clear();
}
