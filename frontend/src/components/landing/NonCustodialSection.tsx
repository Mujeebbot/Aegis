import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { SectionLabel } from '../ui/SectionLabel'
import { ScrollReveal } from '../ui/TechnicalPanel'

// ─── NonCustodialSection ──────────────────────────────────────────────────────
// "YOUR CAPITAL. YOUR CONTROL."
// Features interactive 3D Transparent Permission Boundary Vault
// Demonstrating exact cryptographic bounds of Aegis execution
// ─────────────────────────────────────────────────────────────────────────────

const PERMISSION_RULES = {
  can: [
    {
      title: 'Repay loan debt on your behalf',
      detail: 'Only triggered when Health Factor breaches your configured threshold (e.g. HF < 1.15).',
    },
    {
      title: 'Rebalance designated collateral assets',
      detail: 'Restricted strictly to the pair and pool specified in your signed policy.',
    },
    {
      title: 'Execute pre-approved contract calls',
      detail: 'Bound to official Aave V3, Compound V3, and Morpho Blue contract addresses.',
    },
    {
      title: 'Verify state proofs on Creditcoin CC3',
      detail: 'Requires 100% cryptographic validation by the Block Prover before any dispatch.',
    },
  ],
  cannot: [
    {
      title: 'Never withdraw or transfer funds to external wallets',
      detail: 'Smart contract possesses no ERC-20 transfer permissions to external recipient addresses.',
    },
    {
      title: 'Never act outside configured thresholds',
      detail: 'If position HF is safe, execution is rejected on-chain by the SAFE_THRESHOLD invariant.',
    },
    {
      title: 'Never modify your collateral allocation without proof',
      detail: 'Requires immutable Merkle proofs verified on CC3 consensus.',
    },
    {
      title: 'Never lock or seize user assets',
      detail: 'You retain full custody, private keys, and instant withdrawal rights at all times.',
    },
  ],
}

export function NonCustodialSection() {
  const mountRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)
  const [activeTab, setActiveTab] = useState<'can' | 'cannot'>('can')

  // 3D Permission Boundary Vault
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const scene = new THREE.Scene()
    const aspect = container.clientWidth / container.clientHeight
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100)
    camera.position.set(0, 0.1, 5.2)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // Lighting
    const ambient = new THREE.AmbientLight(0x0d2818, 1.8)
    scene.add(ambient)

    const topLight = new THREE.DirectionalLight(0xa8e063, 2.5)
    topLight.position.set(2, 6, 4)
    scene.add(topLight)

    const coreLight = new THREE.PointLight(0xa8e063, 3.0, 8)
    coreLight.position.set(0, 0, 0)
    scene.add(coreLight)

    const vaultGroup = new THREE.Group()
    vaultGroup.position.set(0, 0, 0)
    scene.add(vaultGroup)

    // 1. Outer Wireframe Cube: "User Wallet Custody Boundary"
    const outerGeo = new THREE.BoxGeometry(2.2, 2.2, 2.2)
    const outerMat = new THREE.MeshPhysicalMaterial({
      color: 0x224430,
      metalness: 0.2,
      roughness: 0.1,
      transmission: 0.85,
      transparent: true,
      opacity: 0.25,
      wireframe: false,
    })
    const outerCube = new THREE.Mesh(outerGeo, outerMat)
    vaultGroup.add(outerCube)

    const outerEdges = new THREE.EdgesGeometry(outerGeo)
    const outerEdgeMat = new THREE.LineBasicMaterial({
      color: 0x4e6e58,
      transparent: true,
      opacity: 0.5,
    })
    const outerLine = new THREE.LineSegments(outerEdges, outerEdgeMat)
    vaultGroup.add(outerLine)

    // 2. Inner Bounded Sphere: "Aegis Protected Zone"
    const innerGeo = new THREE.OctahedronGeometry(0.85, 2)
    const innerMat = new THREE.MeshPhysicalMaterial({
      color: 0xa8e063,
      metalness: 0.3,
      roughness: 0.1,
      transmission: 0.5,
      transparent: true,
      opacity: 0.65,
    })
    const innerShield = new THREE.Mesh(innerGeo, innerMat)
    vaultGroup.add(innerShield)

    const innerEdges = new THREE.EdgesGeometry(innerGeo)
    const innerEdgeMat = new THREE.LineBasicMaterial({
      color: 0xc5f57a,
      transparent: true,
      opacity: 0.8,
    })
    const innerLine = new THREE.LineSegments(innerEdges, innerEdgeMat)
    vaultGroup.add(innerLine)

    // 3. Floating Defense Shield Rings
    const ringGeo = new THREE.RingGeometry(1.3, 1.34, 48)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xa8e063,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
    })
    const ring1 = new THREE.Mesh(ringGeo, ringMat)
    ring1.rotation.x = Math.PI / 2
    vaultGroup.add(ring1)

    const ring2 = new THREE.Mesh(ringGeo, ringMat)
    ring2.rotation.y = Math.PI / 2
    vaultGroup.add(ring2)

    // Mouse Parallax
    let mouseX = 0
    let mouseY = 0
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    }
    container.addEventListener('mousemove', onMouseMove)

    // Animation Loop
    let clock = new THREE.Clock()
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

      vaultGroup.rotation.y = t * 0.2 + mouseX * 0.3
      vaultGroup.rotation.x = Math.sin(t * 0.3) * 0.15 + mouseY * 0.2

      innerShield.rotation.y = -t * 0.5
      innerShield.rotation.z = t * 0.3

      const pulse = 1.0 + Math.sin(t * 2.5) * 0.04
      innerShield.scale.set(pulse, pulse, pulse)

      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      if (!container) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      container.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      outerGeo.dispose()
      outerMat.dispose()
      outerEdges.dispose()
      outerEdgeMat.dispose()
      innerGeo.dispose()
      innerMat.dispose()
      innerEdges.dispose()
      innerEdgeMat.dispose()
      ringGeo.dispose()
      ringMat.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <section
      id="trust"
      className="relative section-padding overflow-hidden"
      aria-label="Non-custodial security boundary"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
        <ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <SectionLabel className="mb-4">Non-Custodial Architecture</SectionLabel>
              <h2 className="font-display text-display-lg font-bold text-white tracking-tight">
                Your capital.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-aegis-lime via-[#c5f57a] to-emerald-400">
                  Your sovereign control.
                </span>
              </h2>
            </div>
            <p className="text-aegis-muted text-sm max-w-md leading-relaxed">
              Aegis executes within mathematically constrained permission boundaries. We never hold your keys, never take custody of your collateral, and cannot transfer funds to outside addresses.
            </p>
          </div>
        </ScrollReveal>

        {/* 3D Transparent Permission Vault + Scope Inspector */}
        <ScrollReveal delay={100}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: 3D Transparent Vault */}
            <div className="lg:col-span-5 glass-panel-luxury p-4 rounded-2xl border border-aegis-border-emerald relative overflow-hidden h-[420px] md:h-[480px]">
              <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/[0.08] backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-aegis-lime animate-pulse" />
                <span className="font-mono text-[10px] text-aegis-muted uppercase tracking-widest">
                  PERMISSION VAULT • ZERO CUSTODY
                </span>
              </div>
              <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between text-[11px] font-mono p-2.5 rounded-xl bg-black/70 border border-white/[0.08]">
                <span className="text-white/60">Custody State:</span>
                <span className="text-aegis-lime font-bold">100% User Sovereign</span>
              </div>
            </div>

            {/* Right: Permission Boundary Rules Switcher */}
            <div className="lg:col-span-7 space-y-4">
              <div className="glass-panel-luxury p-6 rounded-2xl border border-aegis-border-emerald">
                {/* Tab Switcher */}
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-6">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('can')}
                      className={`font-mono text-xs font-bold px-4 py-2 rounded-lg transition-all ${
                        activeTab === 'can'
                          ? 'bg-aegis-lime text-black shadow-[0_0_12px_#a8e063]'
                          : 'bg-[#08150d] text-white/60 hover:text-white border border-white/[0.06]'
                      }`}
                    >
                      ✓ What Aegis CAN Do
                    </button>
                    <button
                      onClick={() => setActiveTab('cannot')}
                      className={`font-mono text-xs font-bold px-4 py-2 rounded-lg transition-all ${
                        activeTab === 'cannot'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(168,224,99,0.15)]'
                          : 'bg-[#08150d] text-white/60 hover:text-white border border-white/[0.06]'
                      }`}
                    >
                      ✕ What Aegis CANNOT Do
                    </button>
                  </div>
                  <span className="font-mono text-[11px] text-aegis-muted hidden sm:inline">
                    EIP-712 Scoped Signatures
                  </span>
                </div>

                {/* Rules List */}
                <div className="space-y-3 mb-6">
                  {PERMISSION_RULES[activeTab].map((rule, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition-all duration-300 ${
                        activeTab === 'can'
                          ? 'bg-[#07130a] border-aegis-lime/20 hover:border-aegis-lime/50'
                          : 'bg-[#08150e] border-white/[0.08] hover:border-emerald-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`font-mono text-sm font-bold mt-0.5 ${
                            activeTab === 'can' ? 'text-aegis-lime' : 'text-emerald-400'
                          }`}
                        >
                          {activeTab === 'can' ? '✓' : '⊘'}
                        </span>
                        <div>
                          <h4 className="font-display font-bold text-white text-sm mb-1">
                            {rule.title}
                          </h4>
                          <p className="font-mono text-xs text-aegis-muted leading-relaxed">
                            {rule.detail}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Verification Guard Stamp */}
                <div className="p-4 rounded-xl bg-[#061009] border border-white/[0.06] flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-aegis-lime" />
                    <span className="text-white/80">Invariant Enforced:</span>
                    <code className="text-aegis-lime">SAFE_THRESHOLD = 1.05</code>
                  </div>
                  <span className="text-[11px] text-white/40">Audit Ready</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
