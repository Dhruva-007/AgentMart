import React from 'react'
import { NetworkId, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'

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