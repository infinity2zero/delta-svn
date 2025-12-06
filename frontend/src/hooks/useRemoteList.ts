import { invoke } from '@tauri-apps/api/core'
import { useQuery } from '@tanstack/react-query'
import type { Connection } from '../store/connectionStore'

export type RemoteEntry = {
  name: string
  kind: 'directory' | 'file' | string
}

export function useRemoteList(connection: Connection | null, path: string) {
  return useQuery({
    queryKey: ['remote-list', connection?.id, path],
    queryFn: async () => {
      if (!connection) {
        return [] as RemoteEntry[]
      }
      const entries = await invoke<RemoteEntry[]>('list_remote_entries', {
        baseUrl: connection.url,
        path,
        username: connection.username,
        password: connection.password ?? '',
      })
      return entries
    },
    enabled: Boolean(connection),
    staleTime: 30_000,
  })
}

