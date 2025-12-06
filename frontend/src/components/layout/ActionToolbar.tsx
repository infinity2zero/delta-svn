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

type ActionToolbarProps = {
  groups: ActionGroup[]
}

export function ActionToolbar({ groups }: ActionToolbarProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="pl-8 pr-4 py-1.5 flex items-center gap-3 overflow-x-auto text-xs">
        {groups.map((group, index) => (
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
            {index < groups.length - 1 && (
              <span className="h-5 w-px bg-gray-200 dark:bg-gray-800 mx-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

