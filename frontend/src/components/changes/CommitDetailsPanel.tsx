import { format } from 'date-fns'
import { parseISO } from 'date-fns'
import type { CommitLogEntry, ChangedPath } from '../../hooks/useCommitHistory'
import { PlusIcon, MinusIcon, DocumentTextIcon, FolderIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

type CommitDetailsPanelProps = {
  commit: CommitLogEntry | null
}

// Generate initials from author name
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

// Generate color from string (for consistent avatar colors)
function getColorFromString(str: string): string {
  const colors = [
    'bg-teal-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-orange-500',
    'bg-red-500',
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function CommitDetailsPanel({ commit }: CommitDetailsPanelProps) {
  if (!commit) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900">
        <div className="text-center">
          <DocumentTextIcon className="h-16 w-16 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Select a commit to view details</p>
          <p className="text-xs mt-1 opacity-75">Click on any commit in the timeline</p>
        </div>
      </div>
    )
  }

  const commitDate = parseISO(commit.date)
  const formattedDate = format(commitDate, 'PPpp') // Pretty format with time
  const initials = getInitials(commit.author)
  const avatarColor = getColorFromString(commit.author)

  // Group changed paths by action
  const added = commit.changed_paths.filter((p) => p.action === 'A')
  const modified = commit.changed_paths.filter((p) => p.action === 'M')
  const deleted = commit.changed_paths.filter((p) => p.action === 'D')
  const replaced = commit.changed_paths.filter((p) => p.action === 'R')

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'A':
        return <PlusIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
      case 'M':
        return <DocumentTextIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      case 'D':
        return <MinusIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
      case 'R':
        return <ArrowPathIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      default:
        return <DocumentTextIcon className="h-4 w-4 text-gray-400" />
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'A':
        return 'Added'
      case 'M':
        return 'Modified'
      case 'D':
        return 'Deleted'
      case 'R':
        return 'Replaced'
      default:
        return action
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'A':
        return 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'M':
        return 'text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      case 'D':
        return 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'R':
        return 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      default:
        return 'text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
    }
  }

  const renderFileList = (files: ChangedPath[], title: string, icon: React.ReactNode) => {
    if (files.length === 0) return null

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
            {title}
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            ({files.length})
          </span>
        </div>
        <div className="space-y-1 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
          {files.map((file, index) => {
            const isDirectory = file.path.endsWith('/')
            const pathParts = file.path.split('/')
            const fileName = pathParts[pathParts.length - 1] || file.path
            const directory = pathParts.slice(0, -1).join('/')

            return (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 rounded hover:bg-white dark:hover:bg-gray-700 transition-colors group"
              >
                {getActionIcon(file.action)}
                {isDirectory ? (
                  <FolderIcon className="h-4 w-4 text-teal-500 dark:text-teal-400 flex-shrink-0" />
                ) : (
                  <DocumentTextIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  {directory ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {directory}/
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white font-medium">
                        {fileName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-900 dark:text-white font-medium">
                      {file.path}
                    </span>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getActionColor(file.action)}`}>
                  {getActionLabel(file.action)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-gray-900">
      <div className="p-6">
        {/* Commit Header */}
        <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-start gap-4 mb-4">
            {/* Author Avatar */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-full ${avatarColor} flex items-center justify-center text-white text-sm font-bold shadow-md`}>
              {initials}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  Revision {commit.revision}
                </span>
                {commit.branch && commit.branch !== 'trunk' && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold">
                    {commit.branch}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                <span className="font-medium">{commit.author}</span>
                <span>•</span>
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>
          
          {/* Commit Message */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-sans">
              {commit.message || '(no commit message)'}
            </pre>
          </div>
        </div>

        {/* Changed Files Summary */}
        <div className="mb-6 p-4 bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
            File Changes Summary
          </h2>
          <div className="flex items-center gap-6 text-sm">
            {commit.stats.added > 0 && (
              <div className="flex items-center gap-2">
                <PlusIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="font-bold text-green-700 dark:text-green-300">{commit.stats.added}</span>
                <span className="text-gray-600 dark:text-gray-400">added</span>
              </div>
            )}
            {commit.stats.modified > 0 && (
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <span className="font-bold text-yellow-700 dark:text-yellow-300">{commit.stats.modified}</span>
                <span className="text-gray-600 dark:text-gray-400">modified</span>
              </div>
            )}
            {commit.stats.deleted > 0 && (
              <div className="flex items-center gap-2">
                <MinusIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                <span className="font-bold text-red-700 dark:text-red-300">{commit.stats.deleted}</span>
                <span className="text-gray-600 dark:text-gray-400">deleted</span>
              </div>
            )}
            {commit.stats.replaced > 0 && (
              <div className="flex items-center gap-2">
                <ArrowPathIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="font-bold text-blue-700 dark:text-blue-300">{commit.stats.replaced}</span>
                <span className="text-gray-600 dark:text-gray-400">replaced</span>
              </div>
            )}
          </div>
        </div>

        {/* File Lists */}
        <div>
          {renderFileList(added, 'Added Files', <PlusIcon className="h-4 w-4 text-green-600 dark:text-green-400" />)}
          {renderFileList(modified, 'Modified Files', <DocumentTextIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />)}
          {renderFileList(deleted, 'Deleted Files', <MinusIcon className="h-4 w-4 text-red-600 dark:text-red-400" />)}
          {renderFileList(replaced, 'Replaced Files', <ArrowPathIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />)}
        </div>
      </div>
    </div>
  )
}
