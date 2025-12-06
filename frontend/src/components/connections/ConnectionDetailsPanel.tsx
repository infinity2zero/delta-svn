import { useMemo } from 'react'
import { useConnectionStore } from '../../store/connectionStore'
import { RemoteBrowser } from './RemoteBrowser'

export function ConnectionDetailsPanel() {
  const { connections, activeConnectionId } = useConnectionStore()

  const activeConnection = useMemo(
    () => connections.find((connection) => connection.id === activeConnectionId) ?? null,
    [connections, activeConnectionId],
  )

  if (!activeConnection) {
    return (
      <aside className="w-96 border-l border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 overflow-y-auto flex-shrink-0">
        <div className="h-full flex items-center justify-center px-6 text-xs text-gray-500 dark:text-gray-400 text-center">
          <div>
            <p className="mb-2 font-medium">No Connection Selected</p>
            <p className="text-xs">Select a connection from the table to browse repositories and perform checkouts.</p>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-96 border-l border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 overflow-y-auto flex-shrink-0">
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          <RemoteBrowser connection={activeConnection} />
        </div>
      </div>
    </aside>
  )
}
