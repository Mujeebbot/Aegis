import React, { useState } from 'react'

// ─── HeroMonument3D ───────────────────────────────────────────────────────────
// High-fidelity 3D Aegis Defense Monument matching the exact reference composition
// Features volumetric glass cube, levitating metallic sphere, and 6 connected HUD callouts
// ─────────────────────────────────────────────────────────────────────────────

interface CalloutNode {
  id: string
  label: string
  icon: React.ReactNode
  positionClasses: string // absolute positioning on container
  lineSvg: React.ReactNode // leader line connecting badge to object
}

export function HeroMonument3D() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setMousePos({ x, y })
  }

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 })
    setHoveredNode(null)
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-[620px] aspect-square mx-auto flex items-center justify-center select-none"
      style={{
        transform: `perspective(1000px) rotateY(${mousePos.x * 6}deg) rotateX(${-mousePos.y * 6}deg)`,
        transition: 'transform 0.2s ease-out',
      }}
    >
      {/* Volumetric Green Ambient Glow behind Monument */}
      <div
        className="absolute inset-0 pointer-events-none rounded-full blur-[90px] opacity-40"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(168,224,99,0.35) 0%, rgba(13,31,20,0.6) 50%, transparent 75%)',
        }}
      />

      {/* Central 3D Monument Artwork */}
      <div className="relative w-[82%] h-[82%] rounded-2xl overflow-hidden flex items-center justify-center shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-[rgba(168,224,99,0.15)] bg-[#050c07]/80">
        <img
          src="/aegis_monument.jpg"
          alt="Aegis 3D Defense Core"
          className="w-full h-full object-cover mix-blend-screen scale-[1.03] transition-transform duration-700 ease-out"
        />

        {/* Dynamic Light Sweep & Pulse Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#040805]/90 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(168,224,99,0.18)_0%,transparent_65%)] pointer-events-none animate-pulse-slow" />
      </div>

      {/* SVG Leader Lines Layer */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        viewBox="0 0 600 600"
        fill="none"
      >
        {/* 1. ETHEREUM: Top-Left angled line to top of glass cube */}
        <path
          d="M 320 105 L 345 105 L 375 145"
          stroke="#a8e063"
          strokeWidth="1"
          strokeOpacity={hoveredNode === 'eth' ? 1 : 0.45}
          strokeDasharray="2 3"
        />
        <circle cx="375" cy="145" r="2.5" fill="#a8e063" opacity={0.8} />

        {/* 2. AI RISK ENGINE: Top-Right angled line to sphere top */}
        <path
          d="M 480 140 L 460 140 L 420 180"
          stroke="#a8e063"
          strokeWidth="1"
          strokeOpacity={hoveredNode === 'ai' ? 1 : 0.45}
          strokeDasharray="2 3"
        />
        <circle cx="420" cy="180" r="2.5" fill="#a8e063" opacity={0.8} />

        {/* 3. SOLANA: Mid-Right line to right orbit node */}
        <path
          d="M 525 210 L 490 210 L 465 230"
          stroke="#a8e063"
          strokeWidth="1"
          strokeOpacity={hoveredNode === 'sol' ? 1 : 0.45}
          strokeDasharray="2 3"
        />
        <circle cx="465" cy="230" r="2.5" fill="#a8e063" opacity={0.8} />

        {/* 4. PROTECTED POSITION: Bottom-Right line to pedestal tier */}
        <path
          d="M 500 420 L 470 420 L 440 395"
          stroke="#a8e063"
          strokeWidth="1"
          strokeOpacity={hoveredNode === 'prot' ? 1 : 0.45}
          strokeDasharray="2 3"
        />
        <circle cx="440" cy="395" r="2.5" fill="#a8e063" opacity={0.8} />

        {/* 5. ATTESTCOIN: Bottom-Center-Left line to base front */}
        <path
          d="M 290 425 L 320 425 L 350 400"
          stroke="#a8e063"
          strokeWidth="1"
          strokeOpacity={hoveredNode === 'attest' ? 1 : 0.45}
          strokeDasharray="2 3"
        />
        <circle cx="350" cy="400" r="2.5" fill="#a8e063" opacity={0.8} />

        {/* 6. CREDITCOIN: Mid-Left line to left orbit node */}
        <path
          d="M 285 260 L 310 260 L 335 275"
          stroke="#a8e063"
          strokeWidth="1"
          strokeOpacity={hoveredNode === 'ctc' ? 1 : 0.45}
          strokeDasharray="2 3"
        />
        <circle cx="335" cy="275" r="2.5" fill="#a8e063" opacity={0.8} />
      </svg>

      {/* ── 6 Connected HUD Callout Badges ── */}

      {/* 1. ETHEREUM (Top-Center / Left) */}
      <div
        className="absolute top-[13%] left-[42%] -translate-x-1/2 z-20"
        onMouseEnter={() => setHoveredNode('eth')}
        onMouseLeave={() => setHoveredNode(null)}
      >
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#07130b]/90 border border-[rgba(168,224,99,0.35)] shadow-[0_0_15px_rgba(168,224,99,0.2)] backdrop-blur-md cursor-pointer hover:border-[#a8e063] transition-all">
          <EthIcon className="w-3.5 h-3.5 text-[#a8e063]" />
          <span className="font-mono text-[10px] font-bold tracking-wider text-white">
            ETHEREUM
          </span>
        </div>
      </div>

      {/* 2. AI RISK ENGINE (Top-Right) */}
      <div
        className="absolute top-[20%] right-[3%] z-20"
        onMouseEnter={() => setHoveredNode('ai')}
        onMouseLeave={() => setHoveredNode(null)}
      >
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#07130b]/90 border border-[rgba(168,224,99,0.35)] shadow-[0_0_15px_rgba(168,224,99,0.2)] backdrop-blur-md cursor-pointer hover:border-[#a8e063] transition-all">
          <AiEngineIcon className="w-3.5 h-3.5 text-[#a8e063]" />
          <span className="font-mono text-[10px] font-bold tracking-wider text-white">
            AI RISK ENGINE
          </span>
        </div>
      </div>

      {/* 3. SOLANA (Mid-Right) */}
      <div
        className="absolute top-[32%] right-[1%] z-20"
        onMouseEnter={() => setHoveredNode('sol')}
        onMouseLeave={() => setHoveredNode(null)}
      >
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#07130b]/90 border border-[rgba(168,224,99,0.35)] shadow-[0_0_15px_rgba(168,224,99,0.2)] backdrop-blur-md cursor-pointer hover:border-[#a8e063] transition-all">
          <SolanaIcon className="w-3.5 h-3.5 text-[#a8e063]" />
          <span className="font-mono text-[10px] font-bold tracking-wider text-white">
            SOLANA
          </span>
        </div>
      </div>

      {/* 4. PROTECTED POSITION (Bottom-Right) */}
      <div
        className="absolute bottom-[28%] right-[2%] z-20"
        onMouseEnter={() => setHoveredNode('prot')}
        onMouseLeave={() => setHoveredNode(null)}
      >
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#07130b]/90 border border-[rgba(168,224,99,0.35)] shadow-[0_0_15px_rgba(168,224,99,0.2)] backdrop-blur-md cursor-pointer hover:border-[#a8e063] transition-all">
          <ShieldIcon className="w-3.5 h-3.5 text-[#a8e063]" />
          <span className="font-mono text-[10px] font-bold tracking-wider text-white">
            PROTECTED POSITION
          </span>
        </div>
      </div>

      {/* 5. ATTESTCOIN (Bottom-Center / Left) */}
      <div
        className="absolute bottom-[27%] left-[32%] -translate-x-1/2 z-20"
        onMouseEnter={() => setHoveredNode('attest')}
        onMouseLeave={() => setHoveredNode(null)}
      >
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#07130b]/90 border border-[rgba(168,224,99,0.35)] shadow-[0_0_15px_rgba(168,224,99,0.2)] backdrop-blur-md cursor-pointer hover:border-[#a8e063] transition-all">
          <AttestIcon className="w-3.5 h-3.5 text-[#a8e063]" />
          <span className="font-mono text-[10px] font-bold tracking-wider text-white">
            ATTESTCOIN
          </span>
        </div>
      </div>

      {/* 6. CREDITCOIN (Mid-Left) */}
      <div
        className="absolute top-[41%] left-[2%] z-20"
        onMouseEnter={() => setHoveredNode('ctc')}
        onMouseLeave={() => setHoveredNode(null)}
      >
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#07130b]/90 border border-[rgba(168,224,99,0.35)] shadow-[0_0_15px_rgba(168,224,99,0.2)] backdrop-blur-md cursor-pointer hover:border-[#a8e063] transition-all">
          <CreditcoinIcon className="w-3.5 h-3.5 text-[#a8e063]" />
          <span className="font-mono text-[10px] font-bold tracking-wider text-white">
            CREDITCOIN
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── SVG Icons matching HUD ───────────────────────────────────────────────────

function EthIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1.5L4.5 12.25L12 16.5L19.5 12.25L12 1.5Z" opacity="0.9" />
      <path d="M12 17.5L4.5 13.25L12 22.5L19.5 13.25L12 17.5Z" opacity="0.6" />
    </svg>
  )
}

function AiEngineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.4" />
      <circle cx="12" cy="4" r="2" />
      <circle cx="12" cy="20" r="2" />
      <circle cx="4" cy="12" r="2" />
      <circle cx="20" cy="12" r="2" />
      <path d="M12 6v3M12 15v3M6 12h3M15 12h3" />
    </svg>
  )
}

function SolanaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 17.5h13.5l2.5 2.5H6.5L4 17.5zm0-7.5h13.5l2.5 2.5H6.5L4 10zm2.5-7.5H20l-2.5 2.5H4l2.5-2.5z" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L4 6v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V6l-8-4z" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AttestIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  )
}

function CreditcoinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9a4.5 4.5 0 1 0 0 6" strokeLinecap="round" />
    </svg>
  )
}
