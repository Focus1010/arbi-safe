'use client';

import { useState } from 'react';
import StrategyCard from '@/components/StrategyCard';

interface StressTest {
  label: string;
  priceDropPercent: number;
  portfolioValueUSD: number;
  pnlUSD: number;
}

interface SimulationResult {
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  toAmountUSD: number;
  slippagePercent: number;
  gasCostUSD: number;
  netProfitUSD: number;
  lpAPR: number | null;
  dailyEarningsUSD: number | null;
  weeklyEarningsUSD: number | null;
  stressTests: StressTest[];
  trustScore: number;
  trustTier: string;
  trustReasons: string[];
  degenScore: number;
  degenLabel: string;
  warnings: string[];
  simulatedAt: string;
}

export default function Home() {
  const [fromToken, setFromToken] = useState('USDC');
  const [toToken, setToToken] = useState('ARB');
  const [amountUSD, setAmountUSD] = useState('');
  const [action, setAction] = useState<'swap' | 'lp'>('swap');
  const [protocol, setProtocol] = useState('Camelot');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async () => {
    if (!amountUSD || parseFloat(amountUSD) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromToken,
          toToken,
          amountUSD: parseFloat(amountUSD),
          action,
          protocol: protocol.toLowerCase(),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Simulation failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const getTrustColor = (score: number) => {
    if (score >= 75) return 'bg-green-500';
    if (score >= 45) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            ArbiSafe <span className="inline-block">🛡️</span>
          </h1>
          <p className="text-gray-400 text-lg">Simulate before you ape</p>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* LEFT PANEL - Input Form */}
          <div className="w-full lg:w-[40%]">
            <div
              className="rounded-2xl p-6 border"
              style={{ backgroundColor: '#12121a', borderColor: '#1f1f2e' }}
            >
              <h2 className="text-xl font-semibold text-white mb-6">Strategy Input</h2>

              {/* From Token */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  From Token
                </label>
                <select
                  value={fromToken}
                  onChange={(e) => setFromToken(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                  <option value="WETH">WETH</option>
                </select>
              </div>

              {/* To Token */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  To Token
                </label>
                <select
                  value={toToken}
                  onChange={(e) => setToToken(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="ARB">ARB</option>
                  <option value="WETH">WETH</option>
                  <option value="GMX">GMX</option>
                  <option value="ETH">ETH</option>
                </select>
              </div>

              {/* Amount */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Amount (USD)
                </label>
                <input
                  type="number"
                  value={amountUSD}
                  onChange={(e) => setAmountUSD(e.target.value)}
                  placeholder="Enter amount..."
                  className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Strategy Toggle */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Strategy
                </label>
                <div className="flex rounded-xl overflow-hidden border border-gray-700">
                  <button
                    onClick={() => setAction('swap')}
                    className={`flex-1 py-3 px-4 font-medium transition-all ${
                      action === 'swap'
                        ? 'text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    style={{
                      background: action === 'swap' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#1a1a2e',
                    }}
                  >
                    Swap
                  </button>
                  <button
                    onClick={() => setAction('lp')}
                    className={`flex-1 py-3 px-4 font-medium transition-all ${
                      action === 'lp'
                        ? 'text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    style={{
                      background: action === 'lp' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#1a1a2e',
                    }}
                  >
                    Swap + LP
                  </button>
                </div>
              </div>

              {/* Protocol */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Protocol
                </label>
                <select
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="Camelot">Camelot</option>
                  <option value="GMX">GMX</option>
                  <option value="Uniswap">Uniswap</option>
                  <option value="Aave">Aave</option>
                </select>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Simulate Button */}
              <button
                onClick={handleSimulate}
                disabled={isLoading}
                className="w-full py-4 px-6 rounded-xl font-semibold text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Simulating...
                  </span>
                ) : (
                  'Simulate Strategy'
                )}
              </button>
            </div>
          </div>

          {/* RIGHT PANEL - Results */}
          <div className="w-full lg:w-[60%]">
            {!result ? (
              <div
                className="rounded-2xl p-8 border h-full flex items-center justify-center"
                style={{ backgroundColor: '#12121a', borderColor: '#1f1f2e' }}
              >
                <div className="text-center opacity-50">
                  <p className="text-gray-400 text-lg">
                    Enter your strategy and hit Simulate 👈
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* New Simulation Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => setResult(null)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
                    style={{ backgroundColor: '#1a1a2e', border: '1px solid #2d2d3d' }}
                  >
                    ↺ New Simulation
                  </button>
                </div>
                {/* CARD 1 - Swap Summary */}
                <div
                  className="rounded-2xl p-6 border-l-4"
                  style={{ backgroundColor: '#12121a', borderColor: '#1f1f2e', borderLeftColor: '#3b82f6' }}
                >
                  <h3 className="text-lg font-semibold text-white mb-4">Swap Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">From</span>
                      <span className="text-white">
                        {result.fromAmount.toFixed(4)} {result.fromToken}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">To</span>
                      <span className="text-white">
                        {result.toAmount.toFixed(4)} {result.toToken}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Output Value</span>
                      <span className="text-white">{formatCurrency(result.toAmountUSD)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Slippage</span>
                      <span className="text-yellow-400">{result.slippagePercent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Gas Cost</span>
                      <span className="text-white">{formatCurrency(result.gasCostUSD)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-800">
                      <span className="text-gray-400">Net Profit</span>
                      <span className={result.netProfitUSD >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {result.netProfitUSD >= 0 ? '+' : ''}{formatCurrency(result.netProfitUSD)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CARD 2 - LP Earnings (only if lp) */}
                {action === 'lp' && result.lpAPR !== null && (
                  <div
                    className="rounded-2xl p-6 border-l-4"
                    style={{ backgroundColor: '#12121a', borderColor: '#1f1f2e', borderLeftColor: '#8b5cf6' }}
                  >
                    <h3 className="text-lg font-semibold text-white mb-4">LP Earnings Estimate</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">APR</span>
                        <span className="text-purple-400 font-semibold">{result.lpAPR}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Daily Earnings</span>
                        <span className="text-white">
                          {result.dailyEarningsUSD ? formatCurrency(result.dailyEarningsUSD) : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Weekly Earnings</span>
                        <span className="text-white">
                          {result.weeklyEarningsUSD ? formatCurrency(result.weeklyEarningsUSD) : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* CARD 3 - Stress Test */}
                <div
                  className="rounded-2xl p-6 border-l-4"
                  style={{ backgroundColor: '#12121a', borderColor: '#1f1f2e', borderLeftColor: '#f59e0b' }}
                >
                  <h3 className="text-lg font-semibold text-white mb-4">Stress Test Scenarios</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-800">
                          <th className="text-left py-2">Scenario</th>
                          <th className="text-right py-2">Portfolio Value</th>
                          <th className="text-right py-2">PnL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.stressTests.map((test, idx) => (
                          <tr key={idx} className="border-b border-gray-800 last:border-0">
                            <td className="py-2 text-white">{test.label}</td>
                            <td className="py-2 text-right text-white">
                              {formatCurrency(test.portfolioValueUSD)}
                            </td>
                            <td className={`py-2 text-right ${test.pnlUSD >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {test.pnlUSD >= 0 ? '+' : ''}{formatCurrency(test.pnlUSD)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* CARD 4 - Trust + Degen */}
                <div
                  className="rounded-2xl p-6 border"
                  style={{
                    backgroundColor: '#12121a',
                    borderColor: '#1f1f2e',
                    background: 'linear-gradient(135deg, #12121a 0%, #1a1a2e 100%)',
                  }}
                >
                  <h3 className="text-lg font-semibold text-white mb-4">Risk Analysis</h3>

                  {/* Trust Score */}
                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-400">Trust Score</span>
                      <span className="text-sm text-white">{result.trustScore}/100</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full ${getTrustColor(result.trustScore)}`}
                        style={{ width: `${result.trustScore}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-400">{result.trustTier}</p>
                  </div>

                  {/* Degen Score */}
                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-400">Degen Score</span>
                      <span className="text-sm text-white">{result.degenScore}/100</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${result.degenScore}%`,
                          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                        }}
                      />
                    </div>
                    <p className="text-sm" style={{ color: '#8b5cf6' }}>{result.degenLabel}</p>
                  </div>

                  {/* Trust Reasons */}
                  {result.trustReasons.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-400 mb-2">Trust Analysis:</p>
                      <ul className="space-y-1">
                        {result.trustReasons.map((reason, idx) => (
                          <li key={idx} className="text-xs text-gray-500 flex items-start gap-2">
                            <span>•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {result.warnings.length > 0 && (
                    <div>
                      <p className="text-sm text-yellow-500 mb-2">Warnings:</p>
                      <div className="space-y-2">
                        {result.warnings.map((warning, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg text-sm"
                            style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
                          >
                            <span className="text-yellow-400">{warning}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* CARD 5 - Your Strategy Card */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-semibold text-white">Your Strategy Card</h3>
                    <span className="text-xl">📤</span>
                  </div>
                  <StrategyCard result={result} amountUSD={parseFloat(amountUSD) || 0} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
