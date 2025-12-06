import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { LogEntry } from '../components/ui/OutputPanel'

type ProgressState = {
  active: boolean
  value?: number // 0-100
  message?: string
}

type OutputContextType = {
  logs: LogEntry[]
  progress: ProgressState
  addLog: (message: string, level?: LogEntry['level']) => void
  setProgress: (progress: ProgressState) => void
  clearLogs: () => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const OutputContext = createContext<OutputContextType | undefined>(undefined)

export function OutputProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [progress, setProgress] = useState<ProgressState>({ active: false })
  const [isOpen, setIsOpen] = useState(false)

  const addLog = useCallback((message: string, level: LogEntry['level'] = 'info') => {
    setLogs((prev) => [
      ...prev,
      {
        timestamp: new Date(),
        level,
        message,
      },
    ])
    // Auto-open panel when logs are added
    setIsOpen(true)
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  return (
    <OutputContext.Provider
      value={{
        logs,
        progress,
        addLog,
        setProgress,
        clearLogs,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </OutputContext.Provider>
  )
}

export function useOutput() {
  const context = useContext(OutputContext)
  if (context === undefined) {
    throw new Error('useOutput must be used within an OutputProvider')
  }
  return context
}

