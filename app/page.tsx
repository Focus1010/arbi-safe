'use client';

import { useState, useRef, useEffect } from 'react';
import { parseCommand, COMMANDS_HELP } from '@/lib/commandParser';
import CommandResults from '@/components/CommandResults';
import SimulationCard from '@/components/SimulationCard';
import { Analytics } from "@vercel/analytics/next"

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

const colors = {
  bg: '#000000',
  surface: '#0d0d0d',
  surfaceHover: '#111111',
  border: '#222222',
  borderActive: '#333333',
  text: '#ffffff',
  textMuted: '#888888',
  textDim: '#555555',
  accent: '#3b82f6',
  accentDim: '#1e3a5f',
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#eab308',
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "ArbiSafe Terminal v1.0 — Arbitrum Strategy Simulator\n\nType a command or ask about your strategy. Use /help for available commands.",
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [showCommandAutocomplete, setShowCommandAutocomplete] = useState(false);
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
    setShowCommandAutocomplete(false);
    
    const newMessages: Message[] = [...messages, { role: 'user', content: textToSend }];
    setMessages(newMessages);
    setIsThinking(true);

    const command = parseCommand(textToSend);

    if (command.command === 'clear') {
      setMessages([{
        role: 'assistant',
        content: "ArbiSafe Terminal v1.0 — Arbitrum Strategy Simulator\n\nType a command or ask about your strategy. Use /help for available commands.",
      }]);
      setIsThinking(false);
      setShowChips(true);
      return;
    }

    if (command.command === 'unknown') {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: "Unknown command. Type /help for available commands." },
      ]);
      setIsThinking(false);
      return;
    }

    if (command.command !== null) {
      try {
        const response = await fetch('/api/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            command: command.command, 
            params: command 
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Command API error:', response.status, errorText);
          throw new Error(`Command failed: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        
        const commandMessage: Message = {
          role: 'assistant',
          content: `COMMAND_RESULT:${JSON.stringify({ type: data.type, data: data.data })}`,
        };
        
        setMessages([...newMessages, commandMessage]);
      } catch (err) {
        console.error('Command error:', err);
        setMessages([
          ...newMessages,
          { role: 'assistant', content: "Error: Command execution failed." },
        ]);
      } finally {
        setIsThinking(false);
      }
      return;
    }

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
      let finalMessages: Message[] = [...newMessages, { role: 'assistant', content: data.response }];

      if (data.simulationParams) {
        const simResponse = await fetch('/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.simulationParams),
        });

        if (simResponse.ok) {
          const simResult: SimulationResult = await simResponse.json();
          
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
        { role: 'assistant', content: "Error: Request failed." },
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

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: colors.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* HEADER */}
      <header 
        className="flex items-center justify-between flex-shrink-0"
        style={{ 
          height: '36px', 
          backgroundColor: colors.surface,
          borderBottom: `1px solid ${colors.border}`,
          padding: '0 16px'
        }}
      >
        <div className="flex items-center gap-2">
          <img src="/logo.png" width={18} height={18} style={{ borderRadius: '3px' }} alt="" />
          <span style={{ color: colors.text, fontSize: '13px', fontWeight: 700, letterSpacing: '-0.3px' }}>
            ArbiSafe
          </span>
          <span style={{ color: colors.textDim, fontSize: '11px', fontWeight: 500 }}>
            Agent #162
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: colors.textDim, fontSize: '11px', fontWeight: 500 }}>
            Arbitrum Sepolia
          </span>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: colors.green }} />
        </div>
      </header>

      {/* MAIN CONTENT - CENTERED */}
      <div className="flex-1 flex justify-center overflow-hidden">
        <div className="flex flex-col w-full" style={{ maxWidth: '800px' }}>
          
          {/* CHAT AREA */}
          <div 
            className="flex-1 overflow-y-auto"
            style={{ padding: '12px 16px' }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                style={{ gap: '6px', marginBottom: '8px' }}
              >
                {/* Avatar */}
                <div 
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ 
                    width: '20px',
                    height: '20px',
                    borderRadius: '3px',
                    backgroundColor: msg.role === 'user' ? colors.surface : colors.surfaceHover,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  {msg.role === 'user' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#3b82f6">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      <rect x="9" y="9" width="6" height="6" rx="1" fill="#0d0d0d"/>
                      <circle cx="11" cy="12" r="1" fill="#3b82f6"/>
                      <circle cx="13" cy="12" r="1" fill="#3b82f6"/>
                    </svg>
                  )}
                </div>

                {/* Message */}
                <div
                  className="flex flex-col"
                  style={{
                    maxWidth: 'calc(100% - 30px)',
                    backgroundColor: msg.role === 'user' ? 'transparent' : colors.surface,
                    border: msg.role === 'user' ? 'none' : `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    padding: msg.role === 'user' ? '4px 0' : '8px 10px',
                  }}
                >
                  {msg.content.startsWith('COMMAND_RESULT:') ? (
                    (() => {
                      try {
                        const resultStr = msg.content.slice('COMMAND_RESULT:'.length);
                        const result = JSON.parse(resultStr);
                        return <CommandResults type={result.type} data={result.data} />;
                      } catch {
                        return <span style={{ color: colors.text, fontSize: '13px', fontWeight: 500, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{msg.content}</span>;
                      }
                    })()
                  ) : (
                    <span style={{ 
                      color: msg.role === 'user' ? colors.text : colors.textMuted, 
                      fontSize: '13px', 
                      fontWeight: msg.role === 'user' ? 600 : 500,
                      lineHeight: 1.4,
                      whiteSpace: 'pre-wrap'
                    }}>
                      {msg.content}
                    </span>
                  )}
                  
                  {msg.simulationResult && (
                    <SimulationCard 
                      data={msg.simulationResult} 
                      onOpenModal={() => openModal(msg.simulationResult!)} 
                    />
                  )}
                </div>
              </div>
            ))}

            {/* Suggestion Chips */}
            <div 
              className="flex flex-wrap"
              style={{
                gap: '6px',
                marginTop: '8px',
                marginLeft: '26px',
                opacity: showChips && messages.length === 1 ? 1 : 0,
                transform: showChips && messages.length === 1 ? 'translateY(0)' : 'translateY(-8px)',
                transition: 'opacity 150ms ease-out, transform 150ms ease-out',
                pointerEvents: showChips && messages.length === 1 ? 'auto' : 'none'
              }}
            >
              {['Swap $200 USDC → ARB', 'LP $500 USDC/WETH', '/price ARB'].map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(chip)}
                  style={{
                    backgroundColor: 'transparent',
                    border: `1px solid ${colors.border}`,
                    color: colors.textDim,
                    fontSize: '11px',
                    fontWeight: 500,
                    padding: '3px 8px',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = colors.borderActive;
                    e.currentTarget.style.color = colors.textMuted;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.color = colors.textDim;
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Typing Indicator */}
            {isThinking && (
              <div className="flex flex-row" style={{ gap: '6px', marginTop: '8px' }}>
                <div 
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ 
                    width: '20px',
                    height: '20px',
                    borderRadius: '3px',
                    backgroundColor: colors.surfaceHover,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#3b82f6">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    <rect x="9" y="9" width="6" height="6" rx="1" fill="#0d0d0d"/>
                    <circle cx="11" cy="12" r="1" fill="#3b82f6"/>
                    <circle cx="13" cy="12" r="1" fill="#3b82f6"/>
                  </svg>
                </div>
                <div
                  style={{
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <span className="animate-pulse" style={{ width: '4px', height: '4px', borderRadius: '1px', backgroundColor: colors.textDim }} />
                  <span className="animate-pulse" style={{ width: '4px', height: '4px', borderRadius: '1px', backgroundColor: colors.textDim, animationDelay: '0.15s' }} />
                  <span className="animate-pulse" style={{ width: '4px', height: '4px', borderRadius: '1px', backgroundColor: colors.textDim, animationDelay: '0.3s' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* DISCLAIMER */}
          <div 
            style={{ 
              fontSize: '10px', 
              color: colors.textDim,
              textAlign: 'center',
              padding: '4px 16px',
              fontWeight: 500
            }}
          >
            Not financial advice. DeFi carries risk of loss.
          </div>

          {/* INPUT AREA */}
          <div className="relative flex-shrink-0" style={{ padding: '8px 16px 12px' }}>
            {/* Command Autocomplete */}
            {showCommandAutocomplete && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '52px',
                  left: '16px',
                  right: '16px',
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  zIndex: 10,
                }}
              >
                {COMMANDS_HELP.map((cmd, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputValue(cmd.command.split(' ')[0] + ' ');
                      setShowCommandAutocomplete(false);
                    }}
                    style={{
                      display: 'flex',
                      gap: '10px',
                      width: '100%',
                      padding: '6px 10px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderBottom: i < COMMANDS_HELP.length - 1 ? `1px solid ${colors.border}` : 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.surfaceHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', color: colors.accent, fontWeight: 600 }}>
                      {cmd.command}
                    </span>
                    <span style={{ fontSize: '12px', color: colors.textDim }}>
                      {cmd.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
            
            {/* Input Bar */}
            <div 
              className="flex items-center gap-2"
              style={{ 
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                padding: '6px 8px'
              }}
            >
              <span style={{ color: colors.accent, fontSize: '14px', fontWeight: 700, fontFamily: 'monospace' }}>
                &gt;
              </span>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  const value = e.target.value;
                  setInputValue(value);
                  if (value === '/') {
                    setShowCommandAutocomplete(true);
                  } else if (!value.startsWith('/')) {
                    setShowCommandAutocomplete(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowCommandAutocomplete(false);
                  }
                  handleKeyPress(e);
                }}
                placeholder="Type command or ask..."
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: colors.text,
                  fontSize: '14px',
                  fontWeight: 500,
                  outline: 'none'
                }}
                autoFocus
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isThinking}
                style={{
                  backgroundColor: 'transparent',
                  color: inputValue.trim() && !isThinking ? colors.accent : colors.textDim,
                  border: `1px solid ${inputValue.trim() && !isThinking ? colors.accentDim : colors.border}`,
                  borderRadius: '3px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: inputValue.trim() && !isThinking ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                SEND
              </button>
            </div>
          </div>
        </div>
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

// FULL REPORT MODAL
function FullReportModal({ data, onClose }: { data: SimulationResult; onClose: () => void }) {
  const getTrustColor = (tier: string) => {
    if (tier.includes('Fort')) return colors.green;
    if (tier.includes('Carefully')) return colors.yellow;
    return colors.red;
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50" 
      style={{ backgroundColor: 'rgba(0,0,0,0.9)' }} 
      onClick={onClose}
    >
      <div 
        style={{ 
          backgroundColor: colors.surface, 
          border: `1px solid ${colors.border}`, 
          borderRadius: '4px', 
          maxWidth: '700px', 
          width: 'calc(100% - 32px)', 
          maxHeight: '90vh', 
          overflowY: 'auto',
          position: 'relative'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', 
            top: '8px', 
            right: '8px', 
            width: '24px',
            height: '24px',
            borderRadius: '3px',
            backgroundColor: 'transparent', 
            border: `1px solid ${colors.border}`, 
            color: colors.textDim, 
            fontSize: '14px', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>

        <div style={{ padding: '16px' }}>
          <h2 style={{ color: colors.text, fontSize: '14px', fontWeight: 700, marginBottom: '16px', letterSpacing: '-0.3px' }}>
            Strategy Report
          </h2>

          {/* Swap Summary */}
          <div style={{ marginBottom: '12px' }}>
            <h3 style={{ color: colors.textDim, fontSize: '10px', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
              Swap Summary
            </h3>
            <div style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '3px', padding: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '12px' }}>
                <div>
                  <div style={{ color: colors.textDim, fontSize: '10px', fontWeight: 500 }}>FROM</div>
                  <div style={{ color: colors.text, fontWeight: 600 }}>{data.fromAmount.toFixed(4)} {data.fromToken}</div>
                </div>
                <div>
                  <div style={{ color: colors.textDim, fontSize: '10px', fontWeight: 500 }}>TO</div>
                  <div style={{ color: colors.text, fontWeight: 600 }}>{data.toAmount.toFixed(4)} {data.toToken}</div>
                </div>
                <div>
                  <div style={{ color: colors.textDim, fontSize: '10px', fontWeight: 500 }}>VALUE</div>
                  <div style={{ color: colors.text, fontWeight: 600 }}>${data.toAmountUSD.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ color: colors.textDim, fontSize: '10px', fontWeight: 500 }}>GAS</div>
                  <div style={{ color: colors.text, fontWeight: 600 }}>${data.gasCostUSD.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* LP Earnings */}
          {data.lpAPR !== null && (
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{ color: colors.textDim, fontSize: '10px', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                LP Earnings
              </h3>
              <div style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '3px', padding: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px' }}>
                  <div>
                    <div style={{ color: colors.textDim, fontSize: '10px', fontWeight: 500 }}>APR</div>
                    <div style={{ color: colors.green, fontWeight: 700 }}>{data.lpAPR}%</div>
                  </div>
                  <div>
                    <div style={{ color: colors.textDim, fontSize: '10px', fontWeight: 500 }}>DAILY</div>
                    <div style={{ color: colors.text, fontWeight: 600 }}>${data.dailyEarningsUSD?.toFixed(2) || '0'}</div>
                  </div>
                  <div>
                    <div style={{ color: colors.textDim, fontSize: '10px', fontWeight: 500 }}>WEEKLY</div>
                    <div style={{ color: colors.text, fontWeight: 600 }}>${data.weeklyEarningsUSD?.toFixed(2) || '0'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scenarios */}
          <div style={{ marginBottom: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <h3 style={{ color: colors.textDim, fontSize: '10px', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                Stress Tests
              </h3>
              <div style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '3px', padding: '8px' }}>
                {data.stressTests.map((test, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      padding: '3px 0', 
                      fontSize: '11px',
                      borderBottom: i < data.stressTests.length - 1 ? `1px solid ${colors.border}` : 'none'
                    }}
                  >
                    <span style={{ color: colors.textDim, fontWeight: 500 }}>{test.label}</span>
                    <span style={{ color: colors.red, fontWeight: 600 }}>${test.pnlUSD.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 style={{ color: colors.textDim, fontSize: '10px', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                Profit Scenarios
              </h3>
              <div style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '3px', padding: '8px' }}>
                {data.profitScenarios.map((scenario, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      padding: '3px 0', 
                      fontSize: '11px',
                      borderBottom: i < data.profitScenarios.length - 1 ? `1px solid ${colors.border}` : 'none'
                    }}
                  >
                    <span style={{ color: colors.textDim, fontWeight: 500 }}>{scenario.label}</span>
                    <span style={{ color: colors.green, fontWeight: 600 }}>+${scenario.pnlUSD.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trust Score */}
          <div style={{ marginBottom: '12px' }}>
            <h3 style={{ color: colors.textDim, fontSize: '10px', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
              Trust Score
            </h3>
            <div style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '3px', padding: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{ height: '6px', flex: 1, backgroundColor: colors.surface, borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${data.trustScore}%`, backgroundColor: getTrustColor(data.trustTier), borderRadius: '2px' }} />
                </div>
                <span style={{ color: colors.text, fontSize: '13px', fontWeight: 700 }}>{data.trustScore}</span>
              </div>
              <div style={{ color: getTrustColor(data.trustTier), fontSize: '12px', fontWeight: 600 }}>{data.trustTier}</div>
            </div>
          </div>

          {/* Degen Score */}
          <div style={{ marginBottom: '12px' }}>
            <h3 style={{ color: colors.textDim, fontSize: '10px', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
              Degen Score
            </h3>
            <div style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '3px', padding: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ height: '6px', flex: 1, backgroundColor: colors.surface, borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${data.degenScore}%`, backgroundColor: colors.accent, borderRadius: '2px' }} />
                </div>
                <span style={{ color: colors.accent, fontSize: '12px', fontWeight: 600 }}>{data.degenScore} · {data.degenLabel}</span>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {data.warnings.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{ color: colors.textDim, fontSize: '10px', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                Warnings
              </h3>
              <div style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '3px', padding: '8px' }}>
                {data.warnings.map((warning, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      padding: '3px 0', 
                      fontSize: '11px', 
                      color: warning.includes('🚨') ? colors.red : warning.includes('⚠️') ? colors.yellow : colors.textMuted,
                      fontWeight: warning.includes('🚨') || warning.includes('⚠️') ? 600 : 500,
                      borderBottom: i < data.warnings.length - 1 ? `1px solid ${colors.border}` : 'none'
                    }}
                  >
                    {warning}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ fontSize: '10px', color: colors.textDim, textAlign: 'center', fontWeight: 500, marginTop: '16px' }}>
            ArbiSafe Agent #162 — ERC-8004 Registered
          </div>
        </div>
      </div>
    </div>
  );
}
