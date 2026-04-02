'use client';

import { useState, useRef, useEffect } from 'react';
import StrategyCard from '@/components/StrategyCard';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

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

interface SimulationParams {
  fromToken: string;
  toToken: string;
  amountUSD: number;
  action: 'swap' | 'lp';
  protocol: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hey! I'm ArbiSafe 🛡️ — your onchain strategy simulator. Tell me what you're thinking of doing. For example: 'Should I swap $500 USDC for ARB on Camelot?' and I'll run the numbers before you risk real money.",
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [action, setAction] = useState<'swap' | 'lp'>('swap');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showSuggestions, setShowSuggestions] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || inputValue.trim();
    if (!textToSend || isThinking) return;

    setInputValue('');
    setShowSuggestions(false);
    
    const newMessages: Message[] = [...messages, { role: 'user', content: textToSend }];
    setMessages(newMessages);
    setIsThinking(true);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        throw new Error('Failed to get agent response');
      }

      const data = await response.json();
      const assistantMessage: Message = { role: 'assistant', content: data.response };
      setMessages([...newMessages, assistantMessage]);

      if (data.simulationParams) {
        setIsSimulating(true);
        const params: SimulationParams = data.simulationParams;
        setAction(params.action);
        
        try {
          const simResponse = await fetch('/api/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
          });

          if (simResponse.ok) {
            const simData = await simResponse.json();
            setSimulationResult(simData);
          }
        } catch (err) {
          console.error('Simulation error:', err);
        } finally {
          setIsSimulating(false);
        }
      }
    } catch (err) {
      console.error('Agent error:', err);
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Sorry, I had trouble processing that. Can you try again?' },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  const getTrustColor = (score: number) => {
    if (score >= 75) return 'bg-green-500';
    if (score >= 45) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatTimestamp = () => {
    if (!simulationResult?.simulatedAt) return '';
    const date = new Date(simulationResult.simulatedAt);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: '#0a0a0f' }}>
      <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#1f1f2e', backgroundColor: '#0a0a0f' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold text-white">ArbiSafe</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#1a1a2e', color: '#8b5cf6' }}>
            Agent #162
          </span>
          <span className="text-gray-500">·</span>
          <span className="text-gray-400">Arbitrum Sepolia</span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[45%] flex flex-col border-r" style={{ borderColor: '#1f1f2e' }}>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2 flex-shrink-0" style={{ backgroundColor: '#1a1a2e' }}>
                    <span className="text-sm">🛡️</span>
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'text-white rounded-br-md'
                      : 'text-gray-200 rounded-bl-md'
                  }`}
                  style={{
                    backgroundColor: msg.role === 'user' ? '#3b82f6' : '#1a1a2e',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Suggestion Chips - only show after welcome message and before first user message */}
            {showSuggestions && messages.length === 1 && (
              <div className="flex flex-col gap-2 pl-10 mt-2">
                <button
                  onClick={() => handleSend('Swap $200 USDC for ARB on Camelot')}
                  className="self-start px-4 py-2 rounded-full text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: '#1a1a2e', border: '1px solid #2d2d3d' }}
                >
                  🔄 Swap $200 USDC for ARB on Camelot
                </button>
                <button
                  onClick={() => handleSend('Add $500 to a USDC/WETH LP on Camelot')}
                  className="self-start px-4 py-2 rounded-full text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: '#1a1a2e', border: '1px solid #2d2d3d' }}
                >
                  💧 Add $500 to a USDC/WETH LP on Camelot
                </button>
                <button
                  onClick={() => handleSend('Is it safe to put $5000 into GMX?')}
                  className="self-start px-4 py-2 rounded-full text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: '#1a1a2e', border: '1px solid #2d2d3d' }}
                >
                  ⚠️ Is it safe to put $5000 into GMX?
                </button>
              </div>
            )}
            
            {isThinking && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2 flex-shrink-0" style={{ backgroundColor: '#1a1a2e' }}>
                  <span className="text-sm">🛡️</span>
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-md text-sm" style={{ backgroundColor: '#1a1a2e' }}>
                  <span className="text-gray-400">ArbiSafe is thinking</span>
                  <span className="ml-1">
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </span>
                </div>
              </div>
            )}
            
            {isSimulating && (
              <div className="flex justify-center py-2">
                <span className="text-xs text-gray-500 flex items-center gap-2">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Running simulation...
                </span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="px-6 py-4 border-t" style={{ borderColor: '#1f1f2e' }}>
            <div className="flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask ArbiSafe about your strategy..."
                className="flex-1 px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                style={{ backgroundColor: '#12121a', border: '1px solid #2d2d3d' }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isThinking}
                className="px-6 py-3 rounded-xl font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <div className="w-[55%] overflow-y-auto px-6 py-6">
          {!simulationResult ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center opacity-40">
                <p className="text-gray-400 text-lg">
                  Simulation results will appear here after your first strategy chat 👈
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-500">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Latest Simulation</h2>
                <span className="text-xs text-gray-500">{formatTimestamp()}</span>
              </div>

              <div
                className="rounded-2xl p-6 border-l-4"
                style={{ backgroundColor: '#12121a', borderColor: '#1f1f2e', borderLeftColor: '#3b82f6' }}
              >
                <h3 className="text-lg font-semibold text-white mb-4">Swap Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">From</span>
                    <span className="text-white">
                      {simulationResult.fromAmount.toFixed(4)} {simulationResult.fromToken}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">To</span>
                    <span className="text-white">
                      {simulationResult.toAmount.toFixed(4)} {simulationResult.toToken}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Output Value</span>
                    <span className="text-white">{formatCurrency(simulationResult.toAmountUSD)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Slippage</span>
                    <span className="text-yellow-400">{simulationResult.slippagePercent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gas Cost</span>
                    <span className="text-white">{formatCurrency(simulationResult.gasCostUSD)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-800">
                    <span className="text-gray-400">Net Profit</span>
                    <span className={simulationResult.netProfitUSD >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {simulationResult.netProfitUSD >= 0 ? '+' : ''}{formatCurrency(simulationResult.netProfitUSD)}
                    </span>
                  </div>
                </div>
              </div>

              {action === 'lp' && simulationResult.lpAPR !== null && (
                <div
                  className="rounded-2xl p-6 border-l-4"
                  style={{ backgroundColor: '#12121a', borderColor: '#1f1f2e', borderLeftColor: '#8b5cf6' }}
                >
                  <h3 className="text-lg font-semibold text-white mb-4">LP Earnings Estimate</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">APR</span>
                      <span className="text-purple-400 font-semibold">{simulationResult.lpAPR}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Daily Earnings</span>
                      <span className="text-white">
                        {simulationResult.dailyEarningsUSD ? formatCurrency(simulationResult.dailyEarningsUSD) : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Weekly Earnings</span>
                      <span className="text-white">
                        {simulationResult.weeklyEarningsUSD ? formatCurrency(simulationResult.weeklyEarningsUSD) : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

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
                      {simulationResult.stressTests.map((test, idx) => (
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

              <div
                className="rounded-2xl p-6 border"
                style={{
                  backgroundColor: '#12121a',
                  borderColor: '#1f1f2e',
                  background: 'linear-gradient(135deg, #12121a 0%, #1a1a2e 100%)',
                }}
              >
                <h3 className="text-lg font-semibold text-white mb-4">Risk Analysis</h3>

                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-400">Trust Score</span>
                    <span className="text-sm text-white">{simulationResult.trustScore}/100</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full ${getTrustColor(simulationResult.trustScore)}`}
                      style={{ width: `${simulationResult.trustScore}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-400">{simulationResult.trustTier}</p>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-400">Degen Score</span>
                    <span className="text-sm text-white">{simulationResult.degenScore}/100</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${simulationResult.degenScore}%`,
                        background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                      }}
                    />
                  </div>
                  <p className="text-sm" style={{ color: '#8b5cf6' }}>{simulationResult.degenLabel}</p>
                </div>

                {simulationResult.trustReasons.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-400 mb-2">Trust Analysis:</p>
                    <ul className="space-y-1">
                      {simulationResult.trustReasons.map((reason, idx) => (
                        <li key={idx} className="text-xs text-gray-500 flex items-start gap-2">
                          <span>•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {simulationResult.warnings.length > 0 && (
                  <div>
                    <p className="text-sm text-yellow-500 mb-2">Warnings:</p>
                    <div className="space-y-2">
                      {simulationResult.warnings.map((warning, idx) => (
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

              <div className="pt-2">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-white">Your Strategy Card</h3>
                  <span className="text-xl">📤</span>
                </div>
                <StrategyCard result={simulationResult} amountUSD={simulationResult.toAmountUSD} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
