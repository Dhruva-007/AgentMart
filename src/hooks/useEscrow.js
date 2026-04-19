import { useCallback, useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import {
  buildDepositTxnGroup,
  submitSignedGroup,
  isContractConfigured,
  APP_ID,
  RECEIVER_ADDR,
} from '../lib/algorand.js'

function isValidAlgorandAddress(address) {
  if (!address || typeof address !== 'string') return false
  const cleaned = address.trim()
  return cleaned.length === 58 && /^[A-Z2-7]{58}$/.test(cleaned)
}

export function useEscrow() {
  const { activeAccount, activeWallet, signTransactions } = useWallet()
  const [isDepositing, setIsDepositing] = useState(false)
  const [depositError, setDepositError] = useState(null)

  const executeDeposit = useCallback(
    async (taskDescription, creatorWallet) => {
      setDepositError(null)

      console.log('\n[useEscrow] executeDeposit called')
      console.log('  taskDescription:', taskDescription?.slice(0, 50))
      console.log('  creatorWallet  :', creatorWallet)
      console.log('  activeAccount  :', activeAccount?.address)
      console.log('  APP_ID         :', APP_ID)
      console.log('  RECEIVER_ADDR  :', RECEIVER_ADDR)
      console.log('  isContractConfigured:', isContractConfigured())

      if (!activeAccount?.address) {
        const err = 'Wallet not connected. Please connect your wallet first.'
        setDepositError(err)
        throw new Error(err)
      }

      if (!creatorWallet) {
        console.warn('[useEscrow] creatorWallet is empty — using RECEIVER_ADDR')
      } else if (!isValidAlgorandAddress(creatorWallet)) {
        console.warn('[useEscrow] creatorWallet may be invalid:', creatorWallet)
        console.warn('[useEscrow] Length:', creatorWallet.length, '(expected 58)')
      } else {
        console.log('[useEscrow] creatorWallet is valid ✅')
      }

      if (!isContractConfigured()) {
        console.warn('[useEscrow] Contract not configured → SIMULATION MODE')
        const simId = `SIM_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)
          .toUpperCase()}`
        return {
          txId       : simId,
          round      : null,
          explorerUrl: null,
          simulated  : true,
          receiver   : creatorWallet || RECEIVER_ADDR,
        }
      }

      setIsDepositing(true)

      try {
        console.log('[useEscrow] Calling buildDepositTxnGroup (backend)...')

        const encodedTxns = await buildDepositTxnGroup({
          senderAddress  : activeAccount.address,
          taskDescription: taskDescription || 'AgentMart task',
          creatorWallet  : creatorWallet || RECEIVER_ADDR,
          appId          : APP_ID,
        })

        console.log('[useEscrow] encodedTxns received:', encodedTxns.length)

        console.log('[useEscrow] Requesting wallet signature...')
        console.log('  signTransactions (hook)  :', typeof signTransactions)
        console.log('  activeWallet.signTxns    :', typeof activeWallet?.signTransactions)

        let signedTxns

        if (typeof signTransactions === 'function') {
          console.log('[useEscrow] Using hook signTransactions (v4)')
          signedTxns = await signTransactions(encodedTxns)
        } else if (activeWallet && typeof activeWallet.signTransactions === 'function') {
          console.log('[useEscrow] Using activeWallet.signTransactions (v3 fallback)')
          signedTxns = await activeWallet.signTransactions(encodedTxns)
        } else {
          throw new Error('No signTransactions method available. Check wallet provider setup.')
        }

        console.log('[useEscrow] Wallet signed ✅')
        console.log('  signedTxns count:', signedTxns?.length)

        console.log('[useEscrow] Submitting to Algorand via backend...')
        const result = await submitSignedGroup(signedTxns)

        console.log('[useEscrow] ✅ Deposit confirmed!')
        console.log('  txId :', result.txId)
        console.log('  round:', result.round)

        return {
          ...result,
          receiver : creatorWallet || RECEIVER_ADDR,
          simulated: false,
        }

      } catch (err) {
        const msg = err.message || 'Deposit transaction failed'
        console.error('[useEscrow] ❌ Error:', msg)

        const isCancelled =
          msg.toLowerCase().includes('rejected')  ||
          msg.toLowerCase().includes('cancelled') ||
          msg.toLowerCase().includes('canceled')  ||
          msg.toLowerCase().includes('user denied')

        if (isCancelled) {
          const cancelMsg = 'Transaction cancelled. Click Execute Task to try again.'
          setDepositError(cancelMsg)
          throw new Error(cancelMsg)
        }

        setDepositError(msg)
        throw new Error(msg)
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