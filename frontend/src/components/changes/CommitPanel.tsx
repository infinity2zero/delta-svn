import { useState, useMemo, useEffect } from 'react'
import { useCommit } from '../../hooks/useCommit'
import { useQueryClient } from '@tanstack/react-query'
import { useConnectionStore } from '../../store/connectionStore'
import { useOutput } from '../../contexts/OutputContext'
import { invoke } from '@tauri-apps/api/core'
import { UserCircleIcon, UserGroupIcon } from '@heroicons/react/24/outline'

type CommitPanelProps = {
  stagedCount: number
  totalCount: number
  branchName?: string
  stagedFiles: string[]
  workingCopyPath?: string
  repositoryUrl?: string
  allChanges?: Array<{ name: string; status: string }>
  onCommitSuccess?: () => void
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void
}

export function CommitPanel({
  stagedCount,
  totalCount,
  branchName,
  stagedFiles,
  workingCopyPath,
  repositoryUrl,
  allChanges = [],
  onCommitSuccess,
  onShowToast,
}: CommitPanelProps) {
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [summaryTouched, setSummaryTouched] = useState(false)
  const [repositoryRootUrl, setRepositoryRootUrl] = useState<string | null>(null)
  const commitMutation = useCommit()
  const queryClient = useQueryClient()
  const { connections } = useConnectionStore()
  let setProgress: (progress: { active: boolean; value?: number; message?: string }) => void = () => {}
  try {
    const output = useOutput()
    setProgress = output.setProgress
  } catch {
    // Output context not available, use no-ops
  }

  // Fetch repository root URL from working copy
  useEffect(() => {
    if (!workingCopyPath) {
      setRepositoryRootUrl(null)
      return
    }

    invoke<string>('get_repository_root_url', { workingCopyPath })
      .then((rootUrl) => {
        setRepositoryRootUrl(rootUrl)
      })
      .catch((err) => {
        console.error('Failed to get repository root URL:', err)
        // Fallback to stored URL if we can't get root
        setRepositoryRootUrl(repositoryUrl || null)
      })
  }, [workingCopyPath, repositoryUrl])

  // Find matching connection for credentials using repository root URL
  const matchingConnection = useMemo(() => {
    const urlToMatch = repositoryRootUrl || repositoryUrl
    if (!urlToMatch) return null
    
    // Try to find connection that matches the repository URL
    // Check if repo URL starts with connection URL or vice versa
    for (const conn of connections) {
      // Normalize URLs (remove trailing slashes)
      const repoUrlNorm = urlToMatch.replace(/\/$/, '')
      const connUrlNorm = conn.url.replace(/\/$/, '')
      
      // Check if repository URL starts with connection URL
      if (repoUrlNorm.startsWith(connUrlNorm)) {
        return conn
      }
      // Or if connection URL starts with repository URL (for subdirectories)
      if (connUrlNorm.startsWith(repoUrlNorm)) {
        return conn
      }
    }
    
    return null
  }, [repositoryRootUrl, repositoryUrl, connections])

  // Check if any staged files are unversioned
  // Note: After adding files, their status changes from UNVERSIONED to ADDED
  // So we only block if the file is currently UNVERSIONED in the changes list
  const stagedUnversionedFiles = useMemo(() => {
    if (!allChanges || allChanges.length === 0) {
      // If allChanges is not provided or empty, don't block commit
      // The backend will validate anyway
      return []
    }
    return stagedFiles.filter((file) => {
      const change = allChanges.find((c) => c.name === file)
      // Only block if status is explicitly UNVERSIONED
      // If file is not found in allChanges, it might have been just added and status is updating
      // In that case, don't block - the backend will validate
      // ADDED, MODIFIED, DELETED files are all fine to commit
      // Only UNVERSIONED files need to be added first
      if (!change) {
        // File not found in allChanges - might be in transition, don't block
        return false
      }
      return change.status === 'UNVERSIONED'
    })
  }, [stagedFiles, allChanges])

  // Debug: Log commit button state
  useEffect(() => {
    console.log('Commit button state:', {
      stagedCount,
      hasSummary: summary.trim().length > 0,
      isPending: commitMutation.isPending,
      unversionedCount: stagedUnversionedFiles.length,
      allChangesCount: allChanges?.length || 0,
      stagedFilesList: stagedFiles,
      unversionedFilesList: stagedUnversionedFiles,
      allChangesStatuses: stagedFiles.map(f => {
        const change = allChanges?.find(c => c.name === f)
        return { file: f, status: change?.status || 'NOT_FOUND' }
      }),
      canCommit: stagedCount > 0 && summary.trim().length > 0 && !commitMutation.isPending,
    })
  }, [stagedCount, summary, commitMutation.isPending, stagedUnversionedFiles.length, allChanges?.length, stagedFiles, stagedUnversionedFiles, allChanges])

  // Commit button should be enabled if files are staged and message is filled
  // We'll check for unversioned files when the user actually clicks commit
  const canCommit = stagedCount > 0 && summary.trim().length > 0 && !commitMutation.isPending

  const isSummaryError = summaryTouched && summary.trim().length === 0

  const handleCommit = async () => {
    if (!workingCopyPath || !canCommit) return

    // Check for unversioned files by fetching fresh SVN status right before commit
    // This ensures we have the latest status, not cached data
    try {
      const currentStatus = await invoke<Array<{ name: string; status: string }>>('get_svn_status', { 
        workingCopyPath 
      })
      
      // Normalize paths for comparison (remove trailing slashes, normalize separators)
      const normalizePath = (path: string) => path.replace(/\/$/, '').replace(/\\/g, '/')
      
      // Debug logging
      console.log('Commit validation - Staged files:', stagedFiles)
      console.log('Commit validation - Current SVN status:', currentStatus.map(c => `${c.name}: ${c.status}`))
      
      // Check if any staged files are still unversioned
      const unversionedInStaged = stagedFiles.filter((file) => {
        const normalizedFile = normalizePath(file)
        const change = currentStatus.find((c) => {
          const normalizedChange = normalizePath(c.name)
          // Check exact match
          if (normalizedChange === normalizedFile) {
            return true
          }
          // For directories: check if change path starts with file path or vice versa
          if (normalizedFile.includes('/') || normalizedChange.includes('/')) {
            return normalizedChange.startsWith(normalizedFile + '/') ||
                   normalizedFile.startsWith(normalizedChange + '/')
          }
          return false
        })
        
        // If file is not found in status, it might have been added and is now ADDED
        // Only block if explicitly UNVERSIONED
        if (!change) {
          console.log(`File ${file} not found in status - assuming it's been added`)
          return false // Not found = might be added, don't block
        }
        
        const isUnversioned = change.status === 'UNVERSIONED'
        if (isUnversioned) {
          console.log(`File ${file} is still UNVERSIONED in status`)
        } else {
          console.log(`File ${file} has status: ${change.status}`)
        }
        return isUnversioned
      })
      
      if (unversionedInStaged.length > 0) {
        const fileList = unversionedInStaged.slice(0, 5).join(', ')
        const moreText = unversionedInStaged.length > 5 ? ` and ${unversionedInStaged.length - 5} more` : ''
        const message = `Cannot commit unversioned files. Please add them to SVN first.\n\nUnversioned files: ${fileList}${moreText}\n\nTo add files:\n1. Select the unversioned files in the Changes view\n2. Click the 'Add' button in the toolbar\n3. Then commit the files`
        if (onShowToast) {
          onShowToast(message, 'error')
        } else {
          console.error(message)
        }
        return
      }
    } catch (error) {
      // If we can't check status, log but continue (backend will validate anyway)
      console.warn('Failed to check file status before commit:', error)
    }

    const message = description.trim()
      ? `${summary.trim()}\n\n${description.trim()}`
      : summary.trim()

    // Log for debugging
    console.log('Committing with:', {
      workingCopyPath,
      files: stagedFiles,
      hasConnection: !!matchingConnection,
      connectionUrl: matchingConnection?.url,
      repositoryUrl,
      repositoryRootUrl,
      hasUsername: !!matchingConnection?.username,
      hasPassword: !!matchingConnection?.password,
    })
    
    // Warn if we have a remote URL but no matching connection
    const urlToCheck = repositoryRootUrl || repositoryUrl
    if (urlToCheck && (urlToCheck.startsWith('svn://') || urlToCheck.startsWith('http://') || urlToCheck.startsWith('https://')) && !matchingConnection) {
      console.warn('⚠️ Remote repository detected but no matching connection found. Commit may fail without credentials.')
    }

    try {
      // Real-time output will come via events, just show progress
      setProgress({ active: true, message: 'Committing changes...', value: 0 })

      // Filter out invalid file paths (like "> moved to" display labels)
      const validFiles = stagedFiles.filter(file => 
        !file.trimStart().startsWith('> ') && 
        !file.includes('moved to') && 
        !file.includes('moved from')
      )
      
      if (validFiles.length === 0) {
        const errorMsg = 'No valid files to commit. Please select actual files, not display labels.'
        if (onShowToast) {
          onShowToast(errorMsg, 'error')
        }
        return
      }
      
      const result = await commitMutation.mutateAsync({
        workingCopyPath,
        files: validFiles,
        message,
        username: matchingConnection?.username,
        password: matchingConnection?.password,
      })

      setProgress({ active: true, value: 100, message: 'Commit successful!' })

      // Clear form
      setSummary('')
      setDescription('')
      
      // Call success callback (to clear staged files)
      onCommitSuccess?.()

      // Refresh file changes and commit history
      if (workingCopyPath) {
        await queryClient.invalidateQueries({ queryKey: ['fileChanges', workingCopyPath] })
        await queryClient.refetchQueries({ queryKey: ['fileChanges', workingCopyPath] }) // Force refetch
        // Also refresh commit history to show the new commit
        // Reset infinite query pages first, then invalidate and refetch
        // Wait a bit for SVN to update its internal state
        await new Promise(resolve => setTimeout(resolve, 500))
        queryClient.resetQueries({ 
          queryKey: ['commitHistory', workingCopyPath],
          exact: false 
        })
        await queryClient.invalidateQueries({ 
          queryKey: ['commitHistory', workingCopyPath],
          exact: false 
        })
        await queryClient.refetchQueries({ 
          queryKey: ['commitHistory', workingCopyPath],
          exact: false,
          type: 'active'
        })
      }

      // Show success message
      const successMessage = `Successfully committed to revision ${result.revision}\n${result.files_committed} files committed.`
      if (onShowToast) {
        onShowToast(successMessage, 'success')
      } else {
        console.log(successMessage)
      }
      
      setTimeout(() => {
        setProgress({ active: false })
      }, 1000)
    } catch (err) {
      setProgress({ active: false })
      const errorMsg = err instanceof Error ? err.message : String(err)
      // Error is handled by the mutation
      console.error('Commit error:', err)
      if (onShowToast) {
        onShowToast(errorMsg, 'error')
      }
    }
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 py-3 space-y-3">
      <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
          Summary
        </label>
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onBlur={() => setSummaryTouched(true)}
          placeholder="Update configuration files"
          className={`w-full pl-3 pr-4 py-1.5 text-xs rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none ${
            isSummaryError
              ? 'border border-red-500 dark:border-red-500 focus:border-red-500 dark:focus:border-red-400'
              : 'border border-gray-300 dark:border-gray-700 focus:border-teal-500 dark:focus:border-teal-400'
          }`}
        />
        {isSummaryError && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            Summary is required.
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add an optional extended description..."
          rows={3}
          className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400 resize-none"
        />
      </div>

      {!matchingConnection && (repositoryRootUrl || repositoryUrl) && (repositoryRootUrl?.startsWith('svn://') || repositoryRootUrl?.startsWith('http://') || repositoryRootUrl?.startsWith('https://') || repositoryUrl?.startsWith('svn://') || repositoryUrl?.startsWith('http://') || repositoryUrl?.startsWith('https://')) && (
        <div className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-none">
          ⚠️ No matching connection found. Add a connection in the Connections tab with URL: <strong>{repositoryRootUrl || repositoryUrl}</strong>
          <br />
          The connection URL must match the repository root exactly.
        </div>
      )}

      {matchingConnection && repositoryRootUrl && matchingConnection.url !== repositoryRootUrl && (
        <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-none">
          ⚠️ Connection URL mismatch. Connection: <strong>{matchingConnection.url}</strong>, Repository Root: <strong>{repositoryRootUrl}</strong>
          <br />
          Update the connection URL to match the repository root.
        </div>
      )}

      {commitMutation.isError && (
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-none whitespace-pre-line">
          {commitMutation.error instanceof Error
            ? commitMutation.error.message
            : 'Commit failed'}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {matchingConnection?.username ? (
            <>
              <UserCircleIcon className="h-5 w-5 text-gray-600 dark:text-gray-200" />
              <span className="font-semibold text-gray-800 dark:text-gray-100">
                {matchingConnection.username}
              </span>
            </>
          ) : (
            <>
              <UserGroupIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <span className="font-medium text-gray-400 dark:text-gray-500">No user configured</span>
            </>
          )}
        </div>
        <button
          onClick={handleCommit}
          disabled={!canCommit}
          title={
            !canCommit
              ? `Cannot commit: ${
                  stagedCount === 0
                    ? 'No files staged'
                    : summary.trim().length === 0
                      ? 'Commit message required'
                      : commitMutation.isPending
                        ? 'Commit in progress'
                        : 'Unknown reason'
                }`
              : `Commit ${stagedCount} ${stagedCount === 1 ? 'file' : 'files'}${branchName ? ` to ${branchName}` : ''}`
          }
          className={`inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
            canCommit
              ? 'bg-teal-600 hover:bg-teal-700 text-white'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          {commitMutation.isPending ? (
            <>
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></span>
              Committing...
            </>
          ) : (
            <>
              Commit {stagedCount} {stagedCount === 1 ? 'file' : 'files'}
              {branchName && ` to ${branchName}`}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

