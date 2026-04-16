import { useState, useEffect } from 'react'

export function useTypewriter(text, speed = 20, startTyping = true) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (!startTyping || !text) {
      setDisplayedText('')
      setIsComplete(false)
      return
    }

    setDisplayedText('')
    setIsComplete(false)
    let index = 0

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1))
        index++
      } else {
        setIsComplete(true)
        clearInterval(interval)
      }
    }, speed)

    return () => clearInterval(interval)
  }, [text, speed, startTyping])

  return { displayedText, isComplete }
}