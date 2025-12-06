import { Tooltip } from 'react-tooltip'
import { Cog6ToothIcon, MoonIcon, SunIcon, QuestionMarkCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

type NavItem = {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

type NavigationSidebarProps = {
  items: NavItem[]
  activeKey: string
  onSelect: (key: string) => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onShowSettings: () => void
  hasRepo?: boolean
  onHelp?: () => void
  onInfo?: () => void
}

export function NavigationSidebar({
  items,
  activeKey,
  onSelect,
  theme,
  onToggleTheme,
  onShowSettings,
  hasRepo = false,
  onHelp,
  onInfo,
}: NavigationSidebarProps) {

  return (
    <aside className="w-14 bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <div className="px-0 space-y-0.5 flex-1">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeKey === item.key
          return (
            <div key={item.key} className="relative">
              {/* VS Code-style active indicator - vertical bar on left */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-600 dark:bg-teal-500 z-10" />
              )}
              <button
                data-tooltip-id={`nav-${item.key}`}
                data-tooltip-content={item.label}
                data-tooltip-place="right"
                onClick={() => onSelect(item.key)}
                className="flex items-center justify-center w-full py-2.5 px-0 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Icon
                  className={`h-5 w-5 transition-colors ${
                    isActive
                      ? 'text-teal-700 dark:text-teal-500'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                />
              </button>
              <Tooltip id={`nav-${item.key}`} />
            </div>
          )
        })}
      </div>

      {/* Bottom Bar - Help, Info, Theme, Settings */}
      <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-1">
        <div className="flex flex-col items-center gap-0.5">
          {onHelp && (
            <button
              data-tooltip-id="sidebar-help-tooltip"
              data-tooltip-content="Help"
              data-tooltip-place="right"
              onClick={onHelp}
              className="p-1.5 rounded-none text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <QuestionMarkCircleIcon className="h-4 w-4" />
            </button>
          )}
          {onInfo && hasRepo && (
            <button
              data-tooltip-id="sidebar-info-tooltip"
              data-tooltip-content="Repository Info"
              data-tooltip-place="right"
              onClick={onInfo}
              className="p-1.5 rounded-none text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <InformationCircleIcon className="h-4 w-4" />
            </button>
          )}
          <button
            data-tooltip-id="sidebar-theme-tooltip"
            data-tooltip-content={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            data-tooltip-place="right"
            onClick={onToggleTheme}
            className="p-1.5 rounded-none text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {theme === 'dark' ? (
              <SunIcon className="h-4 w-4" />
            ) : (
              <MoonIcon className="h-4 w-4" />
            )}
          </button>
          <button
            data-tooltip-id="sidebar-settings-tooltip"
            data-tooltip-content="Settings"
            data-tooltip-place="right"
            onClick={onShowSettings}
            className="p-1.5 rounded-none text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Cog6ToothIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Tooltip id="sidebar-help-tooltip" />
      <Tooltip id="sidebar-info-tooltip" />
      <Tooltip id="sidebar-theme-tooltip" />
      <Tooltip id="sidebar-settings-tooltip" />
    </aside>
  )
}

