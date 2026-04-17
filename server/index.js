import express from 'express'
import cors from 'cors'
import algosdk from 'algosdk'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ── Load .env from project root ───────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })
config({ path: resolve(__dirname, '.env') })

const app        = express()
const PORT       = 3001
const OLLAMA_URL = 'http://localhost:11434'
const MODEL      = 'mistral:7b-instruct'

const ALGOD_SERVER      = 'https://testnet-api.algonode.cloud'
const APP_ID            = parseInt(process.env.APP_ID || '0', 10) || 0
const DEPLOYER_MNEMONIC = process.env.DEPLOYER_MNEMONIC || ''
const RECEIVER_ADDRESS = process.env.RECEIVER_ADDRESS || ''

console.log(`\n🔧 Config:`)
console.log(`   APP_ID            : ${APP_ID || 'NOT SET'}`)
console.log(`   DEPLOYER_MNEMONIC : ${DEPLOYER_MNEMONIC ? '*****(set)' : 'NOT SET'}`)
console.log(`   OLLAMA            : ${OLLAMA_URL}`)
console.log(`   MODEL             : ${MODEL}\n`)

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}))
app.use(express.json({ limit: '2mb' })) // ← limit prevents huge payload crashes

// ── Global unhandled rejection guard ─────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled Rejection (server kept alive):', reason?.message || reason)
})
process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught Exception (server kept alive):', err.message)
})

// ── Safe JSON response helper ─────────────────────────────────────────────────
// Guarantees the response is ALWAYS valid JSON — never crashes the client
function safeJson(res, statusCode, payload) {
  try {
    if (!res.headersSent) {
      res.status(statusCode).json(payload)
    }
  } catch (err) {
    console.error('❌ safeJson error:', err.message)
    if (!res.headersSent) {
      res.status(500).end('{"success":false,"result":"Server error","error":"Response failed"}')
    }
  }
}

// ── Ollama caller with full safety ────────────────────────────────────────────
async function callOllama(prompt) {
  // 180 second timeout — enough for mistral:7b-instruct on CPU
  const controller = new AbortController()
  const timeoutId  = setTimeout(() => {
    console.warn('⏰ Ollama timeout — aborting request after 300s')
    controller.abort()
  }, 300_000)

  let response
  try {
    response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        model  : MODEL,
        prompt : prompt,
        stream : false,   // CRITICAL: false = single complete response
        options: {
          temperature   : 0.6,
          top_p         : 0.9,
          num_predict   : 350,  // limit output length = faster response
          repeat_penalty: 1.1,
        },
      }),
      signal: controller.signal,
    })
  } catch (fetchErr) {
    clearTimeout(timeoutId)

    // AbortError = our timeout fired
    if (fetchErr.name === 'AbortError') {
      throw new Error('TIMEOUT: Ollama took more than 180 seconds. Try a shorter task.')
    }
    // ECONNREFUSED = Ollama not running
    if (fetchErr.code === 'ECONNREFUSED' || fetchErr.message?.includes('ECONNREFUSED')) {
      throw new Error('OFFLINE: Cannot reach Ollama. Run: ollama serve')
    }
    // ECONNRESET = connection dropped
    if (fetchErr.code === 'ECONNRESET' || fetchErr.message?.includes('ECONNRESET')) {
      throw new Error('RESET: Ollama connection reset. Ollama may have crashed.')
    }

    throw new Error(`FETCH_ERROR: ${fetchErr.message}`)
  }

  clearTimeout(timeoutId)

  // ── Check HTTP status from Ollama ─────────────────────────────────────────
  if (!response.ok) {
    let errBody = ''
    try { errBody = await response.text() } catch { errBody = 'unreadable' }

    if (response.status === 404) {
      throw new Error(`MODEL_NOT_FOUND: Model "${MODEL}" not found. Run: ollama pull ${MODEL}`)
    }
    throw new Error(`OLLAMA_HTTP_${response.status}: ${errBody.slice(0, 200)}`)
  }

  // ── Read raw text first — NEVER call .json() directly ────────────────────
  let rawText = ''
  try {
    rawText = await response.text()
  } catch (readErr) {
    throw new Error(`READ_ERROR: Could not read Ollama response body. ${readErr.message}`)
  }

  if (!rawText || rawText.trim().length === 0) {
    throw new Error('EMPTY_RESPONSE: Ollama returned an empty body.')
  }

  console.log(`📨 Raw Ollama response (first 300 chars): ${rawText.slice(0, 300)}`)

  // ── Safe JSON parse ───────────────────────────────────────────────────────
  let parsed
  try {
    parsed = JSON.parse(rawText)
  } catch (parseErr) {
    // Ollama sometimes returns multiple JSON lines when stream leaks through
    // Try to extract first valid JSON object
    const firstLine = rawText.split('\n').find(line => {
      try { JSON.parse(line); return true } catch { return false }
    })

    if (firstLine) {
      try {
        parsed = JSON.parse(firstLine)
        console.warn('⚠️  Used first-line JSON fallback parser')
      } catch {
        throw new Error(`PARSE_ERROR: Could not parse Ollama JSON. Raw: ${rawText.slice(0, 200)}`)
      }
    } else {
      throw new Error(`PARSE_ERROR: Invalid JSON from Ollama. Raw: ${rawText.slice(0, 200)}`)
    }
  }

  // ── Extract the response text ─────────────────────────────────────────────
  const output = parsed?.response?.trim()

  if (!output || output.length === 0) {
    throw new Error('EMPTY_OUTPUT: Ollama parsed OK but response field is empty.')
  }

  return {
    output,
    evalDuration: parsed.eval_duration  || null,
    evalCount   : parsed.eval_count     || null,
  }
}

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!r.ok) throw new Error('Ollama responded with error')
    const d    = await r.json()
    const models = (d.models || []).map(m => m.name)
    safeJson(res, 200, {
      status       : 'ok',
      ollama       : 'running',
      models,
      targetModel  : MODEL,
      modelReady   : models.some(m => m.includes('mistral')),
      contractReady: APP_ID > 0,
      appId        : APP_ID,
    })
  } catch (err) {
    safeJson(res, 503, {
      status : 'error',
      ollama : 'not running',
      message: 'Please run: ollama serve',
      error  : err.message,
    })
  }
})

// ── AI Generation ─────────────────────────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📥 POST /api/generate received')

  // ── Validate input ────────────────────────────────────────────────────────
  const { task, agent } = req.body || {}

  if (!task || typeof task !== 'string') {
    return safeJson(res, 400, {
      success: false,
      result : 'Please provide a valid task.',
      error  : 'Missing or invalid task field',
    })
  }

  const trimmedTask = task.trim()
  if (trimmedTask.length < 3) {
    return safeJson(res, 400, {
      success: false,
      result : 'Task is too short. Please provide more detail.',
      error  : 'Task must be at least 3 characters',
    })
  }

  // Limit task size to prevent huge prompts
  const safeTask  = trimmedTask.slice(0, 800)
  const agentName = agent?.name || 'default'

  console.log(`📋 Task    : "${safeTask.slice(0, 80)}${safeTask.length > 80 ? '...' : ''}"`)
  console.log(`🤖 Agent   : ${agentName}`)
  console.log(`🔮 Model   : ${MODEL}`)

  // ── Build prompt ──────────────────────────────────────────────────────────
  let prompt
  if (agent?.systemPrompt && typeof agent.systemPrompt === 'string') {
    const safeSystemPrompt  = agent.systemPrompt.slice(0, 600)
    const safeOutputFormat  = (agent.outputFormat || '').slice(0, 300)
    prompt = `${safeSystemPrompt}\n\n${safeOutputFormat}\n\nTask: ${safeTask}\n\nRespond clearly and concisely.`
  } else {
    prompt = `Give a structured answer with:\n1. Research\n2. Analysis\n3. Final Plan\n4. Execution Steps\n\nTask: ${safeTask}\n\nKeep response concise and clear.`
  }

  console.log(`📝 Prompt length: ${prompt.length} chars`)
  console.log(`⏳ Calling Ollama...`)

  // ── Call Ollama ───────────────────────────────────────────────────────────
  let ollamaResult
  try {
    ollamaResult = await callOllama(prompt)
  } catch (err) {
    console.error(`❌ Ollama call failed: ${err.message}`)

    // Map error codes to user-friendly messages
    let userMessage = 'AI processing failed. Please try again.'
    let statusCode  = 500

    if (err.message.startsWith('TIMEOUT'))          { userMessage = 'AI is taking too long. Try a shorter or simpler task.'; statusCode = 504 }
    if (err.message.startsWith('OFFLINE'))          { userMessage = 'AI engine is offline. Please run: ollama serve';        statusCode = 503 }
    if (err.message.startsWith('RESET'))            { userMessage = 'AI connection was reset. Please retry.';                statusCode = 503 }
    if (err.message.startsWith('MODEL_NOT_FOUND'))  { userMessage = `Model not found. Run: ollama pull ${MODEL}`;            statusCode = 503 }
    if (err.message.startsWith('EMPTY'))            { userMessage = 'AI returned empty output. Please retry.';               statusCode = 500 }
    if (err.message.startsWith('PARSE_ERROR'))      { userMessage = 'AI response was malformed. Please retry.';              statusCode = 500 }

    return safeJson(res, statusCode, {
      success: false,
      result : userMessage,
      error  : err.message,
    })
  }

  // ── Send successful response ──────────────────────────────────────────────
  console.log(`✅ Success: ${ollamaResult.output.length} chars generated`)
  console.log(`   Eval count   : ${ollamaResult.evalCount}`)
  console.log(`   Eval duration: ${ollamaResult.evalDuration ? (ollamaResult.evalDuration / 1e9).toFixed(1) + 's' : 'n/a'}`)

  return safeJson(res, 200, {
    success  : true,
    result   : ollamaResult.output,
    output   : ollamaResult.output,
    model    : MODEL,
    agentUsed: agentName,
    metadata : {
      evalDuration: ollamaResult.evalDuration,
      evalCount   : ollamaResult.evalCount,
    },
  })
})

// ── Release Endpoint ──────────────────────────────────────────────────────────
app.post('/api/release', async (req, res) => {
  const { txId, creatorWallet } = req.body || {}

  console.log(`\n🔓 Release requested`)
  console.log(`   txId          : ${txId}`)
  console.log(`   creatorWallet : ${creatorWallet}`)

  // ── Skip if not configured ────────────────────────────────────────────────
  if (!APP_ID || APP_ID === 0) {
    console.warn('⚠️  APP_ID not set — release skipped')
    return safeJson(res, 200, { success: true, message: 'Skipped', simulated: true })
  }

  if (!DEPLOYER_MNEMONIC) {
    console.warn('⚠️  DEPLOYER_MNEMONIC not set — release skipped')
    return safeJson(res, 200, { success: true, message: 'No mnemonic', simulated: true })
  }

  try {
    const client = new algosdk.Algodv2('', ALGOD_SERVER, 443)

    // ── Derive deployer account ───────────────────────────────────────────
    let account
    try {
      account = algosdk.mnemonicToSecretKey(DEPLOYER_MNEMONIC)
    } catch (mnemonicErr) {
      return safeJson(res, 500, {
        success: false,
        error  : `Invalid mnemonic: ${mnemonicErr.message}`,
      })
    }

    console.log(`   Deployer addr : ${account.addr}`)

    // ── Determine release recipient ───────────────────────────────────────
    // Use creatorWallet if valid, otherwise use RECEIVER_ADDRESS from env
    const recipient = (creatorWallet && creatorWallet.length === 58)
      ? creatorWallet
      : RECEIVER_ADDRESS

    console.log(`   Recipient     : ${recipient}`)

    if (!recipient || recipient.length !== 58) {
      return safeJson(res, 500, {
        success: false,
        error  : `No valid recipient address. creatorWallet: "${creatorWallet}", RECEIVER_ADDRESS: "${RECEIVER_ADDRESS}"`,
      })
    }

    // ── Get network params ────────────────────────────────────────────────
    const params   = await client.getTransactionParams().do()
    params.flatFee = true
    params.fee     = 1000

    // ── Strategy 1: Try contract release() call first ─────────────────────
    console.log('   Attempting contract release()...')
    let releaseSuccess = false
    let releaseTxId    = null
    let releaseRound   = null

    try {
      let releaseTxn
      try {
        releaseTxn = algosdk.makeApplicationNoOpTxnFromObject({
          sender         : account.addr.toString(),
          appIndex       : APP_ID,
          appArgs        : [new TextEncoder().encode('release')],
          suggestedParams: { ...params },
          note           : new TextEncoder().encode(`AgentMart release|${txId?.slice(0, 20) || ''}`),
        })
      } catch {
        releaseTxn = algosdk.makeApplicationNoOpTxnFromObject({
          from           : account.addr.toString(),
          appIndex       : APP_ID,
          appArgs        : [new TextEncoder().encode('release')],
          suggestedParams: { ...params },
          note           : new TextEncoder().encode(`AgentMart release|${txId?.slice(0, 20) || ''}`),
        })
      }

      const signedRelease  = releaseTxn.signTxn(account.sk)
      const releaseResult  = await client.sendRawTransaction(signedRelease).do()
      const rTxId          = releaseResult?.txId || releaseResult?.txid || releaseResult?.['tx-id']

      if (rTxId) {
        const confirmed  = await algosdk.waitForConfirmation(client, rTxId, 10)
        releaseSuccess   = true
        releaseTxId      = rTxId
        releaseRound     = confirmed['confirmed-round']
          ? Number(confirmed['confirmed-round'])
          : null

        console.log(`✅ Contract release() succeeded: ${releaseTxId}`)
      }
    } catch (contractErr) {
      console.warn(`   Contract release() failed: ${contractErr.message}`)
      console.warn('   Falling back to direct payment...')
    }

    // ── Strategy 2: Direct payment from deployer to recipient ─────────────
    // Used when contract release() fails (e.g. logic error in contract)
    if (!releaseSuccess) {
      console.log(`   Sending direct payment: ${account.addr} → ${recipient}`)

      // Refresh params for new transaction
      const params2   = await client.getTransactionParams().do()
      params2.flatFee = true
      params2.fee     = 1000

      let directTxn
      try {
        directTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender         : account.addr.toString(),
          receiver       : recipient,
          amount         : 900,  // 0.0009 ALGO (minus fee)
          suggestedParams: { ...params2 },
          note           : new TextEncoder().encode(
            `AgentMart payment|task:${txId?.slice(0, 20) || ''}|creator:${recipient.slice(0, 20)}`
          ),
        })
        console.log('   directTxn (v3 sender/receiver): created ✅')
      } catch (v3Err) {
        console.warn('   v3 failed:', v3Err.message, '— trying v2...')
        directTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from           : account.addr.toString(),
          to             : recipient,
          amount         : 900,
          suggestedParams: { ...params2 },
          note           : new TextEncoder().encode(
            `AgentMart payment|task:${txId?.slice(0, 20) || ''}|creator:${recipient.slice(0, 20)}`
          ),
        })
        console.log('   directTxn (v2 from/to): created ✅')
      }

      const signedDirect  = directTxn.signTxn(account.sk)
      const directResult  = await client.sendRawTransaction(signedDirect).do()
      const dTxId         = directResult?.txId || directResult?.txid || directResult?.['tx-id']

      console.log(`   Direct payment submitted: ${dTxId}`)

      if (dTxId) {
        const confirmed = await algosdk.waitForConfirmation(client, dTxId, 10)
        releaseTxId     = dTxId
        releaseRound    = confirmed['confirmed-round']
          ? Number(confirmed['confirmed-round'])
          : null
        console.log(`✅ Direct payment confirmed: ${releaseTxId} at round ${releaseRound}`)
      }
    }

    return safeJson(res, 200, {
      success    : true,
      releaseTxId: releaseTxId,
      round      : releaseRound,
      recipient,
      method     : releaseSuccess ? 'contract-release' : 'direct-payment',
      explorerUrl: releaseTxId
        ? `https://testnet.algoexplorer.io/tx/${releaseTxId}`
        : null,
    })

  } catch (err) {
    console.error('❌ Release failed:', err.message)

    // Non-critical — deposit already confirmed, just log it
    return safeJson(res, 200, {
      success: true,
      message: 'Deposit confirmed. Release encountered an error (non-critical for demo).',
      error  : err.message,
    })
  }
})


// ── Build Deposit Transactions ────────────────────────────────────────────────
app.post('/api/build-deposit', async (req, res) => {
  const { senderAddress, taskDescription, creatorWallet, appId } = req.body || {}

  console.log('\n[/api/build-deposit] Called')
  console.log('  senderAddress :', senderAddress)
  console.log('  creatorWallet :', creatorWallet)
  console.log('  appId         :', appId)

  // ── Validate ──────────────────────────────────────────────────────────────
  if (!senderAddress || typeof senderAddress !== 'string' || !senderAddress.trim()) {
    return safeJson(res, 400, { error: 'senderAddress is required and must be a string' })
  }

  if (!appId) {
    return safeJson(res, 400, { error: 'appId is required' })
  }

  const numericAppId = parseInt(String(appId), 10)
  if (isNaN(numericAppId) || numericAppId <= 0) {
    return safeJson(res, 400, { error: `appId must be a positive number, got: ${appId}` })
  }

  const cleanSender = senderAddress.trim()

  // ── Log algosdk version info ──────────────────────────────────────────────
  console.log('  algosdk version:', algosdk.version || 'unknown')
  console.log('  numericAppId   :', numericAppId)
  console.log('  cleanSender    :', cleanSender)

  try {
    // ── Get contract address ──────────────────────────────────────────────
    let contractAddress
    try {
      const rawAddr     = algosdk.getApplicationAddress(numericAppId)
      contractAddress   = rawAddr.toString ? rawAddr.toString() : String(rawAddr)
      console.log('  contractAddress:', contractAddress)
      console.log('  length         :', contractAddress.length)
    } catch (addrErr) {
      return safeJson(res, 500, {
        error: `getApplicationAddress failed: ${addrErr.message}`
      })
    }

    if (!contractAddress || contractAddress.length !== 58) {
      return safeJson(res, 500, {
        error: `Invalid contract address: "${contractAddress}" (length: ${contractAddress?.length})`
      })
    }

    // ── Get network params ────────────────────────────────────────────────
    const client = new algosdk.Algodv2('', ALGOD_SERVER, 443)
    let suggestedParams
    try {
      suggestedParams = await client.getTransactionParams().do()
    } catch (paramErr) {
      return safeJson(res, 500, {
        error: `Failed to get network params: ${paramErr.message}`
      })
    }

    suggestedParams.flatFee = true
    suggestedParams.fee     = 1000

    console.log('  suggestedParams.firstRound :', suggestedParams.firstRound || suggestedParams.firstValid)
    console.log('  suggestedParams.lastRound  :', suggestedParams.lastRound  || suggestedParams.lastValid)
    console.log('  suggestedParams.genesisHash:', suggestedParams.genesisHash ? 'present' : 'MISSING')

    // ── Note ──────────────────────────────────────────────────────────────
    const noteText = `AgentMart|creator:${creatorWallet || ''}|task:${(taskDescription || '').slice(0, 60)}`
    const note     = new TextEncoder().encode(noteText)

    // ── Build transactions using algosdk v3 API ───────────────────────────
    // algosdk v3 changed param names:
    //   v2: { from, appIndex, appArgs, suggestedParams }
    //   v3: { sender, appIndex, appArgs, suggestedParams }  ← "from" → "sender"
    //   BUT many builds still support "from" via compatibility layer
    // We try v3 first, fall back to v2 style

    let appCallTxn
    try {
      // Try algosdk v3 style first (sender instead of from)
      appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender         : cleanSender,
        appIndex       : numericAppId,
        appArgs        : [new TextEncoder().encode('deposit')],
        suggestedParams: { ...suggestedParams },
        note,
      })
      console.log('  appCallTxn (v3 sender): created ✅')
    } catch (v3Err) {
      console.warn('  v3 sender failed:', v3Err.message, '— trying v2 from...')
      try {
        appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
          from           : cleanSender,
          appIndex       : numericAppId,
          appArgs        : [new TextEncoder().encode('deposit')],
          suggestedParams: { ...suggestedParams },
          note,
        })
        console.log('  appCallTxn (v2 from): created ✅')
      } catch (v2Err) {
        return safeJson(res, 500, {
          error: `Failed to create app call txn: ${v2Err.message}`
        })
      }
    }

    let paymentTxn
    try {
      // Try algosdk v3 style first (sender instead of from)
      paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender         : cleanSender,
        receiver       : contractAddress,
        amount         : 1000,
        suggestedParams: { ...suggestedParams },
        note,
      })
      console.log('  paymentTxn (v3 sender/receiver): created ✅')
    } catch (v3Err) {
      console.warn('  v3 sender/receiver failed:', v3Err.message, '— trying v2 from/to...')
      try {
        paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from           : cleanSender,
          to             : contractAddress,
          amount         : 1000,
          suggestedParams: { ...suggestedParams },
          note,
        })
        console.log('  paymentTxn (v2 from/to): created ✅')
      } catch (v2Err) {
        return safeJson(res, 500, {
          error: `Failed to create payment txn: ${v2Err.message}`
        })
      }
    }

    // ── Assign group ID ───────────────────────────────────────────────────
    try {
      algosdk.assignGroupID([appCallTxn, paymentTxn])
      console.log('  groupID: assigned ✅')
    } catch (groupErr) {
      return safeJson(res, 500, {
        error: `Failed to assign group ID: ${groupErr.message}`
      })
    }

    // ── Encode to base64 ──────────────────────────────────────────────────
    let encodedAppCall, encodedPayment
    try {
      encodedAppCall = Buffer.from(algosdk.encodeUnsignedTransaction(appCallTxn)).toString('base64')
      encodedPayment = Buffer.from(algosdk.encodeUnsignedTransaction(paymentTxn)).toString('base64')
      console.log('  encodedAppCall length:', encodedAppCall.length)
      console.log('  encodedPayment length:', encodedPayment.length)
    } catch (encErr) {
      return safeJson(res, 500, {
        error: `Failed to encode transactions: ${encErr.message}`
      })
    }

    console.log('[/api/build-deposit] ✅ All done')

    return safeJson(res, 200, {
      success        : true,
      encodedTxns    : [encodedAppCall, encodedPayment],
      contractAddress: contractAddress,
      appId          : numericAppId,
    })

  } catch (err) {
    console.error('[/api/build-deposit] ❌ Unexpected error:', err.message)
    console.error(err.stack)
    return safeJson(res, 500, {
      success: false,
      error  : err.message,
    })
  }
})

// ── Submit Signed Transactions ────────────────────────────────────────────────
app.post('/api/submit-deposit', async (req, res) => {
  const { signedTxns } = req.body || {}

  console.log('\n[/api/submit-deposit] Submitting signed transactions...')
  console.log('  signedTxns count:', signedTxns?.length)

  if (!signedTxns || !Array.isArray(signedTxns) || signedTxns.length === 0) {
    return safeJson(res, 400, { error: 'signedTxns array is required' })
  }

  try {
    const client = new algosdk.Algodv2('', ALGOD_SERVER, 443)

    // ── Decode base64 → Uint8Array ───────────────────────────────────────────
    const decodedTxns = signedTxns
      .filter(t => t !== null && t !== undefined)
      .map((b64, i) => {
        try {
          const decoded = Buffer.from(b64, 'base64')
          console.log(`  txn[${i}] decoded length:`, decoded.length)
          return new Uint8Array(decoded)
        } catch (decErr) {
          throw new Error(`Failed to decode txn[${i}]: ${decErr.message}`)
        }
      })

    if (decodedTxns.length === 0) {
      throw new Error('No valid signed transactions after decoding')
    }

    // ── Submit to Algorand ───────────────────────────────────────────────────
    let result
    try {
      result = await client.sendRawTransaction(decodedTxns).do()
      console.log('  sendRawTransaction result:', result)
    } catch (arrayErr) {
      // Fallback: concatenate into single blob
      console.warn('  Array submit failed, trying concatenated blob...')
      const totalLen    = decodedTxns.reduce((s, t) => s + t.length, 0)
      const blob        = new Uint8Array(totalLen)
      let offset        = 0
      for (const t of decodedTxns) { blob.set(t, offset); offset += t.length }
      result = await client.sendRawTransaction(blob).do()
      console.log('  concatenated submit result:', result)
    }

    // ── Extract txId ─────────────────────────────────────────────────────────
    const txId =
      result?.txId      ||
      result?.txid      ||
      result?.txID      ||
      result?.['tx-id'] ||
      null

    if (!txId) {
      console.error('  Could not extract txId from result:', result)
      throw new Error('Transaction submitted but txId not found in response')
    }

    console.log('  txId:', txId)
    console.log('  Waiting for confirmation...')

    // ── Wait for confirmation ────────────────────────────────────────────────
    const confirmation = await algosdk.waitForConfirmation(client, txId, 10)
    const round = confirmation['confirmed-round']
      ? Number(confirmation['confirmed-round'])
      : null

    console.log('[/api/submit-deposit] ✅ Confirmed at round:', round)

    return safeJson(res, 200, {
      success    : true,
      txId,
      round,
      explorerUrl: `https://testnet.algoexplorer.io/tx/${txId}`,
    })

  } catch (err) {
    console.error('[/api/submit-deposit] ❌ Error:', err.message)

    let hint = ''
    if (err.message.includes('overspend'))            hint = ' — Fund contract account at testnet faucet'
    if (err.message.includes('transaction rejected')) hint = ' — Check contract logic and app state'
    if (err.message.includes('has already been'))     hint = ' — Duplicate transaction, contract may already be released'

    return safeJson(res, 500, {
      success: false,
      error  : err.message + hint,
    })
  }
})


// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  safeJson(res, 404, { error: 'Route not found' })
})


// ── Debug: check algosdk API ──────────────────────────────────────────────────
app.get('/api/debug-algosdk', async (_req, res) => {
  try {
    const testAppId   = 758915053
    const testAddress = 'NSRNOIM5KHCFELJWVFTUJJHSDATDLB6DBBAWGCRTN2EPFBL6XWO3JKB47U'

    // Test getApplicationAddress
    const rawAddr       = algosdk.getApplicationAddress(testAppId)
    const contractAddr  = rawAddr.toString ? rawAddr.toString() : String(rawAddr)

    // Test which param names work
    const client        = new algosdk.Algodv2('', ALGOD_SERVER, 443)
    const params        = await client.getTransactionParams().do()
    params.flatFee      = true
    params.fee          = 1000

    let appCallResult   = 'unknown'
    let paymentResult   = 'unknown'

    // Test v3 API (sender/receiver)
    try {
      algosdk.makeApplicationNoOpTxnFromObject({
        sender: testAddress, appIndex: testAppId,
        appArgs: [new TextEncoder().encode('test')],
        suggestedParams: { ...params },
      })
      appCallResult = 'v3-sender-works'
    } catch {
      try {
        algosdk.makeApplicationNoOpTxnFromObject({
          from: testAddress, appIndex: testAppId,
          appArgs: [new TextEncoder().encode('test')],
          suggestedParams: { ...params },
        })
        appCallResult = 'v2-from-works'
      } catch (e) {
        appCallResult = `both-failed: ${e.message}`
      }
    }

    try {
      algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: testAddress, receiver: contractAddr,
        amount: 1000, suggestedParams: { ...params },
      })
      paymentResult = 'v3-sender-receiver-works'
    } catch {
      try {
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: testAddress, to: contractAddr,
          amount: 1000, suggestedParams: { ...params },
        })
        paymentResult = 'v2-from-to-works'
      } catch (e) {
        paymentResult = `both-failed: ${e.message}`
      }
    }

    res.json({
      algosdk_version : algosdk.version || 'unknown',
      contractAddress : contractAddr,
      contractAddrLen : contractAddr.length,
      appCallApi      : appCallResult,
      paymentApi      : paymentResult,
      paramsKeys      : Object.keys(params),
    })
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack })
  }
})

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║      AgentMart — AI Agent Marketplace API        ║')
  console.log(`║  Server : http://localhost:${PORT}                  ║`)
  console.log(`║  Model  : ${MODEL.padEnd(28)} ║`)
  console.log(`║  App ID : ${String(APP_ID || 'NOT SET').padEnd(28)} ║`)
  console.log('╚══════════════════════════════════════════════════╝\n')
})