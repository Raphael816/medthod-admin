import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useRef } from 'react'

// マウス位置に応じてカードが傾く3Dチルト効果。motion.div/motion.li などの差し替えとして使える。
export function Tilt({ children, className, style, as = 'div', ...rest }) {
  const MotionTag = motion[as]
  const ref = useRef(null)
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const rotateX = useSpring(useTransform(py, [0, 1], [9, -9]), { stiffness: 260, damping: 22 })
  const rotateY = useSpring(useTransform(px, [0, 1], [-9, 9]), { stiffness: 260, damping: 22 })

  const handleMouseMove = (event) => {
    const rect = ref.current.getBoundingClientRect()
    px.set((event.clientX - rect.left) / rect.width)
    py.set((event.clientY - rect.top) / rect.height)
  }
  const handleMouseLeave = () => {
    px.set(0.5)
    py.set(0.5)
  }

  return (
    <MotionTag
      ref={ref}
      className={className}
      style={{ ...style, rotateX, rotateY, transformPerspective: 900 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}
