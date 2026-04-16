import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Store, Search, Star, Zap, CheckCircle2, Bot,
  Users, ArrowRight, Filter
} from 'lucide-react'
import useAgentStore from '../store/useAgentStore.js'
import GlassCard from './GlassCard.jsx'
import Button from './Button.jsx'

const CATEGORY_FILTERS = ['All', 'Research', 'Finance', 'Development', 'Strategy', 'Marketing', 'Custom']

const GRADIENT_MAP = {
  purple: 'from-purple-500/15 to-purple-600/5 border-purple-500/15 hover:border-purple-500/30',
  blue  : 'from-blue-500/15 to-blue-600/5 border-blue-500/15 hover:border-blue-500/30',
  green : 'from-green-500/15 to-green-600/5 border-green-500/15 hover:border-green-500/30',
  cyan  : 'from-cyan-500/15 to-cyan-600/5 border-cyan-500/15 hover:border-cyan-500/30',
  pink  : 'from-pink-500/15 to-pink-600/5 border-pink-500/15 hover:border-pink-500/30',
  orange: 'from-orange-500/15 to-orange-600/5 border-orange-500/15 hover:border-orange-500/30',
}

const DOT_MAP = {
  purple: 'bg-purple-400', blue: 'bg-blue-400', green: 'bg-green-400',
  cyan: 'bg-cyan-400', pink: 'bg-pink-400', orange: 'bg-orange-400',
}

const ICON_MAP = {
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  blue  : 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  green : 'text-green-400 bg-green-500/10 border-green-500/20',
  cyan  : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  pink  : 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
}

const AgentMarketplace = () => {
  const { agents, selectedAgent, selectAgent } = useAgentStore()
  const [searchQuery,     setSearchQuery]     = useState('')
  const [activeCategory,  setActiveCategory]  = useState('All')

  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      const matchesSearch = !searchQuery || (
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
      const matchesCategory = activeCategory === 'All' || agent.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [agents, searchQuery, activeCategory])

  return (
    <GlassCard hover glowColor="purple" delay={0.1}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Store size={18} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-dark-100">Agent Marketplace</h3>
            <p className="text-xs text-dark-400">{agents.length} agents available · Select to execute tasks</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-[10px] font-medium text-purple-300">Live</span>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search agents..."
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:border-purple-500/30 transition-all duration-200"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Filter size={12} className="text-dark-500 flex-shrink-0" />
          {CATEGORY_FILTERS.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 text-[10px] font-medium px-3 py-1 rounded-full border transition-all duration-150 ${activeCategory === cat ? 'bg-purple-500/15 border-purple-500/25 text-purple-300' : 'bg-white/[0.02] border-white/[0.05] text-dark-400 hover:bg-white/[0.04]'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Selected agent banner */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            key="selected-banner"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-green-500/[0.06] border border-green-500/20"
          >
            <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-green-400">Active Agent: {selectedAgent.name}</p>
              <p className="text-[10px] text-green-400/60 truncate">Tasks will use this agent's configuration</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent Grid */}
      {filteredAgents.length === 0 ? (
        <div className="py-10 text-center">
          <Bot size={28} className="text-dark-500 mx-auto mb-2" />
          <p className="text-sm text-dark-400">No agents found</p>
          <p className="text-xs text-dark-500 mt-1">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredAgents.map((agent, i) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isSelected={selectedAgent?.id === agent.id}
              onSelect={() => selectAgent(agent.id)}
              index={i}
            />
          ))}
        </div>
      )}
    </GlassCard>
  )
}

// ── AgentCard sub-component ───────────────────────────────────────────────────
function AgentCard({ agent, isSelected, onSelect, index }) {
  const gradientClass = GRADIENT_MAP[agent.color] || GRADIENT_MAP.purple
  const iconClass     = ICON_MAP[agent.color]     || ICON_MAP.purple
  const dotClass      = DOT_MAP[agent.color]      || DOT_MAP.purple

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      whileHover={{ y: -2, scale: 1.01 }}
      onClick={onSelect}
      className={`
        relative p-4 rounded-xl border cursor-pointer
        bg-gradient-to-br transition-all duration-250
        ${gradientClass}
        ${isSelected ? 'ring-1 ring-green-500/40' : ''}
      `}
    >
      {/* Selected badge */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center"
        >
          <CheckCircle2 size={11} className="text-green-400" />
        </motion.div>
      )}

      {/* Agent icon + category */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${iconClass}`}>
          <Bot size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h4 className="text-sm font-semibold text-dark-100 leading-tight truncate">{agent.name}</h4>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
            <span className="text-[10px] text-dark-400">{agent.category}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-dark-300 leading-relaxed mb-3 line-clamp-2">{agent.description}</p>

      {/* Stats row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {agent.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star size={10} className="text-yellow-400" fill="currentColor" />
              <span className="text-[10px] font-medium text-dark-300">{agent.rating}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Zap size={10} className="text-dark-400" />
            <span className="text-[10px] text-dark-400">{agent.usageCount} runs</span>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={e => { e.stopPropagation(); onSelect() }}
          className={`
            text-[10px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1
            transition-all duration-150
            ${isSelected
              ? 'bg-green-500/15 text-green-400 border border-green-500/25'
              : 'bg-white/[0.05] text-dark-300 border border-white/[0.07] hover:bg-purple-500/10 hover:text-purple-300 hover:border-purple-500/20'}
          `}
        >
          {isSelected ? 'Selected' : 'Select'}
          {!isSelected && <ArrowRight size={9} />}
        </motion.button>
      </div>

      {/* Creator wallet */}
      <div className="mt-2.5 pt-2.5 border-t border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users size={9} className="text-dark-500" />
          <span className="text-[9px] text-dark-500">by {agent.creatorLabel}</span>
        </div>
        {!agent.isDefault && (
          <span className="text-[9px] text-purple-400/60 bg-purple-500/5 px-1.5 py-0.5 rounded">Your agent</span>
        )}
      </div>
    </motion.div>
  )
}

export default AgentMarketplace