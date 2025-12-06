export type RepoStatus = 'synced' | 'updating' | 'error'

export type Repository = {
  name: string
  url: string
  path: string
  revision: string
  branch: string
  changes: number
  status: RepoStatus
}

export type FileChangeStatus = 'NORMAL' | 'ADDED' | 'MODIFIED' | 'CONFLICTED' | 'DELETED' | 'UNVERSIONED'

export type FileChange = {
  name: string
  status: FileChangeStatus
  revision: string
  author: string
}

