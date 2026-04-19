import React from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, Zap, Shield, Brain } from 'lucide-react'
import { useWallet } from '@txnlab/use-wallet-react'

const features = [
  { icon: Brain,  label: 'AI-Powered', desc: 'Multi-agent task execution' },
  { icon: Shield, label: 'Verified',   desc: 'Algorand-secured results'    },
  { icon: Zap,    label: 'Fast',       desc: 'Sub-minute processing'       },
]

const LandingSection = () => {
  const { activeAccount } = useWallet()
  const isWalletConnected = !!activeAccount

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto text-center">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </span>
          <span className="text-xs font-medium text-white/75">
            Powered by Multi-Agent AI × Algorand Blockchain
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-5xl sm:text-7xl font-bold tracking-tight mb-4"
        >
          <span className="text-gradient">Agent</span>
          <span className="text-white">Mart</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-lg sm:text-xl text-white/80 mb-4 font-light"
        >
          AI Task Execution with Algorand Verification
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="text-sm text-white/60 max-w-xl mx-auto mb-10"
        >
          Submit any task. Our AI agents research, analyze, and verify —
          with every result cryptographically sealed on Algorand.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          {isWalletConnected ? (
            <motion.div
              key="connected-cta"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="flex items-center gap-3 px-6 py-3 rounded-xl bg-green-500/10 border border-green-500/25"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              <span className="text-green-400 font-semibold text-sm">
                Wallet Connected — Scroll down to start
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="disconnected-cta"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex items-center gap-3 px-6 py-3 rounded-xl glass border border-white/[0.10]">
                <span className="text-white/75 text-sm">
                  👆 Connect your wallet using the button in the top-right corner
                </span>
              </div>
              <p className="text-xs text-white/45">
                Supports Pera, Defly, Exodus, and Lute wallets
              </p>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-12"
        >
          {features.map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.03, y: -2 }}
              className="glass rounded-xl p-4 text-center cursor-default"
            >
              <feature.icon size={20} className="text-purple-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-white/90 mb-1">
                {feature.label}
              </h3>
              <p className="text-xs text-white/60">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {isWalletConnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 8, 0] }}
            transition={{
              opacity: { delay: 0.6, duration: 0.4 },
              y: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="text-white/40"
          >
            <ArrowDown size={20} className="mx-auto" />
          </motion.div>
        )}

      </div>
    </section>
  )
}

export default LandingSection