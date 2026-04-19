import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Inbox, Search, Brain, ShieldCheck, Sparkles, Loader2 } from 'lucide-react'

const iconMap = {
  'inbox': Inbox,
  'search': Search,
  'brain': Brain,
  'shield-check': ShieldCheck,
  'sparkles': Sparkles,
}

const StepProgress = ({ steps, currentStep, completedSteps }) => {
  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(index)
        const isCurrent = index === currentStep && !isCompleted
        const isPending = index > currentStep && !isCompleted
        const Icon = iconMap[step.icon] || Inbox

        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className={`
              relative flex items-start gap-4 p-4 rounded-xl transition-all duration-500
              ${isCompleted ? 'bg-green-500/[0.04] border border-green-500/10' : ''}
              ${isCurrent ? 'bg-purple-500/[0.06] border border-purple-500/15 glow-purple' : ''}
              ${isPending ? 'opacity-40' : ''}
              ${!isCompleted && !isCurrent ? 'border border-transparent' : ''}
            `}
          >
            <div className={`
              relative flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500
              ${isCompleted ? 'bg-green-500/20' : ''}
              ${isCurrent ? 'bg-purple-500/20' : ''}
              ${isPending ? 'bg-white/[0.04]' : ''}
            `}>
              <AnimatePresence mode="wait">
                {isCompleted ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <Check size={18} className="text-green-400" />
                  </motion.div>
                ) : isCurrent ? (
                  <motion.div
                    key="loading"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 size={18} className="text-purple-400" />
                  </motion.div>
                ) : (
                  <motion.div key="icon">
                    <Icon size={18} className="text-dark-300" />
                  </motion.div>
                )}
              </AnimatePresence>

              {isCurrent && (
                <motion.div
                  className="absolute inset-0 rounded-xl border border-purple-400/30"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={`text-sm font-semibold transition-colors duration-300 ${
                  isCompleted ? 'text-green-400' : isCurrent ? 'text-purple-300' : 'text-dark-300'
                }`}>
                  {step.title}
                </h4>
                {isCompleted && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-[10px] font-medium text-green-400/70 bg-green-500/10 px-1.5 py-0.5 rounded"
                  >
                    Done
                  </motion.span>
                )}
              </div>
              <p className={`text-xs mt-0.5 transition-colors duration-300 ${
                isCompleted ? 'text-green-400/50' : isCurrent ? 'text-purple-300/60' : 'text-dark-400'
              }`}>
                {step.description}
              </p>

              {isCurrent && (
                <div className="mt-2 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: step.duration / 1000, ease: 'easeInOut' }}
                  />
                </div>
              )}
            </div>

            {index < steps.length - 1 && (
              <div className={`absolute left-9 top-14 w-0.5 h-3 transition-colors duration-500 ${
                isCompleted ? 'bg-green-500/30' : 'bg-white/[0.05]'
              }`} />
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

export default StepProgress