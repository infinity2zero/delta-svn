import type { FileChange } from '../../types'

const statusColorMap: Record<FileChange['status'], string> = {
  NORMAL: 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-800',
  ADDED: 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30',
  MODIFIED: 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30',
  CONFLICTED: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30',
  DELETED: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30',
}

type FileListProps = {
  changes: FileChange[]
  branchName?: string
  selectedChange?: FileChange | null
  onSelectChange?: (change: FileChange) => void
}

export function FileList({ changes, branchName, selectedChange, onSelectChange }: FileListProps) {
  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">Changes</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {changes.length} files
            {branchName ? (
              <>
                {' '}
                · Branch <span className="font-semibold text-gray-800 dark:text-gray-100">{branchName}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            placeholder="Search files…"
            className="px-4 py-2 rounded-none border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button className="px-4 py-2 rounded-none border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            Select all
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {changes.map((file) => {
          const isSelected = selectedChange?.name === file.name
          return (
            <button
              key={file.name}
              onClick={() => onSelectChange?.(file)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-none border text-left transition-colors shadow-sm ${
                isSelected
                  ? 'border-teal-400 bg-teal-50/50 dark:bg-teal-900/20'
                  : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{file.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{file.revision}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 text-xs font-semibold rounded-none ${statusColorMap[file.status]}`}>
                  {file.status}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-300">{file.author}</span>
              </div>
            </button>
          )
        })}
        {changes.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">No changes detected.</div>
        )}
      </div>
    </div>
  )
}

