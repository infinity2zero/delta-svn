import { useState, useMemo, useEffect } from 'react'
import type { FileChange } from '../../types'
import { FunnelIcon, ArrowPathIcon, ClockIcon } from '@heroicons/react/24/outline'
import { FileListPanel } from './FileListPanel'
import { DiffViewer } from '../diff/DiffViewer'
import { CommitPanel } from './CommitPanel'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useQueryClient } from '@tanstack/react-query'
import { Tooltip } from 'react-tooltip'
import { useUIStore } from '../../store/uiStore'

type ChangesViewProps = {
  changes: FileChange[]
  branchName?: string
  selectedChange?: FileChange | null
  onSelectChange?: (change: FileChange) => void
  workingCopyPath?: string
  repositoryUrl?: string
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void
  onStagedFilesChange?: (stagedFiles: Set<string>) => void
}

export function ChangesView({
  changes,
  branchName,
  selectedChange,
  onSelectChange,
  workingCopyPath,
  repositoryUrl,
  onShowToast,
  onStagedFilesChange,
}: ChangesViewProps) {
  const [stagedFiles, setStagedFiles] = useState<Set<string>>(new Set())
  
  // Notify parent when staged files change (optional callback)
  useEffect(() => {
    onStagedFilesChange?.(stagedFiles)
  }, [stagedFiles, onStagedFilesChange])
  const queryClient = useQueryClient()
  const setActiveTab = useUIStore((state) => state.setActiveTab)

  const toolbarIconButtonClass =
    'inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600 transition-colors px-2.5 py-1.5'

  // Group files by directory for directory-based selection
  const filesByDirectory = useMemo(() => {
    const map = new Map<string, string[]>()
    changes.forEach((file) => {
      const parts = file.name.split('/')
      if (parts.length > 1) {
        // It's in a subdirectory
        const dir = parts.slice(0, -1).join('/')
        if (!map.has(dir)) {
          map.set(dir, [])
        }
        map.get(dir)!.push(file.name)
      }
    })
    return map
  }, [changes])

  // Get all files under a directory path
  const getFilesInDirectory = (dirPath: string): string[] => {
    const files: string[] = []
    changes.forEach((file) => {
      if (file.name === dirPath || file.name.startsWith(dirPath + '/')) {
        files.push(file.name)
      }
    })
    return files
  }

  // Check if a path represents a directory (has children)
  const isDirectory = (path: string): boolean => {
    return filesByDirectory.has(path) || changes.some((f) => f.name.startsWith(path + '/'))
  }

  const handleToggleFile = (fileName: string) => {
    setStagedFiles((prev) => {
      const next = new Set(prev)
      
      // Check if this is a directory path
      if (isDirectory(fileName)) {
        // Toggle all files in this directory
        const dirFiles = getFilesInDirectory(fileName)
        const allSelected = dirFiles.every((f) => prev.has(f))
        
        if (allSelected) {
          // Deselect all files in directory
          dirFiles.forEach((f) => next.delete(f))
        } else {
          // Select all files in directory
          dirFiles.forEach((f) => next.add(f))
        }
      } else {
        // Regular file toggle
        if (next.has(fileName)) {
          next.delete(fileName)
        } else {
          next.add(fileName)
        }
      }
      
      return next
    })
  }

  const handleRefresh = () => {
    if (workingCopyPath) {
      queryClient.invalidateQueries({ queryKey: ['fileChanges', workingCopyPath] })
      queryClient.invalidateQueries({ queryKey: ['repositories'] })
      // Also refresh commit history - reset pages first for infinite query
      queryClient.resetQueries({ 
        queryKey: ['commitHistory', workingCopyPath],
        exact: false 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['commitHistory', workingCopyPath],
        exact: false 
      })
      queryClient.refetchQueries({ 
        queryKey: ['commitHistory', workingCopyPath],
        exact: false 
      })
    }
  }


  return (
    <div className="flex flex-1 h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/95 backdrop-blur-sm flex-shrink-0">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">
            Changes
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {changes.length} {changes.length === 1 ? 'changed file' : 'changed files'} in working copy
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            data-tooltip-id="open-history-tooltip"
            data-tooltip-content="Open full history view"
            data-tooltip-place="bottom"
            className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ClockIcon className="h-4 w-4" />
            <span>Open full history view</span>
          </button>
          <Tooltip id="open-history-tooltip" />
          <button
            onClick={handleRefresh}
            data-tooltip-id="refresh-tooltip"
            data-tooltip-content="Refresh changes & history"
            data-tooltip-place="bottom"
            className={toolbarIconButtonClass}
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
          <Tooltip id="refresh-tooltip" />
        </div>
      </div>

      {/* Content */}
      <PanelGroup direction="horizontal" className="flex flex-1 overflow-hidden">
        {/* Left Panel: File List + Commit */}
        <Panel defaultSize={40} minSize={25} maxSize={60} className="flex flex-col">
          <div className="h-full border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
            {/* Filter and Summary */}
            <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/95 backdrop-blur-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  data-tooltip-id="filter-tooltip"
                  data-tooltip-content="Filter files"
                  data-tooltip-place="bottom"
                  className={toolbarIconButtonClass}
                >
                  <FunnelIcon className="h-4 w-4" />
                </button>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {changes.length} changed {changes.length === 1 ? 'file' : 'files'}
                </span>
              </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto">
              <FileListPanel
                changes={changes}
                selectedChange={selectedChange}
                stagedFiles={stagedFiles}
                onSelectChange={onSelectChange}
                onToggleFile={handleToggleFile}
                getFilesInDirectory={getFilesInDirectory}
                isDirectory={isDirectory}
              />
            </div>

            {/* Commit Panel */}
            <CommitPanel
              stagedCount={stagedFiles.size}
              totalCount={changes.length}
              branchName={branchName}
              stagedFiles={Array.from(stagedFiles)}
              workingCopyPath={workingCopyPath}
              repositoryUrl={repositoryUrl}
              allChanges={changes}
              onCommitSuccess={() => {
                // Clear staged files after successful commit
                setStagedFiles(new Set())
              }}
              onShowToast={onShowToast}
            />
          </div>
        </Panel>

        {/* Resize Handle */}
        <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-800 hover:bg-teal-500 dark:hover:bg-teal-600 transition-colors cursor-col-resize" />

        {/* Right Panel: Diff Viewer */}
        <Panel defaultSize={60} minSize={40}>
          <DiffViewer
            fileName={selectedChange?.name}
            status={selectedChange?.status}
            workingCopyPath={workingCopyPath}
          />
        </Panel>
      </PanelGroup>
    </div>
  )
}

