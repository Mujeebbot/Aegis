import React, { useEffect, useRef } from 'react'

// ─── AmbientBackground ────────────────────────────────────────────────────────
// Signature visual background: Near-black obsidian environment with continuous,
// ultra-sleek 60fps particle telemetry stream, scanning laser beams, and drifting
// volumetric green light pools. Non-bulky, high performance canvas.
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
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  // 1. Mouse Tracking for Subtle Volumetric Shift
  useEffect(() => {
    if (prefersReducedMotion || !glowRef.current) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!glowRef.current) return
      const x = (e.clientX / window.innerWidth) * 100
      const y = (e.clientY / window.innerHeight) * 100
      const dx = (x - 50) * 0.08
      const dy = (y - 50) * 0.08
      glowRef.current.style.transform = `translate(calc(-50% + ${dx}vw), calc(-50% + ${dy}vh))`
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [prefersReducedMotion])

  // 2. High-Performance 60fps Continuous Canvas Particle Stream & Laser Sweeps
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || prefersReducedMotion) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    // Generate 45 lightweight particle nodes
    const PARTICLE_COUNT = 45
    const particles: {
      x: number
      y: number
      radius: number
      vx: number
      vy: number
      alpha: number
      baseAlpha: number
      pulseSpeed: number
      color: string
    }[] = []

    const colors = ['#a8e063', '#c5f57a', '#34d399', '#22c55e']

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.8,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.2 - Math.random() * 0.4, // Gentle upward drift
        alpha: Math.random() * 0.4 + 0.1,
        baseAlpha: Math.random() * 0.35 + 0.1,
        pulseSpeed: Math.random() * 0.02 + 0.008,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    // Laser Beam Sweep State
    let laserY = 0
    const laserSpeed = 1.2

    let time = 0

    const render = () => {
      ctx.clearRect(0, 0, width, height)
      time += 0.015

      // A. Draw Subtle Horizontal Laser Beam Sweep
      laserY = (laserY + laserSpeed) % (height + 200)
      if (laserY < height) {
        const grad = ctx.createLinearGradient(0, laserY, width, laserY)
        grad.addColorStop(0, 'rgba(168,224,99,0)')
        grad.addColorStop(0.3, 'rgba(168,224,99,0.06)')
        grad.addColorStop(0.5, 'rgba(197,245,122,0.12)')
        grad.addColorStop(0.7, 'rgba(168,224,99,0.06)')
        grad.addColorStop(1, 'rgba(168,224,99,0)')

        ctx.strokeStyle = grad
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(0, laserY)
        ctx.lineTo(width, laserY)
        ctx.stroke()
      }

      // B. Render Floating Particles & Constellation Links
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        // Update position
        p.x += p.vx + Math.sin(time + i) * 0.15
        p.y += p.vy

        // Wrap around screen boundaries
        if (p.y < -10) {
          p.y = height + 10
          p.x = Math.random() * width
        }
        if (p.x < -10) p.x = width + 10
        if (p.x > width + 10) p.x = -10

        // Pulsate Alpha
        p.alpha = p.baseAlpha + Math.sin(time * 2 + i) * 0.08

        // Draw Particle Core
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha))
        ctx.fill()

        // Draw Soft Glow Halo around larger particles
        if (p.radius > 1.8) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius * 3.5, 0, Math.PI * 2)
          ctx.fillStyle = p.color
          ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha * 0.25))
          ctx.fill()
        }

        // Draw Constellation Lines between nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 110) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            const lineAlpha = (1 - dist / 110) * 0.08 * p.alpha
            ctx.strokeStyle = '#a8e063'
            ctx.globalAlpha = Math.max(0, Math.min(1, lineAlpha))
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      ctx.globalAlpha = 1.0
      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
    }
  }, [prefersReducedMotion])

  const glowOpacity = { low: 0.12, medium: 0.2, high: 0.32 }[intensity]
  const glowSize = { low: '60vmax', medium: '85vmax', high: '105vmax' }[intensity]

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
      {/* Deep Obsidian Emerald Gradient Base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, #08160c 0%, #040905 55%, #020503 100%)',
        }}
      />

      {/* Dynamic Canvas Layer for 60fps Particles & Laser Sweeps */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60 z-0" />

      {/* Primary Ambient Emerald Volumetric Glow Source */}
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
            rgba(34,197,94,${glowOpacity * 0.4}) 25%,
            rgba(11,28,17,${glowOpacity * 0.15}) 50%,
            transparent 72%)`,
          transition: 'transform 0.8s cubic-bezier(0.25,0.1,0.25,1)',
          willChange: 'transform',
        }}
      />

      {/* Top Right Floating Glow Pool */}
      <div
        className="animate-pulse-slow"
        style={{
          position: 'absolute',
          top: '10%',
          right: '5%',
          width: '55vmax',
          height: '55vmax',
          borderRadius: '50%',
          background: `radial-gradient(ellipse at center,
            rgba(197,245,122,0.08) 0%,
            rgba(16,185,129,0.03) 40%,
            transparent 70%)`,
        }}
      />

      {/* Bottom Left Floating Glow Pool */}
      <div
        className="animate-pulse-slow"
        style={{
          position: 'absolute',
          bottom: '5%',
          left: '2%',
          width: '50vmax',
          height: '50vmax',
          borderRadius: '50%',
          background: `radial-gradient(ellipse at center,
            rgba(52,211,153,0.06) 0%,
            transparent 65%)`,
        }}
      />

      {/* Subtle Structural Cybernetic Grid Lines */}
      <GridOverlay opacity={0.035} />

      {/* Vignette Shadow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 120% 120% at 50% 50%,
            transparent 50%,
            rgba(3,7,4,0.7) 85%,
            #030704 100%)`,
        }}
      />
    </div>
  )
}

// ─── GridOverlay ──────────────────────────────────────────────────────────────
export function GridOverlay({ opacity = 0.035 }: { opacity?: number }) {
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
  { rx: 200, ry: 80, opacity: 0.08, speed: 'slow' },
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
            className={
              prefersReducedMotion
                ? ''
                : ring.speed === 'slow'
                ? 'animate-orbit-slow'
                : ring.speed === 'reverse'
                ? 'animate-orbit-reverse'
                : 'animate-orbit-fast'
            }
            style={{ transformOrigin: `${cx * 10}px ${cy * 7}px` }}
          />
        ))}

        <line
          x1={cx * 10 - 400}
          y1={cy * 7}
          x2={cx * 10 + 400}
          y2={cy * 7}
          stroke="#a8e063"
          strokeWidth="0.3"
          opacity="0.04"
          strokeDasharray="2 20"
        />
        <line
          x1={cx * 10}
          y1={cy * 7 - 300}
          x2={cx * 10}
          y2={cy * 7 + 300}
          stroke="#a8e063"
          strokeWidth="0.3"
          opacity="0.04"
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

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduced
}

