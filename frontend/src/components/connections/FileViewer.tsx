import { useMemo } from 'react'
import Editor from '@monaco-editor/react'
import { useTheme } from '../../hooks/useTheme'
import {
  DocumentTextIcon,
  ClipboardDocumentIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { Tooltip } from 'react-tooltip'

type FileViewerProps = {
  filePath: string | null
  fileContent: string | null
  isLoading: boolean
  error: Error | null
  connectionUrl: string
}

// Detect language from file extension
function detectLanguage(filePath: string | null): string {
  if (!filePath) return 'plaintext'
  
  const ext = filePath.split('.').pop()?.toLowerCase()
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'rs': 'rust',
    'go': 'go',
    'rb': 'ruby',
    'php': 'php',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'ini': 'ini',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'sql': 'sql',
    'dockerfile': 'dockerfile',
    'makefile': 'makefile',
  }
  
  return languageMap[ext || ''] || 'plaintext'
}

export function FileViewer({ filePath, fileContent, isLoading, error, connectionUrl }: FileViewerProps) {
  const { theme } = useTheme()
  const editorTheme = theme === 'dark' ? 'vs-dark' : 'light'
  const language = useMemo(() => detectLanguage(filePath), [filePath])

  const handleCopyPath = async () => {
    if (!filePath) return
    try {
      await navigator.clipboard.writeText(filePath)
    } catch (err) {
      console.error('Failed to copy path:', err)
    }
  }

  const handleDownload = async () => {
    if (!filePath || !fileContent) return
    
    try {
      const fileName = filePath.split('/').pop() || 'file'
      const blob = new Blob([fileContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download file:', err)
    }
  }

  if (!filePath) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <DocumentTextIcon className="h-16 w-16 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No file selected</p>
          <p className="text-xs mt-1 opacity-75">Click on a file in the repository browser to view its contents</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent mb-2"></div>
          <p className="text-sm">Loading file content...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center text-red-600 dark:text-red-400">
          <p className="text-sm font-medium mb-2">Failed to load file</p>
          <p className="text-xs">{error.message}</p>
        </div>
      </div>
    )
  }

  // Check if file is binary (common binary extensions)
  const binaryExtensions = ['png', 'jpg', 'jpeg', 'gif', 'pdf', 'zip', 'tar', 'gz', 'exe', 'dll', 'so', 'dylib']
  const isBinary = binaryExtensions.some(ext => filePath.toLowerCase().endsWith(`.${ext}`))

  if (isBinary) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-900 dark:text-white">{filePath}</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
              Binary File
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPath}
              data-tooltip-id="copy-path-tooltip"
              data-tooltip-content="Copy file path"
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
            </button>
            <Tooltip id="copy-path-tooltip" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <DocumentTextIcon className="h-16 w-16 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Binary file detected</p>
            <p className="text-xs mt-1 opacity-75">This file type cannot be displayed as text</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-gray-900 dark:text-white truncate" title={filePath}>
            {filePath}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300">
            Readonly
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleCopyPath}
            data-tooltip-id="copy-path-tooltip"
            data-tooltip-content="Copy file path"
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
          </button>
          <Tooltip id="copy-path-tooltip" />
          {fileContent && (
            <>
              <button
                onClick={handleDownload}
                data-tooltip-id="download-tooltip"
                data-tooltip-content="Download file"
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
              </button>
              <Tooltip id="download-tooltip" />
            </>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language}
          value={fileContent || ''}
          theme={editorTheme}
          options={{
            readOnly: true,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            fontSize: 12,
            lineNumbers: 'on',
            wordWrap: 'on',
            renderWhitespace: 'selection',
            automaticLayout: true,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
            },
          }}
        />
      </div>
    </div>
  )
}

