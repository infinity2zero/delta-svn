import { invoke } from '@tauri-apps/api/core'
import { useInfiniteQuery } from '@tanstack/react-query'

export type ChangedPath = {
  path: string
  action: string // "A" = added, "M" = modified, "D" = deleted, "R" = replaced
  copyfrom_path?: string | null // Path this was copied from (if action is "A" or "R")
  copyfrom_rev?: string | null // Revision this was copied from
}

export type CommitStats = {
  added: number
  modified: number
  deleted: number
  replaced: number
}

export type CommitLogEntry = {
  revision: string
  author: string
  date: string
  message: string
  changed_paths: ChangedPath[]
  stats: CommitStats
  branch: string
}

type UseCommitHistoryParams = {
  workingCopyPath?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  author?: string
  pathFilter?: string
  stopOnCopy?: boolean
  includeMerged?: boolean
  useRegex?: boolean
  caseSensitive?: boolean
  pageSize?: number
}

export function useCommitHistory({
  workingCopyPath,
  search,
  dateFrom,
  dateTo,
  author,
  pathFilter,
  stopOnCopy,
  includeMerged,
  useRegex,
  caseSensitive,
  pageSize = 100,
}: UseCommitHistoryParams = {}) {
  return useInfiniteQuery({
    queryKey: [
      'commitHistory',
      workingCopyPath,
      search,
      dateFrom,
      dateTo,
      author,
      pathFilter,
      stopOnCopy,
      includeMerged,
      useRegex,
      caseSensitive,
      pageSize,
    ],
    queryFn: async ({ pageParam = 0 }) => {
      if (!workingCopyPath) {
        return { commits: [] as CommitLogEntry[], hasMore: false }
      }
      const entries = await invoke<CommitLogEntry[]>('get_commit_history', {
        workingCopyPath,
        limit: pageSize,
        offset: pageParam * pageSize,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        author: author || undefined,
        pathFilter: pathFilter || undefined,
        stopOnCopy: stopOnCopy ?? undefined,
        includeMerged: includeMerged ?? undefined,
        useRegex: useRegex ?? undefined,
        caseSensitive: caseSensitive ?? undefined,
      })
      return {
        commits: entries,
        hasMore: entries.length === pageSize, // If we got a full page, there might be more
      }
    },
    enabled: Boolean(workingCopyPath),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined
      return allPages.length
    },
    initialPageParam: 0,
    staleTime: 0, // Always fetch fresh data (no caching)
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  })
}
