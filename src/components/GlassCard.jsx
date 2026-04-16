import React from 'react'
import { motion } from 'framer-motion'

const GlassCard = ({
  children,
  className = '',
  hover = false,
  glow = false,
  glowColor = 'purple',
  padding = true,
  animate = true,
  delay = 0,
  ...props
}) => {
  const glowClasses = {
    purple: 'hover:shadow-purple-500/10 hover:border-purple-500/20',
    blue: 'hover:shadow-blue-500/10 hover:border-blue-500/20',
    green: 'hover:shadow-green-500/10 hover:border-green-500/20',
    cyan: 'hover:shadow-cyan-500/10 hover:border-cyan-500/20',
  }

  const Component = animate ? motion.div : 'div'
  const animateProps = animate ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: 'easeOut', delay },
  } : {}

  return (
    <Component
      {...animateProps}
      className={`
        rounded-2xl glass
        ${padding ? 'p-6' : ''}
        ${hover ? `transition-all duration-300 hover:bg-white/[0.05] ${glowClasses[glowColor] || ''}` : ''}
        ${glow ? 'glow-purple' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </Component>
  )
}

export default GlassCard