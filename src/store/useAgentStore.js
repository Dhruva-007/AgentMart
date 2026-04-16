/**
 * useAgentStore.js — Agent management
 *
 * Handles:
 *  - Creating agents (stored in localStorage)
 *  - Listing all agents
 *  - Selecting an agent for task execution
 *  - Seeding default agents on first load
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Default agents (seed data — always available) ─────────────────────────────
const DEFAULT_AGENTS = [
  {
    id          : 'default-research-001',
    name        : 'Research Analyst',
    description : 'Deep research and data analysis on any topic. Provides sourced insights and key findings.',
    systemPrompt: 'You are an expert research analyst. Your job is to gather key insights, identify patterns, and present findings in a clear, evidence-based format. Always cite reasoning behind conclusions.',
    outputFormat: 'Structure your response with: ## Research Findings, ## Key Insights, ## Analysis, ## Recommendations. Use bullet points for clarity.',
    creatorWallet: 'ALGO7B2C...4F1A',
    creatorLabel : 'AgentMart Team',
    isDefault   : true,
    createdAt   : new Date('2024-01-01').toISOString(),
    usageCount  : 142,
    rating      : 4.8,
    category    : 'Research',
    color       : 'purple',
  },
  {
    id          : 'default-defi-002',
    name        : 'DeFi Strategist',
    description : 'Specialized in DeFi protocols, yield optimization, liquidity analysis, and risk assessment.',
    systemPrompt: 'You are a DeFi expert with deep knowledge of Algorand, Ethereum, and cross-chain protocols. Analyze market conditions, evaluate risks, and suggest optimal DeFi strategies based on current data.',
    outputFormat: 'Structure your response with: ## Market Overview, ## Risk Assessment (Low/Medium/High), ## Strategy Recommendations, ## Execution Steps. Include specific metrics where possible.',
    creatorWallet: 'ALGOA3F8...9D2E',
    creatorLabel : 'DeFi Labs',
    isDefault   : true,
    createdAt   : new Date('2024-01-15').toISOString(),
    usageCount  : 89,
    rating      : 4.6,
    category    : 'Finance',
    color       : 'blue',
  },
  {
    id          : 'default-code-003',
    name        : 'Smart Contract Architect',
    description : 'Writes, audits, and explains smart contracts. Specializes in Algorand (PyTeal) and Solidity.',
    systemPrompt: 'You are an expert smart contract developer specializing in Algorand PyTeal and Ethereum Solidity. Write clean, secure, gas-optimized contracts. Always include security considerations and testing notes.',
    outputFormat: 'Structure your response with: ## Contract Overview, ## Code Implementation (with code blocks), ## Security Considerations, ## Testing Guide, ## Deployment Steps.',
    creatorWallet: 'ALGOE9D1...8C3B',
    creatorLabel : 'BlockBuilders',
    isDefault   : true,
    createdAt   : new Date('2024-02-01').toISOString(),
    usageCount  : 201,
    rating      : 4.9,
    category    : 'Development',
    color       : 'green',
  },
  {
    id          : 'default-strategy-004',
    name        : 'Business Strategist',
    description : 'Creates go-to-market plans, competitive analysis, and business strategy frameworks.',
    systemPrompt: 'You are a seasoned business strategist with expertise in Web3 startups and traditional markets. Provide actionable, data-driven strategic advice tailored to real-world execution.',
    outputFormat: 'Structure your response with: ## Situation Analysis, ## Strategic Options, ## Recommended Plan, ## Implementation Roadmap, ## Success Metrics.',
    creatorWallet: 'ALGO5F6A...2E7D',
    creatorLabel : 'Strategy Guild',
    isDefault   : true,
    createdAt   : new Date('2024-02-10').toISOString(),
    usageCount  : 67,
    rating      : 4.5,
    category    : 'Strategy',
    color       : 'cyan',
  },
]

// ── Store ─────────────────────────────────────────────────────────────────────
const useAgentStore = create(
  persist(
    (set, get) => ({
      // ── State ────────────────────────────────────────────────────────────
      agents        : DEFAULT_AGENTS,  // all agents (default + user created)
      selectedAgent : null,            // currently selected agent
      isCreating    : false,           // creating modal state

      // ── Actions ──────────────────────────────────────────────────────────

      /**
       * Create a new agent and save to localStorage.
       * Returns the created agent.
       */
      createAgent: (agentData) => {
        const newAgent = {
          id          : `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name        : agentData.name.trim(),
          description : agentData.description.trim(),
          systemPrompt: agentData.systemPrompt.trim(),
          outputFormat: agentData.outputFormat.trim(),
          creatorWallet: agentData.creatorWallet || 'Unknown',
          creatorLabel : agentData.creatorLabel  || 'You',
          isDefault   : false,
          createdAt   : new Date().toISOString(),
          usageCount  : 0,
          rating      : 0,
          category    : agentData.category || 'Custom',
          color       : agentData.color    || 'purple',
        }

        set(state => ({
          agents       : [...state.agents, newAgent],
          selectedAgent: newAgent,  // auto-select newly created agent
        }))

        console.log(`✅ Agent created: "${newAgent.name}" (${newAgent.id})`)
        return newAgent
      },

      /** Select an agent by ID. */
      selectAgent: (agentId) => {
        const agent = get().agents.find(a => a.id === agentId)
        if (!agent) return
        set({ selectedAgent: agent })
        console.log(`✅ Agent selected: "${agent.name}"`)
      },

      /** Deselect the current agent. */
      deselectAgent: () => set({ selectedAgent: null }),

      /** Increment usage count (called after successful task execution). */
      incrementUsage: (agentId) => {
        set(state => ({
          agents: state.agents.map(a =>
            a.id === agentId ? { ...a, usageCount: a.usageCount + 1 } : a
          )
        }))
      },

      /** Delete a user-created agent (cannot delete defaults). */
      deleteAgent: (agentId) => {
        const agent = get().agents.find(a => a.id === agentId)
        if (!agent || agent.isDefault) return
        set(state => ({
          agents       : state.agents.filter(a => a.id !== agentId),
          selectedAgent: state.selectedAgent?.id === agentId ? null : state.selectedAgent,
        }))
      },

      /** Get all agents for marketplace display. */
      getAllAgents: () => get().agents,

      /** Get user-created agents only. */
      getUserAgents: () => get().agents.filter(a => !a.isDefault),

      setIsCreating: (val) => set({ isCreating: val }),
    }),
    {
      name   : 'agentmart-agents',  // localStorage key
      version: 1,
    }
  )
)

export default useAgentStore