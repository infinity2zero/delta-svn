import { useState, useEffect } from 'react'

export function useActionRailSettings() {
  const [iconOnly, setIconOnly] = useState<boolean>(() => {
    const saved = localStorage.getItem('delta-svn-action-rail-icon-only')
    return saved ? saved === 'true' : true // Default to icon-only
  })

  useEffect(() => {
    localStorage.setItem('delta-svn-action-rail-icon-only', iconOnly.toString())
  }, [iconOnly])

  return { iconOnly, setIconOnly }
}

