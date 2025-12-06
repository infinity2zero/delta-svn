import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

export type UpdateResult = {
  updated_to_revision: string
  files_updated: number
  conflicts: number
  output: string
}

export function useUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (workingCopyPath: string): Promise<UpdateResult> => {
      return await invoke<UpdateResult>('update_working_copy', {
        workingCopyPath,
      })
    },
    onSuccess: (_, workingCopyPath) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['repositories'] })
      queryClient.invalidateQueries({ queryKey: ['fileChanges', workingCopyPath] })
    },
  })
}

