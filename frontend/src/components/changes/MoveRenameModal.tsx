import { useState, useEffect } from 'react'
import { XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import type { FileChange } from '../../types'

type MoveRenameModalProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: (destinationPath: string) => void
  file: FileChange | null
  workingCopyPath: string
}

export function MoveRenameModal({
  isOpen,
  onClose,
  onConfirm,
  file,
  workingCopyPath,
}: MoveRenameModalProps) {
  const [destinationPath, setDestinationPath] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && file) {
      // Pre-fill with current path for rename, or empty for move
      setDestinationPath(file.name)
      setError(null)
    }
  }, [isOpen, file])

  if (!isOpen || !file) {
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate destination path
    if (!destinationPath.trim()) {
      setError('Destination path cannot be empty')
      return
    }

    // Normalize paths (remove leading/trailing slashes, normalize separators)
    const normalizedSource = file.name.replace(/^\/+|\/+$/g, '').replace(/\\/g, '/')
    const normalizedDest = destinationPath.trim().replace(/^\/+|\/+$/g, '').replace(/\\/g, '/')

    if (normalizedSource === normalizedDest) {
      setError('Source and destination paths are the same')
      return
    }

    // Check if destination already exists (basic check)
    // Note: Full validation happens on backend
    if (normalizedDest.includes('..')) {
      setError('Destination path cannot contain ".."')
      return
    }

    onConfirm(normalizedDest)
  }

  const handleCancel = () => {
    setDestinationPath('')
    setError(null)
    onClose()
  }

  const isRename = file.name.split('/').length === destinationPath.split('/').length &&
                   file.name.split('/').slice(0, -1).join('/') === destinationPath.split('/').slice(0, -1).join('/')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {isRename ? 'Rename' : 'Move'} File
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {isRename ? 'Rename the file in the repository' : 'Move the file to a new location'}
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Source Path */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Source Path
            </label>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm text-gray-600 dark:text-gray-400 font-mono">
              {file.name}
            </div>
          </div>

          {/* Arrow Icon */}
          <div className="flex justify-center">
            <ArrowRightIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>

          {/* Destination Path */}
          <div>
            <label htmlFor="destination" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Destination Path
            </label>
            <input
              id="destination"
              type="text"
              value={destinationPath}
              onChange={(e) => {
                setDestinationPath(e.target.value)
                setError(null)
              }}
              placeholder="Enter new path or filename"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent font-mono"
              autoFocus
            />
            {error && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>
            )}
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              {isRename 
                ? 'Enter the new filename (same directory)'
                : 'Enter the full path including directory (e.g., "folder/newfile.txt")'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 dark:bg-teal-500 rounded-md hover:bg-teal-700 dark:hover:bg-teal-600 transition-colors"
            >
              {isRename ? 'Rename' : 'Move'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

