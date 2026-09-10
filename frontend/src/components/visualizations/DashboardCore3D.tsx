import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ─── DashboardCore3D ─────────────────────────────────────────────────────────
// Compact, high-efficiency 3D Live Aegis Defense Core for the dApp Overview
// Shows real-time monitoring perimeter, health factor stability, and proof rings
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardCore3DProps {
  statusText?: string
  healthFactor?: number
  isProtected?: boolean
}

export function DashboardCore3D({
  statusText = 'MONITORING ACTIVE',
  healthFactor = 1.82,
  isProtected = true,
}: DashboardCore3DProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const scene = new THREE.Scene()
    const aspect = container.clientWidth / container.clientHeight
    const camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100)
    camera.position.set(0, 0, 4.5)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // Lighting
    const ambient = new THREE.AmbientLight(0x0d2818, 2.0)
    scene.add(ambient)

    const pointLight = new THREE.PointLight(0xa8e063, 3.5, 8)
    pointLight.position.set(1, 2, 2)
    scene.add(pointLight)

    // Core Group
    const rootGroup = new THREE.Group()
    scene.add(rootGroup)

    // Central Dodecahedron Core
    const coreGeo = new THREE.DodecahedronGeometry(0.7, 0)
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0xa8e063,
      metalness: 0.2,
      roughness: 0.1,
      transmission: 0.7,
      thickness: 0.5,
      transparent: true,
      opacity: 0.85,
    })
    const coreMesh = new THREE.Mesh(coreGeo, coreMat)
    rootGroup.add(coreMesh)

    // Wireframe Shield Overlay
    const wireGeo = new THREE.IcosahedronGeometry(0.95, 1)
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xc5f57a,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    })
    const wireMesh = new THREE.Mesh(wireGeo, wireMat)
    rootGroup.add(wireMesh)

    // Orbital Defense Ring 1
    const ring1Geo = new THREE.TorusGeometry(1.3, 0.02, 16, 48)
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0xa8e063,
      transparent: true,
      opacity: 0.6,
    })
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat)
    ring1.rotation.x = Math.PI / 3
    rootGroup.add(ring1)

    // Orbital Defense Ring 2
    const ring2Geo = new THREE.TorusGeometry(1.55, 0.015, 16, 48)
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0x5be4c8,
      transparent: true,
      opacity: 0.4,
    })
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat)
    ring2.rotation.y = Math.PI / 4
    rootGroup.add(ring2)

    // Tiny orbiting satellite markers
    const satGeo = new THREE.SphereGeometry(0.04, 8, 8)
    const satMat = new THREE.MeshBasicMaterial({ color: 0xa8e063 })
    const sat1 = new THREE.Mesh(satGeo, satMat)
    const sat2 = new THREE.Mesh(satGeo, satMat)
    rootGroup.add(sat1, sat2)

    // Mouse Interaction
    let mouseX = 0
    let mouseY = 0
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 1.5
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 1.5
    }
    container.addEventListener('mousemove', onMouseMove)

    // Animation Loop
    let clock = new THREE.Clock()
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

      rootGroup.rotation.y = t * 0.3 + mouseX * 0.4
      rootGroup.rotation.x = Math.sin(t * 0.4) * 0.15 + mouseY * 0.3

      ring1.rotation.z = t * 0.5
      ring2.rotation.z = -t * 0.35

      // Core pulsation
      const pulse = 1.0 + Math.sin(t * 2.0) * 0.04
      coreMesh.scale.set(pulse, pulse, pulse)

      // Satellites orbiting
      sat1.position.set(Math.cos(t * 1.2) * 1.3, Math.sin(t * 1.2) * 1.3 * Math.cos(Math.PI / 3), Math.sin(t * 1.2) * 1.3 * Math.sin(Math.PI / 3))
      sat2.position.set(Math.cos(-t * 0.9) * 1.55, Math.sin(-t * 0.9) * 1.55 * Math.sin(Math.PI / 4), Math.sin(-t * 0.9) * 1.55 * Math.cos(Math.PI / 4))

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
      coreGeo.dispose()
      coreMat.dispose()
      wireGeo.dispose()
      wireMat.dispose()
      ring1Geo.dispose()
      ring1Mat.dispose()
      ring2Geo.dispose()
      ring2Mat.dispose()
      satGeo.dispose()
      satMat.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div className="relative w-full h-[220px] md:h-[240px] rounded-2xl glass-panel-luxury border border-aegis-border-emerald overflow-hidden flex items-center justify-between p-6">
      {/* 3D Canvas on Left */}
      <div className="w-48 h-full relative shrink-0">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      </div>

      {/* Telemetry Status on Right */}
      <div className="flex-1 pl-4 z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-aegis-lime shadow-[0_0_10px_#a8e063] animate-pulse" />
          <span className="font-mono text-xs font-bold text-aegis-lime uppercase tracking-wider">
            {statusText}
          </span>
        </div>
        <h3 className="font-display text-xl font-bold text-white mb-1">
          Aegis Defense Perimeter
        </h3>
        <p className="font-mono text-xs text-aegis-muted mb-4">
          Ethereum Sepolia (ChainKey 1) • Verified on Creditcoin CC3
        </p>

        <div className="flex flex-wrap gap-4 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-[#08150d] border border-white/[0.08]">
            <span className="text-white/40">Portfolio HF: </span>
            <span className="text-aegis-lime font-bold">{healthFactor.toFixed(2)} SAFE</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#08150d] border border-white/[0.08]">
            <span className="text-white/40">Protection: </span>
            <span className="text-white font-bold">{isProtected ? 'ARMED' : 'STANDBY'}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#08150d] border border-white/[0.08]">
            <span className="text-white/40">Polling: </span>
            <span className="text-emerald-400 font-bold">30s Cadence</span>
          </div>
        </div>
      </div>
    </div>
  )
}
