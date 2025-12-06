import { invoke } from '@tauri-apps/api/core'
import { useQuery } from '@tanstack/react-query'
import type { FileChange } from '../types'

export function useFileChanges(workingCopyPath?: string) {
  return useQuery({
    queryKey: ['fileChanges', workingCopyPath],
    queryFn: async () => {
      if (!workingCopyPath) {
        return []
      }
      const result = await invoke<FileChange[]>('get_svn_status', { workingCopyPath })
      return result
    },
    enabled: !!workingCopyPath,
    refetchOnWindowFocus: true, // Refresh when window regains focus
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    staleTime: 2000, // Consider data stale after 2 seconds
  })
}

