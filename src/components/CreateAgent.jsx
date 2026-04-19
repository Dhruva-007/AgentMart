import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, Bot, Wallet, Tag, FileText,
  Sparkles, CheckCircle2
} from 'lucide-react'
import { useWallet } from '@txnlab/use-wallet-react'
import useAgentStore from '../store/useAgentStore.js'
import GlassCard from './GlassCard.jsx'
import Button from './Button.jsx'

const CATEGORIES = ['Research', 'Finance', 'Development', 'Strategy', 'Marketing', 'Custom']
const OUTPUT_STYLES = [
  { value: 'Structure your response with: ## Research, ## Analysis, ## Final Plan, ## Execution Steps. Use bullet points for clarity.',     label: 'Structured Report'   },
  { value: 'Present findings as clear numbered steps. Each step must have a title and 2-3 sentence explanation.',                          label: 'Step-by-Step Guide'  },
  { value: 'Use bullet points throughout. Group insights under bold headers. Keep each point under 20 words.',                              label: 'Bullet Points'       },
  { value: 'Write as a professional analysis document with sections: Executive Summary, Detailed Analysis, Conclusion, Action Items.',      label: 'Executive Summary'   },
  { value: 'Provide a technical deep-dive with: Problem Statement, Technical Approach, Implementation Details, Code Examples, Trade-offs.', label: 'Technical Deep-Dive' },
]
const COLORS = ['purple', 'blue', 'green', 'cyan', 'pink', 'orange']

const COLOR_MAP = {
  purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/20',
  blue  : 'from-blue-500/20 to-blue-600/10 border-blue-500/20',
  green : 'from-green-500/20 to-green-600/10 border-green-500/20',
  cyan  : 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/20',
  pink  : 'from-pink-500/20 to-pink-600/10 border-pink-500/20',
  orange: 'from-orange-500/20 to-orange-600/10 border-orange-500/20',
}

const CreateAgent = () => {
  const { activeAccount } = useWallet()
  const { createAgent, isCreating, setIsCreating } = useAgentStore()

  const [form, setForm] = useState({
    name        : '',
    description : '',
    systemPrompt: '',
    outputFormat: OUTPUT_STYLES[0].value,
    category    : 'Research',
    color       : 'purple',
  })
  const [errors,       setErrors]       = useState({})
  const [success,      setSuccess]      = useState(false)
  const [customOutput, setCustomOutput] = useState(false)

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()         || form.name.trim().length < 3)          e.name         = 'Agent name must be at least 3 characters'
    if (!form.description.trim()  || form.description.trim().length < 10)  e.description  = 'Description must be at least 10 characters'
    if (!form.systemPrompt.trim() || form.systemPrompt.trim().length < 20) e.systemPrompt = 'Behavior prompt must be at least 20 characters'
    if (!activeAccount?.address)                                            e.wallet       = 'Connect your wallet to create an agent'
    return e
  }

  function handleCreate() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }

    createAgent({
      ...form,
      creatorWallet: activeAccount?.address || 'Unknown',
      creatorLabel : `${(activeAccount?.address || '').slice(0, 6)}...${(activeAccount?.address || '').slice(-4)}`,
    })

    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
      setIsCreating(false)
      setForm({ name: '', description: '', systemPrompt: '', outputFormat: OUTPUT_STYLES[0].value, category: 'Research', color: 'purple' })
    }, 2000)
  }

  return (
    <GlassCard hover glowColor="purple" delay={0.1}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Plus size={18} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white/90">Create AI Agent</h3>
            <p className="text-xs text-white/50">Build and list your agent on the marketplace</p>
          </div>
        </div>
        <Button variant="glow" size="sm"
          onClick={() => setIsCreating(!isCreating)}
          icon={isCreating ? <X size={14} /> : <Plus size={14} />}>
          {isCreating ? 'Cancel' : 'New Agent'}
        </Button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div key="create-form" initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}>
            {success ? (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="py-10 flex flex-col items-center gap-3">
                <CheckCircle2 size={40} className="text-green-400" />
                <p className="text-base font-semibold text-green-400">Agent Created & Listed!</p>
                <p className="text-xs text-white/50">Your agent is now available in the marketplace</p>
              </motion.div>
            ) : (
              <div className="space-y-4 pt-2">
                <FormField label="Agent Name" icon={<Bot size={14} className="text-white/40" />} error={errors.name}>
                  <input type="text" value={form.name}
                    onChange={e => setField('name', e.target.value)}
                    placeholder="e.g., DeFi Risk Analyst" maxLength={50}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5
                      text-sm text-white/85 placeholder-white/25
                      focus:outline-none focus:border-purple-500/35 transition-all duration-200"
                  />
                </FormField>

                <FormField label="Description" icon={<FileText size={14} className="text-white/40" />} error={errors.description}>
                  <textarea value={form.description}
                    onChange={e => setField('description', e.target.value)}
                    placeholder="Describe what this agent does and when to use it..."
                    rows={2} maxLength={200}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5
                      text-sm text-white/85 placeholder-white/25
                      focus:outline-none focus:border-purple-500/35 transition-all duration-200 resize-none"
                  />
                </FormField>

                <FormField label="Agent Behavior (System Prompt)"
                  icon={<Sparkles size={14} className="text-white/40" />}
                  error={errors.systemPrompt} hint="Define how this agent thinks and responds">
                  <textarea value={form.systemPrompt}
                    onChange={e => setField('systemPrompt', e.target.value)}
                    placeholder="You are an expert in... Your role is to... Always respond with..."
                    rows={4} maxLength={800}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5
                      text-sm text-white/85 placeholder-white/25
                      focus:outline-none focus:border-purple-500/35 transition-all duration-200 resize-none leading-relaxed"
                  />
                </FormField>

                <FormField label="Output Style" icon={<Tag size={14} className="text-white/40" />}>
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-1.5">
                      {OUTPUT_STYLES.map((style, i) => (
                        <button key={i} onClick={() => { setField('outputFormat', style.value); setCustomOutput(false) }}
                          className={`text-left px-3 py-2 rounded-lg border text-xs transition-all duration-150
                            ${form.outputFormat === style.value && !customOutput
                              ? 'bg-purple-500/12 border-purple-500/28 text-purple-300'
                              : 'bg-white/[0.03] border-white/[0.07] text-white/60 hover:bg-white/[0.06] hover:text-white/80'}`}>
                          {style.label}
                        </button>
                      ))}
                      <button onClick={() => setCustomOutput(true)}
                        className={`text-left px-3 py-2 rounded-lg border text-xs transition-all duration-150
                          ${customOutput
                            ? 'bg-purple-500/12 border-purple-500/28 text-purple-300'
                            : 'bg-white/[0.03] border-white/[0.07] text-white/60 hover:bg-white/[0.06] hover:text-white/80'}`}>
                        Custom format...
                      </button>
                    </div>
                    {customOutput && (
                      <textarea value={form.outputFormat} onChange={e => setField('outputFormat', e.target.value)}
                        placeholder="Describe how the output should be formatted..."
                        rows={2}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5
                          text-sm text-white/85 placeholder-white/25
                          focus:outline-none focus:border-purple-500/35 transition-all duration-200 resize-none"
                      />
                    )}
                  </div>
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Category" icon={<Tag size={14} className="text-white/40" />}>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map(cat => (
                        <button key={cat} onClick={() => setField('category', cat)}
                          className={`text-[10px] px-2.5 py-1 rounded-lg border font-medium transition-all duration-150
                            ${form.category === cat
                              ? 'bg-purple-500/15 border-purple-500/28 text-purple-300'
                              : 'bg-white/[0.03] border-white/[0.07] text-white/55 hover:bg-white/[0.06] hover:text-white/80'}`}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  </FormField>

                  <FormField label="Card Color" icon={<Sparkles size={14} className="text-white/40" />}>
                    <div className="flex gap-2 flex-wrap">
                      {COLORS.map(color => (
                        <button key={color} onClick={() => setField('color', color)}
                          className={`w-7 h-7 rounded-lg transition-all duration-150 bg-gradient-to-br
                            ${COLOR_MAP[color]} border
                            ${form.color === color ? 'scale-125 border-white/40' : 'border-transparent'}`} />
                      ))}
                    </div>
                  </FormField>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.07]">
                  <div className="flex items-center gap-2">
                    <Wallet size={14} className="text-white/40" />
                    <span className="text-xs text-white/55">Creator Wallet (auto)</span>
                  </div>
                  <span className={`text-xs font-mono font-medium ${activeAccount ? 'text-green-400' : 'text-red-400'}`}>
                    {activeAccount
                      ? `${activeAccount.address.slice(0, 8)}...${activeAccount.address.slice(-4)}`
                      : 'Wallet not connected'}
                  </span>
                </div>
                {errors.wallet && <p className="text-xs text-red-400 mt-1">{errors.wallet}</p>}

                <div className="pt-2">
                  <Button variant="glow" size="md" onClick={handleCreate}
                    icon={<Plus size={14} />} className="w-full">
                    Create & List Agent
                  </Button>
                  <p className="text-[10px] text-white/35 text-center mt-2">
                    Agent will be listed in the marketplace. Payments go to your connected wallet.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}

function FormField({ label, icon, error, hint, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span>{icon}</span>
        <span className="text-xs font-medium text-white/65">{label}</span>
        {hint && <span className="text-[10px] text-white/35">— {hint}</span>}
      </div>
      {children}
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  )
}

export default CreateAgent