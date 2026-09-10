import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

// ─── Aegis Defense Core (3D WebGL Visualization) ──────────────────────────────
// Represents:
// 1. Central Luminous Core (AI Risk Engine)
// 2. Translucent Smoked Glass Protective Shell (Non-Custodial Boundary)
// 3. Multi-axis 3D Architectural Orbital Rings
// 4. Cross-Chain Infrastructure Nodes (Ethereum, Solana, AI Monitor, Attestcoin, Creditcoin)
// 5. Continuous Signal Flow (Source -> AI -> Attestcoin -> Creditcoin -> Protection)
// 6. Risk Monitoring Scan Sweep & Periodic Protection Pulse
// 7. Dynamic Cursor Parallax & Scroll Elevation
// ─────────────────────────────────────────────────────────────────────────────

interface NodeData {
  id: string
  name: string
  role: string
  ringIndex: number
  baseAngle: number // radians
  radius: number
  tiltX: number
  tiltY: number
  status: string
  color: string
}

const NODES_CONFIG: NodeData[] = [
  {
    id: 'eth',
    name: 'ETHEREUM SEPOLIA',
    role: 'Source Collateral',
    ringIndex: 0,
    baseAngle: 0.3,
    radius: 4.8,
    tiltX: 0.45,
    tiltY: 0.25,
    status: 'ACTIVE',
    color: '#a8e063',
  },
  {
    id: 'ai',
    name: 'AI RISK ENGINE',
    role: 'Continuous Inference',
    ringIndex: 1,
    baseAngle: 1.8,
    radius: 5.7,
    tiltX: -0.55,
    tiltY: 0.7,
    status: 'MONITORING',
    color: '#c5f57a',
  },
  {
    id: 'attest',
    name: 'ATTESTCOIN ASC',
    role: 'Cryptographic Proofs',
    ringIndex: 0,
    baseAngle: 3.2,
    radius: 4.8,
    tiltX: 0.45,
    tiltY: 0.25,
    status: 'VERIFIED',
    color: '#5be4c8',
  },
  {
    id: 'cc3',
    name: 'CREDITCOIN CC3',
    role: 'Settlement Layer',
    ringIndex: 2,
    baseAngle: 4.6,
    radius: 6.6,
    tiltX: 0.25,
    tiltY: -0.85,
    status: 'SETTLED',
    color: '#5be4c8',
  },
  {
    id: 'sol',
    name: 'SOLANA POSITION',
    role: 'Cross-Chain Asset',
    ringIndex: 1,
    baseAngle: 5.9,
    radius: 5.7,
    tiltX: -0.55,
    tiltY: 0.7,
    status: 'SYNCHRONIZED',
    color: '#a8e063',
  },
]

interface AegisDefenseCoreProps {
  className?: string
}

export function AegisDefenseCore({ className }: AegisDefenseCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [projectedNodes, setProjectedNodes] = useState<Array<{
    id: string
    name: string
    role: string
    status: string
    color: string
    x: number
    y: number
    visible: boolean
    active: boolean
  }>>([])
  const [systemState, setSystemState] = useState<{
    scanProgress: number
    protectionPulse: boolean
    currentEvent: string
  }>({
    scanProgress: 0,
    protectionPulse: false,
    currentEvent: 'AI MONITOR ACTIVE',
  })

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    // ── Check reduced motion ──────────────────────────────────────────────────
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // ── Scene Setup ───────────────────────────────────────────────────────────
    const scene = new THREE.Scene()

    // ── Camera ────────────────────────────────────────────────────────────────
    const width = container.clientWidth
    const height = container.clientHeight || 580
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(0, 1.2, 16.5)

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25

    // ── Master Groups ─────────────────────────────────────────────────────────
    const rootGroup = new THREE.Group()
    scene.add(rootGroup)

    const coreGroup = new THREE.Group()
    const shellGroup = new THREE.Group()
    const ringsGroup = new THREE.Group()
    const nodesGroup = new THREE.Group()
    const signalsGroup = new THREE.Group()
    const scanGroup = new THREE.Group()

    rootGroup.add(coreGroup)
    rootGroup.add(shellGroup)
    rootGroup.add(ringsGroup)
    rootGroup.add(nodesGroup)
    rootGroup.add(signalsGroup)
    rootGroup.add(scanGroup)

    // ── Lighting ──────────────────────────────────────────────────────────────
    // 1. Deep atmospheric green-black ambience
    const ambientLight = new THREE.AmbientLight(0x0c1a10, 2.4)
    scene.add(ambientLight)

    // 2. High-key lime rim light from back-top
    const rimLight = new THREE.DirectionalLight(0xa8e063, 3.2)
    rimLight.position.set(8, 12, -8)
    scene.add(rimLight)

    // 3. Subtle white key light for glass specular highlights
    const keyLight = new THREE.DirectionalLight(0xf5f8ee, 1.4)
    keyLight.position.set(-6, 8, 10)
    scene.add(keyLight)

    // 4. Central luminous PointLight (from inside the AI Risk Engine)
    const coreLight = new THREE.PointLight(0xa8e063, 4.5, 12, 1.2)
    coreLight.position.set(0, 0, 0)
    coreGroup.add(coreLight)

    // 5. Cyan accent light (Creditcoin settlement hue)
    const accentLight = new THREE.PointLight(0x5be4c8, 1.8, 14, 1.5)
    accentLight.position.set(0, -5, 2)
    scene.add(accentLight)

    // ── 1. CENTRAL AI RISK ENGINE (Core) ──────────────────────────────────────
    // A. Luminous core point
    const coreNucleusGeo = new THREE.SphereGeometry(0.55, 32, 32)
    const coreNucleusMat = new THREE.MeshBasicMaterial({
      color: 0xc8f57a,
    })
    const coreNucleus = new THREE.Mesh(coreNucleusGeo, coreNucleusMat)
    coreGroup.add(coreNucleus)

    // B. Inner geometric lattice (Icosahedron)
    const innerLatticeGeo = new THREE.IcosahedronGeometry(1.05, 0)
    const innerLatticeMat = new THREE.MeshStandardMaterial({
      color: 0x141f12,
      emissive: 0xa8e063,
      emissiveIntensity: 0.35,
      metalness: 0.9,
      roughness: 0.15,
      wireframe: true,
    })
    const innerLattice = new THREE.Mesh(innerLatticeGeo, innerLatticeMat)
    coreGroup.add(innerLattice)

    // C. Middle counter-rotating octahedron frame with vertex nodes
    const octaGeo = new THREE.OctahedronGeometry(1.65, 0)
    const octaMat = new THREE.MeshStandardMaterial({
      color: 0x182416,
      emissive: 0x5be4c8,
      emissiveIntensity: 0.25,
      metalness: 0.95,
      roughness: 0.2,
      wireframe: true,
    })
    const octahedron = new THREE.Mesh(octaGeo, octaMat)
    coreGroup.add(octahedron)

    // D. Core technical gyro-rings
    const gyroRingGeo = new THREE.TorusGeometry(1.85, 0.018, 16, 80)
    const gyroRingMat = new THREE.MeshBasicMaterial({
      color: 0xa8e063,
      transparent: true,
      opacity: 0.45,
    })
    const gyroRing1 = new THREE.Mesh(gyroRingGeo, gyroRingMat)
    const gyroRing2 = new THREE.Mesh(gyroRingGeo, gyroRingMat)
    gyroRing1.rotation.x = Math.PI / 3
    gyroRing2.rotation.y = Math.PI / 4
    coreGroup.add(gyroRing1)
    coreGroup.add(gyroRing2)

    // ── 2. PROTECTIVE SHELL (Non-Custodial Boundary) ──────────────────────────
    // Main translucent smoked glass sphere
    const shellGeo = new THREE.SphereGeometry(3.3, 64, 64)
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a120b,
      transmission: 0.88,
      opacity: 1.0,
      transparent: true,
      roughness: 0.1,
      metalness: 0.2,
      ior: 1.48,
      reflectivity: 0.85,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      attenuationColor: new THREE.Color(0x0f2814),
      attenuationDistance: 2.2,
    })
    const shellMesh = new THREE.Mesh(shellGeo, shellMat)
    shellGroup.add(shellMesh)

    // Delicate technical latitude / longitude gridlines on the shell
    const latLineGeo = new THREE.TorusGeometry(3.305, 0.008, 16, 120)
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0xa8e063,
      transparent: true,
      opacity: 0.16,
    })
    const equator = new THREE.Mesh(latLineGeo, gridMat)
    equator.rotation.x = Math.PI / 2
    shellGroup.add(equator)

    const tropic1 = new THREE.Mesh(new THREE.TorusGeometry(3.305 * Math.cos(Math.PI / 6), 0.006, 16, 100), gridMat)
    tropic1.position.y = 3.305 * Math.sin(Math.PI / 6)
    tropic1.rotation.x = Math.PI / 2
    shellGroup.add(tropic1)

    const tropic2 = new THREE.Mesh(new THREE.TorusGeometry(3.305 * Math.cos(-Math.PI / 6), 0.006, 16, 100), gridMat)
    tropic2.position.y = 3.305 * Math.sin(-Math.PI / 6)
    tropic2.rotation.x = Math.PI / 2
    shellGroup.add(tropic2)

    // Subtle Hexagonal / facet membrane overlay
    const hexShellGeo = new THREE.IcosahedronGeometry(3.34, 2)
    const hexShellMat = new THREE.MeshStandardMaterial({
      color: 0x050d07,
      emissive: 0xa8e063,
      emissiveIntensity: 0.08,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    })
    const hexShell = new THREE.Mesh(hexShellGeo, hexShellMat)
    shellGroup.add(hexShell)

    // ── 3. ARCHITECTURAL ORBITAL SYSTEM (3D Rings) ───────────────────────────
    interface RingItem {
      mesh: THREE.Mesh
      speed: number
      radius: number
      tiltX: number
      tiltY: number
      tiltZ: number
    }
    const rings: RingItem[] = []

    const ringConfigs = [
      { radius: 4.8, tube: 0.016, tiltX: 0.45, tiltY: 0.25, tiltZ: 0.1, speed: 0.0028, color: 0xa8e063, opacity: 0.32 },
      { radius: 5.7, tube: 0.014, tiltX: -0.55, tiltY: 0.7, tiltZ: -0.2, speed: -0.0022, color: 0x5be4c8, opacity: 0.24 },
      { radius: 6.6, tube: 0.012, tiltX: 0.25, tiltY: -0.85, tiltZ: 0.35, speed: 0.0017, color: 0xa8e063, opacity: 0.2 },
    ]

    ringConfigs.forEach(cfg => {
      const ringGeo = new THREE.TorusGeometry(cfg.radius, cfg.tube, 16, 160)
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x182417,
        emissive: cfg.color,
        emissiveIntensity: cfg.opacity,
        metalness: 0.9,
        roughness: 0.2,
      })
      const ringMesh = new THREE.Mesh(ringGeo, ringMat)
      ringMesh.rotation.set(cfg.tiltX, cfg.tiltY, cfg.tiltZ)
      ringsGroup.add(ringMesh)
      rings.push({
        mesh: ringMesh,
        speed: cfg.speed,
        radius: cfg.radius,
        tiltX: cfg.tiltX,
        tiltY: cfg.tiltY,
        tiltZ: cfg.tiltZ,
      })
    })

    // ── 4. CROSS-CHAIN SYSTEM NODES (3D Mesh + Tethers) ──────────────────────
    interface NodeMeshItem {
      data: NodeData
      group: THREE.Group
      tether: THREE.Line
      marker: THREE.Mesh
      halo: THREE.Mesh
      currentAngle: number
    }
    const nodeMeshes: NodeMeshItem[] = []

    NODES_CONFIG.forEach(nodeCfg => {
      const nodeObjGroup = new THREE.Group()

      // Node technical body (Dark metallic cylinder/sphere)
      const bodyGeo = new THREE.SphereGeometry(0.18, 20, 20)
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x111611,
        emissive: nodeCfg.id === 'attest' || nodeCfg.id === 'cc3' ? 0x5be4c8 : 0xa8e063,
        emissiveIntensity: 0.6,
        metalness: 0.9,
        roughness: 0.15,
      })
      const marker = new THREE.Mesh(bodyGeo, bodyMat)
      nodeObjGroup.add(marker)

      // Surrounding node halo
      const haloGeo = new THREE.RingGeometry(0.24, 0.29, 32)
      const haloMat = new THREE.MeshBasicMaterial({
        color: nodeCfg.id === 'attest' || nodeCfg.id === 'cc3' ? 0x5be4c8 : 0xa8e063,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      })
      const halo = new THREE.Mesh(haloGeo, haloMat)
      nodeObjGroup.add(halo)

      // Delicate tether line to the central shell
      const tetherMat = new THREE.LineBasicMaterial({
        color: 0xa8e063,
        transparent: true,
        opacity: 0.14,
      })
      const tetherGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
      ])
      const tether = new THREE.Line(tetherGeo, tetherMat)
      nodesGroup.add(tether)
      nodesGroup.add(nodeObjGroup)

      nodeMeshes.push({
        data: nodeCfg,
        group: nodeObjGroup,
        tether,
        marker,
        halo,
        currentAngle: nodeCfg.baseAngle,
      })
    })

    // ── 5. DATA SIGNALS (Moving data packets between chains) ───────────────────
    const signalCount = 28
    const signalPositions = new Float32Array(signalCount * 3)
    const signalColors = new Float32Array(signalCount * 3)

    const limeColor = new THREE.Color(0xa8e063)
    const cyanColor = new THREE.Color(0x5be4c8)

    for (let i = 0; i < signalCount; i++) {
      const c = i % 2 === 0 ? limeColor : cyanColor
      signalColors[i * 3] = c.r
      signalColors[i * 3 + 1] = c.g
      signalColors[i * 3 + 2] = c.b
    }

    const signalGeo = new THREE.BufferGeometry()
    signalGeo.setAttribute('position', new THREE.BufferAttribute(signalPositions, 3))
    signalGeo.setAttribute('color', new THREE.BufferAttribute(signalColors, 3))

    // Use small round point sprites with soft glow
    const canvasPoint = document.createElement('canvas')
    canvasPoint.width = 32
    canvasPoint.height = 32
    const ctx = canvasPoint.getContext('2d')!
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.3, 'rgba(168,224,99,0.85)')
    grad.addColorStop(0.8, 'rgba(168,224,99,0.15)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 32, 32)
    const pointTexture = new THREE.CanvasTexture(canvasPoint)

    const signalMat = new THREE.PointsMaterial({
      size: 0.38,
      vertexColors: true,
      map: pointTexture,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const signalPoints = new THREE.Points(signalGeo, signalMat)
    signalsGroup.add(signalPoints)

    // ── 6. RISK MONITORING SCAN LINE ──────────────────────────────────────────
    const scanRingGeo = new THREE.TorusGeometry(3.4, 0.024, 16, 140)
    const scanRingMat = new THREE.MeshBasicMaterial({
      color: 0xa8e063,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    })
    const scanRing = new THREE.Mesh(scanRingGeo, scanRingMat)
    scanRing.rotation.x = Math.PI / 2.3
    scanGroup.add(scanRing)

    // Scan plane fan / subtle glow
    const scanFanGeo = new THREE.RingGeometry(0.1, 3.4, 64)
    const scanFanMat = new THREE.MeshBasicMaterial({
      color: 0x0f3316,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
    const scanFan = new THREE.Mesh(scanFanGeo, scanFanMat)
    scanFan.rotation.x = Math.PI / 2.3
    scanGroup.add(scanFan)

    // ── 7. BACKGROUND DATA DUST / PARTICLES ────────────────────────────────────
    const dustCount = 80
    const dustGeo = new THREE.BufferGeometry()
    const dustPos = new Float32Array(dustCount * 3)
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 22
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 16
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 12
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
    const dustMat = new THREE.PointsMaterial({
      size: 0.08,
      color: 0xa8e063,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    })
    const dust = new THREE.Points(dustGeo, dustMat)
    scene.add(dust)

    // ── Mouse & Scroll Parallax State ─────────────────────────────────────────
    let mouseX = 0
    let mouseY = 0
    let targetMouseX = 0
    let targetMouseY = 0
    let scrollOffset = 0
    let targetScroll = 0

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      targetMouseX = Math.max(-1, Math.min(1, x))
      targetMouseY = Math.max(-1, Math.min(1, y))
    }

    const onScroll = () => {
      const st = window.scrollY
      targetScroll = Math.min(st / 700, 1)
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })

    // ── Resize Observer ───────────────────────────────────────────────────────
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const nw = entry.contentRect.width
        const nh = entry.contentRect.height || 580
        if (nw > 0 && nh > 0) {
          camera.aspect = nw / nh
          camera.updateProjectionMatrix()
          renderer.setSize(nw, nh)
        }
      }
    })
    resizeObserver.observe(container)

    // ── Animation Loop ────────────────────────────────────────────────────────
    let animationFrameId: number
    let clock = new THREE.Clock()
    let lastScanReport = 0

    // Temporary vector for project calculations
    const tempVec = new THREE.Vector3()

    const animate = () => {
      const delta = clock.getDelta()
      const time = clock.getElapsedTime()

      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.05
      mouseY += (targetMouseY - mouseY) * 0.05
      scrollOffset += (targetScroll - scrollOffset) * 0.06

      // Root Parallax & Scroll response
      if (!prefersReducedMotion) {
        rootGroup.rotation.y = mouseX * 0.32 + time * 0.04
        rootGroup.rotation.x = -mouseY * 0.22 + scrollOffset * 0.28
        rootGroup.position.y = Math.sin(time * 0.8) * 0.12 - scrollOffset * 0.8
        rootGroup.position.z = -scrollOffset * 1.5
      }

      // 1. AI Core Rotations
      if (!prefersReducedMotion) {
        innerLattice.rotation.x = time * 0.35
        innerLattice.rotation.y = time * 0.45
        octahedron.rotation.x = -time * 0.25
        octahedron.rotation.z = time * 0.3
        gyroRing1.rotation.z = time * 0.6
        gyroRing2.rotation.x = -time * 0.5
      }

      // 2. Protective Shell Subtle Breathing & Facet shimmer
      const coreBreath = Math.sin(time * 2.2) * 0.05
      coreNucleus.scale.setScalar(1 + coreBreath)
      coreLight.intensity = 4.2 + Math.sin(time * 3.5) * 0.8

      // 3. Architectural Rings slow rotations
      rings.forEach(r => {
        if (!prefersReducedMotion) {
          r.mesh.rotation.z += r.speed
        }
      })

      // 4. Scanning Wave Sweep (Risk Monitoring)
      const scanPeriod = 4.5
      const scanT = (time % scanPeriod) / scanPeriod
      const scanAngle = scanT * Math.PI * 2
      scanRing.position.y = Math.sin(scanAngle) * 2.8
      scanRing.scale.setScalar(Math.cos(scanAngle * 0.5) * 0.25 + 0.95)
      scanRingMat.opacity = 0.2 + (1 - Math.abs(Math.sin(scanAngle))) * 0.45
      scanFan.position.y = scanRing.position.y

      // 5. Protection Event Pulse (Every ~9 seconds)
      const pulseCycle = time % 9.0
      const isPulsing = pulseCycle > 7.5 && pulseCycle < 8.8
      if (isPulsing) {
        const pNorm = (pulseCycle - 7.5) / 1.3
        const pulseScale = 1.0 + Math.sin(pNorm * Math.PI) * 0.045
        shellMesh.scale.setScalar(pulseScale)
        shellMat.emissive = new THREE.Color(0xa8e063)
        shellMat.emissiveIntensity = Math.sin(pNorm * Math.PI) * 0.32
      } else {
        shellMesh.scale.setScalar(1.0)
        shellMat.emissiveIntensity = 0.02
      }

      // Update UI state occasionally
      if (time - lastScanReport > 0.6) {
        lastScanReport = time
        const scanIdx = Math.floor(scanT * NODES_CONFIG.length)
        const activeNodeName = NODES_CONFIG[scanIdx]?.name ?? 'AI RISK ENGINE'
        setSystemState({
          scanProgress: Math.round(scanT * 100),
          protectionPulse: isPulsing,
          currentEvent: isPulsing ? 'PROTECTION VERIFIED & EXECUTED' : `SCANNING: ${activeNodeName}`,
        })
      }

      // 6. Update Nodes position along 3D orbits & project 2D coordinates for technical labels
      const projected: Array<{
        id: string
        name: string
        role: string
        status: string
        color: string
        x: number
        y: number
        visible: boolean
        active: boolean
      }> = []

      nodeMeshes.forEach(item => {
        if (!prefersReducedMotion) {
          item.currentAngle += item.data.ringIndex === 1 ? -0.003 : 0.0025
        }

        const ring = rings[item.data.ringIndex]
        const r = item.data.radius
        const a = item.currentAngle

        // Local ring circle coordinate
        const localPos = new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), 0)
        // Apply ring tilt
        localPos.applyEuler(new THREE.Euler(ring.tiltX, ring.tiltY, ring.tiltZ))
        item.group.position.copy(localPos)

        // Halo orientation towards camera
        item.halo.lookAt(camera.position)

        // Update tether line: from shell surface to node
        const shellAnchor = localPos.clone().normalize().multiplyScalar(3.3)
        const posAttr = item.tether.geometry.attributes.position as THREE.BufferAttribute
        posAttr.setXYZ(0, shellAnchor.x, shellAnchor.y, shellAnchor.z)
        posAttr.setXYZ(1, localPos.x, localPos.y, localPos.z)
        posAttr.needsUpdate = true

        // Node illumination reaction when scan line passes close
        const distToScan = Math.abs(localPos.y - scanRing.position.y)
        const isNearScan = distToScan < 0.9
        const mat = item.marker.material as THREE.MeshStandardMaterial
        mat.emissiveIntensity = isNearScan ? 1.8 : 0.5

        // Project 3D coordinate to screen 2D
        tempVec.copy(localPos)
        item.group.localToWorld(tempVec)
        tempVec.project(camera)

        const isBehind = tempVec.z > 1.0
        const screenX = ((tempVec.x + 1) * width) / 2
        const screenY = ((-tempVec.y + 1) * height) / 2

        projected.push({
          id: item.data.id,
          name: item.data.name,
          role: item.data.role,
          status: item.data.status,
          color: item.data.color,
          x: screenX,
          y: screenY,
          visible: !isBehind && screenX > 20 && screenX < width - 20 && screenY > 20 && screenY < height - 20,
          active: isNearScan,
        })
      })
      setProjectedNodes(projected)

      // 7. Data Signals Animation (Continuous flow along orbits)
      const positions = signalGeo.attributes.position.array as Float32Array
      for (let i = 0; i < signalCount; i++) {
        const ringIdx = i % 3
        const ring = rings[ringIdx]
        const r = ring.radius
        // Staggered motion
        const speed = ring.speed * 28
        const angle = time * speed + (i / signalCount) * Math.PI * 2
        const p = new THREE.Vector3(r * Math.cos(angle), r * Math.sin(angle), 0)
        p.applyEuler(new THREE.Euler(ring.tiltX, ring.tiltY, ring.tiltZ))

        positions[i * 3] = p.x
        positions[i * 3 + 1] = p.y
        positions[i * 3 + 2] = p.z
      }
      signalGeo.attributes.position.needsUpdate = true

      // Render scene
      renderer.render(scene, camera)
      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('scroll', onScroll)
      resizeObserver.disconnect()

      // Dispose Three.js objects
      renderer.dispose()
      scene.traverse(obj => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
          obj.geometry?.dispose()
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose())
          } else {
            obj.material?.dispose()
          }
        }
      })
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={['relative w-full h-[520px] lg:h-[620px] select-none flex items-center justify-center', className ?? ''].join(' ')}
      aria-label="Aegis 3D Defense Core visualization"
    >
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {/* Atmospheric Soft Vignette Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 40%, rgba(8,8,8,0.7) 95%)',
        }}
      />

      {/* Dynamic 2D Technical Node Labels Overlaid in 3D Space */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {projectedNodes.map(node => {
          if (!node.visible) return null
          return (
            <div
              key={node.id}
              className="absolute transition-transform duration-100 ease-out"
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                transform: 'translate(14px, -18px)',
              }}
            >
              <div
                className={[
                  'px-2 py-1 rounded backdrop-blur-md border transition-all duration-300',
                  node.active
                    ? 'bg-aegis-surface-2/95 border-aegis-lime/70 shadow-[0_0_15px_rgba(168,224,99,0.3)]'
                    : 'bg-aegis-surface-1/70 border-aegis-border/60',
                ].join(' ')}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: node.color,
                      boxShadow: node.active ? `0 0 8px ${node.color}` : 'none',
                    }}
                  />
                  <span
                    className="font-mono text-[9px] font-bold tracking-wider uppercase"
                    style={{ color: node.active ? '#f4f4f0' : '#a0a090' }}
                  >
                    {node.name}
                  </span>
                </div>
                <div className="text-[7.5px] font-mono text-aegis-muted tracking-tight pl-3">
                  {node.role}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Technical Infrastructure HUD Header */}
      <div className="absolute top-4 left-4 pointer-events-none flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-aegis-surface-1/80 border border-aegis-border/60 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-aegis-lime animate-pulse" />
          <span className="font-mono text-[9px] tracking-widest text-aegis-lime font-semibold uppercase">
            DEFENSE CORE v2.4
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-aegis-surface-1/50 border border-aegis-border/30 backdrop-blur-sm">
          <span className="font-mono text-[8px] text-aegis-muted tracking-wider uppercase">
            SCAN: {systemState.scanProgress}%
          </span>
        </div>
      </div>

      {/* Bottom Telemetry & Status Indicator */}
      <div className="absolute bottom-4 left-4 right-4 pointer-events-none flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded bg-aegis-surface-1/75 border border-aegis-border/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span
            className={[
              'w-2 h-2 rounded-full transition-colors duration-500',
              systemState.protectionPulse ? 'bg-aegis-lime shadow-[0_0_12px_#a8e063]' : 'bg-aegis-cyan',
            ].join(' ')}
          />
          <span className="font-mono text-[8.5px] font-medium tracking-wide text-aegis-off uppercase">
            {systemState.currentEvent}
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[8px] text-aegis-muted tracking-wider">
          <span>NON-CUSTODIAL MEMBRANE</span>
          <span className="text-aegis-border">|</span>
          <span className="text-aegis-lime/80">LATENCY &lt;15s</span>
        </div>
      </div>
    </div>
  )
}
