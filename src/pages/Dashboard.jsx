import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@txnlab/use-wallet-react'

import LandingSection          from '../components/LandingSection.jsx'
import WalletSection           from '../components/WalletSection.jsx'
import CreateAgent             from '../components/CreateAgent.jsx'
import AgentMarketplace        from '../components/AgentMarketplace.jsx'
import TaskInput               from '../components/TaskInput.jsx'
import AgentExecution          from '../components/AgentExecution.jsx'
import AIOutput                from '../components/AIOutput.jsx'
import TransactionVerification from '../components/TransactionVerification.jsx'

const Dashboard = () => {
  const { activeAccount } = useWallet()
  const isWalletConnected = !!activeAccount

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="relative z-10"
    >
      <LandingSection />

      <AnimatePresence>
        {isWalletConnected && (
          <motion.div
            key="dashboard-content"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 space-y-6"
          >
            <SectionDivider label="Dashboard" />

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <WalletSection />
            </motion.div>

            <SectionDivider label="Agent Marketplace" />

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <AgentMarketplace />
            </motion.div>

            <SectionDivider label="Create Agent" />

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <CreateAgent />
            </motion.div>

            <SectionDivider label="Execute Task" />

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <TaskInput />
            </motion.div>

            <AgentExecution />

            <AIOutput />

            <TransactionVerification />

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center pt-8 pb-4"
            >
              <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mb-6" />
              <p className="text-xs text-white/40">
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
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <span className="text-[10px] font-semibold text-white/50 uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
    </div>
  )
}

export default Dashboard