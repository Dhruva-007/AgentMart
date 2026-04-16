import React from 'react'
import { NetworkId, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'

// Initialize the WalletManager with supported wallets
const walletManager = new WalletManager({
  wallets: [
    WalletId.DEFLY,
    WalletId.PERA,
    WalletId.EXODUS,
    {
      id: WalletId.LUTE,
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