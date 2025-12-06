import { useState, useEffect } from 'react'

const FONT_SIZE_KEY = 'delta-svn-font-size'
const DEFAULT_FONT_SIZE = 13 // Default base font size in px

export function useFontSize() {
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem(FONT_SIZE_KEY)
    return saved ? parseInt(saved, 10) : DEFAULT_FONT_SIZE
  })

  useEffect(() => {
    localStorage.setItem(FONT_SIZE_KEY, fontSize.toString())
    // Apply font size as CSS variable
    document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`)
    // Calculate relative sizes based on base font size
    document.documentElement.style.setProperty('--app-font-size-sm', `${fontSize - 1}px`) // 1px smaller
    document.documentElement.style.setProperty('--app-font-size-xs', `${fontSize - 2}px`) // 2px smaller
    document.documentElement.style.setProperty('--app-font-size-lg', `${fontSize + 1}px`) // 1px larger
  }, [fontSize])

  return { fontSize, setFontSize }
}

