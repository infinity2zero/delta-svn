import { useState } from 'react'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import type { CommitLogEntry } from '../../hooks/useCommitHistory'

type RevisionSelectModalProps = {
  isOpen: boolean
  commits: CommitLogEntry[]
  onClose: () => void
  onSelect: (rev1: string, rev2: string) => void
  title: string
}

export function RevisionSelectModal({
  isOpen,
  commits,
  onClose,
  onSelect,
  title,
}: RevisionSelectModalProps) {
  const [selectedRev1, setSelectedRev1] = useState<string>('')
  const [selectedRev2, setSelectedRev2] = useState<string>('')

  if (!isOpen) return null

  const handleConfirm = () => {
    if (selectedRev1 && selectedRev2) {
      onSelect(selectedRev1, selectedRev2)
      onClose()
      setSelectedRev1('')
      setSelectedRev2('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3.5 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/95 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="ml-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors flex-shrink-0"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="space-y-4">
            {/* Revision 1 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                From Revision:
              </label>
              <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                {commits.map((commit) => (
                  <button
                    key={commit.revision}
                    onClick={() => setSelectedRev1(commit.revision)}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors rounded-md ${
                      selectedRev1 === commit.revision
                        ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-900 dark:text-teal-100'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold">r{commit.revision}</span>
                      {selectedRev1 === commit.revision && (
                        <CheckIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {commit.message.split('\n')[0]}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Revision 2 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                To Revision:
              </label>
              <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                {commits.map((commit) => (
                  <button
                    key={commit.revision}
                    onClick={() => setSelectedRev2(commit.revision)}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors rounded-md ${
                      selectedRev2 === commit.revision
                        ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-900 dark:text-teal-100'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold">r{commit.revision}</span>
                      {selectedRev2 === commit.revision && (
                        <CheckIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {commit.message.split('\n')[0]}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-3.5 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50/95 dark:bg-slate-900/90 flex items-center justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedRev1 || !selectedRev2}
            className="px-3 py-1.5 text-xs font-medium bg-teal-600 text-white rounded-md hover:bg-teal-700 dark:hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Compare
          </button>
        </div>
      </div>
    </div>
  )
}

