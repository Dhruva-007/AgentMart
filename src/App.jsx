import React from 'react'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar.jsx'
import AnimatedBackground from './components/AnimatedBackground.jsx'
import Dashboard from './pages/Dashboard.jsx'

function App() {
  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />

      <Navbar />

      <AnimatePresence mode="wait">
        <Dashboard key="dashboard" />
      </AnimatePresence>
    </div>
  )
}

export default App