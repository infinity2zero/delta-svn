import { useMemo } from 'react'
import Editor from '@monaco-editor/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { parseUnifiedDiff } from '../../utils/diffParser'

type CompareModalProps = {
  diffContent: string
  title: string
  onClose: () => void
}

export function CompareModal({ diffContent, title, onClose }: CompareModalProps) {
  const editorTheme = useMemo(() => {
    return document.documentElement.classList.contains('dark') ? 'vs-dark' : 'light'
  }, [])

  const { oldContent, newContent, oldFileName, newFileName } = useMemo(() => {
    if (!diffContent) {
      return { oldContent: '', newContent: '', oldFileName: undefined, newFileName: undefined }
    }
    return parseUnifiedDiff(diffContent)
  }, [diffContent])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-[90vw] h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3.5 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/95 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-between flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{title}</h3>
            {oldFileName && newFileName && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {oldFileName} → {newFileName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors flex-shrink-0"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Diff Content */}
        <div className="flex-1 overflow-hidden">
          {oldContent && newContent ? (
            <div className="h-full flex">
              {/* Old Content */}
              <div className="flex-1 h-full border-r border-gray-200 dark:border-gray-700">
                <div className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-xs font-semibold text-red-700 dark:text-red-300">
                  OLD {oldFileName ? `(${oldFileName})` : ''}
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

              {/* New Content */}
              <div className="flex-1 h-full">
                <div className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 text-xs font-semibold text-green-700 dark:text-green-300">
                  NEW {newFileName ? `(${newFileName})` : ''}
                </div>
                <Editor
                  height="calc(100% - 32px)"
                  defaultLanguage="plaintext"
                  value={newContent}
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
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <Editor
                height="100%"
                defaultLanguage="diff"
                value={diffContent}
                theme={editorTheme}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 12,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

