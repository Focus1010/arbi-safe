'use client';

import { useEffect, useState } from 'react';
import { getTokenPrice, TOKENS, TokenPriceData } from '../src/lib/api/price';

interface TokenInfo {
  symbol: string;
  address: string;
  data: TokenPriceData | null;
  loading: boolean;
}

export default function Home() {
  const [tokens, setTokens] = useState<TokenInfo[]>([
    { symbol: 'ARB', address: TOKENS.ARB, data: null, loading: true },
    { symbol: 'USDC', address: TOKENS.USDC, data: null, loading: true },
    { symbol: 'USDT', address: TOKENS.USDT, data: null, loading: true },
    { symbol: 'WETH', address: TOKENS.WETH, data: null, loading: true },
    { symbol: 'GMX', address: TOKENS.GMX, data: null, loading: true },
  ]);

  useEffect(() => {
    async function fetchPrices() {
      const updatedTokens = await Promise.all(
        tokens.map(async (token) => {
          const data = await getTokenPrice(token.address);
          return { ...token, data, loading: false };
        })
      );
      setTokens(updatedTokens);
    }

    fetchPrices();
  }, []);

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-center text-4xl font-bold text-white">
          ArbiSafe Token Prices
        </h1>
        <p className="mb-12 text-center text-slate-400">
          Real-time prices from DexScreener API
        </p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tokens.map((token) => (
            <div
              key={token.symbol}
              className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm transition-all hover:border-slate-600 hover:bg-slate-800"
            >
              {token.loading ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                </div>
              ) : token.data ? (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-2xl font-bold text-white">{token.symbol}</span>
                    <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-400">
                      ${parseFloat(token.data.priceUsd).toFixed(4)}
                    </span>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Liquidity</span>
                      <span className="font-medium text-white">
                        {formatCurrency(token.data.liquidityUsd)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">24h Volume</span>
                      <span className="font-medium text-white">
                        {formatCurrency(token.data.volume24h)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 truncate text-xs text-slate-500">
                    {token.address.slice(0, 6)}...{token.address.slice(-4)}
                  </div>
                </>
              ) : (
                <div className="flex h-40 flex-col items-center justify-center text-slate-500">
                  <span className="mb-2 text-4xl">⚠️</span>
                  <p>Failed to load</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-slate-500">
          <p>Data provided by DexScreener API</p>
        </div>
      </div>
    </div>
  );
}
