import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { SectionLabel } from '../ui/SectionLabel'
import { ScrollReveal } from '../ui/TechnicalPanel'

// ─── AttestcoinSection ─────────────────────────────────────────────────────────
// Dedicated luxury section for Attestcoin (ASC) on Creditcoin CC3
// Features interactive 3D Cryptographic Proof Ring and live verification simulator
// ─────────────────────────────────────────────────────────────────────────────

export function AttestcoinSection() {
  const mountRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)
  const [activeStep, setActiveStep] = useState<number>(2) // 0 to 4
  const [liveBlock, setLiveBlock] = useState<number>(6492018)
  const [proofVerified, setProofVerified] = useState<boolean>(true)

  // 3D Proof Ring Scene
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const scene = new THREE.Scene()
    const aspect = container.clientWidth / container.clientHeight
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100)
    camera.position.set(0, 0, 5.2)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // Lights
    const ambient = new THREE.AmbientLight(0x0d2818, 2.0)
    scene.add(ambient)

    const greenLight = new THREE.PointLight(0xa8e063, 3.5, 12)
    greenLight.position.set(0, 0, 1.5)
    scene.add(greenLight)

    const emeraldLight = new THREE.PointLight(0x34d399, 2.0, 10)
    emeraldLight.position.set(-2, 2, 2)
    scene.add(emeraldLight)

    // Proof Ring Group
    const ringGroup = new THREE.Group()
    scene.add(ringGroup)

    // Outer Torus Ring with wireframe edge
    const torusGeo = new THREE.TorusGeometry(1.5, 0.05, 16, 64)
    const torusMat = new THREE.MeshPhysicalMaterial({
      color: 0xa8e063,
      metalness: 0.8,
      roughness: 0.1,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    })
    const torus = new THREE.Mesh(torusGeo, torusMat)
    ringGroup.add(torus)

    // Inner Concentric Ring
    const innerTorusGeo = new THREE.TorusGeometry(1.1, 0.03, 16, 48)
    const innerTorusMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.5,
    })
    const innerTorus = new THREE.Mesh(innerTorusGeo, innerTorusMat)
    innerTorus.rotation.x = Math.PI / 4
    ringGroup.add(innerTorus)

    // Central Cryptographic Proof Core
    const coreGeo = new THREE.IcosahedronGeometry(0.5, 1)
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0xc5f57a,
      metalness: 0.2,
      roughness: 0.1,
      transmission: 0.8,
      thickness: 0.5,
      transparent: true,
      opacity: 0.8,
    })
    const coreMesh = new THREE.Mesh(coreGeo, coreMat)
    ringGroup.add(coreMesh)

    // Orbiting Hash Shards (Merkle proof nodes)
    const shards: THREE.Mesh[] = []
    const shardGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12)
    const shardMat = new THREE.MeshBasicMaterial({ color: 0xa8e063 })

    for (let i = 0; i < 12; i++) {
      const shard = new THREE.Mesh(shardGeo, shardMat)
      const angle = (i / 12) * Math.PI * 2
      shard.position.set(Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, 0)
      ringGroup.add(shard)
      shards.push(shard)
    }

    // Interactive mouse rotation
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

      ringGroup.rotation.z = t * 0.25
      ringGroup.rotation.x = Math.sin(t * 0.5) * 0.2 + mouseY * 0.4
      ringGroup.rotation.y = Math.cos(t * 0.4) * 0.2 + mouseX * 0.4

      innerTorus.rotation.y = t * 0.6
      coreMesh.rotation.y = t * 0.8
      coreMesh.rotation.x = t * 0.5

      // Pulse core scale
      const scale = 1.0 + Math.sin(t * 3) * 0.06
      coreMesh.scale.set(scale, scale, scale)

      // Animate shards
      shards.forEach((s, idx) => {
        const offsetAngle = (idx / 12) * Math.PI * 2 + t * 0.3
        s.position.x = Math.cos(offsetAngle) * 1.5
        s.position.y = Math.sin(offsetAngle) * 1.5
        s.position.z = Math.sin(t * 2 + idx) * 0.2
      })

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
      torusGeo.dispose()
      torusMat.dispose()
      innerTorusGeo.dispose()
      innerTorusMat.dispose()
      coreGeo.dispose()
      coreMat.dispose()
      shardGeo.dispose()
      shardMat.dispose()
      renderer.dispose()
    }
  }, [])

  // Simulate proof verification cadence
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(s => (s + 1) % 5)
      setLiveBlock(b => b + 1)
      setProofVerified(true)
    }, 3200)
    return () => clearInterval(interval)
  }, [])

  return (
    <section
      id="attestcoin"
      className="relative section-padding overflow-hidden"
      aria-label="Attestcoin cryptographic verification"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
        <ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <SectionLabel className="mb-4">Attestcoin Verification Protocol</SectionLabel>
              <h2 className="font-display text-display-lg font-bold text-white tracking-tight">
                Cryptographic truth.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-aegis-lime via-[#c5f57a] to-emerald-400">
                  Zero multi-sig trust.
                </span>
              </h2>
            </div>
            <p className="text-aegis-muted text-sm max-w-md leading-relaxed">
              Before Aegis touches a single dollar of loan repayment, the Attestcoin Smart Contract (ASC) on Creditcoin CC3 verifies the source chain block header using Substrate precompiles.
            </p>
          </div>
        </ScrollReveal>

        {/* 3D Proof Ring + Interactive Protocol Console */}
        <ScrollReveal delay={100}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left 3D Ring Canvas */}
            <div className="lg:col-span-6 glass-panel-luxury p-4 rounded-2xl border border-aegis-border-emerald relative overflow-hidden h-[420px] md:h-[480px]">
              <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/[0.08] backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-aegis-lime animate-pulse" />
                <span className="font-mono text-[10px] text-aegis-muted uppercase tracking-widest">
                  ATTESTCOIN ASC PROOF RING • CC3 CHAIN 102031
                </span>
              </div>
              <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between text-[11px] font-mono p-2.5 rounded-xl bg-black/70 border border-white/[0.08]">
                <span className="text-white/60">Source Attestation:</span>
                <span className="text-aegis-lime font-bold">Ethereum Sepolia (Key 1)</span>
              </div>
            </div>

            {/* Right Telemetry & Verification Simulator */}
            <div className="lg:col-span-6 space-y-4">
              <div className="glass-panel-luxury p-6 rounded-2xl border border-aegis-border-emerald">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-6">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-aegis-lime shadow-[0_0_10px_#a8e063] animate-pulse" />
                    <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                      LIVE CC3 PROOF VERIFICATION ENGINE
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-aegis-lime px-2 py-0.5 rounded bg-aegis-lime/10 border border-aegis-lime/30">
                    ~15s FINALITY
                  </span>
                </div>

                {/* 5-Step Proof Sequence Bar */}
                <div className="space-y-3 mb-6">
                  {[
                    { step: '01', title: 'Source State Snapshot', desc: `Sepolia Block #${liveBlock}` },
                    { step: '02', title: 'Merkle Trie Assembly', desc: '@gluwa/usc-sdk payload signed' },
                    { step: '03', title: 'ASC Submission', desc: 'Attestcoin.verifyPosition(...)' },
                    { step: '04', title: 'Block Prover Precompile', desc: 'Substrate foreign consensus check' },
                    { step: '05', title: 'Settlement Dispatch', desc: 'Zero-risk debt repayment execution' },
                  ].map((s, idx) => {
                    const isPassed = idx <= activeStep
                    const isCurrent = idx === activeStep
                    return (
                      <div
                        key={s.step}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 border ${
                          isCurrent
                            ? 'bg-[#0b1b11] border-aegis-lime shadow-[0_0_16px_rgba(168,224,99,0.12)]'
                            : isPassed
                            ? 'bg-[#071109] border-white/[0.08] opacity-80'
                            : 'bg-transparent border-white/[0.04] opacity-30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-mono text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                              isPassed ? 'bg-aegis-lime text-black' : 'bg-white/10 text-white/40'
                            }`}
                          >
                            {isPassed ? '✓' : s.step}
                          </span>
                          <div>
                            <div className="font-display text-sm font-semibold text-white">
                              {s.title}
                            </div>
                            <div className="font-mono text-[11px] text-aegis-muted">
                              {s.desc}
                            </div>
                          </div>
                        </div>
                        {isCurrent && (
                          <span className="font-mono text-[10px] text-aegis-lime uppercase tracking-wider animate-pulse">
                            Processing...
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Verification Result Stamp */}
                <div className="p-4 rounded-xl bg-[#061009] border border-aegis-border-emerald flex items-center justify-between font-mono text-xs">
                  <div>
                    <div className="text-[10px] text-white/40 uppercase">STATUS STAMP</div>
                    <div className="text-aegis-lime font-bold">
                      {proofVerified ? 'ATTESTATION SIGNATURE VALID' : 'VERIFYING...'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-white/40 uppercase">RPC ENDPOINT</div>
                    <div className="text-white/80">rpc.cc3-testnet.creditcoin.network</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
