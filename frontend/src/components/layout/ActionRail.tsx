import { useState } from 'react'
import { Tooltip } from 'react-tooltip'

export type Action = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
  onClick?: () => void
  loading?: boolean
  tooltip?: string
}

type ActionRailProps = {
  actions: Action[]
  iconOnly?: boolean
  position?: 'right' | 'left'
}

export function ActionRail({ actions, iconOnly = true, position = 'right' }: ActionRailProps) {
  const [_hoveredAction, setHoveredAction] = useState<string | null>(null)

  if (actions.length === 0) {
    return null
  }

  const positionClass = position === 'right' ? 'right-4' : 'left-4'

  return (
    <div className={`fixed ${positionClass} top-1/2 -translate-y-1/2 z-30`}>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg rounded-none flex flex-col gap-1 p-1.5">
        {actions.map((action) => {
          const actionId = `action-${action.id}`
          return (
            <div key={action.id}>
              <button
                data-tooltip-id={actionId}
                data-tooltip-content={action.tooltip || action.label}
                data-tooltip-place={position === 'right' ? 'left' : 'right'}
                disabled={action.disabled || action.loading}
                onMouseEnter={() => setHoveredAction(actionId)}
                onMouseLeave={() => setHoveredAction(null)}
                onClick={action.onClick}
                className={`flex items-center gap-2 px-3 py-2 text-[11px] font-normal transition-colors rounded-none ${
                  iconOnly ? 'justify-center px-2' : 'justify-start'
                } ${
                  action.disabled || action.loading
                    ? 'opacity-40 cursor-not-allowed text-gray-400 dark:text-gray-600'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                {action.loading ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <action.icon className="h-4 w-4 flex-shrink-0" />
                )}
                {!iconOnly && (
                  <span className="font-medium whitespace-nowrap">
                    {action.loading ? 'Loading...' : action.label}
                  </span>
                )}
              </button>
              <Tooltip id={actionId} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

