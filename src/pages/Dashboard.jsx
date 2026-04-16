import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@txnlab/use-wallet-react'
import { WifiOff, Terminal } from 'lucide-react'

import LandingSection          from '../components/LandingSection.jsx'
import WalletSection           from '../components/WalletSection.jsx'
import CreateAgent             from '../components/CreateAgent.jsx'
import AgentMarketplace        from '../components/AgentMarketplace.jsx'
import TaskInput               from '../components/TaskInput.jsx'
import AgentExecution          from '../components/AgentExecution.jsx'
import AIOutput                from '../components/AIOutput.jsx'
import TransactionVerification from '../components/TransactionVerification.jsx'
import useStore                from '../store/useStore.js'
import useAgentStore           from '../store/useAgentStore.js'

const Dashboard = () => {
  const { activeAccount }               = useWallet()
  const isWalletConnected               = !!activeAccount
  const { backendOnline, checkBackendHealth } = useStore()
  const { selectedAgent }               = useAgentStore()

  useEffect(() => { checkBackendHealth() }, [checkBackendHealth])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }} className="relative z-10">

      <LandingSection />

      <AnimatePresence>
        {isWalletConnected && (
          <motion.div key="dashboard-content" initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 space-y-6">

            {/* ── Section divider ── */}
            <SectionDivider label="Dashboard" />

            {/* ── Backend offline warning ── */}
            <AnimatePresence>
              {backendOnline === false && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-orange-500/[0.06] border border-orange-500/20">
                  <WifiOff size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-orange-400 mb-1">Backend or Ollama not running</p>
                    <p className="text-xs text-orange-400/70 mb-2">Start both services so AI processing works.</p>
                    <div className="space-y-1">
                      <CodeHint>ollama serve</CodeHint>
                      <CodeHint>cd server && npm run dev</CodeHint>
                    </div>
                  </div>
                  <button onClick={checkBackendHealth} className="text-xs text-orange-400/60 hover:text-orange-400 transition-colors whitespace-nowrap mt-0.5">Retry ↺</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Wallet info ── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <WalletSection />
            </motion.div>

            {/* ── AGENT MARKETPLACE section ── */}
            <SectionDivider label="Agent Marketplace" />

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <AgentMarketplace />
            </motion.div>

            {/* ── CREATE AGENT section ── */}
            <SectionDivider label="Create Agent" />

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <CreateAgent />
            </motion.div>

            {/* ── TASK EXECUTION section ── */}
            <SectionDivider label="Execute Task" />

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <TaskInput />
            </motion.div>

            {/* ── Agent execution flow ── */}
            <AgentExecution />

            {/* ── AI output ── */}
            <AIOutput />

            {/* ── Transaction verification ── */}
            <TransactionVerification />

            {/* ── Footer ── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="text-center pt-8 pb-4">
              <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-6" />
              <p className="text-xs text-dark-500">
                Built with ❤️ by <span className="text-gradient font-medium">Dhruvann</span>
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function SectionDivider({ label }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <span className="text-[10px] font-medium text-dark-500 uppercase tracking-widest whitespace-nowrap">{label}</span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  )
}

function CodeHint({ children }) {
  return (
    <div className="flex items-center gap-2">
      <Terminal size={10} className="text-orange-400/60" />
      <code className="text-[11px] font-mono text-orange-300/80 bg-orange-500/[0.08] px-2 py-0.5 rounded">{children}</code>
    </div>
  )
}

export default Dashboard