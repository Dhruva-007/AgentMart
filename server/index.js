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
  console.log(`\n🔓 Release: tx=${txId} creator=${creatorWallet}`)

  if (!APP_ID || !DEPLOYER_MNEMONIC) {
    return safeJson(res, 200, {
      success  : true,
      message  : 'Contract not configured — release skipped (simulation)',
      simulated: true,
    })
  }

  try {
    const client = new algosdk.Algodv2('', ALGOD_SERVER, 443)
    const account = algosdk.mnemonicToSecretKey(DEPLOYER_MNEMONIC)

    const params   = await client.getTransactionParams().do()
    params.flatFee = true
    params.fee     = 1000

    const releaseTxn = algosdk.makeApplicationNoOpTxnFromObject({
      from           : account.addr,
      appIndex       : APP_ID,
      appArgs        : [new TextEncoder().encode('release')],
      suggestedParams: params,
      note           : new TextEncoder().encode(
        `AgentMart release | creator:${creatorWallet || 'platform'} | tx:${txId}`
      ),
    })

    const signedTxn = releaseTxn.signTxn(account.sk)
    const result    = await client.sendRawTransaction(signedTxn).do()
    const releaseTxId = result.txId || result.txid || result.txID

    const confirmed = await algosdk.waitForConfirmation(client, releaseTxId, 10)
    console.log(`✅ Release confirmed: ${releaseTxId}`)

    return safeJson(res, 200, {
      success    : true,
      releaseTxId: releaseTxId,
      round      : confirmed['confirmed-round'],
      creatorWallet,
    })
  } catch (err) {
    console.error('❌ Release failed:', err.message)
    return safeJson(res, 500, {
      success: false,
      error  : err.message,
      message: 'Release failed — funds remain in escrow',
    })
  }
})

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  safeJson(res, 404, { error: 'Route not found' })
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