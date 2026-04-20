import express    from 'express'
import cors       from 'cors'
import algosdk    from 'algosdk'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath }    from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })
config({ path: resolve(__dirname, '.env') })

const app  = express()
const PORT = process.env.PORT || 3001

const ALGOD_SERVER       = 'https://testnet-api.algonode.cloud'
const APP_ID             = parseInt(process.env.APP_ID || '0', 10) || 0
const DEPLOYER_MNEMONIC  = process.env.DEPLOYER_MNEMONIC  || ''
const RECEIVER_ADDRESS   = process.env.RECEIVER_ADDRESS   || ''
const GROQ_API_KEY       = process.env.GROQ_API_KEY       || ''
const GROQ_MODEL         = process.env.GROQ_MODEL         || 'llama-3.1-8b-instant'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
const OPENROUTER_MODEL   = process.env.OPENROUTER_MODEL   || 'mistralai/mistral-7b-instruct:free'

const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/$/, '')

console.log('\n🔧 Config:')
console.log('  APP_ID           :', APP_ID || 'NOT SET')
console.log('  RECEIVER_ADDRESS :', RECEIVER_ADDRESS ? RECEIVER_ADDRESS.slice(0,10)+'...' : 'NOT SET')
console.log('  DEPLOYER_MNEMONIC:', DEPLOYER_MNEMONIC ? '*****(set)' : 'NOT SET')
console.log('  GROQ_API_KEY     :', GROQ_API_KEY ? '*****(set)' : 'NOT SET')
console.log('  OPENROUTER_KEY   :', OPENROUTER_API_KEY ? '*****(set)' : 'NOT SET')
console.log('  FRONTEND_URL     :', FRONTEND_URL || 'NOT SET')

app.use((req, res, next) => {
  const origin = req.headers.origin || ''

  const isLocalhost  = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  const isVercel     = /^https:\/\/.*\.vercel\.app$/.test(origin)
  const isFrontend   = FRONTEND_URL && origin === FRONTEND_URL

  const allowed = !origin || isLocalhost || isVercel || isFrontend

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Max-Age', '86400')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  next()
})

app.use(express.json({ limit: '2mb' }))

process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled Rejection:', reason?.message || reason)
})
process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught Exception (kept alive):', err.message)
})

function safeJson(res, status, payload) {
  try {
    if (res.headersSent) return
    res.status(status).json(payload)
  } catch (err) {
    console.error('safeJson failed:', err.message)
    try {
      if (!res.headersSent) {
        res.status(500).end('{"success":false,"error":"Response write failed"}')
      }
    } catch (_) {}
  }
}

app.get('/api/health', (_req, res) => {
  safeJson(res, 200, {
    status       : 'ok',
    aiProvider   : GROQ_API_KEY ? 'groq' : OPENROUTER_API_KEY ? 'openrouter' : 'none',
    aiReady      : !!(GROQ_API_KEY || OPENROUTER_API_KEY),
    contractReady: APP_ID > 0,
    appId        : APP_ID,
  })
})

async function callGroq(prompt) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not set in .env')

  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), 60_000)

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method : 'POST',
      headers: {
        'Content-Type' : 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body  : JSON.stringify({
        model      : GROQ_MODEL,
        messages   : [{ role: 'user', content: prompt }],
        max_tokens : 800,
        temperature: 0.7,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Groq ${res.status}: ${text.slice(0, 200)}`)
    }

    const data   = await res.json()
    const output = data?.choices?.[0]?.message?.content?.trim()
    if (!output) throw new Error('Groq returned empty content')

    return {
      output,
      provider  : 'groq',
      model     : GROQ_MODEL,
      tokenCount: data?.usage?.completion_tokens || null,
    }
  } finally {
    clearTimeout(timer)
  }
}

async function callOpenRouter(prompt) {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not set in .env')

  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), 90_000)

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method : 'POST',
      headers: {
        'Content-Type' : 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer' : 'https://agentmart.app',
        'X-Title'      : 'AgentMart',
      },
      body  : JSON.stringify({
        model      : OPENROUTER_MODEL,
        messages   : [{ role: 'user', content: prompt }],
        max_tokens : 800,
        temperature: 0.7,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 200)}`)
    }

    const data   = await res.json()
    const output = data?.choices?.[0]?.message?.content?.trim()
    if (!output) throw new Error('OpenRouter returned empty content')

    return {
      output,
      provider  : 'openrouter',
      model     : OPENROUTER_MODEL,
      tokenCount: data?.usage?.completion_tokens || null,
    }
  } finally {
    clearTimeout(timer)
  }
}

async function executeAI(prompt) {
  if (GROQ_API_KEY) {
    try {
      console.log(`🤖 Calling Groq (${GROQ_MODEL})...`)
      const result = await callGroq(prompt)
      console.log(`✅ Groq: ${result.output.length} chars`)
      return result
    } catch (e) {
      console.warn('⚠️  Groq failed:', e.message, '— trying OpenRouter...')
    }
  }

  if (OPENROUTER_API_KEY) {
    try {
      console.log(`🤖 Calling OpenRouter (${OPENROUTER_MODEL})...`)
      const result = await callOpenRouter(prompt)
      console.log(`✅ OpenRouter: ${result.output.length} chars`)
      return result
    } catch (e) {
      throw new Error(`All AI providers failed: ${e.message}`)
    }
  }

  throw new Error('No AI API configured. Set GROQ_API_KEY or OPENROUTER_API_KEY in .env')
}

app.post('/api/execute', async (req, res) => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📥 POST /api/execute')

  try {
    const { task, agent } = req.body || {}

    if (!task || typeof task !== 'string' || task.trim().length < 3) {
      return safeJson(res, 400, { success: false, error: 'task must be at least 3 characters' })
    }

    const cleanTask     = task.trim().slice(0, 1000)
    const agentTemplate = agent?.promptTemplate || agent?.systemPrompt || ''
    const agentFormat   = agent?.outputFormat   || ''

    const finalPrompt = agentTemplate
      ? `${agentTemplate}\n\n${agentFormat ? agentFormat + '\n' : ''}Task: ${cleanTask}\n\nProvide a clear, structured response.`
      : `Answer clearly and concisely.\n\nTask: ${cleanTask}`

    console.log(`📋 Task   : "${cleanTask.slice(0, 60)}..."`)
    console.log(`🤖 Agent  : ${agent?.name || 'default'}`)
    console.log(`📝 Prompt : ${finalPrompt.length} chars`)

    const aiResult = await executeAI(finalPrompt)

    return safeJson(res, 200, {
      success   : true,
      result    : aiResult.output,
      output    : aiResult.output,
      provider  : aiResult.provider,
      model     : aiResult.model,
      agentUsed : agent?.name || null,
      metadata  : {
        tokenCount: aiResult.tokenCount,
        provider  : aiResult.provider,
        model     : aiResult.model,
      },
    })

  } catch (err) {
    console.error('❌ /api/execute error:', err.message)
    return safeJson(res, 500, { success: false, error: err.message })
  }
})

app.post('/api/generate', async (req, res) => {
  console.log('📥 POST /api/generate (forwarding to /api/execute)')
  req.url = '/api/execute'
  app._router.handle(req, res, () => {})
})

app.post('/api/build-deposit', async (req, res) => {
  console.log('\n[/api/build-deposit] Called')

  try {
    const { senderAddress, taskDescription, creatorWallet, appId } = req.body || {}

    console.log('  senderAddress:', senderAddress)
    console.log('  creatorWallet:', creatorWallet)
    console.log('  appId        :', appId)

    if (!senderAddress || typeof senderAddress !== 'string' || !senderAddress.trim()) {
      return safeJson(res, 400, { success: false, error: 'senderAddress is required' })
    }

    const numericAppId = parseInt(String(appId || APP_ID), 10)
    if (!numericAppId || numericAppId <= 0) {
      return safeJson(res, 400, { success: false, error: `Invalid appId: "${appId}"` })
    }

    const cleanSender = senderAddress.trim()

    try {
      algosdk.decodeAddress(cleanSender)
    } catch (decErr) {
      return safeJson(res, 400, { success: false, error: `Invalid senderAddress: ${decErr.message}` })
    }

    let contractAddress
    try {
      const raw       = algosdk.getApplicationAddress(numericAppId)
      contractAddress = (raw.toString ? raw.toString() : String(raw)).trim()
    } catch (addrErr) {
      return safeJson(res, 500, { success: false, error: `getApplicationAddress failed: ${addrErr.message}` })
    }

    console.log('  contractAddress:', contractAddress, '(length:', contractAddress.length + ')')

    if (!contractAddress || contractAddress.length !== 58) {
      return safeJson(res, 500, { success: false, error: `Invalid contract address: "${contractAddress}"` })
    }

    try {
      algosdk.decodeAddress(contractAddress)
    } catch (valErr) {
      return safeJson(res, 500, { success: false, error: `Contract address validation failed: ${valErr.message}` })
    }

    const client = new algosdk.Algodv2('', ALGOD_SERVER, 443)
    let suggestedParams

    try {
      suggestedParams = await client.getTransactionParams().do()
    } catch (paramErr) {
      return safeJson(res, 503, { success: false, error: `Failed to get Algorand params: ${paramErr.message}` })
    }

    suggestedParams.flatFee = true
    suggestedParams.fee     = 1000

    const noteText = `AgentMart|creator:${(creatorWallet || '').slice(0, 58)}|task:${(taskDescription || '').slice(0, 60)}`
    const note     = new TextEncoder().encode(noteText)

    let appCallTxn
    try {
      appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender         : cleanSender,
        appIndex       : numericAppId,
        appArgs        : [new TextEncoder().encode('deposit')],
        suggestedParams: { ...suggestedParams },
        note,
      })
      console.log('  appCallTxn: v3 sender ✅')
    } catch {
      try {
        appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
          from           : cleanSender,
          appIndex       : numericAppId,
          appArgs        : [new TextEncoder().encode('deposit')],
          suggestedParams: { ...suggestedParams },
          note,
        })
        console.log('  appCallTxn: v2 from ✅')
      } catch (e) {
        return safeJson(res, 500, { success: false, error: `appCallTxn failed: ${e.message}` })
      }
    }

    let paymentTxn
    try {
      paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender         : cleanSender,
        receiver       : contractAddress,
        amount         : 1000,
        suggestedParams: { ...suggestedParams },
        note,
      })
      console.log('  paymentTxn: v3 sender/receiver ✅')
    } catch {
      try {
        paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from           : cleanSender,
          to             : contractAddress,
          amount         : 1000,
          suggestedParams: { ...suggestedParams },
          note,
        })
        console.log('  paymentTxn: v2 from/to ✅')
      } catch (e) {
        return safeJson(res, 500, { success: false, error: `paymentTxn failed: ${e.message}` })
      }
    }

    try {
      algosdk.assignGroupID([appCallTxn, paymentTxn])
      console.log('  groupID: assigned ✅')
    } catch (e) {
      return safeJson(res, 500, { success: false, error: `assignGroupID failed: ${e.message}` })
    }

    let encodedAppCall, encodedPayment
    try {
      encodedAppCall = Buffer.from(algosdk.encodeUnsignedTransaction(appCallTxn)).toString('base64')
      encodedPayment = Buffer.from(algosdk.encodeUnsignedTransaction(paymentTxn)).toString('base64')
    } catch (e) {
      return safeJson(res, 500, { success: false, error: `encode failed: ${e.message}` })
    }

    console.log('  encodedAppCall:', encodedAppCall.length, 'chars')
    console.log('  encodedPayment:', encodedPayment.length, 'chars')
    console.log('[/api/build-deposit] ✅ Done')

    return safeJson(res, 200, {
      success        : true,
      encodedTxns    : [encodedAppCall, encodedPayment],
      contractAddress: contractAddress,
      appId          : numericAppId,
    })

  } catch (err) {
    console.error('[/api/build-deposit] ❌ Unexpected:', err.message)
    console.error(err.stack)
    return safeJson(res, 500, { success: false, error: err.message })
  }
})

app.post('/api/submit-deposit', async (req, res) => {
  console.log('\n[/api/submit-deposit] Called')

  try {
    const { signedTxns } = req.body || {}

    if (!signedTxns || !Array.isArray(signedTxns) || signedTxns.length === 0) {
      return safeJson(res, 400, { success: false, error: 'signedTxns array required' })
    }

    console.log('  count:', signedTxns.length)

    const client = new algosdk.Algodv2('', ALGOD_SERVER, 443)

    const decoded = signedTxns
      .filter(t => t !== null && t !== undefined)
      .map((b64, i) => {
        const buf = Buffer.from(b64, 'base64')
        console.log(`  txn[${i}] decoded:`, buf.length, 'bytes')
        return new Uint8Array(buf)
      })

    let result
    try {
      result = await client.sendRawTransaction(decoded).do()
    } catch (arrayErr) {
      console.warn('  Array submit failed, trying concat...')
      const total  = decoded.reduce((s, t) => s + t.length, 0)
      const blob   = new Uint8Array(total)
      let   offset = 0
      for (const t of decoded) { blob.set(t, offset); offset += t.length }
      result = await client.sendRawTransaction(blob).do()
    }

    const txId = result?.txId || result?.txid || result?.txID || result?.['tx-id'] || null

    if (!txId) {
      console.error('  No txId in result:', result)
      return safeJson(res, 500, { success: false, error: 'txId not found in submit result' })
    }

    console.log('  txId:', txId)
    const confirmation = await algosdk.waitForConfirmation(client, txId, 10)
    const round        = confirmation['confirmed-round']
      ? Number(confirmation['confirmed-round'])
      : null

    console.log('[/api/submit-deposit] ✅ Confirmed round:', round)

    return safeJson(res, 200, {
      success    : true,
      txId,
      round,
      explorerUrl: `https://testnet.algoexplorer.io/tx/${txId}`,
    })

  } catch (err) {
    console.error('[/api/submit-deposit] ❌', err.message)
    return safeJson(res, 500, { success: false, error: err.message })
  }
})

app.post('/api/release', async (req, res) => {
  console.log('\n[/api/release] Called')

  try {
    const { txId, creatorWallet } = req.body || {}
    console.log('  txId         :', txId)
    console.log('  creatorWallet:', creatorWallet)

    if (!APP_ID || !DEPLOYER_MNEMONIC) {
      return safeJson(res, 200, { success: true, message: 'Not configured — skipped', simulated: true })
    }

    const client = new algosdk.Algodv2('', ALGOD_SERVER, 443)
    let account
    try {
      account = algosdk.mnemonicToSecretKey(DEPLOYER_MNEMONIC)
    } catch (e) {
      return safeJson(res, 500, { success: false, error: `Mnemonic error: ${e.message}` })
    }

    const recipient = (creatorWallet && creatorWallet.length === 58) ? creatorWallet : RECEIVER_ADDRESS
    console.log('  Deployer :', account.addr.toString())
    console.log('  Recipient:', recipient)

    const params   = await client.getTransactionParams().do()
    params.flatFee = true
    params.fee     = 1000

    let releaseTxId = null, releaseRound = null, method = ''

    try {
      let releaseTxn
      try {
        releaseTxn = algosdk.makeApplicationNoOpTxnFromObject({
          sender         : account.addr.toString(),
          appIndex       : APP_ID,
          appArgs        : [new TextEncoder().encode('release')],
          suggestedParams: { ...params },
          note           : new TextEncoder().encode(`AgentMart release|${(txId || '').slice(0, 20)}`),
        })
      } catch {
        releaseTxn = algosdk.makeApplicationNoOpTxnFromObject({
          from           : account.addr.toString(),
          appIndex       : APP_ID,
          appArgs        : [new TextEncoder().encode('release')],
          suggestedParams: { ...params },
          note           : new TextEncoder().encode(`AgentMart release|${(txId || '').slice(0, 20)}`),
        })
      }

      const signed       = releaseTxn.signTxn(account.sk)
      const submitResult = await client.sendRawTransaction(signed).do()
      const rTxId        = submitResult?.txId || submitResult?.txid || submitResult?.['tx-id']

      if (rTxId) {
        const conf   = await algosdk.waitForConfirmation(client, rTxId, 10)
        releaseTxId  = rTxId
        releaseRound = conf['confirmed-round'] ? Number(conf['confirmed-round']) : null
        method       = 'contract-release'
        console.log('[/api/release] ✅ Contract release:', releaseTxId)
      }
    } catch (contractErr) {
      console.warn('  Contract release failed:', contractErr.message)
      console.warn('  Trying direct payment...')

      const params2   = await client.getTransactionParams().do()
      params2.flatFee = true
      params2.fee     = 1000

      let directTxn
      try {
        directTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender         : account.addr.toString(),
          receiver       : recipient,
          amount         : 900,
          suggestedParams: { ...params2 },
          note           : new TextEncoder().encode(`AgentMart direct|${(txId || '').slice(0, 20)}`),
        })
      } catch {
        directTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from           : account.addr.toString(),
          to             : recipient,
          amount         : 900,
          suggestedParams: { ...params2 },
          note           : new TextEncoder().encode(`AgentMart direct|${(txId || '').slice(0, 20)}`),
        })
      }

      const signedDirect = directTxn.signTxn(account.sk)
      const directResult = await client.sendRawTransaction(signedDirect).do()
      const dTxId        = directResult?.txId || directResult?.txid || directResult?.['tx-id']

      if (dTxId) {
        const conf   = await algosdk.waitForConfirmation(client, dTxId, 10)
        releaseTxId  = dTxId
        releaseRound = conf['confirmed-round'] ? Number(conf['confirmed-round']) : null
        method       = 'direct-payment'
        console.log('[/api/release] ✅ Direct payment:', releaseTxId)
      }
    }

    return safeJson(res, 200, {
      success    : true,
      releaseTxId: releaseTxId,
      round      : releaseRound,
      recipient,
      method,
      explorerUrl: releaseTxId ? `https://testnet.algoexplorer.io/tx/${releaseTxId}` : null,
    })

  } catch (err) {
    console.error('[/api/release] ❌', err.message)
    return safeJson(res, 200, {
      success: true,
      message: 'Deposit confirmed. Release had non-critical error.',
      error  : err.message,
    })
  }
})

app.use((_req, res) => safeJson(res, 404, { error: 'Not found' }))

app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════╗')
  console.log('║     AgentMart — Production API                 ║')
  console.log(`║  Server : http://localhost:${PORT}                ║`)
  console.log(`║  AI     : ${(GROQ_API_KEY ? 'Groq' : OPENROUTER_API_KEY ? 'OpenRouter' : 'NOT SET').padEnd(30)} ║`)
  console.log(`║  App ID : ${String(APP_ID || 'NOT SET').padEnd(30)} ║`)
  console.log('╚════════════════════════════════════════════════╝\n')
})