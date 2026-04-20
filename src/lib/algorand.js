const API_BASE = import.meta.env.VITE_API_URL || ''

export const ALGOD_SERVER  = import.meta.env.VITE_ALGOD_SERVER    || 'https://testnet-api.algonode.cloud'
export const APP_ID        = parseInt(import.meta.env.VITE_APP_ID  || '0', 10) || 0
export const RECEIVER_ADDR = import.meta.env.VITE_RECEIVER_ADDRESS || ''
export const NETWORK       = import.meta.env.VITE_NETWORK          || 'testnet'
export const DEPOSIT_AMOUNT_MICROALGO = 1000

console.log('[algorand.js] Config loaded:')
console.log('  APP_ID        :', APP_ID)
console.log('  RECEIVER_ADDR :', RECEIVER_ADDR ? RECEIVER_ADDR.slice(0, 10) + '...' : 'NOT SET')
console.log('  Contract ready:', APP_ID > 0 && RECEIVER_ADDR.length > 50)
console.log('  API_BASE      :', API_BASE || '(local proxy)')

export function isContractConfigured() {
  const ok = APP_ID > 0 && RECEIVER_ADDR.length > 50
  console.log('[algorand.js] isContractConfigured:', ok)
  return ok
}

export function getTxExplorerUrl(txId) {
  return `https://testnet.algoexplorer.io/tx/${txId}`
}

export async function buildDepositTxnGroup({
  senderAddress,
  taskDescription,
  creatorWallet = '',
  appId = APP_ID,
}) {
  console.log('\n[buildDepositTxnGroup] Calling backend...')
  console.log('  senderAddress:', senderAddress)
  console.log('  creatorWallet:', creatorWallet)
  console.log('  appId        :', appId)

  let response
  try {
    response = await fetch(`${API_BASE}/api/build-deposit`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        senderAddress,
        taskDescription: taskDescription || '',
        creatorWallet  : creatorWallet   || RECEIVER_ADDR,
        appId,
      }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch (fetchErr) {
    throw new Error(`Cannot reach backend to build transaction: ${fetchErr.message}`)
  }

  let rawText = ''
  try {
    rawText = await response.text()
  } catch (e) {
    throw new Error(`Could not read build-deposit response: ${e.message}`)
  }

  let data
  try {
    data = JSON.parse(rawText)
  } catch {
    throw new Error(`Backend returned invalid JSON: "${rawText.slice(0, 200)}"`)
  }

  if (!response.ok || !data.success) {
    throw new Error(data?.error || `Backend build-deposit failed: ${response.status}`)
  }

  if (!data.encodedTxns || data.encodedTxns.length === 0) {
    throw new Error('Backend returned no encoded transactions')
  }

  console.log('[buildDepositTxnGroup] contractAddress:', data.contractAddress)
  console.log('[buildDepositTxnGroup] encodedTxns count:', data.encodedTxns.length)

  const uint8Txns = data.encodedTxns.map((b64, i) => {
    try {
      const binaryStr = atob(b64)
      const bytes     = new Uint8Array(binaryStr.length)
      for (let j = 0; j < binaryStr.length; j++) {
        bytes[j] = binaryStr.charCodeAt(j)
      }
      console.log(`  Decoded txn[${i}] length:`, bytes.length)
      return bytes
    } catch (decErr) {
      throw new Error(`Failed to decode txn[${i}] from base64: ${decErr.message}`)
    }
  })

  console.log('[buildDepositTxnGroup] ✅ Ready for wallet signing')
  return uint8Txns
}

export async function submitSignedGroup(signedTxns) {
  console.log('\n[submitSignedGroup] Sending to backend...')
  console.log('  count:', signedTxns?.length)

  const base64Txns = (signedTxns || [])
    .filter(t => t !== null && t !== undefined)
    .map((uint8arr, i) => {
      try {
        const bytes  = uint8arr instanceof Uint8Array ? uint8arr : new Uint8Array(uint8arr)
        let   binary = ''
        for (let j = 0; j < bytes.length; j++) {
          binary += String.fromCharCode(bytes[j])
        }
        const b64 = btoa(binary)
        console.log(`  Encoded signed txn[${i}] → base64 length:`, b64.length)
        return b64
      } catch (encErr) {
        throw new Error(`Failed to encode signed txn[${i}] to base64: ${encErr.message}`)
      }
    })

  if (base64Txns.length === 0) {
    throw new Error('No valid signed transactions to submit')
  }

  let response
  try {
    response = await fetch(`${API_BASE}/api/submit-deposit`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ signedTxns: base64Txns }),
      signal : AbortSignal.timeout(60_000),
    })
  } catch (fetchErr) {
    throw new Error(`Cannot reach backend to submit transaction: ${fetchErr.message}`)
  }

  let rawText = ''
  try {
    rawText = await response.text()
  } catch (e) {
    throw new Error(`Could not read submit-deposit response: ${e.message}`)
  }

  let data
  try {
    data = JSON.parse(rawText)
  } catch {
    throw new Error(`Backend returned invalid JSON on submit: "${rawText.slice(0, 200)}"`)
  }

  if (!response.ok || !data.success) {
    throw new Error(data?.error || `Transaction submission failed: ${response.status}`)
  }

  console.log('[submitSignedGroup] ✅ Confirmed!')
  console.log('  txId :', data.txId)
  console.log('  round:', data.round)

  return {
    txId       : data.txId,
    round      : data.round,
    explorerUrl: data.explorerUrl,
  }
}