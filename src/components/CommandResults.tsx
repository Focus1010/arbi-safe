'use client';

import { useEffect, useState } from 'react';
import SimulationCard from './SimulationCard';

interface CommandResultsProps {
  type: string;
  data: any;
}

const colors = {
  bg: '#000000',
  surface: '#0d0d0d',
  border: '#222222',
  text: '#ffffff',
  textMuted: '#888888',
  textDim: '#555555',
  accent: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#eab308',
  purple: '#a855f7',
};

export default function CommandResults({ type, data }: CommandResultsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cardStyle = {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '3px',
    width: '100%',
    marginTop: '8px',
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(2px)',
    transition: 'opacity 100ms ease-out',
    overflow: 'hidden',
  };

  switch (type) {
    case 'help':
      return <HelpCard data={data} style={cardStyle} />;
    case 'price':
      return <PriceCard data={data} style={cardStyle} />;
    case 'compare':
      return <CompareCard data={data} style={cardStyle} />;
    case 'gas':
      return <GasCard data={data} style={cardStyle} />;
    case 'market':
      return <MarketCard data={data} style={cardStyle} />;
    case 'safe':
      return <SafeCard data={data} style={cardStyle} />;
    case 'pool':
      return <PoolCard data={data} style={cardStyle} />;
    case 'simulation':
      return <SimulationCard data={data} onOpenModal={() => {}} />;
    default:
      return (
        <div style={{ ...cardStyle, padding: '10px', color: colors.red, fontSize: '12px', fontWeight: 600 }}>
          Unknown: {type}
        </div>
      );
  }
}

// HELP CARD
function HelpCard({ data, style }: { data: Array<{ command: string; description: string }>; style: any }) {
  return (
    <div style={{ ...style, padding: '10px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: colors.text, marginBottom: '8px', textTransform: 'uppercase' }}>
        Commands
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
        {data.map((cmd, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: colors.accent, fontWeight: 600 }}>
              {cmd.command}
            </span>
            <span style={{ fontSize: '11px', color: colors.textDim }}>{cmd.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// PRICE CARD
function PriceCard({ data, style }: { data: any; style: any }) {
  const priceChange = data.change24h || 0;
  const isPositive = priceChange >= 0;

  return (
    <div style={{ ...style, padding: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '16px', fontWeight: 700, color: colors.text }}>{data.symbol}</span>
        <span style={{ fontSize: '11px', color: colors.textDim }}>{data.name}</span>
      </div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: colors.text, marginBottom: '8px' }}>
        ${data.priceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '9px', color: colors.textDim, fontWeight: 500, textTransform: 'uppercase' }}>24h</div>
          <div style={{ fontSize: '12px', color: isPositive ? colors.green : colors.red, fontWeight: 700 }}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: '9px', color: colors.textDim, fontWeight: 500, textTransform: 'uppercase' }}>Vol</div>
          <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600 }}>${(data.volume24h / 1e6).toFixed(2)}M</div>
        </div>
        <div>
          <div style={{ fontSize: '9px', color: colors.textDim, fontWeight: 500, textTransform: 'uppercase' }}>Liq</div>
          <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600 }}>${(data.liquidity / 1e6).toFixed(2)}M</div>
        </div>
      </div>
      <a
        href={data.dexscreenerUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: '11px',
          color: colors.accent,
          textDecoration: 'none',
          fontWeight: 600
        }}
      >
        View on DexScreener →
      </a>
    </div>
  );
}

// COMPARE CARD
function CompareCard({ data, style }: { data: any; style: any }) {
  const { tokenA, tokenB, betterLiquidity } = data;

  const TokenColumn = ({ token, isWinner, side }: { token: any; isWinner: boolean; side: 'left' | 'right' }) => {
    const isPositive = (token.change24h || 0) >= 0;
    
    return (
      <div style={{ flex: 1, textAlign: side === 'left' ? 'left' : 'right' }}>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: 700, 
          color: isWinner ? '#3b82f6' : colors.text,
          marginBottom: '2px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          justifyContent: side === 'left' ? 'flex-start' : 'flex-end'
        }}>
          {token.symbol}
          {isWinner && <span style={{ fontSize: '12px' }}>👑</span>}
        </div>
        <div style={{ fontSize: '14px', color: colors.text, fontWeight: 700, marginBottom: '4px' }}>
          ${token.priceUSD.toLocaleString(undefined, { maximumFractionDigits: 6 })}
        </div>
        <div style={{ 
          fontSize: '11px', 
          color: isPositive ? colors.green : colors.red,
          fontWeight: 600,
          marginBottom: '6px'
        }}>
          {isPositive ? '+' : ''}{(token.change24h || 0).toFixed(2)}% (24h)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ fontSize: '10px', color: colors.textDim, fontWeight: 500 }}>
            Vol: ${((token.volume24h || 0) / 1e6).toFixed(2)}M
          </div>
          <div style={{ fontSize: '10px', color: isWinner ? '#3b82f6' : colors.textDim, fontWeight: isWinner ? 600 : 500 }}>
            Liq: ${((token.liquidity || 0) / 1e6).toFixed(2)}M {isWinner && '✓'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ ...style, padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '10px' }}>
        <TokenColumn token={tokenA} isWinner={betterLiquidity === 'A'} side="left" />
        
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '0 12px',
          marginTop: '8px'
        }}>
          <div style={{ 
            fontSize: '10px', 
            fontWeight: 700, 
            color: colors.textDim, 
            backgroundColor: colors.bg,
            padding: '4px 8px',
            borderRadius: '3px',
            border: `1px solid ${colors.border}`
          }}>
            VS
          </div>
        </div>
        
        <TokenColumn token={tokenB} isWinner={betterLiquidity === 'B'} side="right" />
      </div>
      
      <div style={{ 
        fontSize: '11px', 
        color: colors.textMuted, 
        textAlign: 'center', 
        fontWeight: 600,
        paddingTop: '8px',
        borderTop: `1px solid ${colors.border}`
      }}>
        {betterLiquidity === 'equal' 
          ? '⚖️ Similar liquidity depth' 
          : `🏆 ${betterLiquidity === 'A' ? tokenA.symbol : tokenB.symbol} has deeper liquidity`}
      </div>
    </div>
  );
}

// GAS CARD
function GasCard({ data, style }: { data: any; style: any }) {
  const getLabelColor = (label: string) => {
    if (label.includes('✅')) return colors.green;
    if (label.includes('⚠️')) return colors.yellow;
    return colors.red;
  };

  return (
    <div style={{ ...style, padding: '10px' }}>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '28px', fontWeight: 700, color: colors.text }}>{data.gwei.toFixed(1)}</div>
        <div style={{ fontSize: '10px', color: colors.textDim, fontWeight: 500, textTransform: 'uppercase' }}>gwei</div>
        <div style={{ fontSize: '11px', color: getLabelColor(data.label), marginTop: '2px', fontWeight: 600 }}>{data.label}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
        {[
          { label: 'Swap', cost: data.swapCostUSD },
          { label: 'LP Add', cost: data.lpAddCostUSD },
          { label: 'Deploy', cost: data.contractDeployCostUSD },
        ].map((item, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '6px', backgroundColor: colors.bg, borderRadius: '2px' }}>
            <div style={{ fontSize: '9px', color: colors.textDim, fontWeight: 500, textTransform: 'uppercase' }}>{item.label}</div>
            <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 700 }}>${item.cost.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// MARKET CARD
function MarketCard({ data, style }: { data: any; style: any }) {
  const getSentimentStyle = (sentiment: string) => {
    if (sentiment.includes('🟢')) return { bg: '#0d1f0d', color: colors.green };
    if (sentiment.includes('🔴')) return { bg: '#1f0d0d', color: colors.red };
    return { bg: '#1f1a0d', color: colors.yellow };
  };
  const sentimentStyle = getSentimentStyle(data.sentiment);

  return (
    <div style={{ ...style, padding: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: colors.text, textTransform: 'uppercase' }}>Arbitrum</span>
        <span style={{ 
          fontSize: '10px', 
          color: sentimentStyle.color, 
          backgroundColor: sentimentStyle.bg,
          padding: '2px 8px',
          borderRadius: '2px',
          fontWeight: 600
        }}>
          {data.sentiment}
        </span>
      </div>
      <div>
        {data.topTokens.slice(0, 5).map((token: any, i: number) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gap: '6px',
              padding: '4px 0',
              borderBottom: i < 4 ? `1px solid ${colors.border}` : 'none',
              fontSize: '12px',
            }}
          >
            <span style={{ color: colors.text, fontWeight: 600 }}>{token.symbol}</span>
            <span style={{ color: colors.textMuted, fontWeight: 500 }}>${token.price.toFixed(4)}</span>
            <span style={{ color: token.priceChange24h >= 0 ? colors.green : colors.red, fontWeight: 700 }}>
              {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
            </span>
            <span style={{ color: colors.textDim, fontWeight: 500 }}>${(token.volume24h / 1e6).toFixed(1)}M</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// SAFE CARD
function SafeCard({ data, style }: { data: any; style: any }) {
  const getTierColor = (tier: string) => {
    if (tier.includes('Fort')) return colors.green;
    if (tier.includes('Carefully')) return colors.yellow;
    return colors.red;
  };

  const getTierBg = (tier: string) => {
    if (tier.includes('Fort')) return '#0d1f0d';
    if (tier.includes('Carefully')) return '#1f1a0d';
    return '#1f0d0d';
  };

  const score = data.score;

  return (
    <div style={{ ...style, padding: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{ 
          width: '44px',
          height: '44px',
          borderRadius: '3px',
          backgroundColor: getTierBg(data.tier),
          border: `1px solid ${getTierColor(data.tier)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: 700,
          color: getTierColor(data.tier)
        }}>
          {score}
        </div>
        <div>
          <div style={{ fontSize: '10px', color: colors.textDim, fontWeight: 500 }}>{data.protocol}</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: getTierColor(data.tier) }}>
            {data.tier}
          </div>
        </div>
      </div>

      {data.reasons && data.reasons.length > 0 && (
        <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '8px' }}>
          {data.reasons.map((reason: string, i: number) => (
            <div key={i} style={{ fontSize: '11px', color: colors.textMuted, padding: '2px 0', fontWeight: 500 }}>
              • {reason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// POOL CARD
function PoolCard({ data, style }: { data: any; style: any }) {
  return (
    <div style={{ ...style, padding: '10px' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: colors.text, marginBottom: '8px', textTransform: 'uppercase' }}>Pool</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
        <div style={{ padding: '6px', backgroundColor: colors.bg, borderRadius: '2px' }}>
          <div style={{ fontSize: '9px', color: colors.textDim, fontWeight: 500, textTransform: 'uppercase' }}>TVL</div>
          <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 700 }}>${(data.tvlUSD / 1e6).toFixed(2)}M</div>
        </div>
        <div style={{ padding: '6px', backgroundColor: colors.bg, borderRadius: '2px' }}>
          <div style={{ fontSize: '9px', color: colors.textDim, fontWeight: 500, textTransform: 'uppercase' }}>24h Vol</div>
          <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 700 }}>${(data.volume24h / 1e6).toFixed(2)}M</div>
        </div>
        <div style={{ padding: '6px', backgroundColor: colors.bg, borderRadius: '2px' }}>
          <div style={{ fontSize: '9px', color: colors.textDim, fontWeight: 500, textTransform: 'uppercase' }}>Fee</div>
          <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 700 }}>{data.feeTier}</div>
        </div>
        <div style={{ padding: '6px', backgroundColor: colors.bg, borderRadius: '2px' }}>
          <div style={{ fontSize: '9px', color: colors.textDim, fontWeight: 500, textTransform: 'uppercase' }}>Txns</div>
          <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 700 }}>
            {(data.txns24h.buys + data.txns24h.sells).toLocaleString()}
          </div>
        </div>
      </div>
      <div style={{ fontSize: '10px', color: colors.textDim, fontWeight: 500, fontFamily: 'monospace' }}>
        {data.poolAddress.slice(0, 8)}...{data.poolAddress.slice(-6)}
      </div>
    </div>
  );
}
