import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Get platform wallet from env ──────────────────────────────────────────────
const PLATFORM_WALLET = import.meta.env.VITE_RECEIVER_ADDRESS || ''

console.log('[useAgentStore] PLATFORM_WALLET:', PLATFORM_WALLET ? PLATFORM_WALLET.slice(0, 10) + '...' : 'NOT SET')

// ── Helper: extract creator wallet from any agent object ─────────────────────
// Handles all possible field name variants
export function getCreatorWallet(agent) {
  if (!agent) return ''
  const wallet =
    agent.creatorWallet ||
    agent.creator       ||
    agent.creatorAddress||
    agent.wallet        ||
    ''
  console.log('[getCreatorWallet] agent:', agent?.name, '→ wallet:', wallet)
  return wallet
}

// ── Default agents ────────────────────────────────────────────────────────────
const buildDefaultAgents = () => [
  {
    id           : 'default-research-001',
    name         : 'Research Analyst',
    description  : 'Deep research and data analysis. Provides sourced insights and key findings.',
    systemPrompt : 'You are an expert research analyst. Gather key insights, identify patterns, and present findings clearly. Be concise and structured.',
    outputFormat : 'Use: ## Research Findings, ## Key Insights, ## Analysis, ## Recommendations. Bullet points throughout.',
    creatorWallet: PLATFORM_WALLET,
    creatorLabel : 'AgentMart Team',
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
    description  : 'DeFi protocols, yield optimization, liquidity analysis, and risk assessment.',
    systemPrompt : 'You are a DeFi expert. Analyze market conditions, evaluate risks, suggest optimal strategies. Be specific with numbers where possible.',
    outputFormat : 'Use: ## Market Overview, ## Risk Assessment, ## Strategy Recommendations, ## Execution Steps.',
    creatorWallet: PLATFORM_WALLET,
    creatorLabel : 'DeFi Labs',
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
    description  : 'Writes and audits smart contracts for Algorand (PyTeal) and Ethereum (Solidity).',
    systemPrompt : 'You are an expert smart contract developer. Write clean, secure, gas-optimized contracts. Always include security notes.',
    outputFormat : 'Use: ## Contract Overview, ## Code (with code blocks), ## Security Considerations, ## Deployment Steps.',
    creatorWallet: PLATFORM_WALLET,
    creatorLabel : 'BlockBuilders',
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
    description  : 'Rapid research and insight generation. Delivers sharp, concise answers fast.',
    systemPrompt : 'You are Quick Intel, a fast and precise research assistant. Deliver sharp, accurate insights with zero fluff. Short punchy sentences only.',
    outputFormat : 'Bullet points only. Bold headers for sections. Each point under 20 words.',
    creatorWallet: PLATFORM_WALLET,
    creatorLabel : 'AgentMart Team',
    isDefault    : true,
    createdAt    : new Date('2024-02-10').toISOString(),
    usageCount   : 67,
    rating       : 4.5,
    category     : 'Research',
    color        : 'cyan',
  },
]

// ── Store ─────────────────────────────────────────────────────────────────────
const useAgentStore = create(
  persist(
    (set, get) => ({
      agents       : buildDefaultAgents(),
      selectedAgent: null,
      isCreating   : false,

      // ── Create a new agent ─────────────────────────────────────────────
      createAgent: (agentData) => {
        const creatorWallet = agentData.creatorWallet || agentData.creator || ''

        console.log('[createAgent] Creating agent:', agentData.name)
        console.log('[createAgent] creatorWallet:', creatorWallet)

        const newAgent = {
          id           : `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name         : (agentData.name         || '').trim(),
          description  : (agentData.description  || '').trim(),
          systemPrompt : (agentData.systemPrompt  || '').trim(),
          outputFormat : (agentData.outputFormat  || '').trim(),
          creatorWallet: creatorWallet.trim(),
          creatorLabel : (agentData.creatorLabel  || 'You').trim(),
          isDefault    : false,
          createdAt    : new Date().toISOString(),
          usageCount   : 0,
          rating       : 0,
          category     : agentData.category || 'Custom',
          color        : agentData.color    || 'purple',
        }

        console.log('[createAgent] New agent object:', newAgent)

        set((state) => ({
          agents       : [...state.agents, newAgent],
          selectedAgent: newAgent,
        }))

        return newAgent
      },

      // ── Select agent by ID ─────────────────────────────────────────────
      selectAgent: (agentId) => {
        const agent = get().agents.find((a) => a.id === agentId)
        if (!agent) {
          console.warn('[selectAgent] Agent not found:', agentId)
          return
        }
        console.log('[selectAgent] Selected:', agent.name)
        console.log('[selectAgent] creatorWallet:', agent.creatorWallet)
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
      },

      // ── Reset to defaults (call if data is corrupt) ────────────────────
      resetToDefaults: () => {
        console.log('[useAgentStore] Resetting to defaults...')
        set({ agents: buildDefaultAgents(), selectedAgent: null })
      },

      getAllAgents : () => get().agents,
      getUserAgents: () => get().agents.filter((a) => !a.isDefault),
      setIsCreating: (val) => set({ isCreating: val }),
    }),
    {
      name   : 'agentmart-agents',
      version: 3,  // ← bumped: forces clear of old corrupt cache

      // Migration: if old data exists, reset to defaults
      migrate: (persistedState, version) => {
        console.log('[useAgentStore] Migrating from version', version)
        // Any version older than 3 gets reset
        return {
          ...persistedState,
          agents: buildDefaultAgents(),
          selectedAgent: null,
        }
      },
    }
  )
)

export default useAgentStore