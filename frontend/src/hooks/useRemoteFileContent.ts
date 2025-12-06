import { invoke } from '@tauri-apps/api/core'
import { useQuery } from '@tanstack/react-query'
import type { Connection } from '../store/connectionStore'

export function useRemoteFileContent(
  connection: Connection | null,
  filePath: string | null
) {
  return useQuery({
    queryKey: ['remote-file-content', connection?.id, filePath],
    queryFn: async (): Promise<string> => {
      if (!connection || !filePath) {
        throw new Error('Connection and file path are required')
      }
      
      // Use svn cat to get file content from remote
      return await invoke<string>('get_remote_file_content', {
        baseUrl: connection.url,
        path: filePath,
        username: connection.username,
        password: connection.password ?? '',
      })
    },
    enabled: Boolean(connection && filePath),
    staleTime: 30000, // Cache for 30 seconds
  })
}

