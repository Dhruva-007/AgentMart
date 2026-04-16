/**
 * algorand.js — Algorand client & transaction helpers
 *
 * UPDATED FOR:
 *   algosdk v3.5.2
 *   @txnlab/use-wallet-react v4.6.0
 *
 * Key differences in algosdk v3:
 *   - Transaction constructors changed
 *   - algosdk.assignGroupID → algosdk.assignGroupID still works
 *   - algosdk.getApplicationAddress still works
 *   - algosdk.Algodv2 constructor same
 *   - algosdk.ALGORAND_MIN_TX_FEE = 1000
 *   - algosdk.waitForConfirmation still works
 *   - makeApplicationNoOpTxnFromObject still works
 *   - makePaymentTxnWithSuggestedParamsFromObject still works
 *   - Transaction.toByte() → algosdk.encodeUnsignedTransaction(txn)
 */

import algosdk from 'algosdk'

// ── Configuration from .env ───────────────────────────────────────────────────
export const ALGOD_SERVER = import.meta.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud'
export const APP_ID       = parseInt(import.meta.env.VITE_APP_ID || '0', 10) || 0
export const RECEIVER_ADDR = import.meta.env.VITE_RECEIVER_ADDRESS || ''
export const NETWORK      = import.meta.env.VITE_NETWORK || 'testnet'

// ── Deposit amount ────────────────────────────────────────────────────────────
export const DEPOSIT_AMOUNT_MICROALGO = 1000 // 0.001 ALGO

// ── Algod client ──────────────────────────────────────────────────────────────
export function getAlgodClient() {
  return new algosdk.Algodv2('', ALGOD_SERVER, 443)
}

// ── Get contract address from App ID ─────────────────────────────────────────
export function getContractAddress(appId = APP_ID) {
  if (!appId || appId === 0) {
    throw new Error('APP_ID not configured. Deploy the contract first.')
  }
  return algosdk.getApplicationAddress(appId)
}

// ── Build deposit transaction group ──────────────────────────────────────────
/**
 * Builds an UNSIGNED atomic transaction group:
 *   [0] = ApplicationCall("deposit")
 *   [1] = PaymentTxn → contract address
 *
 * Returns array of Uint8Array (encoded unsigned transactions)
 * ready for @txnlab/use-wallet-react v4 signTransactions()
 */
export async function buildDepositTxnGroup({
  senderAddress,
  taskDescription,
  appId = APP_ID,
}) {
  const client          = getAlgodClient()
  const contractAddress = getContractAddress(appId)
  const suggestedParams = await client.getTransactionParams().do()

  // Flat fee for predictable costs
  suggestedParams.flatFee = true
  suggestedParams.fee     = 1000 // 1000 microALGO = minimum fee

  // Encode note with task description (max 1024 bytes)
  const noteText = `AgentMart Task: ${taskDescription.slice(0, 200)}`
  const note     = new TextEncoder().encode(noteText)

  // txn[0]: ApplicationCall → deposit
  const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
    from           : senderAddress,
    appIndex       : appId,
    appArgs        : [new TextEncoder().encode('deposit')],
    suggestedParams: { ...suggestedParams },
    note,
  })

  // txn[1]: Payment → contract address
  const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from           : senderAddress,
    to             : contractAddress,
    amount         : DEPOSIT_AMOUNT_MICROALGO,
    suggestedParams: { ...suggestedParams },
    note,
  })

  // Assign group ID (makes them atomic)
  algosdk.assignGroupID([appCallTxn, paymentTxn])

  // ── CRITICAL: Encode transactions to Uint8Array ────────────────────────
  // @txnlab/use-wallet-react v4 expects Uint8Array[], not Transaction[]
  const encodedTxns = [
    algosdk.encodeUnsignedTransaction(appCallTxn),
    algosdk.encodeUnsignedTransaction(paymentTxn),
  ]

  return encodedTxns
}

// ── Submit signed transactions ────────────────────────────────────────────────
/**
 * Accepts signed transactions from wallet provider.
 * @txnlab/use-wallet-react v4 returns (Uint8Array | null)[]
 * We filter nulls and submit.
 */
export async function submitSignedGroup(signedTxns) {
  const client = getAlgodClient()

  // Filter out null entries (wallet returns null for txns it didn't sign)
  const validSignedTxns = signedTxns.filter(
    (txn) => txn !== null && txn !== undefined
  )

  if (validSignedTxns.length === 0) {
    throw new Error('No signed transactions received from wallet.')
  }

  // algosdk v3: sendRawTransaction accepts Uint8Array or Uint8Array[]
  // For atomic groups, we can pass the array directly
  let result

  try {
    // Try passing array directly (algosdk v3 supports this)
    result = await client.sendRawTransaction(validSignedTxns).do()
  } catch (arrayErr) {
    // Fallback: concatenate into single Uint8Array
    console.warn('Falling back to concatenated submission:', arrayErr.message)
    const totalLength = validSignedTxns.reduce((sum, t) => sum + t.length, 0)
    const concatenated = new Uint8Array(totalLength)
    let offset = 0
    for (const txn of validSignedTxns) {
      concatenated.set(txn, offset)
      offset += txn.length
    }
    result = await client.sendRawTransaction(concatenated).do()
  }

  // Get the transaction ID
  // algosdk v3: result may be { txId } or { txid } depending on version
  const txId = result.txId || result.txid || result.txID

  if (!txId) {
    console.warn('Could not extract txId from result:', result)
    throw new Error('Transaction submitted but could not get confirmation ID.')
  }

  // Wait for confirmation (up to 10 rounds)
  const confirmation = await algosdk.waitForConfirmation(client, txId, 10)

  return {
    txId       : txId,
    round      : confirmation['confirmed-round'],
    explorerUrl: `https://testnet.algoexplorer.io/tx/${txId}`,
  }
}

// ── Get transaction explorer URL ──────────────────────────────────────────────
export function getTxExplorerUrl(txId) {
  return `https://testnet.algoexplorer.io/tx/${txId}`
}

// ── Check if App ID is configured ─────────────────────────────────────────────
export function isContractConfigured() {
  return APP_ID > 0 && RECEIVER_ADDR.length > 0
}