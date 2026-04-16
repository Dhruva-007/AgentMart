import React from 'react'
import { motion } from 'framer-motion'
import Loader from './Loader'

const variants = {
  primary: 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30',
  secondary: 'bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] hover:border-white/[0.15] text-dark-100',
  ghost: 'hover:bg-white/[0.06] text-dark-200 hover:text-dark-100',
  danger: 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400',
  glow: 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white glow-purple',
  success: 'bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-7 py-3.5 text-base gap-2.5',
  xl: 'px-9 py-4 text-lg gap-3',
}

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  isLoading = false,
  disabled = false,
  className = '',
  onClick,
  ...props
}) => {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center font-medium rounded-xl
        transition-all duration-200 ease-out
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <Loader size="sm" />
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
          {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
        </>
      )}
    </motion.button>
  )
}

export default Button