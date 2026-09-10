import React from 'react'

// ─── AmbientBackground ────────────────────────────────────────────────────────
// The signature visual element: near-black environment with a large diffuse
// green radial glow — like light emerging from infrastructure.
// Follows cursor subtly on desktop.
// ─────────────────────────────────────────────────────────────────────────────

interface AmbientBackgroundProps {
  intensity?: 'low' | 'medium' | 'high'
  fixed?: boolean
  className?: string
}

export function AmbientBackground({
  intensity = 'medium',
  fixed = true,
  className,
}: AmbientBackgroundProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const glowRef = React.useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  // Subtle cursor tracking for the ambient glow
  React.useEffect(() => {
    if (prefersReducedMotion || !glowRef.current) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!glowRef.current) return
      const x = (e.clientX / window.innerWidth) * 100
      const y = (e.clientY / window.innerHeight) * 100
      // Very subtle — only moves 8% in each direction
      const dx = (x - 50) * 0.08
      const dy = (y - 50) * 0.08
      glowRef.current.style.transform = `translate(calc(-50% + ${dx}vw), calc(-50% + ${dy}vh))`
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [prefersReducedMotion])

  const glowOpacity = { low: 0.12, medium: 0.18, high: 0.28 }[intensity]
  const glowSize = { low: '60vmax', medium: '80vmax', high: '100vmax' }[intensity]

  return (
    <div
      ref={containerRef}
      className={[
        fixed ? 'fixed' : 'absolute',
        'inset-0 overflow-hidden pointer-events-none z-0',
        className ?? '',
      ].join(' ')}
      aria-hidden="true"
    >
      {/* Base layer — deep near-black green */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #050806 0%, #07100b 40%, #09140d 75%, #050806 100%)',
        }}
      />

      {/* Primary ambient emerald glow — soft volumetric light source */}
      <div
        ref={glowRef}
        className={prefersReducedMotion ? '' : 'animate-drift'}
        style={{
          position: 'absolute',
          top: '38%',
          left: '52%',
          transform: 'translate(-50%, -50%)',
          width: glowSize,
          height: glowSize,
          borderRadius: '50%',
          background: `radial-gradient(ellipse at center,
            rgba(168,224,99,${glowOpacity * 0.95}) 0%,
            rgba(16,185,129,${glowOpacity * 0.45}) 25%,
            rgba(11,28,17,${glowOpacity * 0.2}) 50%,
            transparent 72%)`,
          transition: 'transform 0.8s cubic-bezier(0.25,0.1,0.25,1)',
          willChange: 'transform',
        }}
      />

      {/* Secondary atmospheric emerald light pool — top right */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          right: '10%',
          width: '55vmax',
          height: '55vmax',
          borderRadius: '50%',
          background: `radial-gradient(ellipse at center,
            rgba(168,224,99,0.06) 0%,
            rgba(91,228,200,0.03) 35%,
            transparent 65%)`,
        }}
      />

      {/* Tertiary soft ambient pool — bottom left */}
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '5%',
          width: '50vmax',
          height: '50vmax',
          borderRadius: '50%',
          background: `radial-gradient(ellipse at center,
            rgba(16,185,129,0.04) 0%,
            transparent 60%)`,
        }}
      />

      {/* Vignette — luxury edge shadow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 110% 110% at 50% 50%,
            transparent 45%,
            rgba(5,8,6,0.6) 80%,
            #050806 100%)`,
        }}
      />

      {/* Noise grain SVG filter layer */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.035]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="ambient-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#ambient-noise)" />
      </svg>
    </div>
  )
}

// ─── GridOverlay ──────────────────────────────────────────────────────────────
// Ultra-subtle technical grid — structural, not decorative

export function GridOverlay({ opacity = 0.03 }: { opacity?: number }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
      style={{ opacity }}
    >
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#a8e063" strokeWidth="0.5" />
          </pattern>
          <pattern id="grid-large" width="300" height="300" patternUnits="userSpaceOnUse">
            <path d="M 300 0 L 0 0 0 300" fill="none" stroke="#a8e063" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <rect width="100%" height="100%" fill="url(#grid-large)" opacity="0.5" />
      </svg>
    </div>
  )
}

// ─── OrbitalLines ────────────────────────────────────────────────────────────
// Thin SVG orbital rings — the Aegis protection motif

export interface OrbitalRing {
  rx: number
  ry: number
  opacity: number
  speed: 'slow' | 'medium' | 'reverse'
}

interface OrbitalLinesProps {
  cx?: number
  cy?: number
  className?: string
  rings?: OrbitalRing[]
}

const DEFAULT_RINGS: OrbitalRing[] = [
  { rx: 200, ry: 80,  opacity: 0.08, speed: 'slow' },
  { rx: 320, ry: 130, opacity: 0.06, speed: 'reverse' },
  { rx: 420, ry: 170, opacity: 0.04, speed: 'slow' },
  { rx: 520, ry: 210, opacity: 0.025, speed: 'medium' },
]

export function OrbitalLines({
  cx = 50,
  cy = 50,
  className,
  rings = DEFAULT_RINGS,
}: OrbitalLinesProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div
      className={['absolute inset-0 pointer-events-none overflow-hidden', className ?? ''].join(' ')}
      aria-hidden="true"
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 1000 700"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {rings.map((ring, i) => (
          <ellipse
            key={i}
            cx={cx * 10}
            cy={cy * 7}
            rx={ring.rx}
            ry={ring.ry}
            fill="none"
            stroke="#a8e063"
            strokeWidth="0.75"
            strokeDasharray="4 12"
            opacity={ring.opacity}
            className={prefersReducedMotion ? '' :
              ring.speed === 'slow' ? 'animate-orbit-slow' :
              ring.speed === 'reverse' ? 'animate-orbit-reverse' :
              'animate-orbit-fast'
            }
            style={{ transformOrigin: `${cx * 10}px ${cy * 7}px` }}
          />
        ))}

        {/* Construction lines */}
        <line
          x1={cx * 10 - 400} y1={cy * 7}
          x2={cx * 10 + 400} y2={cy * 7}
          stroke="#a8e063" strokeWidth="0.3" opacity="0.04"
          strokeDasharray="2 20"
        />
        <line
          x1={cx * 10} y1={cy * 7 - 300}
          x2={cx * 10} y2={cy * 7 + 300}
          stroke="#a8e063" strokeWidth="0.3" opacity="0.04"
          strokeDasharray="2 20"
        />
      </svg>
    </div>
  )
}

// ─── Hook: useReducedMotion ───────────────────────────────────────────────────

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  )

  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduced
}
