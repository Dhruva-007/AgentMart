import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const PLATFORM_WALLET = import.meta.env.VITE_RECEIVER_ADDRESS || ''

if (!PLATFORM_WALLET && PLATFORM_WALLET.length === 0) {
  console.warn('[useAgentStore] VITE_RECEIVER_ADDRESS not set in .env')
} else if (PLATFORM_WALLET.length > 0) {
  console.log('[useAgentStore] PLATFORM_WALLET:', PLATFORM_WALLET.slice(0, 10) + '...')
}

export function getCreatorWallet(agent) {
  if (!agent) return ''
  const wallet =
    agent.creatorWallet      ||
    agent.creator            ||
    agent.creatorAddress     ||
    agent.wallet             ||
    ''
  if (wallet && wallet.length !== 58) {
    console.warn(`[getCreatorWallet] Invalid address for agent "${agent?.name}": ${wallet}`)
  }
  return wallet.trim()
}

function getPlatformWallet() {
  if (!PLATFORM_WALLET || PLATFORM_WALLET.length < 50) {
    return 'DEMO_WALLET_FOR_TESTING_PURPOSES_ONLY_NOT_REAL'
  }
  return PLATFORM_WALLET
}

const DEFAULT_AGENTS = [
  {
    id           : 'default-research-001',
    name         : 'Research Analyst',
    description  : 'Deep research and data analysis on any topic. Provides sourced insights and key findings.',
    promptTemplate: 'You are an expert research analyst. Gather key insights, identify patterns, and present findings clearly. Be concise and evidence-based. Always structure your response with clear sections.',
    outputFormat : 'Use headers: ## Research Findings, ## Key Insights, ## Analysis, ## Recommendations. Use bullet points throughout.',
    creatorWallet: getPlatformWallet(),
    creatorLabel : 'AgentMart Team',
    price        : 0.001,
    isDefault    : true,
    createdAt    : new Date('2024-01-01').toISOString(),
    usageCount   : 142,
    rating       : 4.8,
    category     : 'Research',
    color        : 'purple',
  },
  {
    id           : 'default-defi-002',
    name         : 'DeFi Strategist',
    description  : 'DeFi protocols, yield optimization, liquidity analysis, and risk assessment specialist.',
    promptTemplate: 'You are a DeFi expert. Analyze market conditions, evaluate risks, and suggest optimal strategies. Be specific with numbers where possible. Always assess risk level before recommending.',
    outputFormat : 'Use headers: ## Market Overview, ## Risk Assessment (Low/Medium/High), ## Strategy Recommendations, ## Execution Steps.',
    creatorWallet: getPlatformWallet(),
    creatorLabel : 'DeFi Labs',
    price        : 0.001,
    isDefault    : true,
    createdAt    : new Date('2024-01-15').toISOString(),
    usageCount   : 89,
    rating       : 4.6,
    category     : 'Finance',
    color        : 'blue',
  },
  {
    id           : 'default-code-003',
    name         : 'Smart Contract Architect',
    description  : 'Writes and audits smart contracts for Algorand (PyTeal) and Ethereum (Solidity). Security-focused developer.',
    promptTemplate: 'You are an expert smart contract developer specializing in Algorand PyTeal and Ethereum Solidity. Write clean, secure, gas-optimized contracts. Always include security considerations and testing notes.',
    outputFormat : 'Use headers: ## Contract Overview, ## Code Implementation (with code blocks), ## Security Considerations, ## Testing Guide, ## Deployment Steps.',
    creatorWallet: getPlatformWallet(),
    creatorLabel : 'BlockBuilders',
    price        : 0.001,
    isDefault    : true,
    createdAt    : new Date('2024-02-01').toISOString(),
    usageCount   : 201,
    rating       : 4.9,
    category     : 'Development',
    color        : 'green',
  },
  {
    id           : 'default-quick-004',
    name         : 'Quick Intel Agent',
    description  : 'Fast, precise answers on any topic. Delivers sharp, actionable insights with zero fluff.',
    promptTemplate: 'You are Quick Intel, a fast and precise research assistant. Deliver sharp, accurate insights with zero fluff. Use short punchy sentences. Never over-explain.',
    outputFormat : 'Bullet points only. Bold headers for sections. Each point under 20 words.',
    creatorWallet: getPlatformWallet(),
    creatorLabel : 'AgentMart Team',
    price        : 0.001,
    isDefault    : true,
    createdAt    : new Date('2024-02-10').toISOString(),
    usageCount   : 67,
    rating       : 4.5,
    category     : 'Research',
    color        : 'cyan',
  },
]

const validateDefaultAgents = () => {
  let valid = true
  for (const agent of DEFAULT_AGENTS) {
    if (!agent.creatorWallet || agent.creatorWallet.length < 50) {
      console.warn(`⚠️  Default agent "${agent.name}" has invalid wallet`)
      valid = false
    }
  }
  return valid
}

validateDefaultAgents()

const useAgentStore = create(
  persist(
    (set, get) => ({
      agents       : DEFAULT_AGENTS,
      selectedAgent: null,
      isCreating   : false,

      createAgent: (agentData) => {
        const promptTemplate =
          agentData.promptTemplate || agentData.systemPrompt || ''
        const outputFormat   = agentData.outputFormat || ''
        const creatorWallet  = agentData.creatorWallet || agentData.creator || ''

        console.log('[createAgent] Creating new agent:')
        console.log('  Name         :', agentData.name)
        console.log('  Prompt       :', promptTemplate.slice(0, 50))
        console.log('  Creator      :', creatorWallet ? `${creatorWallet.slice(0, 8)}...` : '(none)')

        const newAgent = {
          id           : `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name         : (agentData.name         || '').trim(),
          description  : (agentData.description  || '').trim(),
          promptTemplate,
          outputFormat,
          creatorWallet: creatorWallet.trim(),
          creatorLabel : (agentData.creatorLabel  || 'You').trim(),
          price        : 0.001, 
          isDefault    : false,
          createdAt    : new Date().toISOString(),
          usageCount   : 0,
          rating       : 0,
          category     : agentData.category || 'Custom',
          color        : agentData.color || 'purple',
        }

        if (!newAgent.name || newAgent.name.length < 3) {
          console.error('[createAgent] ❌ Invalid name')
          return null
        }
        if (!newAgent.creatorWallet || newAgent.creatorWallet.length !== 58) {
          console.warn(`[createAgent] ⚠️  Invalid creatorWallet: ${newAgent.creatorWallet}`)
        }

        set((state) => ({
          agents       : [...state.agents, newAgent],
          selectedAgent: newAgent,
        }))

        return newAgent
      },

      selectAgent: (agentId) => {
        const agent = get().agents.find((a) => a.id === agentId)
        if (!agent) {
          console.warn('[selectAgent] Agent not found:', agentId)
          return
        }
        console.log('[selectAgent] Selected:', agent.name, '— Wallet:', agent.creatorWallet ? `${agent.creatorWallet.slice(0, 10)}...` : '(none)')
        set({ selectedAgent: agent })
      },

      deselectAgent: () => set({ selectedAgent: null }),

      incrementUsage: (agentId) => {
        set((state) => ({
          agents: state.agents.map((a) =>
            a.id === agentId ? { ...a, usageCount: a.usageCount + 1 } : a
          ),
        }))
      },

      deleteAgent: (agentId) => {
        const agent = get().agents.find((a) => a.id === agentId)
        if (!agent || agent.isDefault) return
        set((state) => ({
          agents       : state.agents.filter((a) => a.id !== agentId),
          selectedAgent: state.selectedAgent?.id === agentId ? null : state.selectedAgent,
        }))
        console.log('[deleteAgent] Removed:', agent.name)
      },

      resetToDefaults: () => {
        console.log('[resetToDefaults] Clearing custom agents...')
        set({ agents: DEFAULT_AGENTS, selectedAgent: null })
      },

      getAllAgents : () => get().agents,
      getUserAgents: () => get().agents.filter((a) => !a.isDefault),
      setIsCreating: (val) => set({ isCreating: val }),
    }),
    {
      name        : 'agentmart-agents',
      version     : 3, 

      partialize   : (state) => ({
        agents: state.agents,
        selectedAgent: state.selectedAgent,
        isCreating: state.isCreating,
      }),
      migrate      : (persistedState, version) => {
        console.log('[migrate] Moving from version', version)

        if (version < 3) {
          const currentAgents = persistedState.agents || []
          const userAgents    = currentAgents.filter(a => !a.isDefault)

          console.log(`[migrate] Keeping ${userAgents.length} user agents`)

          return {
            ...persistedState,
            agents    : [...DEFAULT_AGENTS, ...userAgents],
            selectedAgent: persistedState.selectedAgent,
            isCreating: persistedState.isCreating,
          }
        }

        return persistedState
      },
      skipHydration: false,
    }
  )
)

export default useAgentStore