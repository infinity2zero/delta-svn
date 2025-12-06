import { useCallback, useEffect, useMemo, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
type Theme = 'light' | 'dark'

const THEME_KEY = 'delta-svn-theme-mode'

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

function resolveTheme(mode: ThemeMode): Theme {
  return mode === 'system' ? getSystemTheme() : mode
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  const resolved = resolveTheme(mode)
  const isDark = resolved === 'dark'
  const root = document.documentElement
  root.classList.toggle('dark', isDark)
  // Hook for design-tokens.css
  root.setAttribute('data-color-scheme', resolved)
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => getInitialMode())

  const theme = useMemo<Theme>(() => resolveTheme(mode), [mode])

  useEffect(() => {
    applyTheme(mode)
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_KEY, mode)
    }
  }, [mode])

  // Keep in sync with OS when in "system" mode
  useEffect(() => {
    if (mode !== 'system' || typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  const toggleTheme = useCallback(() => {
    setMode((prev) => (resolveTheme(prev) === 'dark' ? 'light' : 'dark'))
  }, [])

  const setThemeMode = useCallback((next: ThemeMode) => {
    setMode(next)
  }, [])

  return { theme, mode, setMode: setThemeMode, toggleTheme }
}

