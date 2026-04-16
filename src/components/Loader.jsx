import React from 'react'
import { motion } from 'framer-motion'

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
}

const Loader = ({ size = 'md', className = '' }) => {
  return (
    <div className={`${sizeMap[size]} ${className}`}>
      <motion.div
        className="w-full h-full rounded-full border-2 border-white/10 border-t-purple-400"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}

export const PulseLoader = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-purple-400"
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

export default Loader