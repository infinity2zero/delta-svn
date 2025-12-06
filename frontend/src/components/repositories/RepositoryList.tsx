import type { Repository } from '../../types'
import { invoke } from '@tauri-apps/api/core'
import { useQueryClient } from '@tanstack/react-query'
import { useUIStore } from '../../store/uiStore'
import { 
  FolderIcon, 
  TrashIcon, 
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { Tooltip } from 'react-tooltip'

type RepositoryListProps = {
  repositories: Repository[]
  loading: boolean
  error: string | null
  selectedRepo?: Repository | null
  onSelect?: (repo: Repository) => void
  onView?: (repo: Repository) => void
}

export function RepositoryList({ repositories, loading, error, selectedRepo, onSelect, onView }: RepositoryListProps) {
  const setActiveTab = useUIStore((state) => state.setActiveTab)
  const queryClient = useQueryClient()

  const handleRadioSelect = (repo: Repository) => {
    onSelect?.(repo)
    setActiveTab('changes')
  }

  const handleCardClick = (repo: Repository) => {
    onView?.(repo)
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
        <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">Error loading repositories</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm animate-pulse"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              </div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20"></div>
            </div>
            <div className="flex gap-6 mt-4">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!repositories.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
          <FolderIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">No repositories found</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-md">
          You haven't checked out any SVN repositories yet. Use the Connections tab to browse and checkout repositories from a remote server.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {repositories.map((repo) => {
        const isSelected = selectedRepo?.path === repo.path
        return (
        <div
          key={repo.name}
          onClick={() => handleCardClick(repo)}
          className={`group p-3 bg-white dark:bg-gray-900 border rounded-lg shadow-sm cursor-pointer transition-all duration-150 active:scale-[0.998] ${
            isSelected
              ? 'border-teal-500 dark:border-teal-400 bg-teal-50/50 dark:bg-teal-900/10 shadow-md'
              : 'border-gray-200 dark:border-gray-800 hover:border-teal-500 dark:hover:border-teal-400 hover:shadow-md'
          }`}
        >
          {/* Header Section */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {/* Radio Button */}
              <div className="flex items-center pt-0.5">
                <input
                  type="radio"
                  name="repository-selection"
                  checked={isSelected}
                  onChange={() => handleRadioSelect(repo)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 text-teal-600 dark:text-teal-400 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:ring-offset-0 cursor-pointer"
                />
              </div>
              <div className="p-1.5 bg-teal-50 dark:bg-teal-900/20 rounded-md flex-shrink-0">
                <FolderIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {repo.name}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                  {repo.url}
                </p>
              </div>
            </div>
            
            {/* Status and Actions */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              {/* Status Badge */}
              <span
                className={`px-3 py-1.5 text-xs font-medium rounded-full flex items-center gap-1.5 ${
                  repo.status === 'synced'
                    ? 'text-green-700 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : repo.status === 'error'
                      ? 'text-red-700 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      : 'text-blue-700 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                }`}
              >
                {repo.status === 'synced' ? (
                  <CheckCircleIcon className="h-3.5 w-3.5" />
                ) : repo.status === 'error' ? (
                  <XCircleIcon className="h-3.5 w-3.5" />
                ) : (
                  <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                )}
                <span>{repo.status === 'synced' ? 'Synced' : repo.status === 'error' ? 'Error' : 'Updating'}</span>
              </span>
              
              {/* Remove Button */}
              <button
                data-tooltip-id={`remove-${repo.name}`}
                data-tooltip-content="Remove repository"
                data-tooltip-place="top"
                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                onClick={async (e) => {
                  e.stopPropagation()
                  const confirmed = window.confirm(
                    `Remove working copy "${repo.name}" from DELTA SVN? This will NOT delete files on disk.`,
                  )
                  if (!confirmed) return

                  try {
                    await invoke('unregister_working_copy', { path: repo.path })
                    await queryClient.invalidateQueries({ queryKey: ['repositories'] })
                  } catch (err) {
                    console.error('Failed to remove working copy:', err)
                    window.alert(
                      `Failed to remove working copy: ${
                        err instanceof Error ? err.message : String(err)
                      }`,
                    )
                  }
                }}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
              <Tooltip id={`remove-${repo.name}`} />
            </div>
          </div>

          {/* Metadata Section */}
          <div className="pt-2.5 border-t border-gray-200 dark:border-gray-800">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Revision
                </div>
                <div className="text-sm font-medium text-teal-700 dark:text-teal-300">
                  {repo.revision}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Branch
                </div>
                <div className="text-sm font-medium text-teal-700 dark:text-teal-300">
                  {repo.branch}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Changes
                </div>
                <div className="text-sm font-medium text-orange-600 dark:text-orange-400">
                  {repo.changes} {repo.changes === 1 ? 'change' : 'changes'}
                </div>
              </div>
            </div>
          </div>
        </div>
        )
      })}
    </div>
  )
}

