import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ─── ExplodedArchitecture3D ──────────────────────────────────────────────────
// High-fidelity interactive 3D Exploded Architectural Model for Aegis
// 6 Layer physical stack hovering in volumetric 3D space
// Layer 5 (Top): AI Risk Monitor
// Layer 4: Oracle Worker
// Layer 3: Attestcoin ASC
// Layer 2: Block Prover Precompile
// Layer 1: Settlement Contract
// Layer 0 (Bottom): Source DeFi Protocols
// ─────────────────────────────────────────────────────────────────────────────

export interface ArchLayerInfo {
  id: string
  index: number
  name: string
  layerTag: string
  color: string
  specs: string
}

export const ARCH_LAYERS: ArchLayerInfo[] = [
  {
    id: 'ai-monitor',
    index: 5,
    name: 'AI Risk Monitor',
    layerTag: 'OFF-CHAIN TELEMETRY',
    color: '#a8e063',
    specs: '30s Polling · The Graph · Price Trend Modeling',
  },
  {
    id: 'oracle-worker',
    index: 4,
    name: 'Oracle Worker',
    layerTag: 'PROOF DISPATCH',
    color: '#a8e063',
    specs: 'Merkle & Continuity Proofs · @gluwa/usc-sdk',
  },
  {
    id: 'attestcoin-asc',
    index: 3,
    name: 'Attestcoin (ASC)',
    layerTag: 'ON-CHAIN CC3 (102031)',
    color: '#c5f57a',
    specs: 'verifyPosition(...) · Cryptographic Verification',
  },
  {
    id: 'block-prover',
    index: 2,
    name: 'Block Prover Precompile',
    layerTag: 'CC3 SUBSTRATE ENGINE',
    color: '#5be4c8',
    specs: 'State Root Attestation · Sepolia (key 1) & ETH (key 3)',
  },
  {
    id: 'settlement-contract',
    index: 1,
    name: 'Settlement Contract',
    layerTag: 'AUTONOMOUS DISPATCH',
    color: '#5be4c8',
    specs: 'protectPosition(...) · SAFE_THRESHOLD 1.05',
  },
  {
    id: 'source-protocols',
    index: 0,
    name: 'DeFi Protocols',
    layerTag: 'SOURCE CHAIN (SEPOLIA)',
    color: '#4e6e58',
    specs: 'Aave V3 · Morpho Blue · Compound V3',
  },
]

interface ExplodedArchitecture3DProps {
  selectedLayerId: string
  onSelectLayer: (id: string) => void
}

export function ExplodedArchitecture3D({
  selectedLayerId,
  onSelectLayer,
}: ExplodedArchitecture3DProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)

  // Three.js object references
  const layerMeshesRef = useRef<THREE.Group[]>([])
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2(-999, -999))
  const hoveredIndexRef = useRef<number | null>(null)
  const isDraggingRef = useRef<boolean>(false)
  const prevMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const rotAngleRef = useRef<{ x: number; y: number }>({ x: 0.35, y: -0.45 })

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    // 1. Scene Setup
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x050906, 0.04)

    // 2. Camera Setup (Isometric slant)
    const aspect = container.clientWidth / container.clientHeight
    const camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 100)
    camera.position.set(0, 1.2, 7.2)

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0x0d2818, 1.8)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xa8e063, 2.5)
    keyLight.position.set(5, 8, 5)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x5be4c8, 1.8)
    fillLight.position.set(-6, -4, 4)
    scene.add(fillLight)

    const centerGlow = new THREE.PointLight(0xa8e063, 3.0, 10)
    centerGlow.position.set(0, 0, 0)
    scene.add(centerGlow)

    // 5. Stack Root Group
    const stackGroup = new THREE.Group()
    scene.add(stackGroup)

    // Central Data Beam (Cylinder passing through all layers)
    const beamGeo = new THREE.CylinderGeometry(0.04, 0.04, 5.0, 16)
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xa8e063,
      transparent: true,
      opacity: 0.6,
    })
    const beamMesh = new THREE.Mesh(beamGeo, beamMat)
    stackGroup.add(beamMesh)

    // Floating pulse ring traveling along the beam
    const pulseRingGeo = new THREE.TorusGeometry(0.35, 0.02, 12, 32)
    const pulseRingMat = new THREE.MeshBasicMaterial({
      color: 0xc5f57a,
      transparent: true,
      opacity: 0.8,
    })
    const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat)
    pulseRing.rotation.x = Math.PI / 2
    stackGroup.add(pulseRing)

    // 6. Build the 6 architectural layer slabs
    const layerGroups: THREE.Group[] = []
    const layerSpacing = 0.65
    const slabWidth = 3.4
    const slabDepth = 2.0
    const slabHeight = 0.08

    ARCH_LAYERS.forEach(layer => {
      const group = new THREE.Group()
      // Position vertically according to index
      const targetY = (layer.index - 2.5) * layerSpacing
      group.position.y = targetY
      group.userData = {
        layerId: layer.id,
        index: layer.index,
        baseY: targetY,
        name: layer.name,
      }

      // Main Glass Slab Body
      const slabGeo = new THREE.BoxGeometry(slabWidth, slabHeight, slabDepth)
      const slabMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(layer.color),
        metalness: 0.1,
        roughness: 0.2,
        transmission: 0.7,
        thickness: 0.8,
        transparent: true,
        opacity: 0.35,
      })
      const slabMesh = new THREE.Mesh(slabGeo, slabMat)
      group.add(slabMesh)

      // Wireframe Outline Edges
      const edges = new THREE.EdgesGeometry(slabGeo)
      const lineMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(layer.color),
        transparent: true,
        opacity: 0.7,
      })
      const lineMesh = new THREE.LineSegments(edges, lineMat)
      group.add(lineMesh)

      // Corner technical markers
      const cornerGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12)
      const cornerMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(layer.color),
      })
      const c1 = new THREE.Mesh(cornerGeo, cornerMat)
      c1.position.set(slabWidth / 2, 0, slabDepth / 2)
      const c2 = new THREE.Mesh(cornerGeo, cornerMat)
      c2.position.set(-slabWidth / 2, 0, slabDepth / 2)
      const c3 = new THREE.Mesh(cornerGeo, cornerMat)
      c3.position.set(slabWidth / 2, 0, -slabDepth / 2)
      const c4 = new THREE.Mesh(cornerGeo, cornerMat)
      c4.position.set(-slabWidth / 2, 0, -slabDepth / 2)
      group.add(c1, c2, c3, c4)

      // Central aperture ring (where data beam passes through)
      const holeRingGeo = new THREE.RingGeometry(0.15, 0.2, 24)
      const holeRingMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(layer.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      })
      const holeRing = new THREE.Mesh(holeRingGeo, holeRingMat)
      holeRing.rotation.x = Math.PI / 2
      holeRing.position.y = slabHeight / 2 + 0.005
      group.add(holeRing)

      stackGroup.add(group)
      layerGroups.push(group)
    })

    layerMeshesRef.current = layerGroups

    // 7. Mouse & Raycasting Handlers
    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      mouseRef.current.set(x, y)

      if (isDraggingRef.current) {
        const deltaX = e.clientX - prevMousePosRef.current.x
        const deltaY = e.clientY - prevMousePosRef.current.y
        rotAngleRef.current.y += deltaX * 0.005
        rotAngleRef.current.x = Math.max(
          0.1,
          Math.min(0.7, rotAngleRef.current.x + deltaY * 0.005)
        )
        prevMousePosRef.current = { x: e.clientX, y: e.clientY }
      }
    }

    const onPointerDown = (e: MouseEvent) => {
      isDraggingRef.current = true
      prevMousePosRef.current = { x: e.clientX, y: e.clientY }
    }

    const onPointerUp = () => {
      isDraggingRef.current = false
    }

    const onClick = () => {
      if (hoveredIndexRef.current !== null) {
        const layer = ARCH_LAYERS.find(l => l.index === hoveredIndexRef.current)
        if (layer) {
          onSelectLayer(layer.id)
        }
      }
    }

    container.addEventListener('mousemove', onPointerMove)
    container.addEventListener('mousedown', onPointerDown)
    window.addEventListener('mouseup', onPointerUp)
    container.addEventListener('click', onClick)

    // 8. Animation Loop
    let clock = new THREE.Clock()

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()

      // Smooth rotate towards target rotation angle + subtle idle wobble
      const targetRotY = rotAngleRef.current.y + Math.sin(elapsed * 0.3) * 0.05
      const targetRotX = rotAngleRef.current.x + Math.cos(elapsed * 0.25) * 0.02
      stackGroup.rotation.y += (targetRotY - stackGroup.rotation.y) * 0.08
      stackGroup.rotation.x += (targetRotX - stackGroup.rotation.x) * 0.08

      // Animate central pulse ring
      pulseRing.position.y = Math.sin(elapsed * 2.0) * 2.2

      // Raycast for hover detection
      raycasterRef.current.setFromCamera(mouseRef.current, camera)
      const allSlabMeshes = layerGroups.map(g => g.children[0])
      const intersects = raycasterRef.current.intersectObjects(allSlabMeshes)

      let currentHovered: number | null = null
      if (intersects.length > 0) {
        const hitGroup = intersects[0].object.parent as THREE.Group
        if (hitGroup && hitGroup.userData) {
          currentHovered = hitGroup.userData.index
        }
      }
      hoveredIndexRef.current = currentHovered

      // Animate layers: elevation, glow, and selection expansion
      layerGroups.forEach(group => {
        const isHovered = group.userData.index === currentHovered
        const isSelected = group.userData.layerId === selectedLayerId
        const baseY = group.userData.baseY

        // Target vertical displacement: active or hovered layers pop up slightly
        let targetY = baseY
        if (isSelected) {
          targetY = baseY + (group.userData.index >= 3 ? 0.3 : -0.3)
        } else if (isHovered) {
          targetY = baseY + 0.15
        }

        group.position.y += (targetY - group.position.y) * 0.1

        // Adjust opacity / emissive intensity
        const slab = group.children[0] as THREE.Mesh<
          THREE.BoxGeometry,
          THREE.MeshPhysicalMaterial
        >
        if (slab && slab.material) {
          const targetOpacity = isSelected ? 0.75 : isHovered ? 0.6 : 0.35
          slab.material.opacity += (targetOpacity - slab.material.opacity) * 0.15
        }
      })

      renderer.render(scene, camera)
    }

    animate()

    // 9. Window Resize
    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      container.removeEventListener('mousemove', onPointerMove)
      container.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('mouseup', onPointerUp)
      container.removeEventListener('click', onClick)
      window.removeEventListener('resize', handleResize)

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }

      // Dispose geometries & materials
      beamGeo.dispose()
      beamMat.dispose()
      pulseRingGeo.dispose()
      pulseRingMat.dispose()
      layerGroups.forEach(g => {
        g.traverse(obj => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose()
            if (Array.isArray(obj.material)) {
              obj.material.forEach(m => m.dispose())
            } else {
              obj.material.dispose()
            }
          }
        })
      })
      renderer.dispose()
    }
  }, [selectedLayerId, onSelectLayer])

  return (
    <div className="relative w-full h-[480px] md:h-[560px] rounded-2xl overflow-hidden glass-panel-luxury border border-aegis-border-emerald/70">
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Interactive HUD Overlay instructions */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/[0.08] backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-aegis-lime animate-pulse" />
        <span className="font-mono text-[10px] text-aegis-muted uppercase tracking-widest">
          3D EXPLODED ARCHITECTURE • CLICK OR DRAG TO ROTATE
        </span>
      </div>

      {/* Layer Quick Selector Tabs */}
      <div className="absolute bottom-4 left-4 right-4 z-10 hidden sm:flex items-center justify-between gap-1.5 p-2 rounded-xl bg-[#061009]/80 border border-white/[0.08] backdrop-blur-md">
        {ARCH_LAYERS.map(l => {
          const isSelected = l.id === selectedLayerId
          return (
            <button
              key={l.id}
              onClick={() => onSelectLayer(l.id)}
              className={`flex-1 py-1.5 px-2 rounded-lg font-mono text-[10px] uppercase tracking-wider text-center transition-all ${
                isSelected
                  ? 'bg-aegis-lime text-black font-bold shadow-[0_0_12px_#a8e063]'
                  : 'text-aegis-muted hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              L{l.index}: {l.name.split(' ')[0]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
