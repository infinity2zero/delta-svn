import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'

type CheckoutModalProps = {
  isOpen: boolean
  remoteUrl: string
  defaultFolderName: string
  onClose: () => void
  onConfirm: (destination: string) => Promise<void>
}

export function CheckoutModal({ isOpen, remoteUrl, defaultFolderName, onClose, onConfirm }: CheckoutModalProps) {
  const [destination, setDestination] = useState('')
  const [browsing, setBrowsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Set a simple default path - user can change it
      const defaultPath = `./svn-working-copies/${defaultFolderName}`
      setDestination(defaultPath)
      setError(null)
    } else {
      setDestination('')
      setError(null)
    }
  }, [isOpen, defaultFolderName])

  const handleBrowse = async () => {
    setBrowsing(true)
    setError(null)
    try {
      // Use Tauri command to open native OS folder picker
      const currentPath = destination ? destination.split('/').slice(0, -1).join('/') : undefined
      const selected = await invoke<string | null>('open_folder_dialog', {
        title: 'Select checkout destination folder',
        defaultPath: currentPath || undefined,
      })

      if (selected) {
        // Append folder name to selected directory
        const finalPath = `${selected}/${defaultFolderName}`
        setDestination(finalPath)
      }
    } catch (err) {
      console.error('Browse error:', err)
      setError('Failed to open folder picker. Please enter the path manually.')
    } finally {
      setBrowsing(false)
    }
  }

  const handleConfirm = async () => {
    if (!destination.trim()) {
      setError('Please enter a destination path')
      return
    }

    setError(null)
    setCheckingOut(true)

    try {
      await onConfirm(destination.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setCheckingOut(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Checkout</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              disabled={checkingOut}
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Repository URL
              </label>
              <div className="px-3 py-2 rounded-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 font-mono break-all">
                {remoteUrl}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Checkout Directory
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value)
                    setError(null)
                  }}
                  className="flex-1 px-3 py-2 rounded-none border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter destination path..."
                  disabled={checkingOut}
                />
                <button
                  type="button"
                  onClick={handleBrowse}
                  disabled={browsing || checkingOut}
                  className="px-4 py-2 rounded-none border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {browsing ? 'Browsing...' : 'Browse'}
                </button>
              </div>
              {error && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400 whitespace-pre-line">{error}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={onClose}
              disabled={checkingOut}
              className="px-4 py-2 rounded-none border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={checkingOut || !destination.trim()}
              className="px-5 py-2 rounded-none bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkingOut ? 'Checking out...' : 'Checkout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
