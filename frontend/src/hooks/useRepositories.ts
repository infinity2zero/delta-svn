import { useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useQuery } from '@tanstack/react-query'
import type { Repository } from '../types'

export function useRepositories() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['repositories'],
    queryFn: async () => {
      const result = await invoke<Repository[]>('list_repositories')
      return result
    },
  })

  const repositories = data ?? []
  const selectedRepo = useMemo(() => repositories[0] ?? null, [repositories])

  return {
    repositories,
    selectedRepo,
    loading: isLoading,
    error: isError ? (error instanceof Error ? error.message : 'Unable to load repositories') : null,
  }
}

