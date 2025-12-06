import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

export function useFileContent(workingCopyPath: string | undefined, filePath: string | undefined) {
  return useQuery({
    queryKey: ['fileContent', workingCopyPath, filePath],
    queryFn: async (): Promise<string> => {
      if (!workingCopyPath || !filePath) {
        throw new Error('Working copy path and file path are required')
      }
      return await invoke<string>('get_file_content', {
        workingCopyPath,
        filePath,
      })
    },
    enabled: !!workingCopyPath && !!filePath,
    staleTime: 30000, // Cache for 30 seconds
  })
}

