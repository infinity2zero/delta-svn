import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { createPortal } from 'react-dom'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useCommitHistory, type CommitLogEntry } from '../../hooks/useCommitHistory'
import {
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MagnifyingGlassIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CodeBracketIcon,
  FolderArrowDownIcon,
  ClipboardDocumentIcon,
  LinkIcon,
  ArrowsRightLeftIcon,
  ChartBarIcon,
  ArrowUturnLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon,
  MinusIcon,
  FunnelIcon,
  XMarkIcon,
  CheckIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import { Tooltip } from 'react-tooltip'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { ContextMenu, type ContextMenuItem } from '../ui/ContextMenu'
import { invoke } from '@tauri-apps/api/core'
import { useQueryClient } from '@tanstack/react-query'
import { BlameViewer } from '../diff/BlameViewer'
import { CompareModal } from '../diff/CompareModal'
import { RevisionSelectModal } from './RevisionSelectModal'
import { StatisticsModal } from './StatisticsModal'
import { HistoryStatisticsModal } from './HistoryStatisticsModal'
import { DropdownSelect } from '../ui/DropdownSelect'

type HistoryViewProps = {
  workingCopyPath?: string
  selectedCommit?: CommitLogEntry | null
  onSelectCommit?: (commit: CommitLogEntry) => void
  selectedFilePath?: string | null
  onSelectFile?: (filePath: string | null) => void
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void
  isActive?: boolean // Whether this tab is currently active
}

// Generate color from string (for consistent branch colors)
function getBranchColor(branch: string): string {
  const colors = [
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  ]
  let hash = 0
  for (let i = 0; i < branch.length; i++) {
    hash = branch.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
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

export function HistoryView({ workingCopyPath, selectedCommit, onSelectCommit, selectedFilePath, onSelectFile, onShowToast, isActive = true }: HistoryViewProps) {
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: 'date',
      desc: true, // Latest first (newest dates at top)
    },
  ])
  const [globalFilter, setGlobalFilter] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [authorFilter, setAuthorFilter] = useState<string>('')
  const [pathFilter, setPathFilter] = useState<string>('')
  const [showOnlyAffectedPaths, setShowOnlyAffectedPaths] = useState<boolean>(false)
  const [stopOnCopy, setStopOnCopy] = useState<boolean>(false)
  const [includeMerged, setIncludeMerged] = useState<boolean>(false)
  const [selectedCommitIds, setSelectedCommitIds] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    commit?: CommitLogEntry
    file?: { path: string; action: string }
  } | null>(null)
  const [showBlame, setShowBlame] = useState<{ content: string; filePath: string; revision?: string } | null>(null)
  const [showCompare, setShowCompare] = useState<{ content: string; title: string } | null>(null)
  const [showRevisionSelect, setShowRevisionSelect] = useState<{ title: string; onSelect: (rev1: string, rev2: string) => void } | null>(null)
  const [showStatistics, setShowStatistics] = useState<boolean>(false)
  const [showHistoryStatistics, setShowHistoryStatistics] = useState<boolean>(false)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null) // Only one row expanded at a time
  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const [tempDateFrom, setTempDateFrom] = useState<string>('')
  const [tempDateTo, setTempDateTo] = useState<string>('')
  const [tempAuthorFilter, setTempAuthorFilter] = useState<string>('')
  const [tempPathFilter, setTempPathFilter] = useState<string>('')
  const [tempShowOnlyAffectedPaths, setTempShowOnlyAffectedPaths] = useState<boolean>(false)
  const [tempStopOnCopy, setTempStopOnCopy] = useState<boolean>(false)
  const [tempIncludeMerged, setTempIncludeMerged] = useState<boolean>(false)
  // Advanced search options
  const [useRegex, setUseRegex] = useState<boolean>(false)
  const [caseSensitive, setCaseSensitive] = useState<boolean>(false)
  const [showAdvancedSearch, setShowAdvancedSearch] = useState<boolean>(false)
  const filterPopoverRef = useRef<HTMLDivElement>(null)
  const filterButtonRef = useRef<HTMLButtonElement>(null)
  const advancedSearchPopoverRef = useRef<HTMLDivElement>(null)
  const advancedSearchButtonRef = useRef<HTMLButtonElement>(null)
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; right: number } | null>(null)
  const queryClient = useQueryClient()

  // Shared styles for compact toolbar icon buttons in History header
  const toolbarIconButtonClass =
    'inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-colors px-2.5 py-1.5'

  const toolbarIconButtonActiveClass =
    'inline-flex items-center justify-center rounded-md border border-teal-500 dark:border-teal-400 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 focus:outline-none transition-colors px-2.5 py-1.5'

  // Simple JIRA-style issue key pattern: ABC-123
  const ISSUE_KEY_REGEX = /\b[A-Z][A-Z0-9]+-\d+\b/g
  const ISSUE_TRACKER_BASE_URL =
    (import.meta as any).env?.VITE_ISSUE_TRACKER_BASE_URL || ''

  // Toggle row expansion - only one row can be expanded at a time
  const toggleRowExpansion = useCallback((rowId: string) => {
    setExpandedRowId((current) => (current === rowId ? null : rowId))
  }, [])
  
  // Get all commits for revision selection
  const { data: allCommitsData } = useCommitHistory({
    workingCopyPath,
    pageSize: 1000, // Get all commits for selection
  })
  const allCommits = allCommitsData?.pages.flatMap(page => page.commits) || []
  const allAuthors = useMemo(
    () => Array.from(new Set(allCommits.map(c => c.author))).sort((a, b) => a.localeCompare(b)),
    [allCommits]
  )
  
  // Debounce search to avoid too many requests
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(globalFilter)
    }, 300)
    return () => clearTimeout(timer)
  }, [globalFilter])

  // Calculate popover position
  const updatePopoverPosition = useCallback(() => {
    if (filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect()
      setPopoverPosition({
        top: rect.bottom + 8, // 8px = mt-2 equivalent
        right: window.innerWidth - rect.right, // Distance from right edge
      })
    }
  }, [])

  // Initialize temp filter values when popover opens and calculate position
  useEffect(() => {
    if (showFilterPopover) {
      setTempDateFrom(dateFrom)
      setTempDateTo(dateTo)
      setTempAuthorFilter(authorFilter)
      setTempPathFilter(pathFilter)
      setTempShowOnlyAffectedPaths(showOnlyAffectedPaths)
      setTempStopOnCopy(stopOnCopy)
      setTempIncludeMerged(includeMerged)

      // Calculate popover position based on button position
      updatePopoverPosition()
    } else {
      setPopoverPosition(null)
    }
  }, [showFilterPopover, dateFrom, dateTo, authorFilter, pathFilter, showOnlyAffectedPaths, stopOnCopy, includeMerged, updatePopoverPosition])

  // Update position on scroll/resize when popover is open
  useEffect(() => {
    if (showFilterPopover) {
      updatePopoverPosition()
      window.addEventListener('scroll', updatePopoverPosition, true) // Use capture to catch all scroll events
      window.addEventListener('resize', updatePopoverPosition)
      return () => {
        window.removeEventListener('scroll', updatePopoverPosition, true)
        window.removeEventListener('resize', updatePopoverPosition)
      }
    }
  }, [showFilterPopover, updatePopoverPosition])

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterPopoverRef.current &&
        !filterPopoverRef.current.contains(event.target as Node) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(event.target as Node)
      ) {
        setShowFilterPopover(false)
      }
      
      // Also handle advanced search popover
      if (
        advancedSearchPopoverRef.current &&
        !advancedSearchPopoverRef.current.contains(event.target as Node) &&
        advancedSearchButtonRef.current &&
        !advancedSearchButtonRef.current.contains(event.target as Node)
      ) {
        setShowAdvancedSearch(false)
      }
    }

    if (showFilterPopover || showAdvancedSearch) {
      // Use setTimeout to avoid immediate close on button click
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 0)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showFilterPopover, showAdvancedSearch])

  // Handle Apply button
  const handleApplyFilters = () => {
    setDateFrom(tempDateFrom)
    setDateTo(tempDateTo)
    setAuthorFilter(tempAuthorFilter)
    setPathFilter(tempPathFilter)
    setShowOnlyAffectedPaths(tempShowOnlyAffectedPaths)
    setStopOnCopy(tempStopOnCopy)
    setIncludeMerged(tempIncludeMerged)
    setShowFilterPopover(false)
  }

  // Handle Cancel button
  const handleCancelFilters = () => {
    setShowFilterPopover(false)
  }

  // Use infinite query with server-side filtering
  const {
    data,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useCommitHistory({
    workingCopyPath,
    search: debouncedSearch || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    author: authorFilter || undefined,
    pathFilter: showOnlyAffectedPaths && pathFilter ? pathFilter : undefined,
    stopOnCopy,
    includeMerged,
    useRegex,
    caseSensitive,
    pageSize: 100,
  })

  // Refetch when tab becomes active or when workingCopyPath changes
  useEffect(() => {
    if (isActive && workingCopyPath) {
      // Reset and refetch when tab becomes active
      queryClient.resetQueries({ 
        queryKey: ['commitHistory', workingCopyPath],
        exact: false 
      })
      refetch()
    }
  }, [isActive, workingCopyPath, queryClient, refetch])

  // Flatten all pages into a single array
  const commits = useMemo(() => {
    return data?.pages.flatMap((page) => page.commits) || []
  }, [data])

  // Get changed paths for selected commit (needed for handlers)
  const changedPaths = selectedCommit?.changed_paths || []
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set())

  const toggleFileSelection = useCallback((path: string) => {
    setSelectedFilePaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const clearFileSelection = useCallback(() => {
    setSelectedFilePaths(new Set())
  }, [])

  useEffect(() => {
    clearFileSelection()
  }, [selectedCommit?.revision, clearFileSelection])

  const handleToggleAllFiles = useCallback(() => {
    if (!selectedCommit || changedPaths.length === 0) return
    setSelectedFilePaths((prev) => {
      if (prev.size === changedPaths.length) {
        return new Set()
      }
      return new Set(changedPaths.map((p) => p.path))
    })
  }, [changedPaths, selectedCommit])

  const handleBulkExportFiles = useCallback(async () => {
    if (!workingCopyPath || !selectedCommit) {
      onShowToast?.('No commit selected', 'error')
      return
    }
    if (selectedFilePaths.size === 0) {
      onShowToast?.('No files selected for export', 'info')
      return
    }
    try {
      const exportRoot = await invoke<string | null>('open_folder_dialog', {
        title: 'Select export destination for selected files',
        defaultPath: undefined,
      })
      if (!exportRoot) return

      for (const path of selectedFilePaths) {
        const fileName = path.split('/').pop() || 'file'
        const savePath =
          exportRoot.endsWith('/') || exportRoot.endsWith('\\')
            ? `${exportRoot}${fileName}`
            : `${exportRoot}/${fileName}`
        await invoke<string>('save_file_from_revision', {
          workingCopyPath,
          filePath: path,
          revision: selectedCommit.revision,
          savePath,
        })
      }
      onShowToast?.(
        `Exported ${selectedFilePaths.size} selected file(s) from r${selectedCommit.revision}`,
        'success',
      )
      clearFileSelection()
    } catch (error) {
      console.error('Failed to export selected files:', error)
      onShowToast?.(`Failed to export selected files: ${error}`, 'error')
    }
  }, [workingCopyPath, selectedCommit, selectedFilePaths, onShowToast, clearFileSelection])

  // Handle refresh - defined after refetch is available
  const handleRefresh = useCallback(() => {
    if (workingCopyPath) {
      // Reset and refetch all commit history queries for this working copy
      // For infinite queries, we need to reset the pages
      queryClient.resetQueries({ 
        queryKey: ['commitHistory', workingCopyPath],
        exact: false 
      })
      // Then invalidate to mark as stale (this bypasses staleTime)
      queryClient.invalidateQueries({ 
        queryKey: ['commitHistory', workingCopyPath],
        exact: false 
      })
      // Force refetch - this will refetch all pages starting from page 0
      queryClient.refetchQueries({ 
        queryKey: ['commitHistory', workingCopyPath],
        exact: false,
        type: 'active' // Only refetch active queries
      })
      // Also manually trigger refetch on the current query
      refetch()
      onShowToast?.('Refreshing commit history...', 'info')
    }
  }, [workingCopyPath, queryClient, onShowToast, refetch])

  // Toolbar action handlers - MUST be before any early returns
  const handleCompare = useCallback(async () => {
    if (!workingCopyPath || !selectedCommit) {
      onShowToast?.('No commit selected', 'error')
      return
    }
    setShowRevisionSelect({
      title: 'Compare Revisions',
      onSelect: async (rev1, rev2) => {
        try {
          const diff = await invoke<string>('compare_revisions', {
            workingCopyPath,
            filePath: null,
            revision1: rev1,
            revision2: rev2,
          })
          setShowCompare({
            content: diff,
            title: `Compare Revisions r${rev1} → r${rev2}`,
          })
        } catch (error) {
          console.error('Failed to compare revisions:', error)
          onShowToast?.(`Failed to compare: ${error}`, 'error')
        }
      },
    })
  }, [workingCopyPath, selectedCommit, onShowToast])

  const handleRevert = useCallback(async () => {
    if (!workingCopyPath || !selectedCommit) {
      onShowToast?.('No commit selected', 'error')
      return
    }
    if (!confirm(`Are you sure you want to revert to revision ${selectedCommit.revision}? This will undo all changes after this revision.`)) {
      return
    }
    try {
      await invoke<string>('revert_to_revision', {
        workingCopyPath,
        revision: selectedCommit.revision,
      })
      onShowToast?.('Reverted to revision ' + selectedCommit.revision, 'success')
      queryClient.invalidateQueries({ queryKey: ['fileChanges', workingCopyPath] })
    } catch (error) {
      console.error('Failed to revert:', error)
      onShowToast?.(`Failed to revert: ${error}`, 'error')
    }
  }, [workingCopyPath, selectedCommit, onShowToast, queryClient])

  const handleExport = useCallback(async () => {
    if (!workingCopyPath || !selectedCommit) {
      onShowToast?.('No commit selected', 'error')
      return
    }
    try {
      const exportPath = await invoke<string | null>('open_folder_dialog', {
        title: 'Select export destination',
        defaultPath: undefined,
      })
      if (exportPath) {
        await invoke<string>('export_revision', {
          workingCopyPath,
          revision: selectedCommit.revision,
          exportPath,
        })
        onShowToast?.(`Exported revision ${selectedCommit.revision} to ${exportPath}`, 'success')
      }
    } catch (error) {
      console.error('Failed to export:', error)
      onShowToast?.(`Failed to export: ${error}`, 'error')
    }
  }, [workingCopyPath, selectedCommit, onShowToast])

  const handleMerge = useCallback(async () => {
    if (!workingCopyPath || !selectedCommit) {
      onShowToast?.('No commit selected', 'error')
      return
    }
    const mergeRange = confirm(
      `Merge from revision ${selectedCommit.revision}?\n\n` +
      `OK: Merge from r${selectedCommit.revision} to HEAD\n` +
      `Cancel: Select a range of revisions`
    )
    
    if (mergeRange) {
      try {
        await invoke<string>('merge_revisions', {
          workingCopyPath,
          sourceRevision: selectedCommit.revision,
          targetRevision: null,
          sourceUrl: null,
        })
        onShowToast?.(`Merged revision ${selectedCommit.revision} to HEAD into working copy`, 'success')
        queryClient.invalidateQueries({ queryKey: ['fileChanges', workingCopyPath] })
        queryClient.invalidateQueries({ queryKey: ['commitHistory', workingCopyPath] })
      } catch (error) {
        console.error('Failed to merge:', error)
        onShowToast?.(`Failed to merge: ${error}`, 'error')
      }
    } else {
      setShowRevisionSelect({
        title: `Merge Range (from Revision ${selectedCommit.revision})`,
        onSelect: async (rev1, rev2) => {
          try {
            await invoke<string>('merge_revisions', {
              workingCopyPath,
              sourceRevision: rev1,
              targetRevision: rev2 !== rev1 ? rev2 : null,
              sourceUrl: null,
            })
            onShowToast?.(`Merged revisions ${rev1}${rev2 !== rev1 ? ` to ${rev2}` : ''} into working copy`, 'success')
            queryClient.invalidateQueries({ queryKey: ['fileChanges', workingCopyPath] })
            queryClient.invalidateQueries({ queryKey: ['commitHistory', workingCopyPath] })
          } catch (error) {
            console.error('Failed to merge:', error)
            onShowToast?.(`Failed to merge: ${error}`, 'error')
          }
        },
      })
    }
  }, [workingCopyPath, selectedCommit, onShowToast, queryClient])

  const handleStatistics = useCallback(() => {
    if (!selectedCommit) {
      onShowToast?.('No commit selected', 'error')
      return
    }
    setShowStatistics(true)
  }, [selectedCommit, onShowToast])

  const handleIssueClick = useCallback(
    async (issueKey: string) => {
      if (!ISSUE_TRACKER_BASE_URL) {
        onShowToast?.('Issue tracker URL not configured', 'info')
        return
      }
      const base = ISSUE_TRACKER_BASE_URL.replace(/\/$/, '')
      const url = `${base}/${issueKey}`
      try {
        if (typeof window !== 'undefined') {
          window.open(url, '_blank', 'noopener,noreferrer')
        }
      } catch (error) {
        console.error('Failed to open issue link:', error)
        onShowToast?.(`Failed to open issue: ${error}`, 'error')
      }
    },
    [ISSUE_TRACKER_BASE_URL, onShowToast],
  )

  const renderMessageWithIssues = useCallback(
    (text: string): React.JSX.Element[] => {
      const parts: React.JSX.Element[] = []
      let lastIndex = 0
      let match: RegExpExecArray | null
      const regex = new RegExp(ISSUE_KEY_REGEX.source, 'g')

      while ((match = regex.exec(text)) !== null) {
        const start = match.index
        const end = start + match[0].length
        if (start > lastIndex) {
          parts.push(
            <span key={`text-${lastIndex}-${start}`}>{text.slice(lastIndex, start)}</span>,
          )
        }
        const issueKey = match[0]
        parts.push(
          <button
            key={`issue-${issueKey}-${start}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleIssueClick(issueKey)
            }}
            className="underline text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 cursor-pointer"
            title={`Open issue ${issueKey}`}
          >
            {issueKey}
          </button>,
        )
        lastIndex = end
      }

      if (lastIndex < text.length) {
        parts.push(<span key={`text-${lastIndex}-end`}>{text.slice(lastIndex)}</span>)
      }

      if (parts.length === 0) {
        return [<span key="full-text">{text}</span>]
      }
      return parts
    },
    [handleIssueClick],
  )

  // Bulk selection helpers
  const toggleCommitSelection = useCallback((revision: string) => {
    setSelectedCommitIds((prev) => {
      const next = new Set(prev)
      if (next.has(revision)) {
        next.delete(revision)
      } else {
        next.add(revision)
      }
      return next
    })
  }, [])

  const clearCommitSelection = useCallback(() => {
    setSelectedCommitIds(new Set())
  }, [])

  // Clear bulk selection when working copy changes
  useEffect(() => {
    clearCommitSelection()
  }, [workingCopyPath, clearCommitSelection])

  const handleToggleAllCommits = useCallback(() => {
    if (commits.length === 0) return
    setSelectedCommitIds((prev) => {
      if (prev.size === commits.length) {
        return new Set()
      }
      return new Set(commits.map((c) => c.revision))
    })
  }, [commits])

  const selectedCommits = useMemo(
    () => commits.filter((c) => selectedCommitIds.has(c.revision)),
    [commits, selectedCommitIds]
  )

  const handleBulkCompare = useCallback(async () => {
    if (!workingCopyPath) {
      onShowToast?.('No working copy selected', 'error')
      return
    }
    if (selectedCommits.length < 2) {
      onShowToast?.('Select at least two commits to compare', 'info')
      return
    }
    // Compare earliest and latest revision numerically
    const sorted = [...selectedCommits].sort(
      (a, b) => parseInt(a.revision, 10) - parseInt(b.revision, 10),
    )
    const rev1 = sorted[0].revision
    const rev2 = sorted[sorted.length - 1].revision
    try {
      const diff = await invoke<string>('compare_revisions', {
        workingCopyPath,
        filePath: null,
        revision1: rev1,
        revision2: rev2,
      })
      setShowCompare({
        content: diff,
        title: `Compare Selected Range r${rev1} → r${rev2}`,
      })
    } catch (error) {
      console.error('Failed to compare selected revisions:', error)
      onShowToast?.(`Failed to compare selected: ${error}`, 'error')
    }
  }, [workingCopyPath, selectedCommits, onShowToast])

  const handleBulkExportCommits = useCallback(async () => {
    if (!workingCopyPath) {
      onShowToast?.('No working copy selected', 'error')
      return
    }
    if (selectedCommits.length === 0) {
      onShowToast?.('No commits selected for export', 'info')
      return
    }
    try {
      const exportRoot = await invoke<string | null>('open_folder_dialog', {
        title: 'Select export destination for selected revisions',
        defaultPath: undefined,
      })
      if (!exportRoot) return

      for (const commit of selectedCommits) {
        const subDir =
          exportRoot.endsWith('/') || exportRoot.endsWith('\\')
            ? `${exportRoot}r${commit.revision}`
            : `${exportRoot}/r${commit.revision}`
        await invoke<string>('export_revision', {
          workingCopyPath,
          revision: commit.revision,
          exportPath: subDir,
        })
      }
      onShowToast?.(
        `Exported ${selectedCommits.length} selected revision(s) to chosen folder`,
        'success',
      )
    } catch (error) {
      console.error('Failed to export selected revisions:', error)
      onShowToast?.(`Failed to export selected: ${error}`, 'error')
    }
  }, [workingCopyPath, selectedCommits, onShowToast])

  const handleBulkRevert = useCallback(async () => {
    if (!workingCopyPath) {
      onShowToast?.('No working copy selected', 'error')
      return
    }
    if (selectedCommits.length === 0) {
      onShowToast?.('No commits selected to revert to', 'info')
      return
    }
    // Revert to the earliest selected revision
    const sorted = [...selectedCommits].sort(
      (a, b) => parseInt(a.revision, 10) - parseInt(b.revision, 10),
    )
    const target = sorted[0]
    const confirmMsg =
      `Revert working copy to the earliest selected revision r${target.revision}?\n\n` +
      `Selected revisions: ${sorted.map((c) => `r${c.revision}`).join(', ')}\n\n` +
      `This will undo all changes after r${target.revision}.`
    if (!confirm(confirmMsg)) return
    try {
      await invoke<string>('revert_to_revision', {
        workingCopyPath,
        revision: target.revision,
      })
      onShowToast?.(`Reverted to revision ${target.revision}`, 'success')
      queryClient.invalidateQueries({ queryKey: ['fileChanges', workingCopyPath] })
      clearCommitSelection()
    } catch (error) {
      console.error('Failed to revert to selected revision:', error)
      onShowToast?.(`Failed to revert: ${error}`, 'error')
    }
  }, [workingCopyPath, selectedCommits, onShowToast, queryClient, clearCommitSelection])

  // Global keyboard shortcuts (History tab only)
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const isMetaOrCtrl = event.metaKey || event.ctrlKey
      if (!isMetaOrCtrl) return

      const key = event.key.toLowerCase()
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      const isTypingElement =
        tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable

      // Cmd/Ctrl+F → focus history search (even when typing elsewhere)
      if (key === 'f') {
        event.preventDefault()
        if (searchInputRef.current) {
          searchInputRef.current.focus()
          searchInputRef.current.select()
        }
        return
      }

      // For all other shortcuts, ignore when typing in inputs/textareas
      if (isTypingElement) return

      // Cmd/Ctrl+R → refresh history
      if (key === 'r') {
        event.preventDefault()
        handleRefresh()
        return
      }

      // The following shortcuts require a selected commit
      if (!selectedCommit) return

      // Cmd/Ctrl+Shift+C → compare revisions
      if (key === 'c' && event.shiftKey) {
        event.preventDefault()
        handleCompare()
        return
      }

      // Cmd/Ctrl+Shift+Z → revert to this revision
      if (key === 'z' && event.shiftKey) {
        event.preventDefault()
        handleRevert()
        return
      }

      // Cmd/Ctrl+Shift+E → export this revision
      if (key === 'e' && event.shiftKey) {
        event.preventDefault()
        handleExport()
        return
      }

      // Cmd/Ctrl+Shift+M → merge from this revision
      if (key === 'm' && event.shiftKey) {
        event.preventDefault()
        handleMerge()
        return
      }

      // Cmd/Ctrl+Shift+S → show statistics for this revision
      if (key === 's' && event.shiftKey) {
        event.preventDefault()
        handleStatistics()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isActive, handleRefresh, selectedCommit, handleCompare, handleRevert, handleExport, handleMerge, handleStatistics])

  const columns = useMemo<ColumnDef<CommitLogEntry>[]>(
    () => [
      {
        id: 'select',
        header: () => {
          const allSelected = commits.length > 0 && selectedCommitIds.size === commits.length
          return (
            <input
              type="checkbox"
              checked={allSelected}
              onChange={handleToggleAllCommits}
              className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400"
              onClick={(e) => e.stopPropagation()}
            />
          )
        },
        cell: (info) => {
          const commit = info.row.original
          const checked = selectedCommitIds.has(commit.revision)
          return (
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                e.stopPropagation()
                toggleCommitSelection(commit.revision)
              }}
              className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400"
              onClick={(e) => e.stopPropagation()}
            />
          )
        },
        size: 32,
      },
      {
        id: 'expand',
        header: '',
        cell: (info) => {
          const rowId = info.row.id
          const isExpanded = expandedRowId === rowId
          return (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleRowExpansion(rowId)
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              data-tooltip-id="expand-tooltip"
              data-tooltip-content={isExpanded ? 'Collapse details' : 'Expand details'}
              data-tooltip-place="right"
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>
          )
        },
        size: 40,
      },
      {
        accessorKey: 'revision',
        header: 'Commit',
        cell: (info) => {
          const revision = info.getValue() as string
          return (
            <span className="text-sm font-mono text-gray-900 dark:text-white font-medium">
              {revision}
            </span>
          )
        },
        size: 80,
      },
      {
        accessorKey: 'author',
        header: 'Author',
        cell: (info) => {
          const author = info.getValue() as string
          return (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {author}
            </span>
          )
        },
        size: 120,
      },
      {
        id: 'description',
        header: 'Description',
        cell: (info) => {
          const commit = info.row.original
          const firstLine = commit.message.split('\n')[0] || '(no message)'
          const branchColor = commit.branch && commit.branch !== 'trunk' ? getBranchColor(commit.branch) : ''
          
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm text-gray-900 dark:text-white">
                {renderMessageWithIssues(firstLine)}
              </span>
              {commit.branch && commit.branch !== 'trunk' && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${branchColor}`}>
                  {commit.branch}
                </span>
              )}
              {commit.branch === 'trunk' && (
                <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  trunk
                </span>
              )}
            </div>
          )
        },
        size: 400,
      },
      {
        id: 'bugId',
        header: 'Bug ID',
        cell: (info) => {
          const commit = info.row.original
          const message = commit.message || ''
          const match = message.match(ISSUE_KEY_REGEX)
          const bugId = match?.[0]

          if (!bugId) {
            return (
              <span className="text-xs text-gray-400 dark:text-gray-600">
                —
              </span>
            )
          }

          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleIssueClick(bugId)
              }}
              className="text-xs font-medium text-teal-600 dark:text-teal-400 underline hover:text-teal-700 dark:hover:text-teal-300"
              title={`Open issue ${bugId}`}
            >
              {bugId}
            </button>
          )
        },
        size: 90,
      },
      {
        accessorKey: 'date',
        header: 'Date',
        cell: (info) => {
          const dateStr = info.getValue() as string
          const date = parseISO(dateStr)
          const formattedDate = format(date, 'MMM d, yyyy, h:mm')
          const timeAgo = formatDistanceToNow(date, { addSuffix: true })
          
          return (
            <div className="flex flex-col">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {formattedDate}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {timeAgo}
              </span>
            </div>
          )
        },
        size: 180,
      },
    ],
    [selectedCommit, expandedRowId, toggleRowExpansion, commits, selectedCommitIds, handleToggleAllCommits, toggleCommitSelection]
  )

  const table = useReactTable({
    data: commits,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  const { rows } = table.getRowModel()

  // Handle jump to revision from blame viewer
  const handleJumpToRevision = useCallback((revision: string) => {
    const commit = commits.find((c) => c.revision === revision)
    if (commit) {
      onSelectCommit?.(commit)
      onShowToast?.(`Jumped to revision ${revision}`, 'info')
    } else {
      onShowToast?.(`Revision ${revision} not found in current history`, 'error')
    }
  }, [commits, onSelectCommit, onShowToast])

  if (isLoading && commits.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent mb-2"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading commit history...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-600 dark:text-red-400">
          <p className="text-sm">Failed to load commit history</p>
          <p className="text-xs mt-1">{error instanceof Error ? error.message : String(error)}</p>
        </div>
      </div>
    )
  }

  if (commits.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <ClockIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No commit history found</p>
        </div>
      </div>
    )
  }


  // Helper functions for action display
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
        return 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20'
      case 'M':
        return 'text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20'
      case 'D':
        return 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20'
      case 'R':
        return 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20'
      default:
        return 'text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  return (
    <PanelGroup direction="horizontal" className="h-full">
      {/* Left Panel: History Table (60%) */}
      <Panel defaultSize={60} minSize={40} maxSize={80}>
        <div className="h-full flex flex-col bg-white dark:bg-gray-900">
          {/* Filters / History Toolbar */}
          <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/95 backdrop-blur-sm relative z-50">
            <div className="flex items-center gap-3">
              {/* Number of records - Left */}
              <div className="text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                {commits.length} {hasNextPage ? '+' : ''} records
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Search Bar - Right */}
              <div className="relative flex items-center gap-2">
                <div className="relative w-64">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search messages, paths, authors, revisions..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400"
                  />
                </div>
                
                {/* Advanced Search Toggle */}
                <div className="relative">
                  <button
                    ref={advancedSearchButtonRef}
                    onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                    data-tooltip-id="advanced-search-tooltip"
                    data-tooltip-content="Advanced search options"
                    data-tooltip-place="bottom"
                    className={
                      showAdvancedSearch || useRegex || caseSensitive
                        ? toolbarIconButtonActiveClass
                        : toolbarIconButtonClass
                    }
                  >
                    <Cog6ToothIcon className="h-4 w-4" />
                  </button>
                  <Tooltip id="advanced-search-tooltip" />
                  
                  {/* Advanced Search Options - Inline */}
                  {showAdvancedSearch && (
                    <div
                      ref={advancedSearchPopoverRef}
                      className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 z-50 min-w-[200px]"
                    >
                      <div className="space-y-2">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={useRegex}
                            onChange={(e) => setUseRegex(e.target.checked)}
                            className="h-3.5 w-3.5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Use regex</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={caseSensitive}
                            onChange={(e) => setCaseSensitive(e.target.checked)}
                            className="h-3.5 w-3.5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Case sensitive</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Filter Icon */}
              <div className="relative">
                <button
                  ref={filterButtonRef}
                  onClick={() => setShowFilterPopover(!showFilterPopover)}
                  data-tooltip-id="filter-tooltip"
                  data-tooltip-content="Filter options"
                  data-tooltip-place="bottom"
                  className={
                    showFilterPopover ||
                    dateFrom ||
                    dateTo ||
                    authorFilter ||
                    pathFilter ||
                    showOnlyAffectedPaths ||
                    stopOnCopy ||
                    includeMerged
                      ? toolbarIconButtonActiveClass
                      : toolbarIconButtonClass
                  }
                >
                  <FunnelIcon className="h-4 w-4" />
                </button>
                <Tooltip id="filter-tooltip" />
              </div>

              {/* Filter Popover - Rendered via Portal */}
              {showFilterPopover && popoverPosition && createPortal(
                <div
                  ref={filterPopoverRef}
                  className="fixed w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[9999]"
                  style={{
                    top: `${popoverPosition.top}px`,
                    right: `${popoverPosition.right}px`,
                  }}
                >
                    <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
                      {/* Date Range Filters */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Date Range</h4>
                        <DatePicker
                          selectsRange
                          startDate={tempDateFrom ? parseISO(tempDateFrom) : null}
                          endDate={tempDateTo ? parseISO(tempDateTo) : null}
                          onChange={(dates) => {
                            const [start, end] = (dates || []) as [Date | null, Date | null]
                            setTempDateFrom(start ? format(start, 'yyyy-MM-dd') : '')
                            setTempDateTo(end ? format(end, 'yyyy-MM-dd') : '')
                          }}
                          dateFormat="yyyy-MM-dd"
                          placeholderText="Select date range"
                          className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-teal-500 dark:focus:border-teal-400"
                        />
                      </div>

                      {/* Author Filter */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Author</h4>
                        <DropdownSelect
                          value={tempAuthorFilter}
                          onChange={setTempAuthorFilter}
                          options={[
                            { value: '', label: 'All authors' },
                            ...allAuthors.map((author) => ({ value: author, label: author })),
                          ]}
                          placeholder="All authors"
                          size="sm"
                        />
                      </div>

                      {/* Path Filter */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Path</h4>
                        <input
                          type="text"
                          value={tempPathFilter}
                          onChange={(e) => setTempPathFilter(e.target.value)}
                          placeholder="/trunk/src..."
                          className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400"
                        />
                      </div>

                      {/* Advanced Toggles */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Options</h4>
                        <div className="space-y-2">
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tempShowOnlyAffectedPaths}
                              onChange={(e) => setTempShowOnlyAffectedPaths(e.target.checked)}
                              className="h-3.5 w-3.5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Show only affected paths</span>
                          </label>
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tempStopOnCopy}
                              onChange={(e) => setTempStopOnCopy(e.target.checked)}
                              className="h-3.5 w-3.5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Stop on copy/rename</span>
                          </label>
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tempIncludeMerged}
                              onChange={(e) => setTempIncludeMerged(e.target.checked)}
                              className="h-3.5 w-3.5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Include merged revisions</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Apply and Cancel Buttons */}
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
                      <button
                        onClick={handleCancelFilters}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <XMarkIcon className="h-3.5 w-3.5" />
                        <span>Cancel</span>
                      </button>
                      <button
                        onClick={handleApplyFilters}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-white bg-teal-600 dark:bg-teal-500 rounded-md hover:bg-teal-700 dark:hover:bg-teal-600 transition-colors"
                      >
                        <CheckIcon className="h-3.5 w-3.5" />
                        <span>Apply</span>
                      </button>
                    </div>
                  </div>,
                document.body
              )}

              {/* Refresh Button */}
              <button
                data-tooltip-id="history-refresh-tooltip"
                data-tooltip-content="Refresh history"
                data-tooltip-place="bottom"
                onClick={handleRefresh}
                className={toolbarIconButtonClass}
              >
                <ArrowPathIcon className="h-4 w-4" />
              </button>
              <Tooltip id="history-refresh-tooltip" />

              {/* History Statistics Button */}
              <button
                data-tooltip-id="history-stats-tooltip"
                data-tooltip-content="History statistics"
                data-tooltip-place="bottom"
                onClick={() => setShowHistoryStatistics(true)}
                className={toolbarIconButtonClass}
              >
                <ChartBarIcon className="h-4 w-4" />
              </button>
              <Tooltip id="history-stats-tooltip" />
            </div>
          </div>

          {/* Bulk commit actions */}
          {selectedCommits.length > 1 && (
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mr-2">
                Bulk actions for {selectedCommits.length} commits:
              </span>
              <button
                onClick={handleBulkCompare}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <CodeBracketIcon className="h-4 w-4" />
                <span>Compare range</span>
              </button>
              <button
                onClick={handleBulkExportCommits}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <FolderArrowDownIcon className="h-4 w-4" />
                <span>Export selected</span>
              </button>
              <button
                onClick={handleBulkRevert}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-300 dark:border-red-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <ArrowUturnLeftIcon className="h-4 w-4" />
                <span>Revert to earliest</span>
              </button>
            </div>
          )}

          {/* Revision Actions Toolbar - shown when commit is selected */}
          {selectedCommit && (
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mr-2">
                Revision {selectedCommit.revision}:
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCompare}
                  data-tooltip-id="toolbar-compare-tooltip"
                  data-tooltip-content="Compare revisions"
                  data-tooltip-place="bottom"
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <CodeBracketIcon className="h-4 w-4" />
                  <span>Compare</span>
                </button>
                <Tooltip id="toolbar-compare-tooltip" />
                
                <button
                  onClick={handleRevert}
                  data-tooltip-id="toolbar-revert-tooltip"
                  data-tooltip-content="Revert to this revision"
                  data-tooltip-place="bottom"
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <ArrowUturnLeftIcon className="h-4 w-4" />
                  <span>Revert</span>
                </button>
                <Tooltip id="toolbar-revert-tooltip" />
                
                <button
                  onClick={handleExport}
                  data-tooltip-id="toolbar-export-tooltip"
                  data-tooltip-content="Export this revision"
                  data-tooltip-place="bottom"
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <FolderArrowDownIcon className="h-4 w-4" />
                  <span>Export</span>
                </button>
                <Tooltip id="toolbar-export-tooltip" />
                
                <button
                  onClick={handleMerge}
                  data-tooltip-id="toolbar-merge-tooltip"
                  data-tooltip-content="Merge from this revision"
                  data-tooltip-place="bottom"
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <ArrowsRightLeftIcon className="h-4 w-4" />
                  <span>Merge</span>
                </button>
                <Tooltip id="toolbar-merge-tooltip" />
                
                <button
                  onClick={handleStatistics}
                  data-tooltip-id="toolbar-statistics-tooltip"
                  data-tooltip-content="Show commit statistics"
                  data-tooltip-place="bottom"
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <ChartBarIcon className="h-4 w-4" />
                  <span>Statistics</span>
                </button>
                <Tooltip id="toolbar-statistics-tooltip" />
              </div>
            </div>
          )}
          
          {/* History Table */}
          <div className="flex-1 overflow-auto relative z-0">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={`px-2 py-1.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide ${
                          header.column.getCanSort() ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800' : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-2">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="text-gray-400">
                              {{
                                asc: <ArrowUpIcon className="h-3 w-3" />,
                                desc: <ArrowDownIcon className="h-3 w-3" />,
                              }[header.column.getIsSorted() as string] ?? (
                                <span className="opacity-0">
                                  <ArrowUpIcon className="h-3 w-3" />
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {rows.map((row) => {
                  const commit = row.original
                  const isSelected = selectedCommit?.revision === commit.revision
                  const isExpanded = expandedRowId === row.id

                  return (
                    <>
                      <tr
                        key={row.id}
                        className={`cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800 ${
                          isSelected
                            ? 'bg-teal-50 dark:bg-teal-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 bg-white dark:bg-gray-900'
                        }`}
                        onClick={() => onSelectCommit?.(commit)}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            commit,
                          })
                        }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-2 py-1.5 align-top">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                      {isExpanded && (
                        <tr className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/50">
                          <td colSpan={row.getVisibleCells().length} className="px-4 py-4">
                            <div className="flex items-start gap-4">
                              {/* Author Avatar - Small */}
                              <div
                                className={`flex-shrink-0 w-8 h-8 rounded-full ${getColorFromString(
                                  commit.author,
                                )} flex items-center justify-center text-white text-xs font-bold`}
                              >
                                {getInitials(commit.author)}
                              </div>

                              {/* Main Content */}
                              <div className="flex-1 min-w-0 space-y-3">
                                {/* Commit metadata */}
                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-600 dark:text-gray-400">
                                  <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 font-medium text-gray-800 dark:text-gray-100">
                                    r{commit.revision}
                                  </span>
                                  <span>{commit.author}</span>
                                  {commit.date && (
                                    <>
                                      <span className="text-gray-400 dark:text-gray-500">•</span>
                                      <span title={format(parseISO(commit.date), 'PPpp')}>
                                        {formatDistanceToNow(parseISO(commit.date), { addSuffix: true })}
                                      </span>
                                    </>
                                  )}
                                </div>

                                {/* Two-column layout: message left, stats right */}
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                  {/* Summary + Description from commit message */}
                                  {(() => {
                                    const rawMessage = commit.message || '(no commit message)'
                                    const lines = rawMessage.split('\n')
                                    const summaryLine = lines[0] || ''
                                    const descriptionText = lines.slice(1).join('\n').trim()
                                    const descriptionLines = descriptionText ? descriptionText.split('\n') : []

                                    return (
                                      <div className="flex-1 min-w-0 space-y-1.5">
                                        {/* Summary (first line) */}
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                          {renderMessageWithIssues(summaryLine || '(no commit message)')}
                                        </div>

                                        {/* Description (remaining lines, if any) */}
                                        {descriptionLines.length > 0 && (
                                          <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                                            {descriptionLines.map((line, idx) => (
                                              <span key={idx}>
                                                {renderMessageWithIssues(line)}
                                                {idx < descriptionLines.length - 1 && <br />}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })()}

                                  {/* File Stats + Branch + Key paths */}
                                  <div className="w-full md:w-auto md:min-w-[220px] flex flex-col items-start md:items-end gap-2 text-xs text-gray-600 dark:text-gray-400">
                                    <div className="flex flex-wrap items-center justify-start md:justify-end gap-3">
                                      {commit.stats.added > 0 && (
                                        <div className="flex items-center gap-1">
                                          <PlusIcon className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                          <span className="font-medium text-green-700 dark:text-green-300">
                                            {commit.stats.added}
                                          </span>
                                          <span>added</span>
                                        </div>
                                      )}
                                      {commit.stats.modified > 0 && (
                                        <div className="flex items-center gap-1">
                                          <DocumentTextIcon className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
                                          <span className="font-medium text-yellow-700 dark:text-yellow-300">
                                            {commit.stats.modified}
                                          </span>
                                          <span>modified</span>
                                        </div>
                                      )}
                                      {commit.stats.deleted > 0 && (
                                        <div className="flex items-center gap-1">
                                          <MinusIcon className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                          <span className="font-medium text-red-700 dark:text-red-300">
                                            {commit.stats.deleted}
                                          </span>
                                          <span>deleted</span>
                                        </div>
                                      )}
                                      {commit.stats.replaced > 0 && (
                                        <div className="flex items-center gap-1">
                                          <ArrowPathIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                          <span className="font-medium text-blue-700 dark:text-blue-300">
                                            {commit.stats.replaced}
                                          </span>
                                          <span>replaced</span>
                                        </div>
                                      )}

                                      {commit.branch && commit.branch !== 'trunk' && (
                                        <div className="flex items-center gap-1">
                                          <span
                                            className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getBranchColor(
                                              commit.branch,
                                            )}`}
                                          >
                                            {commit.branch}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {commit.changed_paths && commit.changed_paths.length > 0 && (
                                      <div className="flex flex-wrap items-center justify-start md:justify-end gap-1">
                                        <span className="text-[11px] text-gray-500 dark:text-gray-400">Affects:</span>
                                        {Array.from(
                                          new Set(
                                            commit.changed_paths
                                              .map((p: any) => (p.path || '').split('/')[0])
                                              .filter(Boolean),
                                          ),
                                        )
                                          .slice(0, 3)
                                          .map((folder: string) => (
                                            <span
                                              key={folder}
                                              className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                                            >
                                              {folder}
                                            </span>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
            {isFetchingNextPage && (
              <div className="px-4 py-2 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky bottom-0 z-10">
                <div className="flex items-center justify-center gap-2">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-teal-600 border-t-transparent"></div>
                  <span>Loading more...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Panel>

      {/* Resize Handle */}
      <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-800 hover:bg-teal-500 dark:hover:bg-teal-600 transition-colors cursor-col-resize" />

      {/* Right Panel: Changed Files Table (40%) */}
      <Panel defaultSize={40} minSize={20}>
        <div className="h-full flex flex-col bg-white dark:bg-gray-900">
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Changes {selectedCommit && `(Revision ${selectedCommit.revision})`}
            </h3>
          </div>

          <div className="flex-1 overflow-auto">
            {!selectedCommit ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <ClockIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select a commit to view changed files</p>
                </div>
              </div>
            ) : changedPaths.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <p className="text-sm">No files changed in this revision</p>
                </div>
              </div>
            ) : (
              <>
                {selectedFilePaths.size > 1 && (
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mr-2">
                      Bulk actions for {selectedFilePaths.size} files:
                    </span>
                    <button
                      onClick={handleBulkExportFiles}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                    >
                      <FolderArrowDownIcon className="h-4 w-4" />
                      <span>Export selected files</span>
                    </button>
                  </div>
                )}
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 w-8 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        <input
                          type="checkbox"
                          checked={
                            changedPaths.length > 0 &&
                            selectedFilePaths.size === changedPaths.length
                          }
                          onChange={handleToggleAllFiles}
                          className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
                        />
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Path
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Action
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Copy from path
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Revision
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {changedPaths.map((changedPath, index) => {
                      const isSelectedRow = selectedFilePath === changedPath.path
                      const isFile = !changedPath.path.endsWith('/')
                      const bulkSelected = selectedFilePaths.has(changedPath.path)

                      return (
                        <tr
                          key={index}
                          onClick={() => {
                            if (isFile) {
                              onSelectFile?.(changedPath.path)
                            }
                          }}
                          onContextMenu={(e) => {
                            if (isFile) {
                              e.preventDefault()
                              e.stopPropagation()
                              setContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                file: {
                                  path: changedPath.path,
                                  action: changedPath.action,
                                },
                              })
                            }
                          }}
                          className={`transition-colors ${
                            isFile
                              ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50'
                              : 'opacity-60 cursor-not-allowed'
                          } ${
                            isSelectedRow
                              ? 'bg-teal-50 dark:bg-teal-900/20'
                              : ''
                          }`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={bulkSelected}
                              onChange={(e) => {
                                e.stopPropagation()
                                if (isFile) {
                                  toggleFileSelection(changedPath.path)
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400"
                              disabled={!isFile}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-sm text-gray-900 dark:text-white font-mono">
                              {changedPath.path}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-medium ${getActionColor(
                                changedPath.action,
                              )}`}
                            >
                              {getActionLabel(changedPath.action)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                              {changedPath.copyfrom_path || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                              {selectedCommit.revision}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </Panel>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.commit, contextMenu.file)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Blame Modal */}
      {showBlame && (
        <BlameViewer
          blameContent={showBlame.content}
          filePath={showBlame.filePath}
          revision={showBlame.revision}
          onClose={() => setShowBlame(null)}
          onJumpToRevision={handleJumpToRevision}
        />
      )}

      {/* Compare Modal */}
      {showCompare && (
        <CompareModal
          diffContent={showCompare.content}
          title={showCompare.title}
          onClose={() => setShowCompare(null)}
        />
      )}

      {/* Revision Select Modal */}
      {showRevisionSelect && (
        <RevisionSelectModal
          isOpen={true}
          commits={allCommits}
          onClose={() => setShowRevisionSelect(null)}
          onSelect={showRevisionSelect.onSelect}
          title={showRevisionSelect.title}
        />
      )}

      {/* Statistics Modal */}
      {showStatistics && selectedCommit && (
        <StatisticsModal
          commit={selectedCommit}
          isOpen={showStatistics}
          onClose={() => setShowStatistics(false)}
        />
      )}

      {/* History Statistics Modal (uses all loaded commits) */}
      {showHistoryStatistics && (
        <HistoryStatisticsModal
          commits={commits}
          isOpen={showHistoryStatistics}
          onClose={() => setShowHistoryStatistics(false)}
        />
      )}

      {/* Tooltip for expand button */}
      <Tooltip id="expand-tooltip" />
    </PanelGroup>
  )

  // Helper function to generate context menu items
  function getContextMenuItems(
    commit?: CommitLogEntry,
    file?: { path: string; action: string }
  ): ContextMenuItem[] {
    if (file) {
      // File context menu
      return [
        {
          label: 'Show Diff',
          icon: CodeBracketIcon,
          onClick: () => {
            if (file) {
              onSelectFile?.(file.path)
            }
          },
        },
        {
          label: 'Copy Path',
          icon: ClipboardDocumentIcon,
          onClick: async () => {
            if (file) {
              try {
                await navigator.clipboard.writeText(file.path)
                onShowToast?.('Path copied to clipboard', 'success')
              } catch (error) {
                console.error('Failed to copy path:', error)
                onShowToast?.('Failed to copy path', 'error')
              }
            }
          },
        },
        {
          separator: true,
          label: '',
          onClick: () => {},
        },
        {
          label: 'Compare with Working Copy',
          icon: ArrowPathIcon,
          onClick: async () => {
            if (!workingCopyPath || !file) return
            try {
              await invoke<string>('get_file_diff', {
                workingCopyPath,
                filePath: file.path,
              })
              // Show diff in right panel - this will be handled by the diff viewer
              onSelectFile?.(file.path)
              onShowToast?.('Showing diff with working copy', 'info')
            } catch (error) {
              console.error('Failed to compare:', error)
              onShowToast?.(`Failed to compare: ${error}`, 'error')
            }
          },
        },
        {
          label: 'Blame',
          icon: DocumentTextIcon,
          onClick: async () => {
            if (!workingCopyPath || !file || !selectedCommit) return
            try {
              const blame = await invoke<string>('get_file_blame', {
                workingCopyPath,
                filePath: file.path,
                revision: selectedCommit.revision,
              })
              setShowBlame({
                content: blame,
                filePath: file.path,
                revision: selectedCommit.revision,
              })
            } catch (error) {
              console.error('Failed to get blame:', error)
              onShowToast?.(`Failed to get blame: ${error}`, 'error')
            }
          },
        },
        {
          label: 'Save As...',
          icon: FolderArrowDownIcon,
          onClick: async () => {
            if (!workingCopyPath || !file || !selectedCommit) return
            try {
              const savePath = await invoke<string | null>('save_file_dialog', {
                defaultFilename: file.path.split('/').pop() || 'file',
              })
              if (savePath) {
                await invoke<string>('save_file_from_revision', {
                  workingCopyPath,
                  filePath: file.path,
                  revision: selectedCommit.revision,
                  savePath,
                })
                onShowToast?.(`File saved to ${savePath}`, 'success')
              }
            } catch (error) {
              console.error('Failed to save file:', error)
              onShowToast?.(`Failed to save file: ${error}`, 'error')
            }
          },
        },
      ]
    }

    if (commit) {
      // Commit context menu
      return [
        {
          label: 'Copy Revision Number',
          icon: DocumentDuplicateIcon,
          onClick: async () => {
            try {
              await navigator.clipboard.writeText(commit.revision)
              onShowToast?.('Revision number copied to clipboard', 'success')
            } catch (error) {
              console.error('Failed to copy revision:', error)
              onShowToast?.('Failed to copy revision', 'error')
            }
          },
        },
        {
          label: 'Copy Commit Message',
          icon: ClipboardDocumentIcon,
          onClick: async () => {
            try {
              await navigator.clipboard.writeText(commit.message)
              onShowToast?.('Commit message copied to clipboard', 'success')
            } catch (error) {
              console.error('Failed to copy message:', error)
              onShowToast?.('Failed to copy message', 'error')
            }
          },
        },
        {
          label: 'Copy URL',
          icon: LinkIcon,
          onClick: async () => {
            if (!workingCopyPath) {
              onShowToast?.('No working copy selected', 'error')
              return
            }
            try {
              const url = await invoke<string>('get_repository_url_for_revision', {
                workingCopyPath,
                revision: commit.revision,
              })
              await navigator.clipboard.writeText(url)
              onShowToast?.('URL copied to clipboard', 'success')
            } catch (error) {
              console.error('Failed to copy URL:', error)
              onShowToast?.(`Failed to copy URL: ${error}`, 'error')
            }
          },
        },
        {
          separator: true,
          label: '',
          onClick: () => {},
        },
        {
          label: 'Compare Revisions',
          icon: CodeBracketIcon,
          onClick: async () => {
            if (!workingCopyPath) {
              onShowToast?.('No working copy selected', 'error')
              return
            }
            // Show revision selection modal
            setShowRevisionSelect({
              title: 'Compare Revisions',
              onSelect: async (rev1, rev2) => {
                try {
                  const diff = await invoke<string>('compare_revisions', {
                    workingCopyPath,
                    filePath: null,
                    revision1: rev1,
                    revision2: rev2,
                  })
                  setShowCompare({
                    content: diff,
                    title: `Compare Revisions r${rev1} → r${rev2}`,
                  })
                } catch (error) {
                  console.error('Failed to compare revisions:', error)
                  onShowToast?.(`Failed to compare: ${error}`, 'error')
                }
              },
            })
          },
        },
        {
          label: 'Compare with Working Copy',
          icon: ArrowPathIcon,
          onClick: async () => {
            if (!workingCopyPath) {
              onShowToast?.('No working copy selected', 'error')
              return
            }
            try {
              const diff = await invoke<string>('compare_revisions', {
                workingCopyPath,
                filePath: null,
                revision1: commit.revision,
                revision2: 'HEAD',
              })
              setShowCompare({
                content: diff,
                title: `Compare Revision r${commit.revision} with Working Copy`,
              })
            } catch (error) {
              console.error('Failed to compare:', error)
              onShowToast?.(`Failed to compare: ${error}`, 'error')
            }
          },
        },
        {
          separator: true,
          label: '',
          onClick: () => {},
        },
        {
          label: 'Revert to this Revision',
          icon: ArrowPathIcon,
          onClick: async () => {
            if (!workingCopyPath) {
              onShowToast?.('No working copy selected', 'error')
              return
            }
            if (!confirm(`Are you sure you want to revert to revision ${commit.revision}? This will undo all changes after this revision.`)) {
              return
            }
            try {
              await invoke<string>('revert_to_revision', {
                workingCopyPath,
                revision: commit.revision,
              })
              onShowToast?.('Reverted to revision ' + commit.revision, 'success')
              // Refresh file changes
              queryClient.invalidateQueries({ queryKey: ['fileChanges', workingCopyPath] })
            } catch (error) {
              console.error('Failed to revert:', error)
              onShowToast?.(`Failed to revert: ${error}`, 'error')
            }
          },
        },
        {
          label: 'Merge from this Revision',
          icon: ArrowsRightLeftIcon,
          onClick: async () => {
            if (!workingCopyPath) {
              onShowToast?.('No working copy selected', 'error')
              return
            }
            // For merge, we can merge from this revision to HEAD, or select a range
            // First, ask if user wants to merge just this revision or a range
            const mergeRange = confirm(
              `Merge from revision ${commit.revision}?\n\n` +
              `OK: Merge from r${commit.revision} to HEAD\n` +
              `Cancel: Select a range of revisions`
            )
            
            if (mergeRange) {
              // Merge from this revision to HEAD
              try {
                await invoke<string>('merge_revisions', {
                  workingCopyPath,
                  sourceRevision: commit.revision,
                  targetRevision: null,
                  sourceUrl: null,
                })
                onShowToast?.(`Merged revision ${commit.revision} to HEAD into working copy`, 'success')
                // Refresh file changes to show merge results
                queryClient.invalidateQueries({ queryKey: ['fileChanges', workingCopyPath] })
                // Refresh commit history
                queryClient.invalidateQueries({ queryKey: ['commitHistory', workingCopyPath] })
              } catch (error) {
                console.error('Failed to merge:', error)
                onShowToast?.(`Failed to merge: ${error}`, 'error')
              }
            } else {
              // Show revision selection modal for merge range
              setShowRevisionSelect({
                title: `Merge Range (from Revision ${commit.revision})`,
                onSelect: async (rev1, rev2) => {
                  try {
                    await invoke<string>('merge_revisions', {
                      workingCopyPath,
                      sourceRevision: rev1,
                      targetRevision: rev2 !== rev1 ? rev2 : null,
                      sourceUrl: null,
                    })
                    onShowToast?.(`Merged revisions ${rev1}${rev2 !== rev1 ? ` to ${rev2}` : ''} into working copy`, 'success')
                    // Refresh file changes to show merge results
                    queryClient.invalidateQueries({ queryKey: ['fileChanges', workingCopyPath] })
                    // Refresh commit history
                    queryClient.invalidateQueries({ queryKey: ['commitHistory', workingCopyPath] })
                  } catch (error) {
                    console.error('Failed to merge:', error)
                    onShowToast?.(`Failed to merge: ${error}`, 'error')
                  }
                },
              })
            }
          },
        },
        {
          label: 'Export...',
          icon: FolderArrowDownIcon,
          onClick: async () => {
            if (!workingCopyPath) {
              onShowToast?.('No working copy selected', 'error')
              return
            }
            try {
              const exportPath = await invoke<string | null>('open_folder_dialog', {
                title: 'Select export destination',
                defaultPath: undefined,
              })
              if (exportPath) {
                await invoke<string>('export_revision', {
                  workingCopyPath,
                  revision: commit.revision,
                  exportPath,
                })
                onShowToast?.(`Exported revision ${commit.revision} to ${exportPath}`, 'success')
              }
            } catch (error) {
              console.error('Failed to export:', error)
              onShowToast?.(`Failed to export: ${error}`, 'error')
            }
          },
        },
        {
          label: 'Save Commit Message',
          icon: DocumentTextIcon,
          onClick: async () => {
            try {
              const savePath = await invoke<string | null>('save_file_dialog', {
                defaultFilename: `commit-${commit.revision}.txt`,
              })
              if (savePath) {
                // Write commit message to file using Node.js fs (via Tauri)
                // For now, copy to clipboard as fallback
                const content = `Revision: ${commit.revision}\nAuthor: ${commit.author}\nDate: ${commit.date}\n\n${commit.message}`
                try {
                  // Try to use Tauri's file system API if available
                  await navigator.clipboard.writeText(content)
                  // Create a blob and download it
                  const blob = new Blob([content], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `commit-${commit.revision}.txt`
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                  onShowToast?.(`Commit message saved`, 'success')
                } catch (error) {
                  await navigator.clipboard.writeText(content)
                  onShowToast?.('Content copied to clipboard', 'info')
                }
              }
            } catch (error) {
              console.error('Failed to save commit message:', error)
              // Fallback: copy to clipboard
              try {
                await navigator.clipboard.writeText(commit.message)
                onShowToast?.('Commit message copied to clipboard', 'info')
              } catch (clipError) {
                onShowToast?.(`Failed to save: ${error}`, 'error')
              }
            }
          },
        },
      ]
    }

    return []
  }
}
