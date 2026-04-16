import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Inbox,
  Search,
  Brain,
  Sparkles,
  ShieldCheck,
  Check,
  Loader2,
  AlertCircle,
  Bot,
} from 'lucide-react'
import useStore      from '../store/useStore.js'
import useAgentStore from '../store/useAgentStore.js'
import GlassCard     from './GlassCard.jsx'
import StatusBadge   from './StatusBadge.jsx'
import { PulseLoader } from './Loader.jsx'

// ── Icon map ──────────────────────────────────────────────────────────────────
const ICON_MAP = {
  inbox          : Inbox,
  search         : Search,
  brain          : Brain,
  sparkles       : Sparkles,
  'shield-check' : ShieldCheck,
}

// ── AgentExecution ────────────────────────────────────────────────────────────
const AgentExecution = () => {
  const {
    isProcessing,
    agentSteps,
    currentStep,
    stepsCompleted,
    processingError,
    clearError,
    executedAgentName,
  } = useStore()

  const { selectedAgent } = useAgentStore()

  const hasStarted   = isProcessing || stepsCompleted.length > 0
  const allComplete  = stepsCompleted.length === agentSteps.length
  const hasError     = !!processingError
  const agentLabel   = executedAgentName || selectedAgent?.name || 'AI Agent'

  // Don't render until a task has been submitted
  if (!hasStarted && !hasError) return null

  return (
    <AnimatePresence>
      <motion.div
        key="agent-execution"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <GlassCard
          hover
          glowColor={hasError ? 'red' : allComplete ? 'green' : 'purple'}
          delay={0}
          className={`
            transition-all duration-700
            ${hasError     ? 'border-red-500/20'    : ''}
            ${allComplete  ? 'border-green-500/15'  : ''}
            ${isProcessing && !hasError ? 'border-purple-500/15' : ''}
          `}
        >
          {/* ── Card header ── */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center
                transition-colors duration-500
                ${hasError    ? 'bg-red-500/10 border border-red-500/20'     : ''}
                ${allComplete ? 'bg-green-500/10 border border-green-500/20' : ''}
                ${!hasError && !allComplete ? 'bg-purple-500/10 border border-purple-500/20' : ''}
              `}>
                {hasError ? (
                  <AlertCircle size={18} className="text-red-400" />
                ) : (
                  <Activity size={18} className={allComplete ? 'text-green-400' : 'text-purple-400'} />
                )}
              </div>

              {/* Title */}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-dark-100">
                    Agent Execution Flow
                  </h3>
                  {/* Show which agent is running */}
                  {(isProcessing || allComplete) && !hasError && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-1 text-[9px] font-semibold
                        text-purple-300/70 bg-purple-500/10 border border-purple-500/15
                        px-1.5 py-0.5 rounded-full"
                    >
                      <Bot size={8} />
                      {agentLabel}
                    </motion.span>
                  )}
                </div>
                <p className="text-xs text-dark-400">
                  {hasError
                    ? 'An error occurred during processing'
                    : isProcessing
                    ? `${agentLabel} is processing your task...`
                    : allComplete
                    ? 'All agents completed successfully'
                    : 'Initializing...'}
                </p>
              </div>
            </div>

            {/* Right side: pulse + badge */}
            <div className="flex items-center gap-2">
              {isProcessing && !hasError && <PulseLoader />}
              {!hasError && (
                <StatusBadge
                  status={allComplete ? 'verified' : 'processing'}
                  label={
                    allComplete
                      ? 'Complete'
                      : `Step ${Math.min(currentStep + 1, agentSteps.length)}/${agentSteps.length}`
                  }
                />
              )}
              {hasError && <StatusBadge status="error" label="Failed" />}
            </div>
          </div>

          {/* ── Error state ── */}
          {hasError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 rounded-xl bg-red-500/[0.06] border border-red-500/15"
            >
              <div className="flex items-start gap-3">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-400 mb-1">
                    AI Processing Failed
                  </p>
                  <p className="text-xs text-red-400/70 leading-relaxed">
                    {processingError}
                  </p>

                  {/* Ollama-specific guidance */}
                  {(processingError?.includes('Cannot connect') ||
                    processingError?.includes('OLLAMA') ||
                    processingError?.includes('fetch')) && (
                    <div className="mt-3 space-y-1">
                      <p className="text-[11px] text-dark-400 font-medium">💡 Quick fix:</p>
                      <code className="block text-[11px] text-purple-300
                        bg-purple-500/[0.08] px-3 py-1.5 rounded-lg">
                        ollama serve
                      </code>
                      <code className="block text-[11px] text-purple-300
                        bg-purple-500/[0.08] px-3 py-1.5 rounded-lg">
                        ollama run mistral:7b-instruct
                      </code>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={clearError}
                className="mt-3 text-xs text-red-400/60 hover:text-red-400
                  transition-colors underline underline-offset-2"
              >
                Dismiss and try again
              </button>
            </motion.div>
          )}

          {/* ── Step list ── */}
          {!hasError && (
            <div className="space-y-1.5">
              {agentSteps.map((step, index) => (
                <AgentStep
                  key={step.id}
                  step={step}
                  index={index}
                  isCompleted={stepsCompleted.includes(index)}
                  isCurrent={
                    index === currentStep &&
                    !stepsCompleted.includes(index) &&
                    isProcessing
                  }
                  isPending={
                    index > currentStep ||
                    (!isProcessing && !stepsCompleted.includes(index))
                  }
                  totalSteps={agentSteps.length}
                />
              ))}
            </div>
          )}

          {/* ── Overall progress bar ── */}
          {!hasError && (
            <div className="mt-5 pt-4 border-t border-white/[0.04]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-dark-400">Overall Progress</span>
                <span className="text-xs font-mono text-dark-300">
                  {Math.round((stepsCompleted.length / agentSteps.length) * 100)}%
                </span>
              </div>
              <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    allComplete
                      ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                      : 'bg-gradient-to-r from-purple-500 to-blue-500'
                  }`}
                  initial={{ width: '0%' }}
                  animate={{ width: `${(stepsCompleted.length / agentSteps.length) * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>

              {/* AI timing metadata */}
              <AIMetadata />
            </div>
          )}
        </GlassCard>
      </motion.div>
    </AnimatePresence>
  )
}

// ── AgentStep sub-component ───────────────────────────────────────────────────
function AgentStep({ step, index, isCompleted, isCurrent, isPending, totalSteps }) {
  const Icon       = ICON_MAP[step.icon] || Inbox
  const isLastStep = index === totalSteps - 1

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className={`
        relative flex items-start gap-4 p-3.5 rounded-xl
        transition-all duration-500
        ${isCompleted ? 'bg-green-500/[0.04] border border-green-500/10'    : ''}
        ${isCurrent   ? 'bg-purple-500/[0.06] border border-purple-500/15' : ''}
        ${isPending && !isCompleted && !isCurrent
          ? 'opacity-35 border border-transparent'
          : ''}
        ${!isCompleted && !isCurrent && !isPending ? 'border border-transparent' : ''}
      `}
    >
      {/* ── Step icon ── */}
      <div className={`
        relative flex-shrink-0 w-9 h-9 rounded-xl
        flex items-center justify-center
        transition-all duration-500
        ${isCompleted ? 'bg-green-500/15 border border-green-500/20'    : ''}
        ${isCurrent   ? 'bg-purple-500/15 border border-purple-500/20' : ''}
        ${isPending && !isCompleted ? 'bg-white/[0.03] border border-white/[0.05]' : ''}
      `}>
        <AnimatePresence mode="wait">
          {isCompleted ? (
            <motion.div
              key="check"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Check size={15} className="text-green-400" />
            </motion.div>
          ) : isCurrent ? (
            <motion.div
              key="spinner"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 size={15} className="text-purple-400" />
            </motion.div>
          ) : (
            <motion.div key="icon">
              <Icon size={15} className="text-dark-400" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse ring on active step */}
        {isCurrent && (
          <motion.div
            className="absolute inset-0 rounded-xl border border-purple-400/25"
            animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>

      {/* ── Step content ── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={`
            text-sm font-semibold transition-colors duration-300
            ${isCompleted ? 'text-green-400'   : ''}
            ${isCurrent   ? 'text-purple-300'  : ''}
            ${isPending && !isCompleted ? 'text-dark-400' : ''}
          `}>
            {step.title}
          </h4>

          {/* Done badge */}
          {isCompleted && (
            <motion.span
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[9px] font-semibold text-green-400/60
                bg-green-500/10 px-1.5 py-0.5 rounded uppercase tracking-wide"
            >
              Done
            </motion.span>
          )}

          {/* Ollama badge on dynamic (AI generation) step */}
          {isCurrent && step.isDynamic && (
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-[9px] font-semibold text-purple-300/70
                bg-purple-500/10 px-1.5 py-0.5 rounded uppercase tracking-wide"
            >
              mistral:7b-instruct
            </motion.span>
          )}
        </div>

        <p className={`
          text-xs mt-0.5 transition-colors duration-300
          ${isCompleted ? 'text-green-400/45'  : ''}
          ${isCurrent   ? 'text-purple-300/55' : ''}
          ${isPending && !isCompleted ? 'text-dark-500' : ''}
        `}>
          {step.description}
        </p>

        {/* Progress bar for fixed-duration steps */}
        {isCurrent && !step.isDynamic && step.duration > 0 && (
          <div className="mt-2 h-0.5 bg-white/[0.05] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: step.duration / 1000, ease: 'easeInOut' }}
            />
          </div>
        )}

        {/* Indeterminate bar for AI generation step */}
        {isCurrent && step.isDynamic && (
          <div className="mt-2 h-0.5 bg-white/[0.05] rounded-full overflow-hidden">
            <motion.div
              className="h-full w-2/5 bg-gradient-to-r from-transparent via-purple-400 to-transparent"
              animate={{ x: ['-100%', '350%'] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        )}
      </div>

      {/* Connector line between steps */}
      {!isLastStep && (
        <div className={`
          absolute left-[26px] top-[52px] w-px h-2
          transition-colors duration-500
          ${isCompleted ? 'bg-green-500/25' : 'bg-white/[0.05]'}
        `} />
      )}
    </motion.div>
  )
}

// ── AI metadata display ───────────────────────────────────────────────────────
function AIMetadata() {
  const { generationMetadata, stepsCompleted, agentSteps } = useStore()
  const allComplete = stepsCompleted.length === agentSteps.length

  if (!generationMetadata || !allComplete) return null

  const evalSeconds = generationMetadata.evalDuration
    ? (generationMetadata.evalDuration / 1e9).toFixed(1)
    : null

  const tokensPerSecond =
    generationMetadata.evalCount && generationMetadata.evalDuration
      ? (generationMetadata.evalCount / (generationMetadata.evalDuration / 1e9)).toFixed(1)
      : null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="mt-3 flex items-center gap-3 flex-wrap"
    >
      {evalSeconds && (
        <span className="text-[10px] text-dark-500 bg-white/[0.02]
          border border-white/[0.04] px-2 py-0.5 rounded-md">
          ⏱ {evalSeconds}s generation
        </span>
      )}
      {tokensPerSecond && (
        <span className="text-[10px] text-dark-500 bg-white/[0.02]
          border border-white/[0.04] px-2 py-0.5 rounded-md">
          🚀 {tokensPerSecond} tok/s
        </span>
      )}
      {generationMetadata.evalCount && (
        <span className="text-[10px] text-dark-500 bg-white/[0.02]
          border border-white/[0.04] px-2 py-0.5 rounded-md">
          📝 {generationMetadata.evalCount} tokens
        </span>
      )}
    </motion.div>
  )
}

export default AgentExecution