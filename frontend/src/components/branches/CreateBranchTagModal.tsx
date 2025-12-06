import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  XMarkIcon,
  CodeBracketIcon,
  BookmarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { Toast, type ToastType } from '../ui/Toast'

type CreateBranchTagModalProps = {
  isOpen: boolean
  onClose: () => void
  workingCopyPath: string
  kind: 'branch' | 'tag'
  onCreated: () => void
}

export function CreateBranchTagModal({
  isOpen,
  onClose,
  workingCopyPath,
  kind,
  onCreated,
}: CreateBranchTagModalProps) {
  const [name, setName] = useState('')
  const [sourcePath, setSourcePath] = useState('')
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  useEffect(() => {
    if (isOpen) {
      setName('')
      setSourcePath('')
      setCreating(false)
      setToast(null)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setToast({ message: 'Name cannot be empty', type: 'error' })
      return
    }

    setCreating(true)
    try {
      await invoke('create_branch_or_tag', {
        workingCopyPath,
        name: name.trim(),
        kind,
        sourcePath: sourcePath.trim() || null,
      })

      setToast({
        message: `Successfully created ${kind}: ${name.trim()}`,
        type: 'success',
      })

      onCreated()
      onClose()
    } catch (error) {
      setToast({
        message: `Failed to create ${kind}: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error',
      })
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  const Icon = kind === 'branch' ? CodeBracketIcon : BookmarkIcon
  const kindLabel = kind === 'branch' ? 'Branch' : 'Tag'

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <Icon className="h-6 w-6 text-teal-500" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Create {kindLabel}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create a new {kind} in the repository
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Name Input */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {kindLabel} Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Enter ${kind} name`}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                autoFocus
                disabled={creating}
              />
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                The {kind} will be created in the {kind === 'branch' ? 'branches' : 'tags'} directory
              </p>
            </div>

            {/* Source Path (Optional) */}
            <div>
              <label htmlFor="source" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Source Path <span className="text-gray-400 dark:text-gray-500">(Optional)</span>
              </label>
              <input
                id="source"
                type="text"
                value={sourcePath}
                onChange={(e) => setSourcePath(e.target.value)}
                placeholder="Leave empty to use current working copy or trunk"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                disabled={creating}
              />
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Specify a source path (e.g., "trunk" or a branch URL). If empty, uses current working copy.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={onClose}
                disabled={creating}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  `Create ${kindLabel}`
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  )
}

