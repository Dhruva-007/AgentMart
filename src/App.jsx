import React from 'react'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar.jsx'
import AnimatedBackground from './components/AnimatedBackground.jsx'
import Dashboard from './pages/Dashboard.jsx'

/**
 * App.jsx — Root component
 *
 * Keep this clean. Wallet state is read inside child components
 * directly from useWallet() hook. No conditional rendering here.
 * Dashboard and LandingSection handle their own visibility logic.
 */
function App() {
  return (
    <div className="min-h-screen relative">
      {/* Animated gradient background — always visible */}
      <AnimatedBackground />

      {/* Navbar with wallet button — always visible */}
      <Navbar />

      {/*
       * Dashboard contains BOTH:
       *   - LandingSection (always visible at top)
       *   - Dashboard content (visible after wallet connects)
       *
       * No wallet condition here — Dashboard manages its own sections.
       */}
      <AnimatePresence mode="wait">
        <Dashboard key="dashboard" />
      </AnimatePresence>
    </div>
  )
}

export default App