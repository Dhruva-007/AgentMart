import React from 'react'
import { motion } from 'framer-motion'
import { Bot } from 'lucide-react'
import { ConnectWalletButton } from './wallet/ConnectWalletButton.jsx'

const Navbar = () => {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className="mt-4 rounded-2xl px-6 py-3 flex items-center justify-between"
          style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <motion.div
            className="flex items-center gap-3 cursor-default"
            whileHover={{ scale: 1.02 }}
          >
            <div className="relative">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                }}
              >
                <Bot size={20} className="text-white" />
              </div>
              <div
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                style={{
                  background: '#4ade80',
                  borderColor: '#06060e',
                }}
              />
            </div>
            <div className="flex flex-col leading-none">
              <span
                className="text-lg font-bold tracking-tight"
                style={{
                  background: 'linear-gradient(90deg, #c084fc, #60a5fa, #22d3ee)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                AgentMart
              </span>
            </div>
          </motion.div>

          <div className="flex items-center gap-3">
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{
                background: 'rgba(139,92,246,0.08)',
                border: '1px solid rgba(139,92,246,0.2)',
              }}
            >
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#a78bfa' }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: '#c4b5fd' }}
              >
                Algorand
              </span>
            </div>

            <ConnectWalletButton />
          </div>
        </div>
      </div>
    </motion.nav>
  )
}

export default Navbar