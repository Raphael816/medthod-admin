import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const NAVY = 0x14213d
const GOLD = 0xc9a15a

const SHAPES = {
  icosahedron: (r) => new THREE.IcosahedronGeometry(r, 0),
  octahedron: (r) => new THREE.OctahedronGeometry(r, 0),
  tetrahedron: (r) => new THREE.TetrahedronGeometry(r, 0),
  dodecahedron: (r) => new THREE.DodecahedronGeometry(r, 0),
  torus: (r) => new THREE.TorusGeometry(r * 0.72, r * 0.3, 10, 24),
}

// カード内で使う小さな回転する3Dアイコン。Scene3Dと同じ紺+ゴールドの言語を保つ。
export function Icon3D({ shape = 'icosahedron', size = 56 }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10)
    camera.position.set(0, 0, 3.3)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(size, size)
    mount.appendChild(renderer.domElement)

    const geometry = (SHAPES[shape] || SHAPES.icosahedron)(1)
    const outerMaterial = new THREE.MeshBasicMaterial({ color: GOLD, wireframe: true })
    const outer = new THREE.Mesh(geometry, outerMaterial)
    scene.add(outer)

    const innerMaterial = new THREE.MeshBasicMaterial({ color: NAVY, transparent: true, opacity: 0.18 })
    const inner = new THREE.Mesh(geometry, innerMaterial)
    inner.scale.setScalar(0.92)
    scene.add(inner)

    outer.rotation.set(0.4, 0.6, 0)
    inner.rotation.copy(outer.rotation)

    let frameId
    const animate = () => {
      if (!prefersReducedMotion) {
        outer.rotation.x += 0.007
        outer.rotation.y += 0.011
        inner.rotation.x += 0.007
        inner.rotation.y += 0.011
      }
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(frameId)
      mount.removeChild(renderer.domElement)
      geometry.dispose()
      outerMaterial.dispose()
      innerMaterial.dispose()
      renderer.dispose()
    }
  }, [shape, size])

  return <div ref={mountRef} className="icon3d" style={{ width: size, height: size }} aria-hidden="true" />
}
