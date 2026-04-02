'use client';

import { useState } from 'react';

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

interface SimulationCardProps {
  data: SimulationResult;
  onOpenModal: () => void;
}

const colors = {
  bg: '#000000',
  surface: '#0d0d0d',
  border: '#222222',
  text: '#ffffff',
  textMuted: '#888888',
  textDim: '#555555',
  accent: '#3b82f6',
  accentDim: '#1e3a5f',
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#eab308',
  purple: '#a855f7',
};

export default function SimulationCard({ data, onOpenModal }: SimulationCardProps) {
  const [activeTab, setActiveTab] = useState<'stress' | 'profit'>('stress');

  const getSlippageColor = (slippage: number) => {
    if (slippage < 0.5) return colors.green;
    if (slippage < 1) return colors.yellow;
    return colors.red;
  };

  const getTrustStyle = (tier: string) => {
    if (tier.includes('Fort')) {
      return { bg: '#0d1f0d', color: colors.green, border: '#1a3a1a' };
    }
    if (tier.includes('Carefully')) {
      return { bg: '#1f1a0d', color: colors.yellow, border: '#3a3a1a' };
    }
    return { bg: '#1f0d0d', color: colors.red, border: '#3a1a1a' };
  };

  const trustStyle = getTrustStyle(data.trustTier);

  return (
    <div style={{ 
      backgroundColor: colors.surface, 
      border: `1px solid ${colors.border}`, 
      borderRadius: '3px',
      overflow: 'hidden',
      width: '100%',
      marginTop: '8px'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '8px 10px', 
        borderBottom: `1px solid ${colors.border}` 
      }}>
        <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600 }}>
          {data.fromToken} → {data.toToken} · ${data.toAmountUSD.toFixed(0)}
        </span>
        <span style={{ 
          backgroundColor: trustStyle.bg,
          color: trustStyle.color,
          fontSize: '10px',
          border: `1px solid ${trustStyle.border}`,
          padding: '2px 8px',
          borderRadius: '2px',
          fontWeight: 700
        }}>
          {data.trustTier}
        </span>
      </div>

      {/* Stats Row */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '1px', 
        backgroundColor: colors.border 
      }}>
        <div style={{ backgroundColor: colors.surface, padding: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '9px', color: colors.textDim, fontWeight: 500, textTransform: 'uppercase' }}>You Get</div>
          <div style={{ fontSize: '13px', color: colors.accent, fontWeight: 700 }}>
            {data.toAmount.toFixed(4)} {data.toToken}
          </div>
        </div>
        <div style={{ backgroundColor: colors.surface, padding: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '9px', color: colors.textDim, fontWeight: 500, textTransform: 'uppercase' }}>Slippage</div>
          <div style={{ fontSize: '13px', color: getSlippageColor(data.slippagePercent), fontWeight: 700 }}>
            {data.slippagePercent.toFixed(2)}%
          </div>
        </div>
        <div style={{ backgroundColor: colors.surface, padding: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '9px', color: colors.textDim, fontWeight: 500, textTransform: 'uppercase' }}>Gas</div>
          <div style={{ fontSize: '13px', color: colors.textMuted, fontWeight: 700 }}>
            ${data.gasCostUSD.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Degen Bar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        padding: '6px 10px', 
        borderTop: `1px solid ${colors.border}`,
        borderBottom: `1px solid ${colors.border}`
      }}>
        <span style={{ fontSize: '9px', color: colors.textDim, fontWeight: 500, textTransform: 'uppercase' }}>Degen</span>
        <div style={{ flex: 1, height: '4px', backgroundColor: colors.border, borderRadius: '1px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${data.degenScore}%`, backgroundColor: colors.accent, borderRadius: '1px' }} />
        </div>
        <span style={{ fontSize: '10px', color: colors.purple, fontWeight: 600 }}>
          {data.degenLabel} · {data.degenScore}
        </span>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        borderBottom: `1px solid ${colors.border}` 
      }}>
        {(['stress', 'profit'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '5px 0',
              fontSize: '10px',
              backgroundColor: activeTab === tab ? colors.bg : 'transparent',
              color: activeTab === tab ? colors.accent : colors.textDim,
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 700 : 500,
              textTransform: 'uppercase'
            }}
          >
            {tab === 'stress' ? 'Stress' : 'Profit'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: '6px 10px' }}>
        {(activeTab === 'stress' ? data.stressTests : data.profitScenarios).map((item, i) => (
          <div 
            key={i} 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '2px 0', 
              fontSize: '11px',
              borderBottom: i < ((activeTab === 'stress' ? data.stressTests : data.profitScenarios).length - 1) ? `1px solid ${colors.border}` : 'none'
            }}
          >
            <span style={{ color: colors.textDim, fontWeight: 500 }}>{item.label}</span>
            <span style={{ color: colors.textMuted, fontWeight: 600 }}>${item.portfolioValueUSD.toFixed(2)}</span>
            <span style={{ color: activeTab === 'stress' ? colors.red : colors.green, fontWeight: 700 }}>
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
          padding: '6px',
          fontSize: '10px',
          color: colors.accent,
          backgroundColor: 'transparent',
          border: 'none',
          borderTop: `1px solid ${colors.border}`,
          cursor: 'pointer',
          fontWeight: 600,
          textTransform: 'uppercase'
        }}
      >
        Full Report →
      </button>
    </div>
  );
}
