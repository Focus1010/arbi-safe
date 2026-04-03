# ArbiSafe

> Simulate before you ape.

ArbiSafe is a conversational AI agent that simulates any DeFi strategy on Arbitrum with real onchain data — before you risk a single dollar. Describe your move in plain English, drop a ticker or contract address, and get back real swap quotes, stress tests, protocol trust scores, and profit scenarios instantly.

Built for the **ArbiLink Agentic Bounty** — Arbitrum Open House London 2026.

**Live:** https://arbisafe.vercel.app  
**ERC-8004 Agent ID:** #162 · Arbitrum Sepolia  
**Registration TX:** `0x0422d6b48190e6b2d1a562662784ff48f37d9acd1fd81145a686c5e08600c99a` 

## Why ArbiSafe

Most DeFi agents execute first and ask questions never. ArbiSafe takes the opposite approach — **simulate before you ape**.

| | ArbiSafe | Typical DeFi Agent |
|---|---|---|
| Interface | Conversational AI chat | CLI / curl commands |
| AI Layer | Gemini 2.0 Flash + Groq Llama 4 | None |
| Approach | Simulate → understand → decide | Execute directly |
| User | Anyone | Developers only |
| Safety | Pre-execution risk scoring | Post-execution |
| Token support | Any ticker or contract address | Fixed token list |
| A2A compatible | Yes — /api/agent-card | Varies |

ArbiSafe is the only Arbitrum agent that combines live onchain simulation, conversational AI intelligence, and pre-execution safety scoring in a single accessible interface.

---

## What It Does

ArbiSafe is not a form. It's a live AI agent you talk to.

You type: *"should I swap $500 USDC for ARB on Camelot right now?"*

ArbiSafe fetches real Arbitrum data, runs a full simulation, and responds:

- How many tokens you'd receive (real quote, not an estimate)
- Slippage at current pool depth
- Gas cost in USD
- What happens to your position at -20%, -40%, -60% price drops
- What happens at +20%, +50%, +100% pumps
- Protocol trust score (audited? TVL? contract verified?)
- Degen score (how risky is this move really?)
- A plain-English verdict: proceed, proceed carefully, or avoid

---

## Agent Capabilities

### Conversational Simulation
Talk to ArbiSafe naturally. It understands tickers, contract addresses, and plain English strategy descriptions. It extracts simulation parameters automatically and runs the numbers.

### Slash Commands
For power users who want speed:

| Command | Description |
|---|---|
| `/price {token}` | Real-time price for any token or CA |
| `/compare {tokenA} {tokenB}` | Side-by-side token comparison |
| `/gas` | Current Arbitrum gas fees |
| `/safe {protocol}` | Protocol safety check |
| `/pool {tokenA} {tokenB}` | Liquidity pool info |
| `/market` | Arbitrum market overview + sentiment |
| `/gainers` | Top gaining tokens on Arbitrum right now |
| `/losers` | Biggest drops on Arbitrum right now |
| `/simulate {from} {to} {amount}` | Direct swap simulation |
| `/lp {from} {to} {amount}` | LP position simulation |
| `/help` | Show all commands |
| `/clear` | Clear chat history |

### Token Support
ArbiSafe recognizes 30+ Arbitrum tokens by ticker symbol and accepts any token by contract address (0x...). Unknown tokens are looked up live on DexScreener.

### ERC-8004 Registration
ArbiSafe is registered on the ERC-8004 Identity Registry on Arbitrum Sepolia as Agent #162. The agent metadata is publicly resolvable at `https://arbisafe.vercel.app/agent.json`.

---

## How It Works

```
User message
│
▼
Command parser (slash command?)
│
┌──┴──┐
Yes   No
│      │
▼      ▼
Command  Groq LLM (Llama 4 Scout)
executor  extracts strategy params
│      │
│      ▼
│   Simulation engine
│      │
│   ┌──┴─────────────────┐
│   │  Real data layer   │
│   │  DexScreener API   │
│   │  Arbitrum RPC      │
│   │  DeFiLlama API     │
│   │  Arbiscan API      │
│   └──┬─────────────────┘
│      │
│      ▼
│   Results: swap quote, stress
│   tests, profit scenarios,
│   trust score, degen score
│      │
│      ▼
│   Groq LLM interprets results
│   in plain English
│      │
└──────┤
▼
Response + simulation card
rendered in chat
```

---

## Data Sources

All data is fetched live at simulation time. Nothing is cached or estimated.

| Source | What it provides |
|---|---|
| DexScreener API | Token prices, pool data, 24h volume, liquidity, top gainers/losers |
| Arbitrum RPC | Live gas price, gas estimation |
| DeFiLlama API | Protocol TVL, audit status, chain presence |
| Arbiscan API | Contract verification, proxy detection |
| Groq (Llama 4 Scout) | Natural language understanding, result interpretation |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| AI Agent | Groq API · Llama 4 Scout |
| Onchain | ethers.js v6 · Arbitrum One RPC |
| Data | DexScreener · DeFiLlama · Arbiscan |
| Identity | ERC-8004 Identity Registry · Arbitrum Sepolia |
| Deployment | Vercel |

---

## Running Locally

**Prerequisites:** Node.js 18+, npm
```bash
git clone https://github.com/YOUR_USERNAME/arbisafe.git
cd arbisafe
npm install
```

Create `.env.local`:
```env
ARBISCAN_API_KEY=your_arbiscan_api_key
ARBITRUM_RPC=https://arb1.arbitrum.io/rpc
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
GROQ_API_KEY=your_groq_api_key
```

Get free API keys:
- **Arbiscan:** https://arbiscan.io/apis
- **Groq:** https://console.groq.com
```bash
npm run dev
```

Open http://localhost:3000

---

## ERC-8004 Registration

ArbiSafe is registered as an agent on the ERC-8004 Identity Registry — the Ethereum standard for trustless AI agent identity, reputation, and discovery.

Network:          Arbitrum Sepolia  
Contract:         0x8004A818BFB912233c491871b3d84c89A494BD9e  
Agent ID:         #162  
Owner wallet:     0x9431a4E212cfcadC2F37381b47765b2d6Bcd74cc  
Agent metadata:   https://arbisafe.vercel.app/agent.json  
Registration TX:  0x0422d6b48190e6b2d1a562662784ff48f37d9acd1fd81145a686c5e08600c99a

The agent metadata file (`/agent.json`) is publicly resolvable and describes ArbiSafe's capabilities, service endpoints, and identity per the ERC-8004 spec.

---

## Project Structure

```
arbisafe/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main chat interface
│   │   ├── layout.tsx            # App layout + metadata
│   │   └── api/
│   │       ├── agent/route.ts    # Groq AI agent endpoint
│   │       ├── simulate/route.ts # Simulation engine endpoint
│   │       └── command/route.ts  # Slash command handler
│   ├── components/
│   │   ├── CommandResults.tsx    # Rich command response cards
│   │   └── StrategyCard.tsx      # Shareable strategy card
│   └── lib/
│       ├── simulate.ts           # Core simulation engine
│       ├── tokens.ts             # Token registry + resolver
│       ├── commandParser.ts      # Slash command parser
│       ├── agentTools.ts         # Agent tool functions
│       └── api/
│           ├── price.ts          # DexScreener price feeds
│           ├── pool.ts           # Pool data (DexScreener)
│           ├── gas.ts            # Gas estimation (Arbitrum RPC)
│           └── trust.ts          # Protocol trust scoring
├── public/
│   ├── logo.png                  # ArbiSafe logo
│   ├── agent.json                # ERC-8004 registration metadata
│   └── registration.json        # Onchain registration receipt
├── scripts/
│   └── register-agent.ts        # ERC-8004 registration script
└── .env.local                    # Environment variables (not committed)
```

---

## Disclaimer

ArbiSafe simulations are for informational purposes only and do not constitute financial advice. DeFi carries significant risk of loss. Always do your own research before executing any onchain transaction.

ArbiSafe is registered on the ERC-8004 Identity Registry as Agent #162 on Arbitrum Sepolia.  
Registration TX: `0x0422d6b48190e6b2d1a562662784ff48f37d9acd1fd81145a686c5e08600c99a` 

---

*Built with ❤️ for the ArbiLink Agentic Bounty · Arbitrum Open House London 2026*
