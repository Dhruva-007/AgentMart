import React, { useMemo } from 'react'
import { motion } from 'framer-motion'

const AnimatedBackground = () => {
  const orbs = useMemo(() => [
    { x: '15%', y: '20%', size: 600, color: 'rgba(139, 92, 246, 0.08)', delay: 0 },
    { x: '75%', y: '60%', size: 500, color: 'rgba(59, 130, 246, 0.06)', delay: 2 },
    { x: '50%', y: '80%', size: 400, color: 'rgba(6, 182, 212, 0.05)', delay: 4 },
    { x: '85%', y: '15%', size: 350, color: 'rgba(236, 72, 153, 0.04)', delay: 1 },
  ], [])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            filter: 'blur(40px)',
            transform: 'translate(-50%, -50%)',
          }}
          animate={{
            x: [0, 30, -20, 10, 0],
            y: [0, -20, 15, -10, 0],
            scale: [1, 1.1, 0.95, 1.05, 1],
          }}
          transition={{
            duration: 20 + i * 3,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: orb.delay,
          }}
        />
      ))}

      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-dark-900 to-transparent" />

      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }} />
    </div>
  )
}

export default AnimatedBackground