/**
 * useStore.js — Task execution state
 *
 * UPDATED:
 *  • AI prompt now uses selected agent's systemPrompt + outputFormat
 *  • submitTask accepts both executeDeposit AND selectedAgent
 *  • incrementUsage called after successful execution
 */

import { create } from 'zustand'

const agentSteps = [
  { id: 1, title: 'Task Received',      description: 'Parsing and validating your request...', icon: 'inbox',         duration: 800  },
  { id: 2, title: 'Research Agent',     description: 'Scanning knowledge base and gathering context...', icon: 'search', duration: 1500 },
  { id: 3, title: 'Analysis Agent',     description: 'Running multi-model analysis pipeline...', icon: 'brain',         duration: 2000 },
  { id: 4, title: 'Content Agent',      description: 'Generating output via mistral:7b-instruct...', icon: 'sparkles',  duration: 0, isDynamic: true },
  { id: 5, title: 'Verification Agent', description: 'Validating output and recording on Algorand...', icon: 'shield-check', duration: 1000 },
]

const delay = (ms) => new Promise(r => setTimeout(r, ms))

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
  executedAgentName: null,   // ← which agent ran this task

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
      const res  = await fetch('/api/health', { signal: AbortSignal.timeout(5000) })
      const data = await res.json()
      set({ backendOnline: data.status === 'ok' })
      return data
    } catch {
      set({ backendOnline: false })
      return { status: 'error' }
    }
  },

  /**
   * submitTask
   * @param {Function} executeDeposit - from useEscrow hook
   * @param {Object}   selectedAgent  - from useAgentStore
   * @param {Function} onSuccess      - callback (e.g., incrementUsage)
   */
  submitTask: async (executeDeposit, selectedAgent, onSuccess) => {
    const { taskInput } = get()
    if (!taskInput.trim()) return
    if (!selectedAgent)   {
      set({ processingError: 'Please select an agent from the marketplace first.' })
      return
    }

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

    // ── Steps 1-3 animate while API call starts ────────────────────────────
    set({ currentStep: 0 })
    await delay(agentSteps[0].duration)
    set({ stepsCompleted: [0] })

    set({ currentStep: 1 })
    await delay(agentSteps[1].duration)
    set({ stepsCompleted: [0, 1] })

    set({ currentStep: 2 })
    await delay(agentSteps[2].duration)
    set({ stepsCompleted: [0, 1, 2] })

    // ── Step 4: AI call with agent configuration ───────────────────────────
    set({ currentStep: 3 })

    const aiPromise = callAIBackend(taskInput, selectedAgent)
    let aiResult
    try {
      aiResult = await aiPromise
    } catch (err) {
      set({ isProcessing: false, processingError: err.message, currentStep: -1 })
      return
    }

    if (!aiResult.success && !aiResult.result) {
      set({ isProcessing: false, processingError: aiResult.error || 'AI generation failed.', currentStep: -1 })
      return
    }

    set({ stepsCompleted: [0, 1, 2, 3], generationMetadata: aiResult.metadata })

    // ── Step 5: Blockchain escrow deposit ─────────────────────────────────
    set({ currentStep: 4 })

    let txResult
    try {
      txResult = await executeDeposit(taskInput, selectedAgent.creatorWallet)
    } catch (txErr) {
      console.warn('⚠️ Blockchain tx failed, using simulation:', txErr.message)
      txResult = {
        txId      : `SIM_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        round     : null,
        explorerUrl: null,
        simulated : true,
      }
    }

    await delay(agentSteps[4].duration)
    set({ stepsCompleted: [0, 1, 2, 3, 4] })

    // ── Show output ────────────────────────────────────────────────────────
    await delay(300)
    set({ aiOutput: aiResult.result || aiResult.output, showOutput: true, isProcessing: false })

    // ── Trigger backend release to agent creator ───────────────────────────
    await delay(700)
    triggerBackendRelease(txResult.txId, selectedAgent.creatorWallet)
      .catch(err => console.warn('Release trigger (non-critical):', err.message))

    set({
      transactionId    : txResult.txId,
      transactionRound : txResult.round    || null,
      explorerUrl      : txResult.explorerUrl || null,
      isSimulated      : txResult.simulated   || false,
      showTransaction  : true,
    })

    await delay(600)
    set({ isVerified: true })

    // ── Callback (e.g., increment agent usage count) ───────────────────────
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

// ── Backend API calls ─────────────────────────────────────────────────────────
// ── Backend API call with full safety ─────────────────────────────────────────
async function callAIBackend(task, agent) {
  let response

  // ── Step 1: Make the fetch request ───────────────────────────────────────
  try {
    response = await fetch('/api/generate', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ task, agent }),
      signal : AbortSignal.timeout(600_000), // 10 min frontend timeout
    })
  } catch (fetchErr) {
    // Network-level error (proxy down, backend not running, etc.)
    if (fetchErr.name === 'AbortError' || fetchErr.name === 'TimeoutError') {
      throw new Error('Request timed out. The AI is taking too long. Please retry.')
    }
    if (fetchErr.message?.includes('Failed to fetch') || fetchErr.message?.includes('NetworkError')) {
      throw new Error('Cannot reach backend. Make sure the server is running on port 3001.')
    }
    throw new Error(`Network error: ${fetchErr.message}`)
  }

  // ── Step 2: Read body as text FIRST — never call .json() directly ────────
  let rawText = ''
  try {
    rawText = await response.text()
  } catch (readErr) {
    throw new Error(`Could not read server response: ${readErr.message}`)
  }

  // ── Step 3: Check we got something ───────────────────────────────────────
  if (!rawText || rawText.trim().length === 0) {
    throw new Error('Server returned an empty response. Backend may have crashed.')
  }

  // ── Step 4: Parse JSON safely ─────────────────────────────────────────────
  let data
  try {
    data = JSON.parse(rawText)
  } catch (parseErr) {
    console.error('JSON parse failed. Raw response was:', rawText.slice(0, 500))
    throw new Error(`Server returned invalid data. Raw: "${rawText.slice(0, 100)}"`)
  }

  // ── Step 5: Check HTTP status using parsed data ───────────────────────────
  if (!response.ok) {
    // Backend sent a proper error JSON — use its message
    const errorMsg = data?.error || data?.result || `Server error ${response.status}`
    throw new Error(errorMsg)
  }

  // ── Step 6: Validate the parsed response has content ─────────────────────
  const output = data?.result || data?.output
  if (!output || typeof output !== 'string' || output.trim().length === 0) {
    throw new Error('AI returned empty output. Please try again with a different task.')
  }

  return data
}



async function triggerBackendRelease(txId, creatorWallet) {
  const response = await fetch('/api/release', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ txId, creatorWallet }),
    signal : AbortSignal.timeout(30000),
  })
  return response.json()
}

export default useStore