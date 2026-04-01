import axios from 'axios';

const ARBISCAN_API_URL = 'https://api.arbiscan.io/api';
const ARBISCAN_API_KEY = process.env.NEXT_PUBLIC_ARBISCAN_API_KEY || '';
const DEFILLAMA_API_URL = 'https://api.llama.fi/protocol';

interface TrustResult {
  score: number;
  tier: 'Fort Knox' | 'Proceed Carefully' | 'Touch Grass Instead';
  reasons: string[];
}

const KNOWN_PROTOCOLS: Record<string, { slug: string; audited: boolean; launchYear: number }> = {
  camelot: { slug: 'camelot', audited: true, launchYear: 2022 },
  gmx: { slug: 'gmx', audited: true, launchYear: 2021 },
  uniswap: { slug: 'uniswap-v3', audited: true, launchYear: 2018 },
  aave: { slug: 'aave-v3', audited: true, launchYear: 2020 },
  curve: { slug: 'curve-finance', audited: true, launchYear: 2020 },
};

function calculateAgeScore(launchYear: number): number {
  const currentYear = new Date().getFullYear();
  const age = currentYear - launchYear;
  if (age >= 5) return 25;
  if (age >= 3) return 20;
  if (age >= 1) return 15;
  return 10;
}

function getTier(score: number): TrustResult['tier'] {
  if (score >= 70) return 'Fort Knox';
  if (score >= 40) return 'Proceed Carefully';
  return 'Touch Grass Instead';
}

export async function getTrustScore(
  protocolName: string,
  contractAddress?: string
): Promise<TrustResult | null> {
  const normalizedName = protocolName.toLowerCase().trim();
  const reasons: string[] = [];
  let score = 0;

  try {
    const knownProtocol = KNOWN_PROTOCOLS[normalizedName];

    if (knownProtocol) {
      reasons.push(`Known protocol: ${protocolName}`);

      if (knownProtocol.audited) {
        score += 30;
        reasons.push('Protocol has been audited by reputable firms');
      } else {
        reasons.push('No known audits found');
      }

      const ageScore = calculateAgeScore(knownProtocol.launchYear);
      score += ageScore;
      const age = new Date().getFullYear() - knownProtocol.launchYear;
      reasons.push(`Protocol is ${age} years old (launched ${knownProtocol.launchYear})`);

      try {
        const response = await axios.get(`${DEFILLAMA_API_URL}/${knownProtocol.slug}`, {
          timeout: 10000,
        });

        const tvl = response.data?.currentChainTvls?.['Arbitrum'] || response.data?.tvl?.[0]?.totalLiquidityUSD || 0;

        if (tvl > 1_000_000_000) {
          score += 25;
          reasons.push(`High TVL: $${(tvl / 1_000_000_000).toFixed(2)}B on Arbitrum`);
        } else if (tvl > 100_000_000) {
          score += 20;
          reasons.push(`Strong TVL: $${(tvl / 1_000_000).toFixed(0)}M on Arbitrum`);
        } else if (tvl > 10_000_000) {
          score += 10;
          reasons.push(`Moderate TVL: $${(tvl / 1_000_000).toFixed(1)}M on Arbitrum`);
        } else if (tvl > 0) {
          score += 5;
          reasons.push(`Low TVL: $${(tvl / 1_000_000).toFixed(2)}M on Arbitrum`);
        } else {
          reasons.push('No TVL data available');
        }

        const chainTvls = response.data?.chainTvls || {};
        const chainCount = Object.keys(chainTvls).length;
        if (chainCount > 3) {
          score += 10;
          reasons.push(`Multi-chain presence (${chainCount} chains)`);
        } else if (chainCount > 1) {
          score += 5;
          reasons.push(`Deployed on ${chainCount} chains`);
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.warn('DeFiLlama API error:', error.message);
        }
        reasons.push('Could not fetch TVL data from DeFiLlama');
      }
    } else if (contractAddress) {
      reasons.push(`Unknown protocol: ${protocolName}`);
      reasons.push('Analyzing contract verification...');

      try {
        const response = await axios.get(ARBISCAN_API_URL, {
          params: {
            module: 'contract',
            action: 'getsourcecode',
            address: contractAddress,
            apikey: ARBISCAN_API_KEY,
          },
          timeout: 10000,
        });

        if (response.data.status === '1' && response.data.result?.[0]) {
          const contractData = response.data.result[0];

          if (contractData.SourceCode && contractData.SourceCode.length > 10) {
            score += 30;
            reasons.push('Contract source code is verified on Arbiscan');

            if (contractData.OptimizationUsed === '1') {
              score += 10;
              reasons.push('Contract uses compiler optimization');
            }

            if (contractData.ContractName && contractData.ContractName.length > 0) {
              score += 5;
              reasons.push(`Contract name: ${contractData.ContractName}`);
            }

            if (contractData.ABI && contractData.ABI !== 'Contract source code not verified') {
              score += 5;
              reasons.push('ABI is available');
            }
          } else {
            reasons.push('Contract source code is NOT verified - high risk');
            score -= 20;
          }
        } else {
          reasons.push('Could not verify contract on Arbiscan');
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 429) {
            reasons.push('Arbiscan API rate limit reached');
          } else {
            console.error('Arbiscan API error:', error.message);
          }
        }
        reasons.push('Failed to check contract verification');
      }

      score += 10;
      reasons.push('Unknown protocol - exercise extreme caution');
    } else {
      reasons.push(`Unknown protocol: ${protocolName}`);
      reasons.push('No contract address provided for verification');
      score = 10;
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      score: finalScore,
      tier: getTier(finalScore),
      reasons,
    };
  } catch (error) {
    console.error('Unexpected error in getTrustScore:', error);
    return null;
  }
}
