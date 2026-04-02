export interface TokenInfo {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
}

export interface DexScreenerTokenMetadata {
  symbol: string;
  name: string;
  price: number;
  liquidity: number;
  volume24h: number;
  pairAddress: string;
}

// Master token registry for Arbitrum
export const TOKENS_REGISTRY: Record<string, TokenInfo> = {
  USDC: {
    address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
  },
  USDT: {
    address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    decimals: 6,
    symbol: 'USDT',
    name: 'Tether USD',
  },
  WETH: {
    address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    decimals: 18,
    symbol: 'WETH',
    name: 'Wrapped Ether',
  },
  ETH: {
    address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    decimals: 18,
    symbol: 'WETH',
    name: 'Wrapped Ether',
  },
  ARB: {
    address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    decimals: 18,
    symbol: 'ARB',
    name: 'Arbitrum',
  },
  GMX: {
    address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
    decimals: 18,
    symbol: 'GMX',
    name: 'GMX',
  },
  GRAIL: {
    address: '0x3d9907F9d368D9019f5C0cEea933A0003E3154a0',
    decimals: 18,
    symbol: 'GRAIL',
    name: 'Camelot Token',
  },
  PENDLE: {
    address: '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8',
    decimals: 18,
    symbol: 'PENDLE',
    name: 'Pendle',
  },
  RDNT: {
    address: '0x3082CC23568eA640225c2467653dB90e9250Aa0e',
    decimals: 18,
    symbol: 'RDNT',
    name: 'Radiant',
  },
  JONES: {
    address: '0x10393c20975cF177a3513071bC1107067c9E83d3',
    decimals: 18,
    symbol: 'JONES',
    name: 'Jones DAO',
  },
  MAGIC: {
    address: '0x539bdE0d7Dbd336b79148AA742883198BBF60342',
    decimals: 18,
    symbol: 'MAGIC',
    name: 'Magic',
  },
  DPX: {
    address: '0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55',
    decimals: 18,
    symbol: 'DPX',
    name: 'Dopex',
  },
  UMAMI: {
    address: '0x1622bF67e6e0057d15E0A56cC1e9F3F7F53B8924',
    decimals: 18,
    symbol: 'UMAMI',
    name: 'Umami Finance',
  },
  GNS: {
    address: '0x18c11FD286C5EC11c8b90038B22b53D6e947bE12',
    decimals: 18,
    symbol: 'GNS',
    name: 'Gains Network',
  },
  VELA: {
    address: '0x088cd8f5eF3652623c22D48b1605dC77e6bCE06e',
    decimals: 18,
    symbol: 'VELA',
    name: 'Vela Exchange',
  },
  LINK: {
    address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
    decimals: 18,
    symbol: 'LINK',
    name: 'Chainlink',
  },
  UNI: {
    address: '0xFa7F8980b0f205E58eD59dB831C74915E5F40c98',
    decimals: 18,
    symbol: 'UNI',
    name: 'Uniswap',
  },
  AAVE: {
    address: '0xba5DdD1f9d7F570dC94a51476a080eE67Aeb6d1e',
    decimals: 18,
    symbol: 'AAVE',
    name: 'Aave',
  },
  CRV: {
    address: '0x11cDb42B0EB46D95f990BeDD39A6Fd491a8f9c22',
    decimals: 18,
    symbol: 'CRV',
    name: 'Curve DAO Token',
  },
  BAL: {
    address: '0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a27B8',
    decimals: 18,
    symbol: 'BAL',
    name: 'Balancer',
  },
  FRAX: {
    address: '0x17FC002b466eEc40FaE1A22796806dBC86E70b92',
    decimals: 18,
    symbol: 'FRAX',
    name: 'Frax',
  },
  DAI: {
    address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    decimals: 18,
    symbol: 'DAI',
    name: 'Dai Stablecoin',
  },
  LUSD: {
    address: '0x93b346b6BC2548dA6A1E7d98DE9C292fE6A9dB5c',
    decimals: 18,
    symbol: 'LUSD',
    name: 'Liquity USD',
  },
  MIM: {
    address: '0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A',
    decimals: 18,
    symbol: 'MIM',
    name: 'Magic Internet Money',
  },
  SPELL: {
    address: '0x3E6648c5a70A150A88bCE65F4aD4d506Fe15d2AF',
    decimals: 18,
    symbol: 'SPELL',
    name: 'Spell Token',
  },
  SUSHI: {
    address: '0xd4d42F0b6c4E38C87ef28c45cB796354F1D8d84B',
    decimals: 18,
    symbol: 'SUSHI',
    name: 'SushiToken',
  },
  DOPEX: {
    address: '0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55',
    decimals: 18,
    symbol: 'DPX',
    name: 'Dopex',
  },
  SPA: {
    address: '0x5575552988A3A80504bBaeB1311674f6d40e85d2',
    decimals: 18,
    symbol: 'SPA',
    name: 'Spartacus',
  },
  PREMIA: {
    address: '0x51fC0f6660482Ea73330E414eFD13017d3fFa667',
    decimals: 18,
    symbol: 'PREMIA',
    name: 'Premia',
  },
  CAP: {
    address: '0x031d35296154279dc1984cd503fd30c9d546d97f',
    decimals: 18,
    symbol: 'CAP',
    name: 'Cap',
  },
  HOP: {
    address: '0xc5102fE9359FD9a28f877a67E36B0F050c81f3B0',
    decimals: 18,
    symbol: 'HOP',
    name: 'Hop',
  },
  ACROSS: {
    address: '0x44108f0223A3C3028F5Fe7A9e3A73d55C6c6b258',
    decimals: 18,
    symbol: 'ACX',
    name: 'Across Protocol',
  },
  ACE: {
    address: '0x8F30F8278eEc8C01B8c1a3dE67c3eE9E64fFbF61',
    decimals: 18,
    symbol: 'ACE',
    name: 'Acentrik',
  },
  WINR: {
    address: '0xd77b108d4f6cefaa0cae9506a934e825f6c433e3',
    decimals: 18,
    symbol: 'WINR',
    name: 'WINR Protocol',
  },
};

const STABLECOINS = new Set([
  'USDC', 'USDT', 'DAI', 'FRAX', 'LUSD', 'MIM', 'BUSD',
]);

/**
 * Resolve a token input (ticker or address) to a contract address
 * @param input - Token ticker (e.g., "USDC") or contract address (0x...)
 * @returns The contract address if valid, null if unknown
 */
export function resolveToken(input: string): string | null {
  if (!input) return null;
  
  const trimmed = input.trim();
  
  // Check if it's an address (starts with 0x and is 42 chars)
  if (trimmed.toLowerCase().startsWith('0x') && trimmed.length === 42) {
    return trimmed;
  }
  
  // Check if it's a known ticker (case-insensitive)
  const ticker = trimmed.toUpperCase();
  if (TOKENS_REGISTRY[ticker]) {
    return TOKENS_REGISTRY[ticker].address;
  }
  
  return null;
}

/**
 * Get token metadata from DexScreener API
 * @param address - Token contract address
 * @returns Token metadata if found on Arbitrum, null otherwise
 */
export async function getTokenMetadata(
  address: string
): Promise<DexScreenerTokenMetadata | null> {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${address}`,
      {
        headers: {
          Accept: 'application/json',
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.pairs || !Array.isArray(data.pairs)) {
      return null;
    }

    // Filter for Arbitrum pairs
    const arbitrumPairs = data.pairs.filter(
      (pair: any) => pair.chainId === 'arbitrum'
    );

    if (arbitrumPairs.length === 0) {
      return null;
    }

    // Use the first Arbitrum pair (usually has highest liquidity)
    const pair = arbitrumPairs[0];

    // Determine which token in the pair matches our address
    const tokenInfo =
      pair.baseToken.address.toLowerCase() === address.toLowerCase()
        ? pair.baseToken
        : pair.quoteToken;

    return {
      symbol: tokenInfo.symbol,
      name: tokenInfo.name,
      price: parseFloat(pair.priceUsd) || 0,
      liquidity: pair.liquidity?.usd || 0,
      volume24h: pair.volume?.h24 || 0,
      pairAddress: pair.pairAddress,
    };
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    return null;
  }
}

/**
 * Check if a ticker represents a stablecoin
 * @param ticker - Token ticker (case-insensitive)
 * @returns True if the token is a known stablecoin
 */
export function isStablecoin(ticker: string): boolean {
  if (!ticker) return false;
  return STABLECOINS.has(ticker.toUpperCase());
}

/**
 * Get all token addresses as an array
 * @returns Array of token contract addresses
 */
export function getAllTokenAddresses(): string[] {
  return Object.values(TOKENS_REGISTRY).map((token) => token.address);
}

/**
 * Get token info by ticker
 * @param ticker - Token ticker (case-insensitive)
 * @returns TokenInfo if found, null otherwise
 */
export function getTokenByTicker(ticker: string): TokenInfo | null {
  if (!ticker) return null;
  return TOKENS_REGISTRY[ticker.toUpperCase()] || null;
}
