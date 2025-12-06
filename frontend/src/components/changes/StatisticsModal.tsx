import { XMarkIcon } from '@heroicons/react/24/outline'
import type { CommitLogEntry } from '../../hooks/useCommitHistory'
import { format, parseISO } from 'date-fns'

type StatisticsModalProps = {
  commit: CommitLogEntry
  isOpen: boolean
  onClose: () => void
}

export function StatisticsModal({ commit, isOpen, onClose }: StatisticsModalProps) {
  if (!isOpen) return null

  const stats = commit.stats || { added: 0, modified: 0, deleted: 0, replaced: 0 }
  const totalFiles = stats.added + stats.modified + stats.deleted + stats.replaced
  const date = parseISO(commit.date)
  const formattedDate = format(date, 'PPp') // Pretty print date with time

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3.5 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/95 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Commit Statistics - Revision {commit.revision}
          </h3>
          <button
            onClick={onClose}
            className="ml-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors flex-shrink-0"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="space-y-6">
            {/* Commit Info */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Commit Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Revision:</span>
                  <span className="font-mono font-medium text-gray-900 dark:text-white">r{commit.revision}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Author:</span>
                  <span className="text-gray-900 dark:text-white">{commit.author}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Date:</span>
                  <span className="text-gray-900 dark:text-white">{formattedDate}</span>
                </div>
                {commit.branch && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Branch:</span>
                    <span className="text-gray-900 dark:text-white">{commit.branch}</span>
                  </div>
                )}
              </div>
            </div>

            {/* File Statistics */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                File Changes
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.added}</div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">Files Added</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.modified}</div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Files Modified</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.deleted}</div>
                  <div className="text-xs text-red-600 dark:text-red-400 mt-1">Files Deleted</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.replaced || 0}</div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Files Replaced</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Files Changed:</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{totalFiles}</span>
                </div>
              </div>
            </div>

            {/* Changed Paths Summary */}
            {commit.changed_paths && commit.changed_paths.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Changed Paths ({commit.changed_paths.length})
                </h4>
                <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded">
                  <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {commit.changed_paths.slice(0, 50).map((path, index) => (
                      <div key={index} className="px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded font-medium ${
                              path.action === 'A'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : path.action === 'M'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                : path.action === 'D'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            }`}
                          >
                            {path.action}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300 font-mono truncate">{path.path}</span>
                        </div>
                      </div>
                    ))}
                    {commit.changed_paths.length > 50 && (
                      <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                        ... and {commit.changed_paths.length - 50} more files
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-3.5 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50/95 dark:bg-slate-900/90 flex items-center justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium bg-teal-600 text-white rounded-md hover:bg-teal-700 dark:hover:bg-teal-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

