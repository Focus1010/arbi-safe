'use client';

import { useState, useRef, useEffect } from 'react';

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
  stressTests: Array<{
    label: string;
    priceDropPercent: number;
    portfolioValueUSD: number;
    pnlUSD: number;
  }>;
  profitScenarios: Array<{
    label: string;
    priceGainPercent: number;
    portfolioValueUSD: number;
    pnlUSD: number;
  }>;
  trustScore: number;
  trustTier: string;
  trustReasons: string[];
  degenScore: number;
  degenLabel: string;
  warnings: string[];
  simulatedAt: string;
  toTokenMetadata: {
    symbol: string;
    name: string;
    liquidity: number;
    volume24h: number;
  } | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  simulationResult?: SimulationResult;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hey! I'm ArbiSafe 🛡️ — your onchain strategy simulator for Arbitrum. Tell me what you want to do and I'll run the real numbers before you risk a dollar.\n\nYou can drop a ticker, a contract address, or just describe your move.",
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<SimulationResult | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    setShowChips(false);
    
    const newMessages: Message[] = [...messages, { role: 'user', content: textToSend }];
    setMessages(newMessages);
    setIsThinking(true);

    try {
      // First call to agent
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        throw new Error('Failed to get agent response');
      }

      const data = await response.json();
      let finalMessages: Message[] = [...newMessages, { role: 'assistant', content: data.response }];

      // If simulation params, run simulation
      if (data.simulationParams) {
        const simResponse = await fetch('/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.simulationParams),
        });

        if (simResponse.ok) {
          const simResult: SimulationResult = await simResponse.json();
          
          // Second call to agent with results
          const interpResponse = await fetch('/api/agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              messages: finalMessages,
              simulationResult: simResult 
            }),
          });

          if (interpResponse.ok) {
            const interpData = await interpResponse.json();
            finalMessages = [...newMessages, { 
              role: 'assistant', 
              content: interpData.response,
              simulationResult: simResult 
            }];
          }
        }
      }

      setMessages(finalMessages);
    } catch (err) {
      console.error('Agent error:', err);
      setMessages([
        ...newMessages,
        { role: 'assistant', content: "Sorry, I hit a snag fetching that data. Try again in a moment �" },
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

  const openModal = (data: SimulationResult) => {
    setModalData(data);
    setModalOpen(true);
  };

  const getSlippageColor = (slippage: number) => {
    if (slippage < 0.5) return '#22c55e';
    if (slippage < 1) return '#eab308';
    return '#ef4444';
  };

  const getTrustBadgeColor = (tier: string) => {
    if (tier.includes('Fort')) return '#22c55e';
    if (tier.includes('Carefully')) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
      {/* TOP BAR */}
      <header className="flex items-center justify-between px-4 flex-shrink-0" style={{ 
        height: '48px', 
        backgroundColor: '#0d0d16',
        borderBottom: '0.5px solid #1e1e2e'
      }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1a3a6a' }}>
            <span className="text-sm">🛡️</span>
          </div>
          <span style={{ color: '#ffffff', fontSize: '15px', fontWeight: 500 }}>ArbiSafe</span>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ 
            border: '0.5px solid #3b82f6', 
            color: '#3b82f6',
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '4px'
          }}>Agent #162</span>
          <span style={{ color: '#6a6a8a', fontSize: '12px' }}>Arbitrum Sepolia</span>
          <span style={{ color: '#4a90e2', fontSize: '10px', marginLeft: '4px' }}>● Powered by Arbitrum</span>
        </div>
      </header>

      {/* CHAT AREA */}
      <div 
        className="flex-1 overflow-y-auto"
        style={{ padding: '20px 18px' }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-2.5 mb-4`}
          >
            {/* Avatar */}
            <div 
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ 
                backgroundColor: msg.role === 'user' ? '#0d1a2e' : '#0a1a3a',
                border: msg.role === 'user' ? '0.5px solid #1a2a4a' : '0.5px solid #1a3a6a'
              }}
            >
              <span className="text-xs">{msg.role === 'user' ? 'Y' : '🛡️'}</span>
            </div>

            {/* Bubble */}
            <div
              className="max-w-[75%]"
              style={{
                backgroundColor: msg.role === 'user' ? '#1a3a6a' : '#12121f',
                border: `0.5px solid ${msg.role === 'user' ? '#2a5aaa' : '#1e1e30'}`,
                color: msg.role === 'user' ? '#e0eaff' : '#c8c8d8',
                borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                padding: '10px 14px',
                fontSize: '13px',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap'
              }}
            >
              {msg.content}
              
              {/* Simulation Result Card */}
              {msg.simulationResult && (
                <SimulationCard 
                  data={msg.simulationResult} 
                  onOpenModal={() => openModal(msg.simulationResult!)} 
                />
              )}
            </div>
          </div>
        ))}

        {/* Suggestion Chips with fade transition */}
        <div 
          className="flex flex-col gap-2 pl-9 mt-2"
          style={{
            opacity: showChips && messages.length === 1 ? 1 : 0,
            transform: showChips && messages.length === 1 ? 'translateY(0)' : 'translateY(-10px)',
            transition: 'opacity 300ms ease-out, transform 300ms ease-out',
            pointerEvents: showChips && messages.length === 1 ? 'auto' : 'none'
          }}
        >
          {[
            'Swap $200 USDC → ARB on Camelot',
            'LP $500 USDC/WETH on Camelot',
            'Is it safe to put $5000 into GMX?'
          ].map((chip, i) => (
            <button
              key={i}
              onClick={() => handleSend(chip)}
              style={{
                backgroundColor: '#0e0e1e',
                border: '0.5px solid #2a2a4a',
                color: '#8a8ab0',
                fontSize: '11px',
                padding: '5px 12px',
                borderRadius: '20px',
                alignSelf: 'flex-start',
                cursor: 'pointer'
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Typing Indicator */}
        {isThinking && (
          <div className="flex flex-row gap-2.5 mb-4">
            <div 
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#0a1a3a', border: '0.5px solid #1a3a6a' }}
            >
              <span className="text-xs">🛡️</span>
            </div>
            <div
              style={{
                backgroundColor: '#12121f',
                border: '0.5px solid #1e1e30',
                color: '#c8c8d8',
                borderRadius: '4px 14px 14px 14px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* DISCLAIMER BAR */}
      <div 
        className="flex-shrink-0"
        style={{ 
          fontSize: '10px', 
          color: '#3a3a5a',
          textAlign: 'center',
          padding: '5px',
          borderTop: '0.5px solid #141424',
          backgroundColor: '#0a0a0f'
        }}
      >
        ⚠ Simulations are for informational purposes only. Not financial advice. DeFi carries significant risk of loss.
      </div>

      {/* INPUT BAR */}
      <div 
        className="flex items-center gap-2 flex-shrink-0"
        style={{ 
          height: '56px',
          backgroundColor: '#0d0d16', 
          borderTop: '0.5px solid #1a1a2a',
          padding: '10px 14px'
        }}
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask ArbiSafe about your strategy..."
          className="flex-1"
          style={{
            backgroundColor: '#12121f',
            border: '0.5px solid #2a2a4a',
            color: '#c8c8d8',
            borderRadius: '20px',
            padding: '8px 16px',
            fontSize: '13px',
            outline: 'none'
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputValue.trim() || isThinking}
          style={{
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            borderRadius: '20px',
            padding: '8px 18px',
            fontSize: '13px',
            cursor: inputValue.trim() && !isThinking ? 'pointer' : 'not-allowed',
            opacity: inputValue.trim() && !isThinking ? 1 : 0.5,
            border: 'none'
          }}
        >
          Send
        </button>
      </div>

      {/* FULL REPORT MODAL */}
      {modalOpen && modalData && (
        <FullReportModal 
          data={modalData} 
          onClose={() => setModalOpen(false)} 
        />
      )}
    </div>
  );
}

// SIMULATION CARD COMPONENT
function SimulationCard({ data, onOpenModal }: { data: SimulationResult; onOpenModal: () => void }) {
  const [activeTab, setActiveTab] = useState<'stress' | 'profit'>('stress');

  const getSlippageColor = (slippage: number) => {
    if (slippage < 0.5) return '#22c55e';
    if (slippage < 1) return '#eab308';
    return '#ef4444';
  };

  const getTrustBadgeColor = (tier: string) => {
    if (tier.includes('Fort')) return '#22c55e';
    if (tier.includes('Carefully')) return '#eab308';
    return '#ef4444';
  };

  return (
    <div style={{ 
      backgroundColor: '#0e0e1e', 
      border: '0.5px solid #2a2a4a', 
      borderRadius: '12px',
      maxWidth: '340px',
      marginTop: '12px'
    }}>
      {/* Card Header */}
      <div className="flex items-center justify-between" style={{ padding: '10px 14px', borderBottom: '0.5px solid #1a1a2a' }}>
        <span style={{ color: '#ffffff', fontSize: '12px' }}>
          {data.fromToken} → {data.toToken} · ${data.toAmountUSD.toFixed(0)}
        </span>
        <span style={{ 
          color: getTrustBadgeColor(data.trustTier),
          fontSize: '10px',
          border: `0.5px solid ${getTrustBadgeColor(data.trustTier)}`,
          padding: '2px 6px',
          borderRadius: '4px'
        }}>
          {data.trustTier}
        </span>
      </div>

      {/* 3-Column Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', backgroundColor: '#1a1a2a' }}>
        <div style={{ backgroundColor: '#0e0e1e', padding: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '9px', color: '#6a6a8a', textTransform: 'uppercase' }}>You Get</div>
          <div style={{ fontSize: '14px', color: '#3b82f6', fontWeight: 600 }}>
            {data.toAmount.toFixed(4)} {data.toToken}
          </div>
        </div>
        <div style={{ backgroundColor: '#0e0e1e', padding: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '9px', color: '#6a6a8a', textTransform: 'uppercase' }}>Slippage</div>
          <div style={{ fontSize: '14px', color: getSlippageColor(data.slippagePercent), fontWeight: 600 }}>
            {data.slippagePercent.toFixed(2)}%
          </div>
        </div>
        <div style={{ backgroundColor: '#0e0e1e', padding: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '9px', color: '#6a6a8a', textTransform: 'uppercase' }}>Gas</div>
          <div style={{ fontSize: '14px', color: '#c8c8d8', fontWeight: 600 }}>
            ${data.gasCostUSD.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Degen Bar */}
      <div className="flex items-center gap-2" style={{ padding: '8px 14px', borderTop: '0.5px solid #1a1a2a' }}>
        <span style={{ fontSize: '10px', color: '#6a6a8a', textTransform: 'uppercase' }}>Degen</span>
        <div className="flex-1" style={{ height: '4px', backgroundColor: '#1a1a2a', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${data.degenScore}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '2px' }} />
        </div>
        <span style={{ fontSize: '10px', color: '#8b5cf6' }}>
          {data.degenScore} · {data.degenLabel}
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderTop: '0.5px solid #1a1a2a', borderBottom: '0.5px solid #1a1a2a' }}>
        {(['stress', 'profit'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '10px',
              backgroundColor: activeTab === tab ? '#1a1a2a' : 'transparent',
              color: activeTab === tab ? '#ffffff' : '#6a6a8a',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {tab === 'stress' ? 'Stress Test' : 'Profit Scenarios'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: '8px 0' }}>
        {(activeTab === 'stress' ? data.stressTests : data.profitScenarios).map((item, i) => (
          <div key={i} className="flex items-center justify-between" style={{ padding: '4px 14px', fontSize: '11px' }}>
            <span style={{ color: '#6a6a8a' }}>{item.label}</span>
            <span style={{ color: '#c8c8d8' }}>${item.portfolioValueUSD.toFixed(2)}</span>
            <span style={{ color: activeTab === 'stress' ? '#ef4444' : '#22c55e' }}>
              {item.pnlUSD >= 0 ? '+' : ''}${item.pnlUSD.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* View Full Report */}
      <button
        onClick={onOpenModal}
        style={{
          width: '100%',
          padding: '8px',
          fontSize: '11px',
          color: '#3b82f6',
          backgroundColor: 'transparent',
          border: 'none',
          borderTop: '0.5px solid #1a1a2a',
          cursor: 'pointer'
        }}
      >
        View Full Report →
      </button>
    </div>
  );
}

// FULL REPORT MODAL COMPONENT
function FullReportModal({ data, onClose }: { data: SimulationResult; onClose: () => void }) {
  const getTrustColor = (score: number) => {
    if (score >= 75) return '#22c55e';
    if (score >= 45) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div className="relative" style={{ backgroundColor: '#0d0d16', border: '0.5px solid #2a2a4a', borderRadius: '16px', maxWidth: '560px', width: '90%', maxHeight: '85vh', overflowY: 'auto', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#6a6a8a', fontSize: '20px', cursor: 'pointer' }}>×</button>
        <h2 style={{ color: '#ffffff', fontSize: '18px', marginBottom: '16px' }}>Full Simulation Report</h2>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#6a6a8a', fontSize: '12px', marginBottom: '8px' }}>Swap Summary</h3>
          <div style={{ backgroundColor: '#0e0e1e', borderRadius: '8px', padding: '12px' }}>
            <div className="grid grid-cols-2 gap-3" style={{ fontSize: '13px' }}>
              <div><span style={{ color: '#6a6a8a' }}>From:</span> <span style={{ color: '#fff' }}>{data.fromAmount.toFixed(4)} {data.fromToken}</span></div>
              <div><span style={{ color: '#6a6a8a' }}>To:</span> <span style={{ color: '#fff' }}>{data.toAmount.toFixed(4)} {data.toToken}</span></div>
              <div><span style={{ color: '#6a6a8a' }}>Output Value:</span> <span style={{ color: '#fff' }}>${data.toAmountUSD.toFixed(2)}</span></div>
              <div><span style={{ color: '#6a6a8a' }}>Gas Cost:</span> <span style={{ color: '#fff' }}>${data.gasCostUSD.toFixed(2)}</span></div>
              <div><span style={{ color: '#6a6a8a' }}>Slippage:</span> <span style={{ color: '#fff' }}>{data.slippagePercent.toFixed(2)}%</span></div>
              <div><span style={{ color: '#6a6a8a' }}>Net Profit:</span> <span style={{ color: data.netProfitUSD >= 0 ? '#22c55e' : '#ef4444' }}>${data.netProfitUSD.toFixed(2)}</span></div>
            </div>
          </div>
        </div>
        {data.lpAPR !== null && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#6a6a8a', fontSize: '12px', marginBottom: '8px' }}>LP Earnings</h3>
            <div style={{ backgroundColor: '#0e0e1e', borderRadius: '8px', padding: '12px' }}>
              <div className="grid grid-cols-3 gap-3" style={{ fontSize: '13px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#6a6a8a', fontSize: '10px' }}>APR</div>
                  <div style={{ color: '#8b5cf6', fontSize: '16px', fontWeight: 600 }}>{data.lpAPR}%</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#6a6a8a', fontSize: '10px' }}>Daily</div>
                  <div style={{ color: '#fff' }}>${data.dailyEarningsUSD?.toFixed(2) || '0'}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#6a6a8a', fontSize: '10px' }}>Weekly</div>
                  <div style={{ color: '#fff' }}>${data.weeklyEarningsUSD?.toFixed(2) || '0'}</div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div style={{ marginBottom: '20px' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 style={{ color: '#6a6a8a', fontSize: '12px', marginBottom: '8px' }}>Stress Tests</h3>
              <div style={{ backgroundColor: '#0e0e1e', borderRadius: '8px', padding: '8px' }}>
                {data.stressTests.map((test, i) => (
                  <div key={i} className="flex justify-between" style={{ padding: '4px 0', fontSize: '12px' }}>
                    <span style={{ color: '#6a6a8a' }}>{test.label}</span>
                    <span style={{ color: '#ef4444' }}>${test.pnlUSD.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 style={{ color: '#6a6a8a', fontSize: '12px', marginBottom: '8px' }}>Profit Scenarios</h3>
              <div style={{ backgroundColor: '#0e0e1e', borderRadius: '8px', padding: '8px' }}>
                {data.profitScenarios.map((scenario, i) => (
                  <div key={i} className="flex justify-between" style={{ padding: '4px 0', fontSize: '12px' }}>
                    <span style={{ color: '#6a6a8a' }}>{scenario.label}</span>
                    <span style={{ color: '#22c55e' }}>+${scenario.pnlUSD.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#6a6a8a', fontSize: '12px', marginBottom: '8px' }}>Trust Score</h3>
          <div style={{ backgroundColor: '#0e0e1e', borderRadius: '8px', padding: '12px' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: '8px' }}>
              <div style={{ height: '8px', flex: 1, backgroundColor: '#1a1a2a', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${data.trustScore}%`, backgroundColor: getTrustColor(data.trustScore), borderRadius: '4px' }} />
              </div>
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{data.trustScore}/100</span>
            </div>
            <div style={{ color: '#c8c8d8', fontSize: '12px' }}>{data.trustTier}</div>
            {data.trustReasons.length > 0 && (
              <ul style={{ marginTop: '8px', paddingLeft: '16px' }}>
                {data.trustReasons.map((reason, i) => (
                  <li key={i} style={{ color: '#6a6a8a', fontSize: '11px' }}>• {reason}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#6a6a8a', fontSize: '12px', marginBottom: '8px' }}>Degen Score</h3>
          <div style={{ backgroundColor: '#0e0e1e', borderRadius: '8px', padding: '12px' }}>
            <div className="flex items-center gap-3">
              <div style={{ height: '8px', flex: 1, backgroundColor: '#1a1a2a', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${data.degenScore}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '4px' }} />
              </div>
              <span style={{ color: '#8b5cf6', fontSize: '13px' }}>{data.degenScore} · {data.degenLabel}</span>
            </div>
          </div>
        </div>
        {data.warnings.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#6a6a8a', fontSize: '12px', marginBottom: '8px' }}>Warnings</h3>
            <div style={{ backgroundColor: '#0e0e1e', borderRadius: '8px', padding: '12px' }}>
              {data.warnings.map((warning, i) => (
                <div key={i} style={{ padding: '6px 0', fontSize: '12px', color: warning.includes('🚨') ? '#ef4444' : warning.includes('⚠️') ? '#eab308' : '#c8c8d8', borderBottom: i < data.warnings.length - 1 ? '0.5px solid #1a1a2a' : 'none' }}>
                  {warning}
                </div>
              ))}
            </div>
          </div>
        )}
        {data.toTokenMetadata && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#6a6a8a', fontSize: '12px', marginBottom: '8px' }}>Token Info</h3>
            <div style={{ backgroundColor: '#0e0e1e', borderRadius: '8px', padding: '12px', fontSize: '12px' }}>
              <div style={{ color: '#fff', marginBottom: '4px' }}>{data.toTokenMetadata.name} ({data.toTokenMetadata.symbol})</div>
              <div style={{ color: '#6a6a8a' }}>Liquidity: ${data.toTokenMetadata.liquidity.toLocaleString()}</div>
              <div style={{ color: '#6a6a8a' }}>24h Volume: ${data.toTokenMetadata.volume24h.toLocaleString()}</div>
            </div>
          </div>
        )}
        <div style={{ fontSize: '10px', color: '#4a4a6a', textAlign: 'center', borderTop: '0.5px solid #1a1a2a', paddingTop: '16px' }}>
          This simulation uses real market data but cannot predict future prices. Always do your own research and never invest more than you can afford to lose.
          <br /><br />
          ArbiSafe is registered on the ERC-8004 Identity Registry as Agent #162 on Arbitrum Sepolia. Registration TX: 0x0422d6b48190e6b2d1a562662784ff48f37d9acd1fd81145a686c5e08600c99a
        </div>
      </div>
    </div>
  );
}
