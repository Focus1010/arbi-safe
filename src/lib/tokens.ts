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

// Master token registry for Arbitrum - Popular & Verified Tokens Only
export const TOKENS_REGISTRY: Record<string, TokenInfo> = {
  // Major Stablecoins
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
  DAI: {
    address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    decimals: 18,
    symbol: 'DAI',
    name: 'Dai Stablecoin',
  },
  FRAX: {
    address: '0x17FC002b466eEc40FaE1A22796806dBC86E70b92',
    decimals: 18,
    symbol: 'FRAX',
    name: 'Frax',
  },
  LUSD: {
    address: '0x93b346b6BC2548dA6A1E7d98DE9C292fE6A9dB5c',
    decimals: 18,
    symbol: 'LUSD',
    name: 'Liquity USD',
  },
  
  // Wrapped & Native
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
  WBTC: {
    address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    decimals: 8,
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
  },
  
  // Arbitrum Ecosystem
  ARB: {
    address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    decimals: 18,
    symbol: 'ARB',
    name: 'Arbitrum',
  },
  
  // DeFi Blue Chips
  GMX: {
    address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
    decimals: 18,
    symbol: 'GMX',
    name: 'GMX',
  },
  GNS: {
    address: '0x18c11FD286C5EC11c8b90038B22b53D6e947bE12',
    decimals: 18,
    symbol: 'GNS',
    name: 'Gains Network',
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
    name: 'Radiant Capital',
  },
  JONES: {
    address: '0x10393c20975cF177a3513071bC1107067c9E83d3',
    decimals: 18,
    symbol: 'JONES',
    name: 'Jones DAO',
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
  VELA: {
    address: '0x088cd8f5eF3652623c22D48b1605dC77e6bCE06e',
    decimals: 18,
    symbol: 'VELA',
    name: 'Vela Exchange',
  },
  PREMIA: {
    address: '0x51fC0f6660482Ea73330E414eFD13017d3fFa667',
    decimals: 18,
    symbol: 'PREMIA',
    name: 'Premia',
  },
  LODE: {
    address: '0x2c6dDF3D82F1298B50Cd80446A17b2a8A72591e2',
    decimals: 18,
    symbol: 'LODE',
    name: 'Lodestar',
  },
  
  // Gaming/Metaverse
  MAGIC: {
    address: '0x539bdE0d7Dbd336b79148AA742883198BBF60342',
    decimals: 18,
    symbol: 'MAGIC',
    name: 'Treasure',
  },
  
  // Infrastructure
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
  
  // Derivatives/Options
  DYDX: {
    address: '0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55',
    decimals: 18,
    symbol: 'DPX',
    name: 'Dopex',
  },
  
  // Meme/Momentum
  PEPE: {
    address: '0x25d887ce7a35172c62febfdcb87d9d1f417e0b8c',
    decimals: 18,
    symbol: 'PEPE',
    name: 'Pepe',
  },
  SHIB: {
    address: '0xbed8e1e34d903a14c7a5a3d9caa2d07c891e7a5e',
    decimals: 18,
    symbol: 'SHIB',
    name: 'Shiba Inu',
  },
  DOGE: {
    address: '0xc42e14f1729c6e72a52a51c7c6c5f14f9b8f3e6a',
    decimals: 8,
    symbol: 'DOGE',
    name: 'Doge Bridged',
  },
  
  // Other Popular
  SPELL: {
    address: '0x3E6648c5a70A150A88bCE65F4aD4d506Fe15d2AF',
    decimals: 18,
    symbol: 'SPELL',
    name: 'Spell Token',
  },
  MIM: {
    address: '0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A',
    decimals: 18,
    symbol: 'MIM',
    name: 'Magic Internet Money',
  },
  SPA: {
    address: '0x5575552988A3A80504bBaeB1311674f6d40e85d2',
    decimals: 18,
    symbol: 'SPA',
    name: 'Spartacus',
  },
  PLUTUS: {
    address: '0x46B9144771Cb2dE4A4Ffb291c3d7925E0688f01e',
    decimals: 18,
    symbol: 'PLS',
    name: 'PlutusDAO',
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
    name: 'Hop Protocol',
  },
  ACX: {
    address: '0x44108f0223A3C3028F5Fe7A9e3A73d55C6c6b258',
    decimals: 18,
    symbol: 'ACX',
    name: 'Across Protocol',
  },
  WINR: {
    address: '0xd77b108d4f6cefaa0cae9506a934e825f6c433e3',
    decimals: 18,
    symbol: 'WINR',
    name: 'WINR Protocol',
  },
  SYN: {
    address: '0x080F6AEd32Fc474DD5717105Dba5ea57268F46eb',
    decimals: 18,
    symbol: 'SYN',
    name: 'Synapse',
  },
  LPT: {
    address: '0x289ba1701c2f0961b7b91f0207c26f807dd7d77b',
    decimals: 18,
    symbol: 'LPT',
    name: 'Livepeer',
  },
  BEETS: {
    address: '0xF24BcA7e9E1d5fA55df54b1F1a43eD52C0A0188e',
    decimals: 18,
    symbol: 'BEETS',
    name: 'Beethoven X',
  },
  OATH: {
    address: '0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55',
    decimals: 18,
    symbol: 'OATH',
    name: 'Oath',
  },
  RPL: {
    address: '0xB766039cc6Db368759C1E56B79AFfE831d0cc507',
    decimals: 18,
    symbol: 'RPL',
    name: 'Rocket Pool',
  },
  LDO: {
    address: '0x13Ad51ed4F1B7e9Dc168d8a00cb3f4eEe1FBf5f5',
    decimals: 18,
    symbol: 'LDO',
    name: 'Lido DAO',
  },
  STG: {
    address: '0x6694340fc020c5e6b96567843da2df01b2ce1eb6',
    decimals: 18,
    symbol: 'STG',
    name: 'Stargate',
  },
  MAI: {
    address: '0x3F56e6E0E27360e3C3c270b4fF319014a5Eb94Ba',
    decimals: 18,
    symbol: 'MAI',
    name: 'Mai Stablecoin',
  },
  JOE: {
    address: '0x371c7ec6D8039ff7933a2AA28EB827Ffe1F52f3D',
    decimals: 18,
    symbol: 'JOE',
    name: 'Trader Joe',
  },
  FTM: {
    address: '0x07dA5791D3290cC245fFe97c920Dc58B30CB0D94',
    decimals: 18,
    symbol: 'FTM',
    name: 'Fantom',
  },
  
  // Bridged Assets
  MATIC: {
    address: '0x561877b6e62eD30C205E9E3629264FB9bC18F806',
    decimals: 18,
    symbol: 'MATIC',
    name: 'Polygon',
  },
  
  // Perps DEX
  KNC: {
    address: '0xe4Dfb035c6E3f0048e9A2437cAAE3Fc81927F74C',
    decimals: 18,
    symbol: 'KNC',
    name: 'Kyber Network',
  },
  SNX: {
    address: '0xcBA76886e383bC6c4831C9cF1b091E59868c8402',
    decimals: 18,
    symbol: 'SNX',
    name: 'Synthetix',
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
