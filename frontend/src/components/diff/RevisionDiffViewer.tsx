import { useEffect, useMemo, useState } from 'react'
import Editor, { DiffEditor } from '@monaco-editor/react'
import { useRevisionDiff } from '../../hooks/useRevisionDiff'
import { useRevisionFileContent } from '../../hooks/useRevisionFileContent'
import { parseUnifiedDiff } from '../../utils/diffParser'
import { reconstructOldFile } from '../../utils/reconstructOldFile'
import type { ChangedPath } from '../../hooks/useCommitHistory'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { DocumentTextIcon, Squares2X2Icon, Bars3Icon } from '@heroicons/react/24/outline'

type RevisionDiffViewerProps = {
  filePath?: string
  revision?: string
  workingCopyPath?: string
  changedPaths: ChangedPath[]
  onSelectFile?: (filePath: string) => void
  hideFileList?: boolean // When true, only show diff without file list
}

const getStatusChip = (action?: string) => {
  switch (action) {
    case 'A':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
          Added
        </span>
      )
    case 'D':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
          Deleted
        </span>
      )
    case 'M':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
          Modified
        </span>
      )
    case 'R':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          Replaced
        </span>
      )
    default:
      return null
  }
}

export function RevisionDiffViewer({
  filePath,
  revision,
  workingCopyPath,
  changedPaths,
  onSelectFile,
  hideFileList = false,
}: RevisionDiffViewerProps) {
  const [selectedFilePath, setSelectedFilePath] = useState<string | undefined>(filePath)
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified')

  // Keep internal selection in sync with prop so selecting another file updates the diff
  useEffect(() => {
    setSelectedFilePath(filePath)
  }, [filePath])

  const { data: diffContent, isLoading, error } = useRevisionDiff(
    workingCopyPath,
    selectedFilePath,
    revision
  )
  // Fetch full file content at the target revision (the "new" version)
  const { data: fullFileContent } = useRevisionFileContent(
    workingCopyPath,
    selectedFilePath,
    revision
  )

  const editorTheme = useMemo(() => {
    return document.documentElement.classList.contains('dark') ? 'vs-dark' : 'light'
  }, [])

  const { oldContent, newContent, newFileName } = useMemo(() => {
    if (!diffContent) {
      return { oldContent: '', newContent: '', oldFileName: undefined, newFileName: undefined }
    }
    return parseUnifiedDiff(diffContent)
  }, [diffContent])

  // Reconstruct full old and new file content for Monaco DiffEditor
  const { fullOldContent, fullNewContent } = useMemo(() => {
    if (!fullFileContent || !diffContent) {
      return { fullOldContent: oldContent, fullNewContent: newContent }
    }

    try {
      const reconstructedOld = reconstructOldFile(fullFileContent, diffContent)
      return {
        fullOldContent: reconstructedOld,
        fullNewContent: fullFileContent
      }
    } catch (error) {
      console.error('Error reconstructing old file:', error)
      return { fullOldContent: oldContent, fullNewContent: newContent }
    }
  }, [fullFileContent, diffContent, oldContent, newContent])

  const handleFileClick = (path: string) => {
    // Remove trailing slash for directories
    const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path
    setSelectedFilePath(cleanPath)
    onSelectFile?.(cleanPath)
  }

  // Filter out directories for the file list
  const files = changedPaths.filter((p) => !p.path.endsWith('/'))

  const getActionColor = (action: string) => {
    switch (action) {
      case 'A':
        return 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'M':
        return 'text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      case 'D':
        return 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'R':
        return 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      default:
        return 'text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'A':
        return 'Added'
      case 'M':
        return 'Modified'
      case 'D':
        return 'Deleted'
      case 'R':
        return 'Replaced'
      default:
        return action
    }
  }

  // If hideFileList is true, just show the diff without the file list panel
  if (hideFileList) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
        {!selectedFilePath ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <DocumentTextIcon className="h-16 w-16 mx-auto mb-3 opacity-30 text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                Select a file to view its diff
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const fileInfo = changedPaths.find((p) => p.path === selectedFilePath || p.path === selectedFilePath + '/')
                  return getStatusChip(fileInfo?.action)
                })()}
                <div className="text-sm font-medium text-gray-900 dark:text-white">{selectedFilePath}</div>
              </div>
              {(() => {
                const fileInfo = changedPaths.find((p) => p.path === selectedFilePath || p.path === selectedFilePath + '/')
                const isModified = fileInfo?.action === 'M'
                return isModified ? (
                  <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded">
                    <button
                      onClick={() => setViewMode('unified')}
                      className={`px-2 py-1 text-xs transition-colors ${
                        viewMode === 'unified'
                          ? 'bg-teal-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      title="Unified View"
                    >
                      <Bars3Icon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('split')}
                      className={`px-2 py-1 text-xs transition-colors ${
                        viewMode === 'split'
                          ? 'bg-teal-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      title="Split View"
                    >
                      <Squares2X2Icon className="h-4 w-4" />
                    </button>
                  </div>
                ) : null
              })()}
            </div>

            {/* Diff Content */}
            <div className="flex-1 overflow-hidden">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent mb-2"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading diff...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="h-full flex items-center justify-center p-6">
                  <div className="text-center">
                    <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                      {error instanceof Error ? error.message : 'Failed to load diff'}
                    </p>
                  </div>
                </div>
              ) : diffContent ? (
                <div className="h-full flex">
                  {(() => {
                    // Determine file status from changed paths
                    const fileInfo = changedPaths.find((p) => p.path === selectedFilePath || p.path === selectedFilePath + '/')
                    const isNewFile = fileInfo?.action === 'A'
                    const isDeletedFile = fileInfo?.action === 'D'

                    if (isNewFile) {
                      // New file: show only new content
                      return (
                        <div className="flex-1 h-full">
                          <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 text-xs font-semibold text-green-700 dark:text-green-300">
                            NEW FILE (Revision {revision})
                          </div>
                          <Editor
                            height="calc(100% - 32px)"
                            defaultLanguage="plaintext"
                            value={newContent || diffContent}
                            theme={editorTheme}
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                              scrollBeyondLastLine: false,
                              fontSize: 12,
                              lineNumbers: 'on',
                              wordWrap: 'on',
                              renderWhitespace: 'selection',
                            }}
                          />
                        </div>
                      )
                    } else if (isDeletedFile) {
                      // Deleted file: show only old content
                      return (
                        <div className="flex-1 h-full">
                          <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-xs font-semibold text-red-700 dark:text-red-300">
                            DELETED FILE (was in Revision {revision ? parseInt(revision) - 1 : 'N/A'})
                          </div>
                          <Editor
                            height="calc(100% - 32px)"
                            defaultLanguage="plaintext"
                            value={oldContent}
                            theme={editorTheme}
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                              scrollBeyondLastLine: false,
                              fontSize: 12,
                              lineNumbers: 'on',
                              wordWrap: 'on',
                              renderWhitespace: 'selection',
                            }}
                          />
                        </div>
                      )
                    } else {
                      // Modified file: unified or split diff view using Monaco DiffEditor
                      return (
                        <div className="flex-1 h-full flex flex-col" style={{ minHeight: 0 }}>
                          <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2 flex-shrink-0">
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white text-[10px]">
                              Δ
                            </span>
                            <span>
                              CHANGES IN REVISION {revision} {newFileName ? `(${newFileName})` : ''}
                            </span>
                          </div>
                          <div className="flex-1" style={{ minHeight: 0 }}>
                            <DiffEditor
                              key={viewMode}
                              height="100%"
                              language="plaintext"
                              original={fullOldContent}
                              modified={fullNewContent}
                              theme={editorTheme}
                              options={{
                                readOnly: true,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                fontSize: 12,
                                lineNumbers: 'on',
                                wordWrap: 'on',
                                renderWhitespace: 'selection',
                                renderSideBySide: viewMode === 'split',
                                ignoreTrimWhitespace: false,
                                diffWordWrap: 'on',
                              }}
                            />
                          </div>
                        </div>
                      )
                    }
                  })()}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 px-6">
                  <p className="text-center">No changes detected for this file.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  // Original layout with file list (for other use cases)
  return (
    <PanelGroup direction="horizontal" className="h-full">
      {/* Left Panel: File List */}
      <Panel defaultSize={35} minSize={25} maxSize={60}>
        <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Changed Files ({files.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {files.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No files changed
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {files.map((file, index) => {
                  const isSelected = selectedFilePath === file.path
                  const pathParts = file.path.split('/')
                  const fileName = pathParts[pathParts.length - 1] || file.path
                  const directory = pathParts.slice(0, -1).join('/')

                  return (
                    <button
                      key={index}
                      onClick={() => handleFileClick(file.path)}
                      className={`w-full text-left px-3 py-2 rounded transition-colors ${
                        isSelected
                          ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-900 dark:text-teal-100 border border-teal-200 dark:border-teal-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getActionColor(file.action)}`}>
                          {getActionLabel(file.action)}
                        </span>
                        <div className="flex-1 min-w-0">
                          {directory ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {directory}/
                              </span>
                              <span className="text-sm font-medium truncate">{fileName}</span>
                            </div>
                          ) : (
                            <span className="text-sm font-medium truncate">{file.path}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </Panel>

      {/* Resize Handle */}
      <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-800 hover:bg-teal-500 dark:hover:bg-teal-600 transition-colors cursor-col-resize" />

      {/* Right Panel: Diff Viewer */}
      <Panel defaultSize={65} minSize={40}>
        <div className="h-full flex flex-col bg-white dark:bg-gray-900">
          {!selectedFilePath ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a file to view its diff
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(() => {
                    const fileInfo = changedPaths.find((p) => p.path === selectedFilePath || p.path === selectedFilePath + '/')
                    return getStatusChip(fileInfo?.action)
                  })()}
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{selectedFilePath}</div>
                </div>
                {(() => {
                  const fileInfo = changedPaths.find((p) => p.path === selectedFilePath || p.path === selectedFilePath + '/')
                  const isModified = fileInfo?.action === 'M'
                  return isModified ? (
                    <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded">
                      <button
                        onClick={() => setViewMode('unified')}
                        className={`px-2 py-1 text-xs transition-colors ${
                          viewMode === 'unified'
                            ? 'bg-teal-600 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        title="Unified View"
                      >
                        <Bars3Icon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('split')}
                        className={`px-2 py-1 text-xs transition-colors ${
                          viewMode === 'split'
                            ? 'bg-teal-600 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        title="Split View"
                      >
                        <Squares2X2Icon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null
                })()}
              </div>

              {/* Diff Content */}
              <div className="flex-1 overflow-hidden">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent mb-2"></div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading diff...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="h-full flex items-center justify-center p-6">
                    <div className="text-center">
                      <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                        {error instanceof Error ? error.message : 'Failed to load diff'}
                      </p>
                    </div>
                  </div>
                ) : diffContent ? (
                  <div className="h-full flex">
                    {(() => {
                      // Determine file status from changed paths
                      const fileInfo = changedPaths.find((p) => p.path === selectedFilePath || p.path === selectedFilePath + '/')
                      const isNewFile = fileInfo?.action === 'A'
                      const isDeletedFile = fileInfo?.action === 'D'

                      if (isNewFile) {
                        // New file: show only new content
                        return (
                          <div className="flex-1 h-full">
                            <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 text-xs font-semibold text-green-700 dark:text-green-300">
                              NEW FILE (Revision {revision})
                            </div>
                            <Editor
                              height="calc(100% - 32px)"
                              defaultLanguage="plaintext"
                              value={newContent || diffContent}
                              theme={editorTheme}
                              options={{
                                readOnly: true,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                fontSize: 12,
                                lineNumbers: 'on',
                                wordWrap: 'on',
                                renderWhitespace: 'selection',
                              }}
                            />
                          </div>
                        )
                      } else if (isDeletedFile) {
                        // Deleted file: show only old content
                        return (
                          <div className="flex-1 h-full">
                            <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-xs font-semibold text-red-700 dark:text-red-300">
                              DELETED FILE (was in Revision {revision ? parseInt(revision) - 1 : 'N/A'})
                            </div>
                            <Editor
                              height="calc(100% - 32px)"
                              defaultLanguage="plaintext"
                              value={oldContent}
                              theme={editorTheme}
                              options={{
                                readOnly: true,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                fontSize: 12,
                                lineNumbers: 'on',
                                wordWrap: 'on',
                                renderWhitespace: 'selection',
                              }}
                            />
                          </div>
                        )
                      } else {
                        // Modified file: unified or split diff view using Monaco DiffEditor
                        return (
                          <div className="flex-1 h-full flex flex-col" style={{ minHeight: 0 }}>
                            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2 flex-shrink-0">
                              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white text-[10px]">
                                Δ
                              </span>
                              <span>
                                CHANGES IN REVISION {revision} {newFileName ? `(${newFileName})` : ''}
                              </span>
                            </div>
                            <div className="flex-1" style={{ minHeight: 0 }}>
                              <DiffEditor
                                key={viewMode}
                                height="100%"
                                language="plaintext"
                                original={fullOldContent}
                                modified={fullNewContent}
                                theme={editorTheme}
                                options={{
                                  readOnly: true,
                                  minimap: { enabled: false },
                                  scrollBeyondLastLine: false,
                                  fontSize: 12,
                                  lineNumbers: 'on',
                                  wordWrap: 'on',
                                  renderWhitespace: 'selection',
                                  renderSideBySide: viewMode === 'split',
                                  ignoreTrimWhitespace: false,
                                  diffWordWrap: 'on',
                                }}
                              />
                            </div>
                          </div>
                        )
                      }
                    })()}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 px-6">
                    <p className="text-center">No changes detected for this file.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Panel>
    </PanelGroup>
  )
}

