import React from 'react'
import { NetworkId, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'

// ── DO NOT import algosdk here ────────────────────────────────────────────────
// WalletManager handles all crypto internally through the wallet SDKs
// @txnlab/use-wallet-react v4 bundles its own minimal crypto

const walletManager = new WalletManager({
  wallets: [
    WalletId.PERA,
    WalletId.DEFLY,
    WalletId.EXODUS,
    {
      id     : WalletId.LUTE,
      options: { siteName: 'AgentMart Lite' },
    },
  ],
  defaultNetwork: NetworkId.TESTNET,
})

export function WalletProviderWrapper({ children }) {
  return (
    <WalletProvider manager={walletManager}>
      {children}
    </WalletProvider>
  )
}

export default WalletProviderWrapper