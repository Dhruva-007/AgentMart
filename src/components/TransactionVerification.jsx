import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Hash,
  Wallet,
  Clock,
  CheckCircle2,
  ExternalLink,
  Copy,
  CheckCheck,
  Link2,
  Cpu,
  Users,
  ArrowRight,
} from 'lucide-react'
import { useWallet } from '@txnlab/use-wallet-react'
import useStore      from '../store/useStore.js'
import useAgentStore from '../store/useAgentStore.js'
import GlassCard     from './GlassCard.jsx'
import StatusBadge   from './StatusBadge.jsx'

const TransactionVerification = () => {
  const {
    showTransaction,
    transactionId,
    transactionRound,
    explorerUrl,
    isVerified,
    isSimulated,
  } = useStore()

  const { selectedAgent, executedAgentName } = {
    ...useAgentStore(),
    executedAgentName: useStore(s => s.executedAgentName),
  }

  const { activeAccount, activeNetwork } = useWallet()
  const [copied, setCopied] = React.useState(false)

  if (!showTransaction || !transactionId) return null

  function handleCopy() {
    navigator.clipboard.writeText(transactionId).catch(console.error)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shortenAddress(addr) {
    if (!addr) return 'Unknown'
    if (addr.length <= 12) return addr
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  function getNetworkLabel(network) {
    if (!network) return 'Algorand TestNet'
    const n = network.toLowerCase()
    if (n.includes('mainnet')) return 'Algorand Mainnet'
    if (n.includes('testnet')) return 'Algorand TestNet'
    if (n.includes('betanet')) return 'Algorand BetaNet'
    return network
  }

  const timestamp = new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

  const realExplorerUrl = explorerUrl || `https://testnet.algoexplorer.io/tx/${transactionId}`

  // Creator wallet — prefer the agent's creator wallet
  const creatorWallet   = selectedAgent?.creatorWallet || 'Unknown'
  const creatorLabel    = selectedAgent?.creatorLabel  || 'Agent Creator'
  const agentName       = executedAgentName || selectedAgent?.name || 'AI Agent'

  return (
    <AnimatePresence>
      <motion.div
        key="tx-verification"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, type: 'spring', damping: 22 }}
      >
        <GlassCard
          hover
          glowColor="green"
          delay={0}
          className={`transition-all duration-700 ${
            isVerified ? 'border-green-500/20' : 'border-yellow-500/10'
          }`}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className={`
                  w-10 h-10 rounded-xl flex items-center justify-center
                  transition-all duration-700
                  ${isVerified
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-yellow-500/10 border border-yellow-500/20'}
                `}
              >
                <AnimatePresence mode="wait">
                  {isVerified ? (
                    <motion.div
                      key="verified-icon"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                    >
                      <CheckCircle2 size={20} className="text-green-400" />
                    </motion.div>
                  ) : (
                    <motion.div key="pending-icon">
                      <Shield size={20} className="text-yellow-400" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-dark-100">
                    Transaction Verification
                  </h3>
                  {/* On-chain / Simulated badge */}
                  {isSimulated ? (
                    <span className="text-[9px] font-semibold text-yellow-400/70
                      bg-yellow-500/10 border border-yellow-500/20
                      px-1.5 py-0.5 rounded uppercase tracking-wide">
                      Simulated
                    </span>
                  ) : (
                    <span className="text-[9px] font-semibold text-green-400/70
                      bg-green-500/10 border border-green-500/20
                      px-1.5 py-0.5 rounded uppercase tracking-wide">
                      On-Chain
                    </span>
                  )}
                </div>
                <p className="text-xs text-dark-400">
                  {isVerified
                    ? isSimulated
                      ? 'Simulated — deploy contract for real transactions'
                      : `Payment sent to ${creatorLabel}`
                    : 'Recording result to Algorand blockchain...'}
                </p>
              </div>
            </div>

            <StatusBadge
              status={isVerified ? 'verified' : 'processing'}
              label={isVerified ? 'Verified' : 'Verifying'}
            />
          </div>

          {/* ── Payment flow indicator ── */}
          {isVerified && selectedAgent && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-4 flex items-center gap-2 p-3 rounded-xl
                bg-purple-500/[0.05] border border-purple-500/15"
            >
              <Wallet size={13} className="text-purple-400 flex-shrink-0" />
              <span className="text-xs text-dark-300">Your wallet</span>
              <ArrowRight size={12} className="text-dark-500" />
              <span className="text-xs font-medium text-purple-300">{agentName}</span>
              <ArrowRight size={12} className="text-dark-500" />
              <Users size={13} className="text-green-400 flex-shrink-0" />
              <span className="text-xs text-green-400 font-medium">{creatorLabel}</span>
            </motion.div>
          )}

          {/* ── Detail rows ── */}
          <div className="space-y-2.5">

            {/* Transaction ID */}
            <DetailRow
              icon={<Hash size={13} className="text-dark-400" />}
              label="Transaction ID"
              delay={0.1}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-medium text-dark-100
                  max-w-[160px] truncate">
                  {transactionId}
                </span>
                <button
                  onClick={handleCopy}
                  className="text-dark-400 hover:text-dark-200 transition-colors flex-shrink-0"
                  aria-label="Copy transaction ID"
                >
                  {copied
                    ? <CheckCheck size={13} className="text-green-400" />
                    : <Copy size={13} />}
                </button>
                {!isSimulated && (
                  <button
                    onClick={() => window.open(realExplorerUrl, '_blank', 'noopener,noreferrer')}
                    className="text-dark-400 hover:text-dark-200 transition-colors flex-shrink-0"
                    aria-label="View on explorer"
                  >
                    <ExternalLink size={12} />
                  </button>
                )}
              </div>
            </DetailRow>

            {/* Confirmed block round */}
            {transactionRound && (
              <DetailRow
                icon={<Link2 size={13} className="text-dark-400" />}
                label="Confirmed Block"
                delay={0.13}
              >
                <span className="text-sm font-mono font-medium text-dark-100">
                  #{transactionRound.toLocaleString()}
                </span>
              </DetailRow>
            )}

            {/* User wallet */}
            <DetailRow
              icon={<Wallet size={13} className="text-dark-400" />}
              label="From (You)"
              delay={0.15}
            >
              <span className="text-sm font-mono font-medium text-dark-100">
                {shortenAddress(activeAccount?.address)}
              </span>
            </DetailRow>

            {/* Creator wallet */}
            {selectedAgent && (
              <DetailRow
                icon={<Users size={13} className="text-dark-400" />}
                label="To (Agent Creator)"
                delay={0.18}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-medium text-green-400">
                    {shortenAddress(creatorWallet)}
                  </span>
                  <span className="text-[10px] text-dark-500">
                    {creatorLabel}
                  </span>
                </div>
              </DetailRow>
            )}

            {/* Network */}
            <DetailRow
              icon={<Link2 size={13} className="text-dark-400" />}
              label="Network"
              delay={0.2}
            >
              <span className="text-sm font-medium text-dark-100">
                {getNetworkLabel(activeNetwork)}
              </span>
            </DetailRow>

            {/* Timestamp */}
            <DetailRow
              icon={<Clock size={13} className="text-dark-400" />}
              label="Timestamp"
              delay={0.23}
            >
              <span className="text-sm font-mono text-dark-100">{timestamp}</span>
            </DetailRow>

            {/* Model used */}
            <DetailRow
              icon={<Cpu size={13} className="text-dark-400" />}
              label="AI Model"
              delay={0.26}
            >
              <span className="text-sm font-mono text-purple-300">
                mistral:7b-instruct · local
              </span>
            </DetailRow>

            {/* Amount + Agent */}
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.29 }}
              className="grid grid-cols-2 gap-2.5"
            >
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-1 font-medium">
                  Amount
                </p>
                <p className="text-sm font-mono font-medium text-dark-100">
                  0.001 ALGO
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-1 font-medium">
                  Agent Used
                </p>
                <p className="text-sm font-medium text-purple-300 truncate">
                  {agentName}
                </p>
              </div>
            </motion.div>
          </div>

          {/* ── Verified stamp ── */}
          {isVerified && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mt-5 pt-4 border-t border-green-500/[0.08]"
            >
              <div className="flex items-center justify-center gap-2.5
                py-3 rounded-xl bg-green-500/[0.05] border border-green-500/15">
                <CheckCircle2 size={16} className="text-green-400" />
                <span className="text-sm font-semibold text-green-400 text-center">
                  {isSimulated
                    ? 'Simulated — Deploy contract for real on-chain verification'
                    : 'Verified · Payment Sent to Agent Creator via Algorand'}
                </span>
              </div>

              {/* Explorer link (only for real transactions) */}
              {!isSimulated && (
                <div className="mt-3 text-center">
                  <button
                    onClick={() =>
                      window.open(realExplorerUrl, '_blank', 'noopener,noreferrer')
                    }
                    className="text-xs text-dark-500 hover:text-purple-400
                      transition-colors flex items-center gap-1.5 mx-auto"
                  >
                    <ExternalLink size={11} />
                    View on AlgoExplorer
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </GlassCard>
      </motion.div>
    </AnimatePresence>
  )
}

// ── DetailRow sub-component ───────────────────────────────────────────────────
function DetailRow({ icon, label, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center justify-between p-3
        rounded-xl bg-white/[0.02] border border-white/[0.04]"
    >
      <div className="flex items-center gap-2 flex-shrink-0">
        {icon}
        <span className="text-xs text-dark-400">{label}</span>
      </div>
      <div className="ml-3">{children}</div>
    </motion.div>
  )
}

export default TransactionVerification