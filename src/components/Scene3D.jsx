import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const NAVY = 0x14213d
const GOLD = 0xc9a15a

// フィボナッチ球分布: 球面上にほぼ均等に点を配置する
function fibonacciSpherePoints(count, radius) {
  const points = []
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = goldenAngle * i
    points.push(new THREE.Vector3(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius))
  }
  return points
}

// 近い点同士だけを線で結び、ニューラルネットワークのようなメッシュを作る
function buildNetworkLines(points, maxDistance) {
  const positions = []
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (points[i].distanceTo(points[j]) < maxDistance) {
        positions.push(points[i].x, points[i].y, points[i].z, points[j].x, points[j].y, points[j].z)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return geometry
}

// AIが分析しているような、ニューラルネットワーク球体+スキャンリングの3D演出。
export function Scene3D() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(0, 0, 9)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const parallaxGroup = new THREE.Group()
    scene.add(parallaxGroup)
    const group = new THREE.Group()
    parallaxGroup.add(group)

    // ノード(データポイント)
    const nodePoints = fibonacciSpherePoints(70, 2.3)
    const nodeGeometry = new THREE.BufferGeometry().setFromPoints(nodePoints)
    const nodeMaterial = new THREE.PointsMaterial({ color: GOLD, size: 0.1, transparent: true, opacity: 1 })
    const nodes = new THREE.Points(nodeGeometry, nodeMaterial)
    group.add(nodes)

    // ノード同士をつなぐネットワーク線(AIが分析しているような見た目の主役)
    const networkGeometry = buildNetworkLines(nodePoints, 0.95)
    const networkMaterial = new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.4 })
    const network = new THREE.LineSegments(networkGeometry, networkMaterial)
    group.add(network)

    // 外殻のワイヤーフレーム(控えめな構造感)
    const shellGeometry = new THREE.IcosahedronGeometry(3.1, 1)
    const shellMaterial = new THREE.MeshBasicMaterial({ color: NAVY, wireframe: true, transparent: true, opacity: 0.12 })
    const shell = new THREE.Mesh(shellGeometry, shellMaterial)
    group.add(shell)

    // スキャンリング(解析中であることを示す走査線)
    const ringGeometry = new THREE.TorusGeometry(2.7, 0.012, 8, 96)
    const ringMaterial = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.7 })
    const scanRing = new THREE.Mesh(ringGeometry, ringMaterial)
    scanRing.rotation.x = Math.PI / 2
    group.add(scanRing)

    // 中心のコア(処理中の光点)
    const coreGeometry = new THREE.SphereGeometry(0.16, 16, 16)
    const coreMaterial = new THREE.MeshBasicMaterial({ color: GOLD })
    const core = new THREE.Mesh(coreGeometry, coreMaterial)
    group.add(core)

    // 背景の淡い粒子(奥行き)
    const particleCount = 120
    const particlePositions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 18
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 18
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 4
    }
    const particleGeometry = new THREE.BufferGeometry()
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
    const particleMaterial = new THREE.PointsMaterial({ color: NAVY, size: 0.05, transparent: true, opacity: 0.35 })
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particles)

    let targetRotX = 0
    let targetRotY = 0
    const handlePointerMove = (event) => {
      const rect = mount.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width - 0.5
      const y = (event.clientY - rect.top) / rect.height - 0.5
      targetRotY = x * 0.6
      targetRotX = y * 0.4
    }
    window.addEventListener('pointermove', handlePointerMove)

    let frameId
    const clock = new THREE.Clock()
    const animate = () => {
      const elapsed = clock.getElapsedTime()

      if (!prefersReducedMotion) {
        group.rotation.y += 0.0022
        group.rotation.x = Math.sin(elapsed * 0.15) * 0.08
        network.material.opacity = 0.36 + Math.sin(elapsed * 1.4) * 0.14
        core.scale.setScalar(1 + Math.sin(elapsed * 2.2) * 0.25)
        particles.rotation.y += 0.0004

        // スキャンリングが球体を上下に走査する
        scanRing.position.y = Math.sin(elapsed * 0.6) * 1.6
        scanRing.material.opacity = 0.4 + Math.sin(elapsed * 0.6) * 0.3

        parallaxGroup.rotation.x += (targetRotX - parallaxGroup.rotation.x) * 0.04
        parallaxGroup.rotation.y += (targetRotY - parallaxGroup.rotation.y) * 0.04
      }

      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }
    animate()

    const handleResize = () => {
      const { clientWidth, clientHeight } = mount
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(clientWidth, clientHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('pointermove', handlePointerMove)
      mount.removeChild(renderer.domElement)
      ;[nodeGeometry, networkGeometry, shellGeometry, ringGeometry, coreGeometry, particleGeometry].forEach((g) =>
        g.dispose()
      )
      ;[nodeMaterial, networkMaterial, shellMaterial, ringMaterial, coreMaterial, particleMaterial].forEach((m) =>
        m.dispose()
      )
      renderer.dispose()
    }
  }, [])

  return <div ref={mountRef} className="scene3d" aria-hidden="true" />
}
