import { useMemo, useState } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { Tooltip } from 'react-tooltip'
import type { Repository } from '../../types'

type StatusBarProps = {
  selectedRepo: Repository | null
  totalRepos: number
  totalChanges: number
  onRefresh?: () => void
  lastRefreshTime?: Date | null
}

export function StatusBar({
  selectedRepo,
  totalRepos,
  totalChanges,
  onRefresh,
  lastRefreshTime,
}: StatusBarProps) {
  const currentYear = new Date().getFullYear()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const timeAgoText = useMemo(() => {
    if (!lastRefreshTime) return 'Never'
    const now = new Date()
    const diffMs = now.getTime() - lastRefreshTime.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'just now'
    if (diffMins === 1) return '1 min ago'
    return `${diffMins} mins ago`
  }, [lastRefreshTime])

  const handleRefreshClick = () => {
    if (onRefresh) {
      setIsRefreshing(true)
      onRefresh()
      // Reset animation after a short delay
      setTimeout(() => {
        setIsRefreshing(false)
      }, 1000)
    }
  }

  return (
    <footer
      className="h-6 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-[11px] font-normal text-gray-700 dark:text-gray-300 flex-shrink-0 select-none"
    >
      {/* Left Side - Copyright First, then Repository Info */}
      <div className="flex items-center gap-0 h-full">
        {/* Copyright - Leftmost */}
        <div className="px-2.5 h-full flex items-center">
          <span className="text-gray-500 dark:text-gray-400">© {currentYear} DELTA SVN</span>
        </div>
        <div className="h-full w-px bg-gray-200 dark:bg-gray-700" />

        {/* Repository Info */}
        {selectedRepo && (
          <>
            <div className="px-2.5 h-full flex items-center hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer transition-colors">
              <span className="font-normal">{selectedRepo.name}</span>
            </div>
            <div className="h-full w-px bg-gray-200 dark:bg-gray-700" />
            <div className="px-2.5 h-full flex items-center hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer transition-colors">
              <span>{selectedRepo.branch}</span>
            </div>
            <div className="h-full w-px bg-gray-200 dark:bg-gray-700" />
            <div className="px-2.5 h-full flex items-center hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer transition-colors">
              <span>r{selectedRepo.revision}</span>
            </div>
          </>
        )}
        {!selectedRepo && (
          <div className="px-2.5 h-full flex items-center">
            <span className="text-[#a0a0a0] dark:text-[#858585]">No repository selected</span>
          </div>
        )}
      </div>

      {/* Right Side - Stats and Refresh */}
      <div className="flex items-center gap-0 h-full">
        {/* Stats */}
        <div className="h-full w-px bg-gray-200 dark:bg-gray-700" />
        <div className="px-2.5 h-full flex items-center hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer transition-colors">
          <span>{totalRepos} {totalRepos === 1 ? 'repo' : 'repos'}</span>
        </div>
        <div className="h-full w-px bg-gray-200 dark:bg-gray-700" />
        <div className="px-2.5 h-full flex items-center hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer transition-colors">
          <span>{totalChanges} {totalChanges === 1 ? 'change' : 'changes'}</span>
        </div>

        {/* Refresh */}
        {onRefresh && (
          <>
            <div className="h-full w-px bg-gray-200 dark:bg-gray-700" />
            <div className="px-2.5 h-full flex items-center gap-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
              <button
                data-tooltip-id="status-refresh-tooltip"
                data-tooltip-content="Refresh"
                data-tooltip-place="top"
                onClick={handleRefreshClick}
                className="p-0.5 hover:bg-gray-300 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <ArrowPathIcon
                  className={`h-3 w-3 transition-transform duration-1000 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </button>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">{timeAgoText}</span>
              <Tooltip id="status-refresh-tooltip" />
            </div>
          </>
        )}
      </div>
    </footer>
  )
}

