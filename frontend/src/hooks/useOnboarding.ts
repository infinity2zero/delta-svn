import { useState, useEffect } from 'react'

const ONBOARDING_COMPLETED_KEY = 'delta-svn-onboarding-completed'
const ONBOARDING_SKIPPED_KEY = 'delta-svn-onboarding-skipped'

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if onboarding has been completed or skipped
    const completed = localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true'
    const skipped = localStorage.getItem(ONBOARDING_SKIPPED_KEY) === 'true'
    
    // Show onboarding only if it hasn't been completed or skipped
    setShowOnboarding(!completed && !skipped)
    setIsLoading(false)
  }, [])

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true')
    localStorage.removeItem(ONBOARDING_SKIPPED_KEY) // Clear skip flag if it was set
    setShowOnboarding(false)
  }

  const skipOnboarding = () => {
    localStorage.setItem(ONBOARDING_SKIPPED_KEY, 'true')
    setShowOnboarding(false)
  }

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY)
    localStorage.removeItem(ONBOARDING_SKIPPED_KEY)
    setShowOnboarding(true)
  }

  return {
    showOnboarding,
    isLoading,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
  }
}

