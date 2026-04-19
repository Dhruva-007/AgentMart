import { useEffect } from 'react'

export function useLockBodyScroll(isLocked) {
  useEffect(() => {
    if (!isLocked) return

    const body = document.body

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth

    body.classList.add('scroll-locked')

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      body.classList.remove('scroll-locked')
      body.style.paddingRight = ''
    }
  }, [isLocked])
}

export default useLockBodyScroll