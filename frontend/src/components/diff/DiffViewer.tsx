import { useMemo, useState } from 'react'
import Editor, { DiffEditor } from '@monaco-editor/react'
import { useFileDiff } from '../../hooks/useFileDiff'
import { useFileContent } from '../../hooks/useFileContent'
import { parseUnifiedDiff } from '../../utils/diffParser'
import { reconstructOldFile } from '../../utils/reconstructOldFile'
import { Squares2X2Icon, Bars3Icon } from '@heroicons/react/24/outline'

type DiffViewerProps = {
  fileName?: string
  status?: string
  workingCopyPath?: string
}

const getStatusChip = (status?: string) => {
  switch (status) {
    case 'ADDED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
          Added
        </span>
      )
    case 'DELETED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
          Deleted
        </span>
      )
    case 'MODIFIED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
          Modified
        </span>
      )
    case 'UNVERSIONED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300">
          Unversioned
        </span>
      )
    default:
      return null
  }
}

export function DiffViewer({ fileName, status, workingCopyPath }: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified')
  const { data: diffContent, isLoading, error } = useFileDiff(workingCopyPath, fileName)
  const { data: fullFileContent } = useFileContent(workingCopyPath, fileName)

  const editorTheme = useMemo(() => {
    return document.documentElement.classList.contains('dark') ? 'vs-dark' : 'light'
  }, [])

  const { oldContent, newContent, oldFileName: _oldFileName, newFileName } = useMemo(() => {
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

  if (!fileName) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select a file to view its diff
          </p>
        </div>
      </div>
    )
  }

  // For new files (ADDED), show only new content
  const isNewFile = status === 'ADDED'
  // For deleted files, show only old content
  const isDeletedFile = status === 'DELETED'
  // For modified files, we can show split or unified view
  const isModified = status === 'MODIFIED' && !isNewFile && !isDeletedFile

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/95 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusChip(status)}
          <div className="text-sm font-medium text-gray-900 dark:text-white">{fileName}</div>
        </div>
        {isModified && (
          <div className="inline-flex items-center gap-0.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900">
            <button
              onClick={() => setViewMode('unified')}
              className={`px-2.5 py-1.5 text-xs transition-colors rounded-l-md ${
                viewMode === 'unified'
                  ? 'bg-teal-600 text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              title="Unified View"
            >
              <Bars3Icon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1.5 text-xs transition-colors rounded-r-md ${
                viewMode === 'split'
                  ? 'bg-teal-600 text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              title="Split View"
            >
              <Squares2X2Icon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
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
              {status === 'UNVERSIONED' && (
                <p className="text-xs text-gray-500 dark:text-gray-400">This file is not under version control.</p>
              )}
            </div>
          </div>
        ) : diffContent ? (
          <div className="h-full flex">
            {isNewFile ? (
              // New file: show only new content
              <div className="flex-1 h-full border-r border-gray-200 dark:border-gray-800">
                <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 text-xs font-semibold text-green-700 dark:text-green-300">
                  NEW FILE
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
            ) : isDeletedFile ? (
              // Deleted file: show only old content
              <div className="flex-1 h-full border-r border-gray-200 dark:border-gray-800">
                <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-xs font-semibold text-red-700 dark:text-red-300">
                  DELETED FILE
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
            ) : (
              // Modified file: unified or split diff view using Monaco DiffEditor
              <div className="flex-1 h-full flex flex-col" style={{ minHeight: 0 }}>
                <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2 flex-shrink-0">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white text-[10px]">
                    Δ
                  </span>
                  <span>
                    CHANGES {newFileName ? `(${newFileName})` : ''}
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
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 px-6">
            <p className="text-center">No changes detected for this file.</p>
          </div>
        )}
      </div>
    </div>
  )
}
