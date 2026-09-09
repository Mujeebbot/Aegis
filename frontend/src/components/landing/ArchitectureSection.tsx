import React from 'react'
import { SectionLabel } from '../ui/SectionLabel'
import { ScrollReveal } from '../ui/TechnicalPanel'

// ─── ArchitectureSection ──────────────────────────────────────────────────────
// Interactive technical architecture with hover-reveal details
// ─────────────────────────────────────────────────────────────────────────────

const ARCH_NODES = [
  {
    id: 'ai-monitor',
    label: 'AI Risk Monitor',
    layer: 'OFF-CHAIN',
    color: '#a8e063',
    description: 'Continuous position monitoring — polls health factor, collateral/debt ratios via The Graph every 30 seconds. Triggers risk alerts to the oracle worker.',
    tech: ['The Graph subgraphs', 'Price feeds (Chainlink)', 'Health factor tracking', 'Trend projection model'],
    x: 1, y: 0,
  },
  {
    id: 'oracle-worker',
    label: 'Oracle Worker',
    layer: 'OFF-CHAIN',
    color: '#a8e063',
    description: 'Receives risk alerts and generates Merkle + continuity proofs of source-chain state using @gluwa/usc-sdk. Manages the proof submission queue.',
    tech: ['@gluwa/usc-sdk', 'Merkle proof generation', 'Continuity proof', 'Submission queue'],
    x: 1, y: 1,
  },
  {
    id: 'asc',
    label: 'Attestcoin (ASC)',
    layer: 'ON-CHAIN (CC3)',
    color: '#5be4c8',
    description: 'Smart contract on Creditcoin CC3 testnet. Verifies position proofs using the Block Prover precompile. Calls the Settlement contract on successful verification.',
    tech: ['verifyPosition(...)', 'Block Prover precompile', 'Chain ID: 102031', 'CC3 Testnet'],
    x: 2, y: 0,
  },
  {
    id: 'block-prover',
    label: 'Block Prover',
    layer: 'ON-CHAIN (CC3)',
    color: '#5be4c8',
    description: 'CC3 precompile that cryptographically proves source-chain block attestation. Currently attests Ethereum Sepolia (chainKey 1) and Ethereum mainnet (chainKey 3).',
    tech: ['Source: Sepolia (chainKey 1)', 'Source: ETH (chainKey 3)', 'ChainInfo precompile', 'Merkle verification'],
    x: 2, y: 1,
  },
  {
    id: 'settlement',
    label: 'Settlement Contract',
    layer: 'ON-CHAIN (CC3)',
    color: '#5be4c8',
    description: 'Executes protection actions after successful ASC verification. Calls Aave or Compound repayment on the source chain. SAFE_THRESHOLD: 1.05.',
    tech: ['protectPosition(...)', 'setProtectionMode(...)', 'SAFE_THRESHOLD: 1.05', 'PositionProtected event'],
    x: 2, y: 2,
  },
  {
    id: 'protocols',
    label: 'Aave / Compound',
    layer: 'SOURCE CHAIN',
    color: '#888878',
    description: 'The DeFi lending protocols where user positions exist. Protection is executed by repaying debt or rebalancing collateral through approved calls.',
    tech: ['Aave V3', 'Compound V3', 'Morpho Blue', 'Ethereum Sepolia'],
    x: 3, y: 1,
  },
]

export function ArchitectureSection() {
  const [activeNode, setActiveNode] = React.useState<string | null>(null)
  const active = ARCH_NODES.find(n => n.id === activeNode)

  return (
    <section id="architecture" className="relative section-padding" aria-label="Architecture">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <ScrollReveal>
          <SectionLabel className="mb-6">System Architecture</SectionLabel>
          <h2 className="font-display text-display-lg font-bold text-aegis-white mb-4">
            Built on verified
            <br />
            <span className="text-aegis-lime">infrastructure.</span>
          </h2>
          <p className="text-aegis-off text-base max-w-xl leading-relaxed mb-4">
            Hover or tap each component to reveal implementation details.
          </p>
          <p className="font-mono text-label-xs text-aegis-muted tracking-widest uppercase mb-12">
            Off-chain → On-chain (CC3) → Source chain
          </p>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="grid lg:grid-cols-3 gap-4 mb-6">
            {/* Column labels */}
            {['Off-Chain Services', 'Creditcoin CC3 (On-Chain)', 'Source Chain'].map((col, i) => (
              <div key={col} className="text-center">
                <span
                  className="font-mono text-label-xs tracking-widest uppercase"
                  style={{ color: i === 0 ? '#a8e063' : i === 1 ? '#5be4c8' : '#5a5a50' }}
                >
                  {col}
                </span>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {/* Off-Chain column */}
            <div className="space-y-3">
              {ARCH_NODES.filter(n => n.x === 1).map(node => (
                <ArchNode
                  key={node.id}
                  node={node}
                  isActive={activeNode === node.id}
                  onClick={() => setActiveNode(activeNode === node.id ? null : node.id)}
                />
              ))}
            </div>

            {/* On-Chain column */}
            <div className="space-y-3">
              {ARCH_NODES.filter(n => n.x === 2).map(node => (
                <ArchNode
                  key={node.id}
                  node={node}
                  isActive={activeNode === node.id}
                  onClick={() => setActiveNode(activeNode === node.id ? null : node.id)}
                />
              ))}
            </div>

            {/* Source chain column */}
            <div className="flex flex-col justify-center">
              {ARCH_NODES.filter(n => n.x === 3).map(node => (
                <ArchNode
                  key={node.id}
                  node={node}
                  isActive={activeNode === node.id}
                  onClick={() => setActiveNode(activeNode === node.id ? null : node.id)}
                />
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Detail panel */}
        {active && (
          <ScrollReveal>
            <div
              className="mt-6 rounded-lg overflow-hidden transition-all duration-300"
              style={{ background: '#0d0d0a', border: `1px solid ${active.color}30` }}
            >
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: `${active.color}20` }}>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: active.color }} />
                  <span className="font-display text-base font-bold text-aegis-white">{active.label}</span>
                  <span className="font-mono text-label-xs tracking-widest uppercase" style={{ color: `${active.color}80` }}>
                    {active.layer}
                  </span>
                </div>
                <button
                  onClick={() => setActiveNode(null)}
                  className="text-aegis-dim hover:text-aegis-white transition-colors font-mono text-xs"
                  aria-label="Close detail"
                >
                  ✕ close
                </button>
              </div>
              <div className="p-5 grid md:grid-cols-2 gap-6">
                <p className="text-sm text-aegis-off leading-relaxed">{active.description}</p>
                <div>
                  <div className="font-mono text-label-xs text-aegis-dim tracking-widest uppercase mb-3">Implementation</div>
                  <ul className="space-y-2">
                    {active.tech.map(t => (
                      <li key={t} className="flex items-center gap-2 font-mono text-xs" style={{ color: active.color }}>
                        <span className="opacity-40">›</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </ScrollReveal>
        )}
      </div>
    </section>
  )
}

interface ArchNodeProps {
  node: typeof ARCH_NODES[0]
  isActive: boolean
  onClick: () => void
}

function ArchNode({ node, isActive, onClick }: ArchNodeProps) {
  const [hovered, setHovered] = React.useState(false)
  const active = isActive || hovered

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left rounded-sm overflow-hidden transition-all duration-300 focus-visible:outline-1"
      style={{
        background: active ? `${node.color}08` : '#111110',
        border: `1px solid ${active ? `${node.color}40` : '#242420'}`,
        boxShadow: active ? `0 0 20px ${node.color}0A` : 'none',
        transform: active ? 'translateY(-1px)' : 'none',
      }}
      aria-expanded={isActive}
      aria-label={`${node.label} — click to see details`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full transition-all duration-300" style={{ background: active ? node.color : '#3a3a34', boxShadow: active ? `0 0 6px ${node.color}` : 'none' }} />
            <span className="font-mono text-label-xs tracking-widest uppercase" style={{ color: `${node.color}70` }}>
              {node.layer}
            </span>
          </div>
          <span className="font-mono text-label-xs text-aegis-muted">{isActive ? '▲' : '▼'}</span>
        </div>
        <div className="font-display text-sm font-semibold transition-colors duration-300" style={{ color: active ? node.color : '#a0a090' }}>
          {node.label}
        </div>
      </div>
    </button>
  )
}
