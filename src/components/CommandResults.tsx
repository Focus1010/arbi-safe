'use client';

import { useEffect, useState } from 'react';
import SimulationCard from './SimulationCard';

interface CommandResultsProps {
  type: string;
  data: any;
}

export default function CommandResults({ type, data }: CommandResultsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cardStyle = {
    backgroundColor: '#0e0e1e',
    border: '0.5px solid #2a2a4a',
    borderRadius: '12px',
    maxWidth: '380px',
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(10px)',
    transition: 'opacity 300ms ease-out, transform 300ms ease-out',
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
    case 'gainers':
      return <GainersLosersCard data={data} type="gainers" style={cardStyle} />;
    case 'losers':
      return <GainersLosersCard data={data} type="losers" style={cardStyle} />;
    case 'safe':
      return <SafeCard data={data} style={cardStyle} />;
    case 'pool':
      return <PoolCard data={data} style={cardStyle} />;
    case 'simulation':
      return <SimulationCard data={data} onOpenModal={() => {}} />;
    default:
      return (
        <div style={{ ...cardStyle, padding: '16px', color: '#ef4444' }}>
          Unknown command type: {type}
        </div>
      );
  }
}

// HELP CARD
function HelpCard({ data, style }: { data: Array<{ command: string; description: string }>; style: any }) {
  return (
    <div style={{ ...style, padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '18px' }}>⌨️</span>
        <span style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>ArbiSafe Commands</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginBottom: '12px' }}>
        {data.map((cmd, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#3b82f6' }}>{cmd.command}</span>
            <span style={{ fontSize: '11px', color: '#6a6a8a' }}>{cmd.description}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '10px', color: '#4a4a6a', borderTop: '0.5px solid #1a1a2a', paddingTop: '12px', marginTop: '8px' }}>
        💡 You can also just chat naturally — I understand plain English
      </div>
    </div>
  );
}

// PRICE CARD
function PriceCard({ data, style }: { data: any; style: any }) {
  const priceChange = data.change24h || 0;
  const isPositive = priceChange >= 0;
  const borderColor = isPositive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';

  return (
    <div style={{ ...style, borderLeft: `3px solid ${borderColor}`, padding: '16px' }}>
      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff' }}>{data.symbol}</span>
        <span style={{ fontSize: '13px', color: '#6a6a8a', marginLeft: '8px' }}>{data.name}</span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>
        ${data.priceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#6a6a8a', textTransform: 'uppercase' }}>24h Change</div>
          <div style={{ fontSize: '14px', color: isPositive ? '#22c55e' : '#ef4444', fontWeight: 500 }}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#6a6a8a', textTransform: 'uppercase' }}>Volume</div>
          <div style={{ fontSize: '14px', color: '#c8c8d8' }}>${(data.volume24h / 1e6).toFixed(2)}M</div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#6a6a8a', textTransform: 'uppercase' }}>Liquidity</div>
          <div style={{ fontSize: '14px', color: '#c8c8d8' }}>${(data.liquidity / 1e6).toFixed(2)}M</div>
        </div>
      </div>
      <a
        href={data.dexscreenerUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block',
          textAlign: 'center',
          padding: '8px',
          backgroundColor: '#1a1a2a',
          borderRadius: '6px',
          color: '#3b82f6',
          fontSize: '12px',
          textDecoration: 'none',
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

  const TokenCard = ({ token, isWinner }: { token: any; isWinner: boolean }) => (
    <div
      style={{
        flex: 1,
        padding: '12px',
        backgroundColor: isWinner ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
        border: `0.5px solid ${isWinner ? '#3b82f6' : '#1a1a2a'}`,
        borderRadius: '8px',
      }}
    >
      <div style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>{token.symbol}</div>
      <div style={{ fontSize: '20px', fontWeight: 500, color: '#c8c8d8', marginBottom: '12px' }}>
        ${token.priceUSD.toLocaleString(undefined, { maximumFractionDigits: 6 })}
      </div>
      <div style={{ fontSize: '11px', color: '#6a6a8a', marginBottom: '4px' }}>
        Vol: ${(token.volume24h / 1e6).toFixed(2)}M
      </div>
      <div style={{ fontSize: '11px', color: '#6a6a8a' }}>
        Liq: ${(token.liquidity / 1e6).toFixed(2)}M
      </div>
    </div>
  );

  return (
    <div style={{ ...style, padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <TokenCard token={tokenA} isWinner={betterLiquidity === 'A'} />
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#6a6a8a', padding: '0 4px' }}>VS</div>
        <TokenCard token={tokenB} isWinner={betterLiquidity === 'B'} />
      </div>
      <div style={{ fontSize: '11px', color: '#6a6a8a', textAlign: 'center' }}>
        {betterLiquidity === 'equal' ? 'Similar liquidity depth' : `${betterLiquidity === 'A' ? tokenA.symbol : tokenB.symbol} has better liquidity`}
      </div>
    </div>
  );
}

// GAS CARD
function GasCard({ data, style }: { data: any; style: any }) {
  const getLabelColor = (label: string) => {
    if (label.includes('✅')) return '#22c55e';
    if (label.includes('⚠️')) return '#eab308';
    return '#ef4444';
  };

  return (
    <div style={{ ...style, padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '32px', fontWeight: 700, color: '#ffffff' }}>{data.gwei.toFixed(2)}</div>
        <div style={{ fontSize: '12px', color: '#6a6a8a' }}>gwei</div>
        <div style={{ fontSize: '13px', color: getLabelColor(data.label), marginTop: '4px' }}>{data.label}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {[
          { label: 'Swap', cost: data.swapCostUSD },
          { label: 'LP Add', cost: data.lpAddCostUSD },
          { label: 'Deploy', cost: data.contractDeployCostUSD },
        ].map((item, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '8px', backgroundColor: '#12121f', borderRadius: '6px' }}>
            <div style={{ fontSize: '10px', color: '#6a6a8a', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</div>
            <div style={{ fontSize: '14px', color: '#c8c8d8', fontWeight: 500 }}>${item.cost.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// MARKET CARD
function MarketCard({ data, style }: { data: any; style: any }) {
  const getSentimentColor = (sentiment: string) => {
    if (sentiment.includes('🟢')) return '#22c55e';
    if (sentiment.includes('🔴')) return '#ef4444';
    return '#eab308';
  };

  return (
    <div style={{ ...style, padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>Arbitrum Market</span>
        <span style={{ fontSize: '13px', color: getSentimentColor(data.sentiment), fontWeight: 500 }}>{data.sentiment}</span>
      </div>
      <div>
        {data.topTokens.map((token: any, i: number) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gap: '8px',
              padding: '8px 0',
              borderBottom: i < data.topTokens.length - 1 ? '0.5px solid #1a1a2a' : 'none',
              backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(26, 26, 42, 0.3)',
            }}
          >
            <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: 500 }}>{token.symbol}</span>
            <span style={{ fontSize: '12px', color: '#c8c8d8' }}>${token.price.toFixed(4)}</span>
            <span style={{ fontSize: '12px', color: token.priceChange24h >= 0 ? '#22c55e' : '#ef4444' }}>
              {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
            </span>
            <span style={{ fontSize: '12px', color: '#6a6a8a' }}>${(token.volume24h / 1e6).toFixed(2)}M</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// GAINERS/LOSERS CARD
function GainersLosersCard({ data, type, style }: { data: any[]; type: 'gainers' | 'losers'; style: any }) {
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  const isGainers = type === 'gainers';

  return (
    <div style={{ ...style, padding: '16px' }}>
      <div style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>
        {isGainers ? '🚀 Top Gainers' : '📉 Top Losers'}
      </div>
      <div>
        {data.map((token: any, i: number) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 0',
              borderBottom: i < data.length - 1 ? '0.5px solid #1a1a2a' : 'none',
            }}
          >
            <span style={{ fontSize: '14px', width: '24px' }}>{medals[i]}</span>
            <span style={{ fontSize: '14px', color: '#ffffff', fontWeight: 500, width: '60px' }}>{token.symbol}</span>
            <span style={{ fontSize: '13px', color: '#c8c8d8', flex: 1 }}>${token.price.toFixed(4)}</span>
            <span style={{ fontSize: '13px', color: isGainers ? '#22c55e' : '#ef4444', fontWeight: 500, width: '70px', textAlign: 'right' }}>
              {isGainers ? '+' : ''}{token.priceChange24h.toFixed(2)}%
            </span>
            <span style={{ fontSize: '11px', color: '#6a6a8a', width: '60px', textAlign: 'right' }}>${(token.volume24h / 1e6).toFixed(1)}M</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// SAFE CARD
function SafeCard({ data, style }: { data: any; style: any }) {
  const getTierColor = (tier: string) => {
    if (tier.includes('Fort')) return '#22c55e';
    if (tier.includes('Carefully')) return '#eab308';
    return '#ef4444';
  };

  const getTierIcon = (tier: string) => {
    if (tier.includes('Fort')) return '✅';
    if (tier.includes('Carefully')) return '⚠️';
    return '🚨';
  };

  const score = data.score;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div style={{ ...style, padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        {/* Progress Circle */}
        <div style={{ position: 'relative', width: '100px', height: '100px' }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#1a1a2a" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={getTierColor(data.tier)}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
            />
          </svg>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff' }}>{score}</div>
            <div style={{ fontSize: '10px', color: '#6a6a8a' }}>/100</div>
          </div>
        </div>

        {/* Tier Info */}
        <div>
          <div style={{ fontSize: '14px', color: '#6a6a8a', marginBottom: '4px' }}>{data.protocol}</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: getTierColor(data.tier), display: 'flex', alignItems: 'center', gap: '6px' }}>
            {getTierIcon(data.tier)} {data.tier}
          </div>
        </div>
      </div>

      {/* Reasons */}
      {data.reasons && data.reasons.length > 0 && (
        <div style={{ borderTop: '0.5px solid #1a1a2a', paddingTop: '12px' }}>
          {data.reasons.map((reason: string, i: number) => (
            <div key={i} style={{ fontSize: '12px', color: '#c8c8d8', padding: '4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{getTierIcon(data.tier)}</span>
              {reason}
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
    <div style={{ ...style, padding: '16px' }}>
      <div style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>Pool Information</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ padding: '12px', backgroundColor: '#12121f', borderRadius: '8px' }}>
          <div style={{ fontSize: '10px', color: '#6a6a8a', textTransform: 'uppercase', marginBottom: '4px' }}>TVL</div>
          <div style={{ fontSize: '16px', color: '#c8c8d8', fontWeight: 500 }}>${(data.tvlUSD / 1e6).toFixed(2)}M</div>
        </div>
        <div style={{ padding: '12px', backgroundColor: '#12121f', borderRadius: '8px' }}>
          <div style={{ fontSize: '10px', color: '#6a6a8a', textTransform: 'uppercase', marginBottom: '4px' }}>24h Volume</div>
          <div style={{ fontSize: '16px', color: '#c8c8d8', fontWeight: 500 }}>${(data.volume24h / 1e6).toFixed(2)}M</div>
        </div>
        <div style={{ padding: '12px', backgroundColor: '#12121f', borderRadius: '8px' }}>
          <div style={{ fontSize: '10px', color: '#6a6a8a', textTransform: 'uppercase', marginBottom: '4px' }}>Fee Tier</div>
          <div style={{ fontSize: '16px', color: '#c8c8d8', fontWeight: 500 }}>{data.feeTier}</div>
        </div>
        <div style={{ padding: '12px', backgroundColor: '#12121f', borderRadius: '8px' }}>
          <div style={{ fontSize: '10px', color: '#6a6a8a', textTransform: 'uppercase', marginBottom: '4px' }}>24h Txns</div>
          <div style={{ fontSize: '16px', color: '#c8c8d8', fontWeight: 500 }}>{data.txCount24h.toLocaleString()}</div>
        </div>
      </div>
      <div style={{ marginTop: '12px', fontSize: '11px', color: '#6a6a8a', wordBreak: 'break-all' }}>
        Pool: {data.poolAddress.slice(0, 6)}...{data.poolAddress.slice(-4)}
      </div>
    </div>
  );
}
