import { useState } from 'react'
import type { Repository, FileChange } from '../../types'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ArrowUturnLeftIcon,
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ArrowsRightLeftIcon,
  LinkIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CodeBracketIcon,
  BookmarkIcon,
  FolderIcon,
  EyeSlashIcon,
  LockClosedIcon,
  LockOpenIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

type ToolbarAction = {
  id: string
  label: string
  shortLabel?: string // Abbreviated label for compact display
  icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
  onClick?: () => void
  tooltip?: string
}

type ToolbarProps = {
  repositories: Repository[]
  selectedRepo: Repository | null
  onSelectRepo: (repo: Repository | null) => void
  fileChanges: FileChange[]
  selectedChange: FileChange | null
  onAction: (actionId: string) => void
  activeTab?: string
}

export function Toolbar({
  repositories,
  selectedRepo,
  onSelectRepo,
  fileChanges,
  selectedChange,
  onAction,
  activeTab = 'changes',
}: ToolbarProps) {
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false)

  const toolbarIconButtonClass =
    'inline-flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-w-[48px] xl:min-w-[52px] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600 transition-colors'
  const toolbarIconButtonDisabledClass =
    'inline-flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-w-[48px] xl:min-w-[52px] rounded-md border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900/60 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'

  // Determine which actions are enabled based on context
  const hasRepo = !!selectedRepo
  const hasChanges = fileChanges.length > 0
  const hasSelectedFile = !!selectedChange
  const hasConflicts = fileChanges.some((f) => f.status === 'CONFLICTED')
  const hasUnversionedSelected = selectedChange?.status === 'UNVERSIONED'
  
  // File operations (delete, move, add) only work on Changes tab
  const isChangesTab = activeTab === 'changes'

  // All actions in a single array - all visible in compact toolbar
  const allActions: ToolbarAction[] = [
    {
      id: 'update',
      label: 'Update',
      icon: ArrowPathIcon,
      disabled: !hasRepo,
      onClick: () => onAction('update'),
      tooltip: 'Update working copy to latest revision',
    },
    {
      id: 'commit',
      label: 'Commit',
      icon: CheckCircleIcon,
      disabled: !hasRepo || !hasChanges || !isChangesTab,
      onClick: () => onAction('commit'),
      tooltip: 'Commit staged changes',
    },
    {
      id: 'revert',
      label: 'Revert',
      icon: ArrowUturnLeftIcon,
      disabled: !hasRepo || !hasChanges || !isChangesTab,
      onClick: () => onAction('revert'),
      tooltip: 'Revert changes to selected files',
    },
    {
      id: 'add',
      label: 'Add',
      icon: PlusIcon,
      disabled: !hasRepo || !hasUnversionedSelected || !isChangesTab,
      onClick: () => onAction('add'),
      tooltip: 'Add unversioned files to repository',
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: TrashIcon,
      disabled: !hasRepo || !hasSelectedFile || !isChangesTab,
      onClick: () => onAction('delete'),
      tooltip: 'Delete files from repository',
    },
    {
      id: 'move',
      label: 'Move',
      icon: ArrowsRightLeftIcon,
      disabled: !hasRepo || !hasSelectedFile || !isChangesTab,
      onClick: () => onAction('move'),
      tooltip: 'Move or rename files in repository',
    },
    {
      id: 'merge',
      label: 'Merge',
      icon: CodeBracketIcon,
      disabled: !hasRepo,
      onClick: () => onAction('merge'),
      tooltip: 'Merge changes from another branch or tag',
    },
    {
      id: 'switch',
      label: 'Switch',
      icon: ArrowsRightLeftIcon,
      disabled: !hasRepo,
      onClick: () => onAction('switch'),
      tooltip: 'Switch working copy to different branch or tag',
    },
    {
      id: 'resolve',
      label: 'Resolve',
      icon: WrenchScrewdriverIcon,
      disabled: !hasRepo || !hasConflicts,
      onClick: () => onAction('resolve'),
      tooltip: 'Resolve merge conflicts',
    },
    {
      id: 'blame',
      label: 'Blame',
      icon: DocumentTextIcon,
      disabled: !hasRepo || !hasSelectedFile,
      onClick: () => onAction('blame'),
      tooltip: 'View file blame/annotate (who changed what line)',
    },
    {
      id: 'cleanup',
      label: 'Cleanup',
      icon: SparklesIcon,
      disabled: !hasRepo,
      onClick: () => onAction('cleanup'),
      tooltip: 'Cleanup working copy (remove locks, fix inconsistencies)',
    },
    {
      id: 'copy',
      label: 'Copy',
      icon: DocumentDuplicateIcon,
      disabled: !hasRepo || !hasSelectedFile || !isChangesTab,
      onClick: () => onAction('copy'),
      tooltip: 'Copy files in repository',
    },
    {
      id: 'ignore',
      label: 'Ignore',
      icon: EyeSlashIcon,
      disabled: !hasRepo || !hasSelectedFile,
      onClick: () => onAction('ignore'),
      tooltip: 'Add file/pattern to svn:ignore',
    },
    {
      id: 'lock',
      label: 'Lock',
      icon: LockClosedIcon,
      disabled: !hasRepo || !hasSelectedFile,
      onClick: () => onAction('lock'),
      tooltip: 'Lock file for exclusive editing',
    },
    {
      id: 'unlock',
      label: 'Unlock',
      icon: LockOpenIcon,
      disabled: !hasRepo || !hasSelectedFile,
      onClick: () => onAction('unlock'),
      tooltip: 'Unlock file',
    },
    {
      id: 'branch',
      label: 'Branch',
      icon: CodeBracketIcon,
      disabled: !hasRepo,
      onClick: () => onAction('branch'),
      tooltip: 'Create a new branch',
    },
    {
      id: 'tag',
      label: 'Tag',
      icon: BookmarkIcon,
      disabled: !hasRepo,
      onClick: () => onAction('tag'),
      tooltip: 'Create a new tag',
    },
    {
      id: 'relocate',
      label: 'Relocate',
      icon: LinkIcon,
      disabled: !hasRepo,
      onClick: () => onAction('relocate'),
      tooltip: 'Relocate working copy to new repository URL',
    },
    {
      id: 'export',
      label: 'Export',
      icon: ArrowDownTrayIcon,
      disabled: !hasRepo,
      onClick: () => onAction('export'),
      tooltip: 'Export working copy without .svn metadata',
    },
    {
      id: 'import',
      label: 'Import',
      icon: ArrowUpTrayIcon,
      disabled: !hasRepo,
      onClick: () => onAction('import'),
      tooltip: 'Import directory into repository',
    },
  ]

  return (
    <div className="min-h-14 mt-1 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex flex-wrap xl:flex-nowrap items-center px-2 sm:px-3 gap-1.5 sm:gap-2 flex-shrink-0">
      {/* Repository Dropdown */}
      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setIsRepoDropdownOpen(!isRepoDropdownOpen)}
          className="flex items-center gap-2 px-3 sm:px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors min-w-[200px]"
        >
          <FolderIcon className="h-4 w-4 text-gray-600 dark:text-gray-300 flex-shrink-0" />
          <span className="flex-1 text-left text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {selectedRepo ? selectedRepo.name : 'Select Repository'}
          </span>
          <svg
            className={`h-4 w-4 text-gray-500 transition-transform flex-shrink-0 ${isRepoDropdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isRepoDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsRepoDropdownOpen(false)}
            />
            <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-lg z-20 max-h-64 overflow-y-auto">
              {repositories.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  No repositories
                </div>
              ) : (
                repositories.map((repo) => (
                  <button
                    key={repo.path}
                    type="button"
                    onClick={() => {
                      onSelectRepo(repo)
                      setIsRepoDropdownOpen(false)
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      selectedRepo?.path === repo.path
                        ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <div className="font-medium truncate">{repo.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{repo.path}</div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 flex-shrink-0" />

      {/* All SVN Commands - Responsive Wrapping */}
      <div className="flex flex-wrap xl:flex-nowrap items-center gap-1 sm:gap-1.5 flex-1 min-w-0">
        {allActions.map((action) => {
          const Icon = action.icon
          const displayLabel = action.shortLabel || action.label
          return (
            <button
              key={action.id}
              type="button"
              disabled={action.disabled}
              onClick={action.onClick}
              title={action.tooltip}
              className={
                action.disabled
                  ? toolbarIconButtonDisabledClass
                  : toolbarIconButtonClass
              }
            >
              <Icon className="h-4 w-4" />
              <span className="text-[9px] font-medium leading-tight text-center whitespace-nowrap">
                {displayLabel}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
