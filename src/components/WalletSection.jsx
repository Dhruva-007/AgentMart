import React from 'react'
import { motion } from 'framer-motion'
import { Wallet, Shield, Link, Clock, Copy, CheckCheck, ExternalLink } from 'lucide-react'

import { useWallet } from '@txnlab/use-wallet-react'

import GlassCard from './GlassCard.jsx'
import StatusBadge from './StatusBadge.jsx'

const WalletSection = () => {
  const { activeAccount, activeNetwork, activeWallet } = useWallet()
  const isWalletConnected = !!activeAccount

  const [copied, setCopied] = React.useState(false)

  function handleCopy() {
    if (!activeAccount?.address) return
    navigator.clipboard.writeText(activeAccount.address).catch(console.error)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shortenAddress(address) {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  function getNetworkLabel(network) {
    if (!network) return 'Algorand'
    const n = network.toLowerCase()
    if (n.includes('mainnet')) return 'Mainnet'
    if (n.includes('testnet')) return 'TestNet'
    if (n.includes('betanet')) return 'BetaNet'
    return network
  }

  if (!isWalletConnected) {
    return (
      <GlassCard className="text-center py-12" delay={0.1}>
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Wallet size={40} className="text-purple-400 mx-auto mb-4" />
        </motion.div>
        <h3 className="text-lg font-semibold text-dark-100 mb-2">
          Connect Your Wallet
        </h3>
        <p className="text-sm text-dark-400 max-w-sm mx-auto">
          Use the Connect Wallet button in the top-right corner.
        </p>
      </GlassCard>
    )
  }

  return (
    <GlassCard hover glowColor="green" delay={0.1}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <Wallet size={18} className="text-green-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-dark-100">Wallet Connected</h3>
            <p className="text-xs text-dark-400">{getNetworkLabel(activeNetwork)}</p>
          </div>
        </div>
        <StatusBadge status="connected" label="Verified" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div className="flex items-center gap-2">
            <Link size={14} className="text-white/50" />
            <span className="text-xs text-white/80">Address</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-medium text-dark-100">
              {shortenAddress(activeAccount.address)}
            </span>
            <button
              onClick={handleCopy}
              className="text-dark-400 hover:text-dark-200 transition-colors"
              aria-label="Copy address"
            >
              {copied
                ? <CheckCheck size={14} className="text-green-400" />
                : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-white/50" />
            <span className="text-xs text-white/80">Network</span>
          </div>
          <span className="text-sm font-mono font-medium text-dark-100">
            {getNetworkLabel(activeNetwork)}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-white/50" />
            <span className="text-xs text-white/80">Session</span>
          </div>
          <span className="text-sm font-medium text-dark-100">Active</span>
        </div>
      </div>
    </GlassCard>
  )
}

export default WalletSection