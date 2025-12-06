import type { Repository } from '../../types'

type ActionButton = {
  id: string
  label: string
  disabled?: boolean
  onClick?: () => void
  loading?: boolean
}

type ActionGroup = {
  id: string
  title?: string
  actions: ActionButton[]
}

type AppHeaderProps = {
  selectedRepo: Repository | null
  toolbarGroups?: ActionGroup[]
}

export function AppHeader({ selectedRepo, toolbarGroups }: AppHeaderProps) {

  return (
    <>
      <header className="border-b border-gray-200 bg-white dark:bg-gray-900 flex-shrink-0 shadow-sm">
        <div className="pl-3 pr-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="h-10 w-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">
              Δ
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">DELTA SVN</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 tracking-widest uppercase">Track Every Change</div>
            </div>
            <div className="h-10 w-px bg-gray-200 dark:bg-gray-700" />
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Repository</div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {selectedRepo ? selectedRepo.name : 'Loading...'}
                </span>
                {selectedRepo && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
                    {selectedRepo.branch}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {toolbarGroups && toolbarGroups.length > 0 && (
            <div className="flex items-center gap-2 flex-1 justify-center overflow-x-auto">
              {toolbarGroups.map((group, index) => (
                <div key={group.id} className="flex items-center gap-1.5">
                  {group.actions.map((action) => {
                    const isPrimary = index === 0
                    return (
                      <button
                        key={action.id}
                        disabled={action.disabled || action.loading}
                        onClick={action.onClick}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none border text-xs font-medium transition-colors ${
                          isPrimary
                            ? 'border-teal-500/30 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-200 dark:border-teal-700/60'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                        } disabled:opacity-40 disabled:cursor-not-allowed shadow-sm`}
                      >
                        {action.loading ? (
                          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <span className="text-[10px] opacity-70">●</span>
                        )}
                        {action.loading ? 'Updating...' : action.label}
                      </button>
                    )
                  })}
                  {index < toolbarGroups.length - 1 && (
                    <span className="h-5 w-px bg-gray-200 dark:bg-gray-800 mx-1" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </header>
    </>
  )
}

