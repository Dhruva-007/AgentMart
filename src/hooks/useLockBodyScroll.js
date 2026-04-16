import { useEffect } from 'react'

/**
 * Strict Mode-safe body scroll lock.
 *
 * Strategy:
 * - Uses a CSS class on <body> instead of inline style mutation
 * - The class is defined in index.css
 * - No module-level counters (breaks under React Strict Mode double-invoke)
 * - Cleanup always runs via useEffect return
 */
export function useLockBodyScroll(isLocked) {
  useEffect(() => {
    if (!isLocked) return

    const body = document.body

    // Calculate scrollbar width BEFORE hiding to prevent layout shift
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth

    // Apply lock via class (defined in index.css)
    body.classList.add('scroll-locked')

    // Compensate for scrollbar disappearing (prevents content jump)
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    // Cleanup: runs when isLocked becomes false OR component unmounts
    return () => {
      body.classList.remove('scroll-locked')
      body.style.paddingRight = ''
    }
  }, [isLocked])
}

export default useLockBodyScroll