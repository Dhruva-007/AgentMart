import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet,
  ChevronDown,
  LogOut,
  Copy,
  CheckCheck,
  ExternalLink,
  User,
} from 'lucide-react'
import { ConnectWalletModal } from './ConnectWalletModal'

function shortenAddress(address) {
  if (!address || address.length < 10) return address || ''
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

export function ConnectWalletButton() {
  const { activeAccount, activeNetwork, activeWallet } = useWallet()

  const [modalOpen, setModalOpen]         = useState(false)
  const [dropdownOpen, setDropdownOpen]   = useState(false)
  const [copied, setCopied]               = useState(false)

  const isConnected = !!activeAccount

  useEffect(() => {
    setDropdownOpen(false)
  }, [isConnected])

  const openModal  = useCallback(() => setModalOpen(true), [])
  const closeModal = useCallback(() => setModalOpen(false), [])

  function handleCopy() {
    if (!activeAccount?.address) return
    navigator.clipboard.writeText(activeAccount.address).catch(console.error)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDisconnect() {
    setDropdownOpen(false)
    try {
      await activeWallet?.disconnect()
    } catch (err) {
      console.error('Disconnect error:', err)
    }
  }

  return (
    <>
      <ConnectWalletModal isOpen={modalOpen} onClose={closeModal} />

      {!isConnected ? (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={openModal}
          className="
            inline-flex items-center gap-2
            px-5 py-2.5 rounded-xl
            bg-gradient-to-r from-purple-600 to-blue-600
            hover:from-purple-500 hover:to-blue-500
            text-white text-sm font-semibold
            shadow-lg shadow-purple-500/20
            hover:shadow-purple-500/30
            transition-shadow duration-200
          "
        >
          <Wallet size={15} />
          Connect Wallet
        </motion.button>
      ) : (
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="
              inline-flex items-center gap-2.5
              pl-3 pr-3 py-2 rounded-xl
              bg-white/[0.06] hover:bg-white/[0.09]
              border border-white/[0.08] hover:border-white/[0.14]
              text-sm font-medium text-white/90
              transition-all duration-200
            "
          >
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="
                animate-ping absolute inline-flex h-full w-full
                rounded-full bg-green-400 opacity-60
              " />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>

            <span className="font-mono text-xs tracking-wide">
              {shortenAddress(activeAccount.address)}
            </span>

            <span className="
              hidden sm:inline-flex text-[10px] font-medium
              bg-purple-500/10 text-purple-300
              border border-purple-500/20
              px-2 py-0.5 rounded-full
            ">
              {getNetworkLabel(activeNetwork)}
            </span>

            <ChevronDown
              size={13}
              className={`
                text-white/40 transition-transform duration-200
                ${dropdownOpen ? 'rotate-180' : ''}
              `}
            />
          </motion.button>

          <AnimatePresence>
            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0"
                  style={{ zIndex: 200 }}
                  onClick={() => setDropdownOpen(false)}
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 6 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 26 }}
                  className="
                    absolute right-0 mt-2 w-64
                    rounded-2xl overflow-hidden
                    border border-white/[0.08]
                    shadow-2xl shadow-black/50
                  "
                  style={{
                    position: 'absolute',
                    right: 0,
                    marginTop: '8px',
                    width: '256px',
                    zIndex: 201,
                    background: 'rgba(14,14,26,0.98)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '60%',
                      height: '1px',
                      background:
                        'linear-gradient(90deg, transparent, rgba(139,92,246,0.55), transparent)',
                    }}
                  />

                  <div
                    style={{
                      padding: '16px',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '12px',
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background:
                            'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,130,246,0.2))',
                          border: '1px solid rgba(255,255,255,0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <User size={15} color="#c4b5fd" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: '10px',
                            color: 'rgba(255,255,255,0.38)',
                            margin: '0 0 2px',
                          }}
                        >
                          Connected Account
                        </p>
                        <p
                          style={{
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            color: '#f1f1f5',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {shortenAddress(activeAccount.address)}
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '10px',
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: 'monospace',
                          color: 'rgba(255,255,255,0.38)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {activeAccount.address}
                      </span>
                      <button
                        onClick={handleCopy}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          flexShrink: 0,
                          color: copied
                            ? '#4ade80'
                            : 'rgba(255,255,255,0.3)',
                          transition: 'color 0.15s ease',
                        }}
                        aria-label="Copy address"
                      >
                        {copied
                          ? <CheckCheck size={13} />
                          : <Copy size={13} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: '8px' }}>
                    <DropdownItem
                      icon={<LogOut size={14} />}
                      label="Disconnect Wallet"
                      danger
                      onClick={handleDisconnect}
                    />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  )
}

function DropdownItem({ icon, label, onClick, danger = false }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 10px',
        borderRadius: '10px',
        background: hovered
          ? danger
            ? 'rgba(239,68,68,0.08)'
            : 'rgba(255,255,255,0.05)'
          : 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: danger
          ? hovered ? '#f87171' : 'rgba(248,113,113,0.75)'
          : hovered ? '#f1f1f5' : 'rgba(255,255,255,0.55)',
        fontSize: '13px',
        fontWeight: 500,
        textAlign: 'left',
        transition: 'all 0.15s ease',
        transform: hovered ? 'translateX(2px)' : 'translateX(0)',
      }}
    >
      {icon}
      {label}
    </button>
  )
}

export default ConnectWalletButton