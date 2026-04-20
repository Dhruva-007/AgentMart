import { create } from 'zustand'
import { getCreatorWallet } from './useAgentStore.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

const agentSteps = [
  { id: 1, title: 'Task Received',      description: 'Parsing and validating your request...',           icon: 'inbox',        duration: 800  },
  { id: 2, title: 'Research Agent',     description: 'Scanning knowledge base and gathering context...',  icon: 'search',       duration: 1200 },
  { id: 3, title: 'Payment Agent',      description: 'Initiating escrow deposit on Algorand...',          icon: 'shield-check', duration: 0, isDynamic: true },
  { id: 4, title: 'Content Agent',      description: 'Generating output via AI...',                       icon: 'sparkles',     duration: 0, isDynamic: true },
  { id: 5, title: 'Verification Agent', description: 'Validating output and recording on Algorand...',    icon: 'brain',        duration: 1000 },
]

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

const useStore = create((set, get) => ({
  taskInput        : '',
  isProcessing     : false,
  processingError  : null,
  currentStep      : -1,
  stepsCompleted   : [],
  agentSteps,
  aiOutput         : null,
  showOutput       : false,
  generationMetadata: null,
  executedAgentName: null,
  transactionId    : null,
  transactionRound : null,
  explorerUrl      : null,
  isVerified       : false,
  showTransaction  : false,
  isSimulated      : false,
  backendOnline    : null,

  setTaskInput: (input) => set({ taskInput: input }),

  checkBackendHealth: async () => {
    try {
      const res  = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(5000) })
      const data = await res.json()
      set({ backendOnline: data.status === 'ok' })
      return data
    } catch {
      set({ backendOnline: false })
      return { status: 'error' }
    }
  },

  submitTask: async (executeDeposit, selectedAgent, onSuccess) => {
    const { taskInput } = get()

    console.log('\n[submitTask] Called with:')
    console.log('  taskInput    :', taskInput?.slice(0, 50))
    console.log('  selectedAgent:', JSON.stringify(selectedAgent, null, 2))

    if (!taskInput?.trim()) {
      console.warn('[submitTask] No task input')
      return
    }

    if (!selectedAgent) {
      set({ processingError: 'Please select an agent from the marketplace first.' })
      return
    }

    const creatorWallet =
      selectedAgent.creatorWallet   ||
      selectedAgent.creator         ||
      selectedAgent.creatorAddress  ||
      getCreatorWallet(selectedAgent) ||
      import.meta.env.VITE_RECEIVER_ADDRESS ||
      ''

    console.log('[submitTask] Resolved creatorWallet:', creatorWallet)

    set({
      isProcessing     : true,
      processingError  : null,
      currentStep      : 0,
      stepsCompleted   : [],
      aiOutput         : null,
      showOutput       : false,
      transactionId    : null,
      transactionRound : null,
      explorerUrl      : null,
      isVerified       : false,
      showTransaction  : false,
      isSimulated      : false,
      generationMetadata: null,
      executedAgentName: selectedAgent.name,
    })

    set({ currentStep: 0 })
    await delay(agentSteps[0].duration)
    set({ stepsCompleted: [0] })

    set({ currentStep: 1 })
    await delay(agentSteps[1].duration)
    set({ stepsCompleted: [0, 1] })

    set({ currentStep: 2 })
    console.log('[submitTask] Calling executeDeposit with creatorWallet:', creatorWallet)

    let txResult
    try {
      txResult = await executeDeposit(taskInput, creatorWallet)
      console.log('[submitTask] ✅ Deposit result:', txResult)
    } catch (txErr) {
      console.error('[submitTask] ❌ Deposit failed:', txErr.message)
      set({
        isProcessing  : false,
        processingError: txErr.message,
        currentStep   : -1,
      })
      return
    }

    set({ stepsCompleted: [0, 1, 2] })

    set({ currentStep: 3 })
    console.log('[submitTask] Payment confirmed. Now calling AI...')

    let aiResult
    try {
      aiResult = await callAIBackend(taskInput, selectedAgent)
      console.log('[submitTask] ✅ AI result received, length:', aiResult?.result?.length)
    } catch (aiErr) {
      console.error('[submitTask] ❌ AI failed:', aiErr.message)
      set({
        isProcessing  : false,
        processingError: aiErr.message,
        currentStep   : -1,
        transactionId : txResult.txId,
        transactionRound: txResult.round || null,
        explorerUrl   : txResult.explorerUrl || null,
        isSimulated   : txResult.simulated   || false,
        showTransaction: true,
      })
      await delay(600)
      set({ isVerified: true })
      return
    }

    set({ stepsCompleted: [0, 1, 2, 3], generationMetadata: aiResult.metadata })

    set({ currentStep: 4 })
    await delay(agentSteps[4].duration)
    set({ stepsCompleted: [0, 1, 2, 3, 4] })

    triggerBackendRelease(txResult.txId, creatorWallet).catch((e) =>
      console.warn('[submitTask] Release non-critical error:', e.message)
    )

    await delay(300)
    set({
      aiOutput   : aiResult.result || aiResult.output,
      showOutput : true,
      isProcessing: false,
    })

    await delay(600)
    set({
      transactionId    : txResult.txId,
      transactionRound : txResult.round       || null,
      explorerUrl      : txResult.explorerUrl  || null,
      isSimulated      : txResult.simulated    || false,
      showTransaction  : true,
    })

    await delay(500)
    set({ isVerified: true })

    if (onSuccess) onSuccess()
  },

  resetTask: () => set({
    taskInput        : '',
    isProcessing     : false,
    processingError  : null,
    currentStep      : -1,
    stepsCompleted   : [],
    aiOutput         : null,
    showOutput       : false,
    transactionId    : null,
    transactionRound : null,
    explorerUrl      : null,
    isVerified       : false,
    showTransaction  : false,
    isSimulated      : false,
    generationMetadata: null,
    executedAgentName: null,
  }),

  clearError: () => set({ processingError: null }),
}))


async function callAIBackend(task, agent) {
  let response
  try {
    response = await fetch(`${API_BASE}/api/execute`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ task, agent }),
      signal : AbortSignal.timeout(120_000),
    })
  } catch (fetchErr) {
    throw new Error(`Network error: ${fetchErr.message}`)
  }

  let rawText = ''
  try { rawText = await response.text() } catch (e) {
    throw new Error(`Could not read response: ${e.message}`)
  }

  if (!rawText?.trim()) throw new Error('Server returned empty response')

  let data
  try { data = JSON.parse(rawText) } catch {
    throw new Error(`Invalid JSON: "${rawText.slice(0, 100)}"`)
  }

  if (!response.ok) throw new Error(data?.error || `Error ${response.status}`)
  return data
}

async function triggerBackendRelease(txId, creatorWallet) {
  console.log('[triggerBackendRelease] txId:', txId, 'creatorWallet:', creatorWallet)
  const response = await fetch(`${API_BASE}/api/release`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ txId, creatorWallet }),
    signal : AbortSignal.timeout(60_000),
  })
  const data = await response.json()
  console.log('[triggerBackendRelease] result:', data)
  return data
}

export default useStore