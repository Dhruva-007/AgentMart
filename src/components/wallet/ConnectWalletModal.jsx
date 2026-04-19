import React, { useEffect, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Wallet, AlertCircle, Loader2, ShieldCheck } from 'lucide-react'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'

const WALLET_LOGOS = {
  pera: (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      <rect width="40" height="40" rx="10" fill="#FFEE55" />
      <path
        d="M12 28V14l8 7 8-7v14"
        stroke="#1A1A1A"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  defly: (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      <rect width="40" height="40" rx="10" fill="#1A1AFF" />
      <path
        d="M10 20h20M20 10l10 10-10 10"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  exodus: (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      <rect width="40" height="40" rx="10" fill="#0B0B0E" />
      <path d="M20 8l12 20H8L20 8z" fill="#8B5CF6" />
    </svg>
  ),
  lute: (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      <rect width="40" height="40" rx="10" fill="#10B981" />
      <circle cx="20" cy="20" r="8" stroke="white" strokeWidth="2.5" />
      <path
        d="M20 14v12M14 20h12"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  default: (
    <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
      <rect width="40" height="40" rx="10" fill="#1e1e2e" />
      <path
        d="M10 20c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10S10 25.523 10 20z"
        stroke="#6b7280"
        strokeWidth="2"
      />
      <circle cx="20" cy="20" r="4" fill="#6b7280" />
    </svg>
  ),
}

function getWalletLogo(walletId) {
  const id = (walletId || '').toLowerCase()
  if (id.includes('pera'))   return WALLET_LOGOS.pera
  if (id.includes('defly'))  return WALLET_LOGOS.defly
  if (id.includes('exodus')) return WALLET_LOGOS.exodus
  if (id.includes('lute'))   return WALLET_LOGOS.lute
  return WALLET_LOGOS.default
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Modal Component
// ─────────────────────────────────────────────────────────────────────────────
export function ConnectWalletModal({ isOpen, onClose }) {
  const { wallets, activeAccount } = useWallet()

  useLockBodyScroll(isOpen)

  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (activeAccount && isOpen) {
      const t = setTimeout(() => onCloseRef.current(), 120)
      return () => clearTimeout(t)
    }
  }, [activeAccount, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen])

  const portalTarget = document.getElementById('modal-root') || document.body

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-root-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          // Overlay: backdrop + centering container in one element
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{
            zIndex: 9998,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
          onClick={onClose}
        >
          <motion.div
            key="modal-card"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 26,
              opacity: { duration: 0.2 },
            }}
            onClick={(e) => e.stopPropagation()}
            className="
              rounded-2xl overflow-hidden
              border border-white/[0.08]
              shadow-2xl shadow-black/60
            "
            style={{
              width: '100%',
              maxWidth: '460px',
              position: 'relative',
              zIndex: 9999,
              backgroundColor: '#0e0e1a',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '70%',
                height: '1px',
                background:
                  'linear-gradient(90deg, transparent, rgba(139,92,246,0.7), transparent)',
              }}
            />

            {/* ── Header ── */}
            <ModalHeader onClose={onClose} />

            {/* ── Wallet list ── */}
            <div
              style={{
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '55vh',
                overflowY: 'auto',
              }}
            >
              {wallets && wallets.length > 0 ? (
                wallets.map((wallet) => (
                  <WalletOption key={wallet.id} wallet={wallet} />
                ))
              ) : (
                <EmptyState />
              )}
            </div>

            {/* ── Footer ── */}
            <ModalFooter />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Render into portal to escape any stacking context issues
  return ReactDOM.createPortal(modalContent, portalTarget)
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function ModalHeader({ onClose }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(139,92,246,0.12)',
            border: '1px solid rgba(139,92,246,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Wallet size={17} color="#a78bfa" />
        </div>
        <div>
          <h2
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#f1f1f5',
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            Connect Wallet
          </h2>
          <p
            style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.38)',
              margin: '2px 0 0',
            }}
          >
            Choose your Algorand wallet to continue
          </p>
        </div>
      </div>

      <button
        onClick={onClose}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.4)',
          transition: 'all 0.15s ease',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
          e.currentTarget.style.color = 'rgba(255,255,255,0.9)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
        }}
        aria-label="Close wallet modal"
      >
        <X size={15} />
      </button>
    </div>
  )
}

function ModalFooter() {
  return (
    <div
      style={{
        padding: '12px 20px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
      }}
    >
      <ShieldCheck size={12} color="rgba(139,92,246,0.6)" />
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)', margin: 0 }}>
        Secured by Algorand · Non-custodial · Your keys, your assets
      </p>
    </div>
  )
}

function WalletOption({ wallet }) {
  const [isConnecting, setIsConnecting] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [hovered, setHovered] = React.useState(false)

  const isConnected = wallet.isConnected

  async function handleClick() {
    setError(null)
    if (isConnected) {
      try {
        await wallet.disconnect()
      } catch (err) {
        setError('Failed to disconnect.')
        console.error(err)
      }
      return
    }
    setIsConnecting(true)
    try {
      await wallet.connect()
    } catch (err) {
      setError(err?.message || 'Connection failed. Is the wallet installed?')
      console.error(err)
    } finally {
      setIsConnecting(false)
    }
  }

  const baseStyle = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '13px 14px',
    borderRadius: '12px',
    cursor: isConnecting ? 'wait' : 'pointer',
    border: '1px solid',
    transition: 'all 0.15s ease',
    textAlign: 'left',
    opacity: isConnecting ? 0.7 : 1,
  }

  const connectedStyle = {
    ...baseStyle,
    background: hovered ? 'rgba(34,197,94,0.09)' : 'rgba(34,197,94,0.04)',
    borderColor: 'rgba(34,197,94,0.22)',
  }

  const defaultStyle = {
    ...baseStyle,
    background: hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.025)',
    borderColor: hovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.055)',
  }

  return (
    <button
      style={isConnected ? connectedStyle : defaultStyle}
      onClick={handleClick}
      disabled={isConnecting}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Wallet logo */}
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          overflow: 'hidden',
          flexShrink: 0,
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {getWalletLogo(wallet.id)}
      </div>

      {/* Wallet name + error */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#f1f1f5',
              whiteSpace: 'nowrap',
            }}
          >
            {wallet.metadata?.name || wallet.id}
          </span>
          {isConnected && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 500,
                color: '#4ade80',
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.25)',
                padding: '1px 7px',
                borderRadius: '999px',
              }}
            >
              Active
            </span>
          )}
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '4px',
            }}
          >
            <AlertCircle size={10} color="#f87171" />
            <span style={{ fontSize: '11px', color: '#f87171' }}>{error}</span>
          </div>
        )}
      </div>

      {/* Right side CTA */}
      <div style={{ flexShrink: 0 }}>
        {isConnecting ? (
          <Loader2
            size={16}
            color="#a78bfa"
            style={{ animation: 'spin 0.8s linear infinite' }}
          />
        ) : isConnected ? (
          <span style={{ fontSize: '12px', color: 'rgba(248,113,113,0.75)', fontWeight: 500 }}>
            Disconnect
          </span>
        ) : (
          <span
            style={{
              fontSize: '12px',
              color: hovered ? '#a78bfa' : 'rgba(255,255,255,0.25)',
              fontWeight: 500,
              transition: 'color 0.15s ease',
            }}
          >
            Connect →
          </span>
        )}
      </div>
    </button>
  )
}

function EmptyState() {
  return (
    <div
      style={{
        padding: '40px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Wallet size={20} color="rgba(255,255,255,0.2)" />
      </div>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
        No wallets detected
      </p>
      <p
        style={{
          fontSize: '11px',
          color: 'rgba(255,255,255,0.2)',
          margin: 0,
          maxWidth: '200px',
          lineHeight: 1.5,
        }}
      >
        Install a compatible Algorand wallet extension and refresh the page.
      </p>
    </div>
  )
}

// Add spin keyframe for Loader2
const spinStyle = document.createElement('style')
spinStyle.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`
if (!document.head.querySelector('[data-wallet-spin]')) {
  spinStyle.setAttribute('data-wallet-spin', '')
  document.head.appendChild(spinStyle)
}

export default ConnectWalletModal