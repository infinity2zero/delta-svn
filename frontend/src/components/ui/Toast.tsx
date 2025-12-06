import { useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

export type ToastType = 'success' | 'error' | 'info'

type ToastProps = {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
}

export function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const accentColor =
    type === 'success'
      ? 'bg-emerald-500'
      : type === 'error'
        ? 'bg-red-500'
        : 'bg-sky-500'

  return (
    <div className="fixed top-[52px] right-4 z-50 min-w-[260px] max-w-sm animate-in slide-in-from-top-2">
      <div className="flex overflow-hidden rounded-lg border border-gray-200 bg-white dark:bg-gray-900 shadow-sm">
        {/* Left accent bar */}
        <span className={`w-1.5 ${accentColor}`} />

        {/* Message */}
        <div className="px-4 py-3 flex items-center flex-1">
          <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-line leading-snug">
            {message}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="px-3 py-3 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          aria-label="Close"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

