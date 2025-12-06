import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

export function useRevisionDiff(
  workingCopyPath: string | undefined,
  filePath: string | undefined,
  revision: string | undefined
) {
  return useQuery({
    queryKey: ['revisionDiff', workingCopyPath, filePath, revision],
    queryFn: async (): Promise<string> => {
      if (!workingCopyPath || !filePath || !revision) {
        throw new Error('Working copy path, file path, and revision are required')
      }
      return await invoke<string>('get_revision_diff', {
        workingCopyPath,
        filePath,
        revision,
      })
    },
    enabled: !!workingCopyPath && !!filePath && !!revision,
    staleTime: 30000, // Cache for 30 seconds
  })
}

