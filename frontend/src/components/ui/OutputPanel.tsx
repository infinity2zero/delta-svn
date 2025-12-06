import { useState, useEffect, useRef } from 'react'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

export type LogEntry = {
  timestamp: Date
  level: 'info' | 'success' | 'error' | 'warning'
  message: string
}

type OutputPanelProps = {
  logs: LogEntry[]
  progress?: {
    active: boolean
    value?: number // 0-100
    message?: string
  }
  isOpen: boolean
  onToggle: () => void
  onClear: () => void
  className?: string
}

export function OutputPanel({ logs, progress, isOpen, onToggle, onClear, className = '' }: OutputPanelProps) {
  const logEndRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && isOpen && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isOpen, autoScroll])

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'text-green-600 dark:text-green-400'
      case 'error':
        return 'text-red-600 dark:text-red-400'
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400'
      default:
        return 'text-gray-700 dark:text-gray-300'
    }
  }

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return '✓'
      case 'error':
        return '✗'
      case 'warning':
        return '⚠'
      default:
        return '→'
    }
  }

  // When closed, show just the header bar
  if (!isOpen) {
    return (
      <div
        className={`h-8 flex items-center justify-between px-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${className}`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <ChevronUpIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Output</span>
          {logs.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              ({logs.length})
            </span>
          )}
        </div>
      </div>
    )
  }

  // When open, show full panel
  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 dark:bg-gray-800/95 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Collapse output panel"
          >
            <ChevronDownIcon className="h-4 w-4" />
            <span>Output</span>
          </button>
          {logs.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <button
              onClick={onClear}
              className="text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors px-2 py-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Clear output"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-xs px-2 py-0.5 rounded-md transition-colors ${
              autoScroll
                ? 'text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 bg-teal-50 dark:bg-teal-900/30'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
          >
            Auto
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {progress?.active && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 dark:bg-teal-600 transition-all duration-300"
                style={{
                  width: progress.value !== undefined ? `${progress.value}%` : '100%',
                }}
              />
            </div>
            {progress.value !== undefined && (
              <span className="text-xs text-gray-600 dark:text-gray-400 w-12 text-right">
                {Math.round(progress.value)}%
              </span>
            )}
          </div>
          {progress.message && (
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{progress.message}</div>
          )}
        </div>
      )}

      {/* Logs */}
      <div className="flex-1 min-h-0 overflow-y-auto font-mono text-xs bg-white dark:bg-gray-900">
        {logs.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No output yet. Operations will appear here.
          </div>
        ) : (
          <div className="p-2">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 py-0.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                  getLogColor(log.level)
                }`}
              >
                <span className="text-gray-500 dark:text-gray-500 flex-shrink-0 w-20">
                  {formatTimestamp(log.timestamp)}
                </span>
                <span className="flex-shrink-0 w-4 text-center">
                  {getLogIcon(log.level)}
                </span>
                <span className="flex-1 break-words whitespace-pre-wrap">
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  )
}
