const mockEntries = [
  { time: '12:40:12', level: 'info', message: 'Ready. Waiting for commands…' },
  { time: '12:42:03', level: 'cmd', message: 'svn status ../svn-remote-working-copy/trunk' },
  { time: '12:42:03', level: 'success', message: 'Command completed with 2 changes.' },
]

type OutputConsoleProps = {
  collapsed: boolean
  onToggle: () => void
}

export function OutputConsole({ collapsed, onToggle }: OutputConsoleProps) {
  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="px-4 py-2 flex items-center justify-between cursor-pointer select-none" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {collapsed ? '▸' : '▾'}
          </span>
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Output
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {!collapsed && (
            <>
              <button className="hover:text-gray-700 dark:hover:text-gray-200">Clear</button>
              <span>•</span>
              <button className="hover:text-gray-700 dark:hover:text-gray-200">Save Log…</button>
            </>
          )}
        </div>
      </div>
      {!collapsed && (
        <div className="max-h-40 overflow-y-auto font-mono text-xs px-4 pb-3 space-y-1 text-gray-600 dark:text-gray-300">
          {mockEntries.map((entry, index) => (
            <div key={`${entry.time}-${index}`} className="flex gap-3">
              <span className="text-gray-400">{entry.time}</span>
              <span className="uppercase text-[10px] text-teal-500">{entry.level}</span>
              <span>{entry.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

