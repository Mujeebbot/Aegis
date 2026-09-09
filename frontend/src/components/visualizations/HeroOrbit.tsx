import React from 'react'
import { useReducedMotion } from '../background/AmbientBackground'

// ─── HeroOrbit ───────────────────────────────────────────────────────────────
// The cinematic hero visualization.
// Communicates: POSITION → MONITORING → RISK → VERIFICATION → PROTECTION
// Using: orbital rings, nodes, moving signals, health factor indicator
// ─────────────────────────────────────────────────────────────────────────────

const ORBIT_NODES = [
  { id: 'position',     angle: 0,   label: 'POSITION',     sublabel: 'ETH Sepolia',  ring: 1 },
  { id: 'monitor',      angle: 72,  label: 'AI MONITOR',   sublabel: 'Risk Engine',  ring: 1 },
  { id: 'risk',         angle: 144, label: 'RISK ASSESS',  sublabel: 'Health Factor',ring: 1 },
  { id: 'attest',       angle: 216, label: 'ATTESTCOIN',   sublabel: 'Verification', ring: 1 },
  { id: 'settle',       angle: 288, label: 'CREDITCOIN',   sublabel: 'Settlement',   ring: 1 },
]

interface HeroOrbitProps {
  className?: string
}

export function HeroOrbit({ className }: HeroOrbitProps) {
  const prefersReducedMotion = useReducedMotion()
  const [activeNode, setActiveNode] = React.useState(0)
  const [signalProgress, setSignalProgress] = React.useState(0)

  // Cycle through nodes to show the pipeline
  React.useEffect(() => {
    if (prefersReducedMotion) return
    const interval = setInterval(() => {
      setActiveNode(n => (n + 1) % ORBIT_NODES.length)
    }, 2400)
    return () => clearInterval(interval)
  }, [prefersReducedMotion])

  // Animate signal progress
  React.useEffect(() => {
    if (prefersReducedMotion) return
    let frame: number
    let start: number | null = null
    const duration = 2400

    const animate = (ts: number) => {
      if (!start) start = ts
      const progress = ((ts - start) % duration) / duration
      setSignalProgress(progress)
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [prefersReducedMotion])

  const cx = 300
  const cy = 300
  const r1 = 160  // inner orbit
  const r2 = 230  // outer orbit

  // Compute node positions on inner orbit
  const nodePositions = ORBIT_NODES.map(node => {
    const rad = ((node.angle - 90) * Math.PI) / 180
    return {
      ...node,
      x: cx + r1 * Math.cos(rad),
      y: cy + r1 * Math.sin(rad),
    }
  })

  // Signal dot position along orbit
  const signalRad = ((signalProgress * 360 - 90) * Math.PI) / 180
  const signalX = cx + r1 * Math.cos(signalRad)
  const signalY = cy + r1 * Math.sin(signalRad)

  // Outer ring signal (slower)
  const signalRad2 = (((signalProgress * 0.6) * 360 - 90) * Math.PI) / 180
  const signalX2 = cx + r2 * Math.cos(signalRad2)
  const signalY2 = cy + r2 * Math.sin(signalRad2)

  return (
    <div
      className={['relative w-full max-w-[600px] mx-auto', className ?? ''].join(' ')}
      aria-label="Aegis system visualization showing cross-chain position protection flow"
      aria-hidden="false"
    >
      <svg
        viewBox="0 0 600 600"
        className="w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Core glow filter */}
          <filter id="core-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Node glow */}
          <filter id="node-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Signal glow */}
          <filter id="signal-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Ambient gradient behind core */}
          <radialGradient id="core-ambient" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#a8e063" stopOpacity="0.2" />
            <stop offset="60%" stopColor="#a8e063" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#a8e063" stopOpacity="0" />
          </radialGradient>

          {/* Node gradient */}
          <radialGradient id="node-active-grad" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#c5f57a" />
            <stop offset="100%" stopColor="#6aaf2a" />
          </radialGradient>
        </defs>

        {/* ── Ambient background glow ── */}
        <circle cx={cx} cy={cy} r="240" fill="url(#core-ambient)" />

        {/* ── Outer ring (decoration) ── */}
        <circle
          cx={cx} cy={cy} r={r2}
          fill="none"
          stroke="#a8e063"
          strokeWidth="0.5"
          strokeDasharray="3 15"
          opacity="0.15"
          className={prefersReducedMotion ? '' : 'animate-orbit-reverse'}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* ── Middle decorative ring ── */}
        <circle
          cx={cx} cy={cy} r="195"
          fill="none"
          stroke="#a8e063"
          strokeWidth="0.3"
          strokeDasharray="1 25"
          opacity="0.08"
        />

        {/* ── Inner orbit ring ── */}
        <circle
          cx={cx} cy={cy} r={r1}
          fill="none"
          stroke="#a8e063"
          strokeWidth="0.75"
          strokeDasharray="4 10"
          opacity="0.25"
        />

        {/* ── Signal dot on outer ring ── */}
        {!prefersReducedMotion && (
          <circle
            cx={signalX2} cy={signalY2} r="3"
            fill="#5be4c8"
            opacity="0.6"
            filter="url(#signal-glow)"
          />
        )}

        {/* ── Signal dot on inner orbit ── */}
        {!prefersReducedMotion && (
          <circle
            cx={signalX} cy={signalY} r="4"
            fill="#a8e063"
            filter="url(#signal-glow)"
          />
        )}

        {/* ── Orbit Nodes ── */}
        {nodePositions.map((node, i) => {
          const isActive = i === activeNode
          const isPrev = i < activeNode
          return (
            <g key={node.id}>
              {/* Connection line to center */}
              <line
                x1={cx} y1={cy}
                x2={node.x} y2={node.y}
                stroke="#a8e063"
                strokeWidth="0.4"
                opacity={isActive ? 0.3 : isPrev ? 0.12 : 0.06}
                style={{ transition: 'opacity 0.5s ease' }}
              />

              {/* Node outer ring */}
              <circle
                cx={node.x} cy={node.y} r={isActive ? 18 : 14}
                fill="none"
                stroke="#a8e063"
                strokeWidth={isActive ? 1.5 : 0.75}
                opacity={isActive ? 0.8 : isPrev ? 0.35 : 0.2}
                filter={isActive ? 'url(#node-glow)' : undefined}
                style={{ transition: 'all 0.5s ease' }}
              />

              {/* Node inner fill */}
              <circle
                cx={node.x} cy={node.y} r={isActive ? 9 : 6}
                fill={isActive ? 'url(#node-active-grad)' : '#a8e063'}
                opacity={isActive ? 1 : isPrev ? 0.3 : 0.15}
                filter={isActive ? 'url(#node-glow)' : undefined}
                style={{ transition: 'all 0.5s ease' }}
              />

              {/* Node pulse ring (active only) */}
              {isActive && !prefersReducedMotion && (
                <circle
                  cx={node.x} cy={node.y} r="22"
                  fill="none"
                  stroke="#a8e063"
                  strokeWidth="1"
                  opacity="0.4"
                  className="animate-ping-slow"
                />
              )}

              {/* Node label */}
              <text
                x={node.x}
                y={node.y + (node.y > cy ? 34 : -26)}
                textAnchor="middle"
                fill={isActive ? '#a8e063' : '#888878'}
                fontSize="8"
                fontFamily="JetBrains Mono, monospace"
                fontWeight={isActive ? '600' : '400'}
                letterSpacing="0.08em"
                style={{ transition: 'all 0.5s ease' }}
              >
                {node.label}
              </text>
              <text
                x={node.x}
                y={node.y + (node.y > cy ? 44 : -16)}
                textAnchor="middle"
                fill={isActive ? '#6aaf2a' : '#5a5a50'}
                fontSize="6.5"
                fontFamily="JetBrains Mono, monospace"
                letterSpacing="0.06em"
                style={{ transition: 'all 0.5s ease' }}
              >
                {node.sublabel}
              </text>
            </g>
          )
        })}

        {/* ── Central AI Core ── */}
        {/* Outer pulse ring */}
        {!prefersReducedMotion && (
          <circle
            cx={cx} cy={cy} r="45"
            fill="none"
            stroke="#a8e063"
            strokeWidth="1"
            opacity="0.15"
            className="animate-ping-slow"
          />
        )}

        {/* Core background */}
        <circle
          cx={cx} cy={cy} r="36"
          fill="#0d0d0a"
          stroke="#a8e063"
          strokeWidth="1.5"
          opacity="0.9"
        />
        <circle
          cx={cx} cy={cy} r="30"
          fill="none"
          stroke="#a8e063"
          strokeWidth="0.5"
          strokeDasharray="2 6"
          opacity="0.4"
          className={prefersReducedMotion ? '' : 'animate-orbit-fast'}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* Core icon — AI crosshair */}
        <circle cx={cx} cy={cy} r="18" fill="#a8e063" opacity="0.08" />
        <circle cx={cx} cy={cy} r="6" fill="#a8e063" opacity="0.8" filter="url(#core-glow)" />

        {/* Core lines */}
        <line x1={cx-22} y1={cy} x2={cx-10} y2={cy} stroke="#a8e063" strokeWidth="0.75" opacity="0.5" />
        <line x1={cx+10} y1={cy} x2={cx+22} y2={cy} stroke="#a8e063" strokeWidth="0.75" opacity="0.5" />
        <line x1={cx} y1={cy-22} x2={cx} y2={cy-10} stroke="#a8e063" strokeWidth="0.75" opacity="0.5" />
        <line x1={cx} y1={cy+10} x2={cx} y2={cy+22} stroke="#a8e063" strokeWidth="0.75" opacity="0.5" />

        {/* Core label */}
        <text
          x={cx} y={cy + 52}
          textAnchor="middle"
          fill="#a8e063"
          fontSize="7.5"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="600"
          letterSpacing="0.12em"
          opacity="0.8"
        >
          AI RISK ENGINE
        </text>

        {/* ── Health Factor floating panel ── */}
        <g transform={`translate(${cx + 190}, ${cy - 80})`}>
          <rect x="0" y="0" width="100" height="58" rx="3" fill="#111110" stroke="#242420" strokeWidth="1" />
          <rect x="0" y="0" width="100" height="58" rx="3" fill="#a8e063" fillOpacity="0.02" />

          <text x="8" y="14" fill="#5a5a50" fontSize="6" fontFamily="JetBrains Mono, monospace" letterSpacing="0.1em">HEALTH FACTOR</text>
          <text x="8" y="30" fill="#a8e063" fontSize="18" fontFamily="Space Grotesk, sans-serif" fontWeight="700">1.82</text>
          <text x="8" y="42" fill="#a8e063" fontSize="7" fontFamily="JetBrains Mono, monospace" letterSpacing="0.08em" fontWeight="600">● SAFE</text>

          {/* Mini HF bar */}
          <rect x="8" y="48" width="84" height="3" rx="1.5" fill="#242420" />
          <rect x="8" y="48" width={84 * 0.6} height="3" rx="1.5" fill="#a8e063" />
          <line x1={8 + 84 * 0.3} y1="46" x2={8 + 84 * 0.3} y2="52" stroke="#e8a040" strokeWidth="1" />
        </g>

        {/* ── Scan beam (rotating) ── */}
        {!prefersReducedMotion && (
          <line
            x1={cx} y1={cy}
            x2={cx + r1} y2={cy}
            stroke="#a8e063"
            strokeWidth="0.5"
            opacity="0.15"
            className="animate-orbit-fast"
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
        )}

        {/* ── Small tech label bottom ── */}
        <text
          x={cx} y="555"
          textAnchor="middle"
          fill="#3a3a34"
          fontSize="7"
          fontFamily="JetBrains Mono, monospace"
          letterSpacing="0.12em"
        >
          DEMO VISUALIZATION · NOT LIVE DATA
        </text>
      </svg>
    </div>
  )
}
