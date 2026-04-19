import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Sparkles, RotateCcw, MessageSquare, AlertCircle } from 'lucide-react'
import { useWallet } from '@txnlab/use-wallet-react'
import useStore      from '../store/useStore.js'
import useAgentStore from '../store/useAgentStore.js'
import { useEscrow } from '../hooks/useEscrow.js'
import GlassCard from './GlassCard.jsx'
import Button    from './Button.jsx'

const suggestedTasks = [
  'Analyze the current DeFi market trends and suggest optimal yield farming strategies',
  'Research the top 5 Layer 2 blockchain solutions and compare their performance',
  'Build a smart contract for a decentralized escrow payment system on Algorand',
  'Generate a business plan for an AI-powered SaaS startup targeting Web3 developers',
  'Create a go-to-market strategy for a new crypto payment product',
  'Summarize the key risks and opportunities in the current crypto regulatory landscape',
  'Explain how zero-knowledge proofs work and where they are used in blockchain',
  'Analyze the competitive landscape for decentralized AI agent marketplaces',
]

const TaskInput = () => {
  const { activeAccount }  = useWallet()
  const isWalletConnected  = !!activeAccount
  const { selectedAgent, incrementUsage } = useAgentStore()

  const {
    taskInput, setTaskInput, submitTask,
    isProcessing, showOutput, resetTask, processingError,
  } = useStore()

  const { executeDeposit, isDepositing } = useEscrow()
  const [isFocused, setIsFocused] = useState(false)

  const isLoading = isProcessing || isDepositing
  const canSubmit = taskInput.trim().length > 0 && !isLoading && isWalletConnected && !!selectedAgent

  function handleSubmit() {
    submitTask(
      executeDeposit,
      selectedAgent,
      () => selectedAgent && incrementUsage(selectedAgent.id)
    )
  }

  return (
    <GlassCard hover glowColor="purple" delay={0.2}
      className={`transition-all duration-500 ${isFocused ? 'border-purple-500/20 glow-purple' : ''}`}>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <MessageSquare size={18} className="text-purple-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white/90">Submit Task</h3>
          <p className="text-xs text-white/50">
            {selectedAgent
              ? `Using: ${selectedAgent.name} · Payment → creator`
              : 'Select an agent from the marketplace first'}
          </p>
        </div>
      </div>

      {!selectedAgent && (
        <div className="mb-4 flex items-center gap-2.5 p-3 rounded-xl bg-yellow-500/[0.07] border border-yellow-500/22">
          <AlertCircle size={14} className="text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-yellow-300/80">Select an agent from the marketplace to submit tasks</p>
        </div>
      )}

      <div className="relative mb-4">
        <textarea
          value={taskInput}
          onChange={e => setTaskInput(e.target.value.slice(0, 500))}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={selectedAgent ? `Give ${selectedAgent.name} a task...` : 'Select an agent above first...'}
          disabled={isLoading || !isWalletConnected || !selectedAgent}
          rows={4}
          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3
            text-sm text-white/85 placeholder-white/25
            focus:outline-none focus:border-purple-500/35 focus:bg-white/[0.05]
            disabled:opacity-40 disabled:cursor-not-allowed
            resize-none transition-all duration-300 font-sans leading-relaxed"
        />
        <div className="absolute bottom-3 right-3 text-[10px] text-white/30">
          {taskInput.length}/500
        </div>
      </div>

      {!isLoading && !showOutput && selectedAgent && (
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wider text-white/35 mb-2 font-semibold">
            Quick suggestions
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedTasks.map((task, i) => (
              <motion.button key={i} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setTaskInput(task)} disabled={isLoading}
                className="text-[11px] text-white/55 hover:text-purple-300
                  bg-white/[0.04] hover:bg-purple-500/[0.08]
                  border border-white/[0.07] hover:border-purple-500/25
                  rounded-lg px-3 py-1.5 transition-all duration-200
                  disabled:opacity-30 text-left leading-snug">
                <Sparkles size={10} className="inline mr-1 opacity-60" />
                {task.length > 65 ? task.slice(0, 65) + '...' : task}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button variant="glow" size="md" onClick={handleSubmit} disabled={!canSubmit}
          isLoading={isLoading} icon={<Send size={14} />} className="flex-1 sm:flex-none">
          {isDepositing ? 'Signing...' : isProcessing ? 'Processing...' : processingError ? 'Retry Task' : 'Execute Task'}
        </Button>
        {showOutput && (
          <Button variant="secondary" size="md" onClick={resetTask} icon={<RotateCcw size={14} />}>
            New Task
          </Button>
        )}
      </div>
    </GlassCard>
  )
}

export default TaskInput