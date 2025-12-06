import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { Toast, type ToastType } from '../ui/Toast'

type ConflictFile = {
  path: string
  kind: string
}

type ConflictContent = {
  mine: string | null
  theirs: string | null
  working: string
  base: string | null
}

type ConflictResolutionModalProps = {
  isOpen: boolean
  onClose: () => void
  workingCopyPath: string
  onResolved: () => void
}

export function ConflictResolutionModal({
  isOpen,
  onClose,
  workingCopyPath,
  onResolved,
}: ConflictResolutionModalProps) {
  const [conflictedFiles, setConflictedFiles] = useState<ConflictFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [conflictContent, setConflictContent] = useState<ConflictContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [viewMode, setViewMode] = useState<'working' | 'mine' | 'theirs' | 'merged'>('working')

  useEffect(() => {
    if (isOpen && workingCopyPath) {
      loadConflictedFiles()
    }
  }, [isOpen, workingCopyPath])

  useEffect(() => {
    if (selectedFile && workingCopyPath) {
      loadConflictContent(selectedFile)
    }
  }, [selectedFile, workingCopyPath])

  const loadConflictedFiles = async () => {
    if (!workingCopyPath) return

    setLoading(true)
    try {
      const files: ConflictFile[] = await invoke('get_conflicted_files', {
        workingCopyPath,
      })
      setConflictedFiles(files)
      if (files.length > 0 && !selectedFile) {
        setSelectedFile(files[0].path)
      }
    } catch (error) {
      setToast({
        message: `Failed to load conflicted files: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadConflictContent = async (filePath: string) => {
    if (!workingCopyPath) return

    setLoading(true)
    try {
      const content: ConflictContent = await invoke('get_conflict_content', {
        workingCopyPath,
        filePath,
      })
      
      // If .mine or .theirs files don't exist, extract from conflict markers
      if (!content.mine || !content.theirs) {
        const extracted = extractConflictSections(content.working)
        setConflictContent({
          ...content,
          mine: content.mine || extracted.mine,
          theirs: content.theirs || extracted.theirs,
        })
      } else {
        setConflictContent(content)
      }
      
      setViewMode('working')
    } catch (error) {
      setToast({
        message: `Failed to load conflict content: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error',
      })
      setConflictContent(null)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (accept: 'theirs-full' | 'mine-full' | 'working') => {
    if (!selectedFile || !workingCopyPath) return

    setResolving(true)
    try {
      await invoke('resolve_conflict', {
        workingCopyPath,
        filePath: selectedFile,
        accept,
      })

      setToast({
        message: `Conflict resolved: ${selectedFile}`,
        type: 'success',
      })

      // Remove resolved file from list
      setConflictedFiles((prev) => prev.filter((f) => f.path !== selectedFile))

      // Select next file or close if no more conflicts
      const remaining = conflictedFiles.filter((f) => f.path !== selectedFile)
      if (remaining.length > 0) {
        setSelectedFile(remaining[0].path)
      } else {
        setSelectedFile(null)
        setConflictContent(null)
        onResolved()
      }
    } catch (error) {
      setToast({
        message: `Failed to resolve conflict: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error',
      })
    } finally {
      setResolving(false)
    }
  }

  // Extract mine and theirs from conflict markers if .mine/.theirs files don't exist
  const extractConflictSections = (content: string) => {
    const lines = content.split('\n')
    let mineContent: string[] = []
    let theirsContent: string[] = []
    let inMineSection = false
    let inTheirsSection = false

    for (const line of lines) {
      if (line.startsWith('<<<<<<<')) {
        inMineSection = true
        inTheirsSection = false
      } else if (line.startsWith('=======')) {
        inMineSection = false
        inTheirsSection = true
      } else if (line.startsWith('>>>>>>>')) {
        inTheirsSection = false
      } else {
        if (inMineSection) {
          mineContent.push(line)
        } else if (inTheirsSection) {
          theirsContent.push(line)
        }
      }
    }

    return {
      mine: mineContent.length > 0 ? mineContent.join('\n') : null,
      theirs: theirsContent.length > 0 ? theirsContent.join('\n') : null,
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-orange-500" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Resolve Conflicts
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {conflictedFiles.length} conflicted file{conflictedFiles.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* File List */}
            <div className="w-64 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Conflicted Files
                </h3>
                {loading && conflictedFiles.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
                ) : conflictedFiles.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    No conflicts found
                  </div>
                ) : (
                  <div className="space-y-1">
                    {conflictedFiles.map((file) => (
                      <button
                        key={file.path}
                        onClick={() => setSelectedFile(file.path)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          selectedFile === file.path
                            ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className="font-medium truncate">{file.path}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {file.kind} conflict
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Conflict Viewer */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedFile && conflictContent ? (
                <>
                  {/* View Mode Tabs */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <button
                      onClick={() => setViewMode('working')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        viewMode === 'working'
                          ? 'bg-teal-500 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      Working (with markers)
                    </button>
                    {conflictContent.mine && (
                      <button
                        onClick={() => setViewMode('mine')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          viewMode === 'mine'
                            ? 'bg-teal-500 text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        Mine
                      </button>
                    )}
                    {conflictContent.theirs && (
                      <button
                        onClick={() => setViewMode('theirs')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          viewMode === 'theirs'
                            ? 'bg-teal-500 text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        Theirs
                      </button>
                    )}
                  </div>

                  {/* Content Display */}
                  <div className="flex-1 overflow-auto p-4">
                    <div className="bg-gray-50 dark:bg-gray-950 rounded-md p-4 font-mono text-sm">
                      <pre className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">
                        {viewMode === 'working'
                          ? conflictContent.working
                          : viewMode === 'mine'
                            ? conflictContent.mine || ''
                            : viewMode === 'theirs'
                              ? conflictContent.theirs || ''
                              : conflictContent.working}
                      </pre>
                    </div>
                  </div>

                  {/* Resolution Actions */}
                  <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-4 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Select resolution strategy:
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResolve('theirs-full')}
                          disabled={resolving || !conflictContent.theirs}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                        >
                          Accept Theirs
                        </button>
                        <button
                          onClick={() => handleResolve('mine-full')}
                          disabled={resolving || !conflictContent.mine}
                          className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                        >
                          Accept Mine
                        </button>
                        <button
                          onClick={() => handleResolve('working')}
                          disabled={resolving}
                          className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-2"
                        >
                          {resolving ? (
                            <>
                              <ArrowPathIcon className="h-4 w-4 animate-spin" />
                              Resolving...
                            </>
                          ) : (
                            'Mark as Resolved'
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      "Mark as Resolved" assumes you've manually edited the file to resolve conflicts.
                    </p>
                  </div>
                </>
              ) : selectedFile ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading conflict content...</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <CheckCircleIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Select a file to view conflicts
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  )
}

