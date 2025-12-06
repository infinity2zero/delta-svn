import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

export type CommitResult = {
  revision: string
  files_committed: number
  output: string
}

export function useCommit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      workingCopyPath,
      files,
      message,
      username,
      password,
    }: {
      workingCopyPath: string
      files: string[]
      message: string
      username?: string
      password?: string
    }): Promise<CommitResult> => {
      return await invoke<CommitResult>('commit_working_copy', {
        workingCopyPath,
        files,
        message,
        username: username || null,
        password: password || null,
      })
    },
    onSuccess: (_, variables) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['repositories'] })
      queryClient.invalidateQueries({ queryKey: ['fileChanges', variables.workingCopyPath] })
    },
  })
}

