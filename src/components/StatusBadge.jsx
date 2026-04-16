import React from 'react'
import { motion } from 'framer-motion'
import { Check, AlertCircle, Clock, Zap, Loader2 } from 'lucide-react'

const statusConfig = {
  connected: {
    color: 'green',
    icon: Check,
    bgClass: 'bg-green-500/10 border-green-500/20',
    textClass: 'text-green-400',
    dotClass: 'bg-green-400',
  },
  verified: {
    color: 'green',
    icon: Check,
    bgClass: 'bg-green-500/10 border-green-500/20',
    textClass: 'text-green-400',
    dotClass: 'bg-green-400',
  },
  processing: {
    color: 'yellow',
    icon: Loader2,
    bgClass: 'bg-yellow-500/10 border-yellow-500/20',
    textClass: 'text-yellow-400',
    dotClass: 'bg-yellow-400',
  },
  pending: {
    color: 'orange',
    icon: Clock,
    bgClass: 'bg-orange-500/10 border-orange-500/20',
    textClass: 'text-orange-400',
    dotClass: 'bg-orange-400',
  },
  error: {
    color: 'red',
    icon: AlertCircle,
    bgClass: 'bg-red-500/10 border-red-500/20',
    textClass: 'text-red-400',
    dotClass: 'bg-red-400',
  },
  active: {
    color: 'purple',
    icon: Zap,
    bgClass: 'bg-purple-500/10 border-purple-500/20',
    textClass: 'text-purple-400',
    dotClass: 'bg-purple-400',
  },
}

const StatusBadge = ({ status = 'connected', label, showDot = true, animate = true, size = 'md' }) => {
  const config = statusConfig[status] || statusConfig.connected
  const Icon = config.icon

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm',
  }

  const Component = animate ? motion.div : 'div'
  const animateProps = animate ? {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  } : {}

  return (
    <Component
      {...animateProps}
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium
        ${config.bgClass}
        ${config.textClass}
        ${sizeClasses[size]}
      `}
    >
      {showDot && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-50 ${config.dotClass}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotClass}`} />
        </span>
      )}
      <Icon size={size === 'sm' ? 10 : 12} className={status === 'processing' ? 'animate-spin' : ''} />
      <span>{label || status.charAt(0).toUpperCase() + status.slice(1)}</span>
    </Component>
  )
}

export default StatusBadge