/**
 * useEscrow.js — Escrow transaction hook
 *
 * UPDATED FOR:
 *   @txnlab/use-wallet-react v4.6.0
 *   algosdk v3.5.2
 *
 * v4 changes:
 *   - signTransactions accepts Uint8Array[] (encoded unsigned txns)
 *   - returns (Uint8Array | null)[] (signed or null if not owned)
 *   - transactionSigner is the new API but signTransactions still works
 */

import { useCallback, useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import {
  buildDepositTxnGroup,
  submitSignedGroup,
  isContractConfigured,
  APP_ID,
} from '../lib/algorand.js'

export function useEscrow() {
  const { activeAccount, activeWallet, signTransactions } = useWallet()
  const [isDepositing, setIsDepositing] = useState(false)
  const [depositError, setDepositError] = useState(null)

  /**
   * Execute deposit transaction
   * @param {string} taskDescription   - the user's task text
   * @param {string} creatorWallet     - agent creator's wallet address
   */
  const executeDeposit = useCallback(
    async (taskDescription, creatorWallet) => {
      setDepositError(null)

      // ── Guard: wallet must be connected ─────────────────────────────────
      if (!activeAccount?.address) {
        throw new Error('Wallet not connected. Please connect your wallet first.')
      }

      // ── Guard: contract must be deployed ────────────────────────────────
      if (!isContractConfigured()) {
        console.warn('⚠️  APP_ID not configured — running in simulation mode')
        console.log(`   [Simulated] Sender  : ${activeAccount.address}`)
        console.log(`   [Simulated] Receiver: ${creatorWallet || 'platform'}`)
        return {
          txId: `SIM_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)
            .toUpperCase()}`,
          round      : null,
          explorerUrl: null,
          simulated  : true,
          receiver   : creatorWallet,
        }
      }

      setIsDepositing(true)

      try {
        console.log(`\n💳 Building deposit transaction...`)
        console.log(`   Sender  : ${activeAccount.address}`)
        console.log(`   Receiver: ${creatorWallet || 'contract'} (agent creator)`)
        console.log(`   App ID  : ${APP_ID}`)
        console.log(`   Amount  : 0.001 ALGO (1000 microALGO)`)

        // ── Build encoded unsigned transaction group ───────────────────────
        // Returns Uint8Array[] — already encoded for wallet signing
        const encodedTxns = await buildDepositTxnGroup({
          senderAddress  : activeAccount.address,
          taskDescription: taskDescription,
          appId          : APP_ID,
        })

        console.log(
          `📝 Built ${encodedTxns.length} transactions (encoded as Uint8Array)`
        )

        // ── Sign with wallet ──────────────────────────────────────────────
        // @txnlab/use-wallet-react v4:
        //   signTransactions(txns: Uint8Array[]) => Promise<(Uint8Array | null)[]>
        //
        // Try the hook-level signTransactions first (v4 pattern)
        // Fall back to activeWallet.signTransactions (v3 pattern)
        let signedTxns

        if (typeof signTransactions === 'function') {
          // v4 pattern: signTransactions from useWallet()
          console.log('🔐 Using useWallet().signTransactions (v4)')
          signedTxns = await signTransactions(encodedTxns)
        } else if (activeWallet && typeof activeWallet.signTransactions === 'function') {
          // v3 fallback pattern
          console.log('🔐 Using activeWallet.signTransactions (v3 fallback)')
          signedTxns = await activeWallet.signTransactions(encodedTxns)
        } else {
          throw new Error(
            'No signTransactions method available. Check wallet provider version.'
          )
        }

        console.log(`✅ Transactions signed by wallet`)

        // ── Submit to Algorand TestNet ─────────────────────────────────────
        const result = await submitSignedGroup(signedTxns)

        console.log(`✅ Deposit confirmed!`)
        console.log(`   Tx ID : ${result.txId}`)
        console.log(`   Round : ${result.round}`)

        return { ...result, receiver: creatorWallet }
      } catch (err) {
        const errorMessage = err.message || 'Deposit transaction failed'

        // User rejected in wallet popup — not a real error
        if (
          errorMessage.includes('rejected') ||
          errorMessage.includes('cancelled') ||
          errorMessage.includes('canceled') ||
          errorMessage.includes('user denied') ||
          errorMessage.includes('User rejected')
        ) {
          console.log('ℹ️  User cancelled the transaction')
          setDepositError('Transaction cancelled by user.')
          throw new Error('Transaction cancelled by user.')
        }

        setDepositError(errorMessage)
        console.error('❌ Deposit failed:', errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsDepositing(false)
      }
    },
    [activeAccount, activeWallet, signTransactions]
  )

  return {
    executeDeposit,
    isDepositing,
    depositError,
    clearDepositError: () => setDepositError(null),
    isContractReady  : isContractConfigured(),
  }
}

export default useEscrow