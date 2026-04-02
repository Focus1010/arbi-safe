'use client';

import { useRef } from 'react';
import html2canvas from 'html2canvas';

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

interface StrategyCardProps {
  result: SimulationResult;
  amountUSD: number;
}

function getDegenBadgeColor(label: string): string {
  if (label.includes('Smooth Brain')) return '#3b82f6'; // Blue
  if (label.includes('Mid Curve')) return '#22c55e'; // Green
  if (label.includes('Degen')) return '#f97316'; // Orange
  if (label.includes('Galaxy Brain')) return '#8b5cf6'; // Purple
  return '#6b7280';
}

function getTrustBadgeColor(tier: string): string {
  if (tier === 'Fort Knox') return '#22c55e'; // Green
  if (tier === 'Proceed Carefully') return '#eab308'; // Yellow
  if (tier === 'Touch Grass Instead') return '#ef4444'; // Red
  return '#6b7280';
}

export default function StrategyCard({ result, amountUSD }: StrategyCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = 'arbisafe-strategy.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to generate card image:', error);
      alert('Failed to generate card image. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Trading Card */}
      <div
        ref={cardRef}
        className="relative overflow-hidden"
        style={{
          width: '480px',
          height: '280px',
          background: 'linear-gradient(135deg, #0d0d1a 0%, #1a0d2e 100%)',
          borderRadius: '16px',
          padding: '24px',
          boxSizing: 'border-box',
        }}
      >
        {/* Gradient Border Effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            padding: '2px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
          }}
        />

        {/* TOP ROW */}
        <div className="flex justify-between items-start mb-6">
          {/* Logo */}
          <div className="flex items-center gap-1">
            <img src="/logo.png" width="20" height="20" style={{ borderRadius: '4px' }} alt="ArbiSafe" />
            <span className="text-sm font-medium" style={{ color: '#6b7280' }}>
              ArbiSafe
            </span>
          </div>

          {/* Degen Badge */}
          <div
            className="px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider"
            style={{
              backgroundColor: getDegenBadgeColor(result.degenLabel),
              boxShadow: `0 0 12px ${getDegenBadgeColor(result.degenLabel)}40`,
            }}
          >
            {result.degenLabel.replace(/[🧠📈🎰🌌]/g, '').trim()}
          </div>
        </div>

        {/* MIDDLE — Main Stat */}
        <div className="text-center mb-8">
          <div
            className="text-4xl font-bold mb-2"
            style={{
              color: '#ffffff',
              textShadow: '0 0 30px rgba(139, 92, 246, 0.5)',
            }}
          >
            {result.fromToken} → {result.toToken}
          </div>
          <div className="text-xl font-medium" style={{ color: '#9ca3af' }}>
            ${amountUSD.toLocaleString()}
          </div>
        </div>

        {/* BOTTOM ROW — 3 Stat Boxes */}
        <div className="flex justify-between gap-3 mb-6">
          {/* Slippage Box */}
          <div
            className="flex-1 rounded-lg p-3 text-center"
            style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#3b82f6' }}>
              SLIPPAGE
            </div>
            <div className="text-lg font-bold" style={{ color: '#ffffff' }}>
              {result.slippagePercent}%
            </div>
          </div>

          {/* Trust Box */}
          <div
            className="flex-1 rounded-lg p-3 text-center"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)' }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#22c55e' }}>
              TRUST
            </div>
            <div className="text-lg font-bold" style={{ color: '#ffffff' }}>
              {result.trustScore}/100
            </div>
          </div>

          {/* Degen Box */}
          <div
            className="flex-1 rounded-lg p-3 text-center"
            style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)' }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#8b5cf6' }}>
              DEGEN
            </div>
            <div className="text-lg font-bold" style={{ color: '#ffffff' }}>
              {result.degenScore}/100
            </div>
          </div>
        </div>

        {/* VERY BOTTOM */}
        <div className="flex justify-between items-center">
          {/* Trust Tier Badge */}
          <div
            className="px-3 py-1 rounded text-xs font-semibold text-white"
            style={{
              backgroundColor: getTrustBadgeColor(result.trustTier),
              boxShadow: `0 0 8px ${getTrustBadgeColor(result.trustTier)}40`,
            }}
          >
            {result.trustTier}
          </div>

          {/* Watermark */}
          <div className="text-xs" style={{ color: '#4b5563' }}>
            arbisafe.vercel.app
          </div>
        </div>
      </div>

      {/* Share Button */}
      <button
        onClick={handleShare}
        className="px-6 py-3 rounded-xl font-semibold text-white transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
        }}
      >
        📸 Share Strategy Card
      </button>
    </div>
  );
}
