import type { FileChange } from '../../types'
import { FolderIcon, DocumentIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline'

type FileListPanelProps = {
  changes: FileChange[]
  selectedChange?: FileChange | null
  stagedFiles: Set<string>
  onSelectChange?: (change: FileChange) => void
  onToggleFile: (fileName: string) => void
  getFilesInDirectory?: (dirPath: string) => string[]
  isDirectory?: (path: string) => boolean
}

export function FileListPanel({
  changes,
  selectedChange,
  stagedFiles,
  onSelectChange,
  onToggleFile,
  getFilesInDirectory,
  isDirectory,
}: FileListPanelProps) {
  if (changes.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
        No changes detected.
      </div>
    )
  }

  // Helper to get all files under a directory path
  const getAllFilesInDir = (dirPath: string): string[] => {
    if (!getFilesInDirectory) {
      // Fallback: find all files that start with the directory path
      return changes
        .filter((f) => f.name === dirPath || f.name.startsWith(dirPath + '/'))
        .map((f) => f.name)
    }
    return getFilesInDirectory(dirPath)
  }

  // Check if a path is a directory (has children)
  const checkIsDirectory = (path: string): boolean => {
    if (!isDirectory) {
      // Fallback: check if any file starts with this path + '/'
      return changes.some((f) => f.name !== path && f.name.startsWith(path + '/'))
    }
    return isDirectory(path)
  }

  // Check if all files in a directory are staged
  const areAllFilesInDirStaged = (dirPath: string): boolean => {
    const dirFiles = getAllFilesInDir(dirPath)
    return dirFiles.length > 0 && dirFiles.every((f) => stagedFiles.has(f))
  }

  // Check if some (but not all) files in a directory are staged
  const areSomeFilesInDirStaged = (dirPath: string): boolean => {
    const dirFiles = getAllFilesInDir(dirPath)
    const stagedCount = dirFiles.filter((f) => stagedFiles.has(f)).length
    return stagedCount > 0 && stagedCount < dirFiles.length
  }

  // Group files by top-level directory
  const groupedFiles = new Map<string, FileChange[]>()
  const rootFiles: FileChange[] = []

  changes.forEach((file) => {
    const parts = file.name.split('/')
    if (parts.length > 1) {
      const topDir = parts[0]
      if (!groupedFiles.has(topDir)) {
        groupedFiles.set(topDir, [])
      }
      groupedFiles.get(topDir)!.push(file)
    } else {
      rootFiles.push(file)
    }
  })

  const handleFileToggle = (fileName: string, e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent) => {
    e.stopPropagation()
    
    // Check if this is a directory path
    if (checkIsDirectory(fileName)) {
      // Toggle all files in this directory
      const dirFiles = getAllFilesInDir(fileName)
      const allSelected = dirFiles.every((f) => stagedFiles.has(f))
      
      if (allSelected) {
        // Deselect all files in directory
        dirFiles.forEach((f) => onToggleFile(f))
      } else {
        // Select all files in directory
        dirFiles.forEach((f) => {
          if (!stagedFiles.has(f)) {
            onToggleFile(f)
          }
        })
      }
    } else {
      // Regular file toggle
      onToggleFile(fileName)
    }
  }

  // Get status chip with icon
  const getStatusChip = (status: FileChange['status']) => {
    switch (status) {
      case 'ADDED':
        return (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30">
            <PlusIcon className="h-3 w-3 text-green-600 dark:text-green-400" />
            <span className="text-[10px] font-medium text-green-700 dark:text-green-300">Added</span>
          </div>
        )
      case 'MODIFIED':
        return (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30">
            <div className="h-2 w-2 rounded-full bg-yellow-500 dark:bg-yellow-400" />
            <span className="text-[10px] font-medium text-yellow-700 dark:text-yellow-300">Modified</span>
          </div>
        )
      case 'DELETED':
        return (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30">
            <MinusIcon className="h-3 w-3 text-red-600 dark:text-red-400" />
            <span className="text-[10px] font-medium text-red-700 dark:text-red-300">Deleted</span>
          </div>
        )
      case 'UNVERSIONED':
        return (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
            <PlusIcon className="h-3 w-3 text-gray-500 dark:text-gray-400" />
            <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Unversioned</span>
          </div>
        )
      default:
        return null
    }
  }

  const renderFile = (file: FileChange, showFullPath: boolean = true) => {
    const isSelected = selectedChange?.name === file.name
    const isStaged = stagedFiles.has(file.name)
    const fileIsDir = checkIsDirectory(file.name)
    const dirStaged = fileIsDir && areAllFilesInDirStaged(file.name)
    const dirIndeterminate = fileIsDir && areSomeFilesInDirStaged(file.name)

    return (
      <div
        key={file.name}
        className={`px-3 py-1.5 cursor-pointer transition-colors flex items-center gap-2 ${
          isSelected
            ? 'bg-teal-50 dark:bg-teal-900/20 border-l-2 border-teal-600 dark:border-teal-500'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
        onClick={() => onSelectChange?.(file)}
      >
        <input
          type="checkbox"
          checked={isStaged || dirStaged}
          ref={(el) => {
            if (el) {
              el.indeterminate = dirIndeterminate
            }
          }}
          onChange={(e) => {
            handleFileToggle(file.name, e)
            // Also mark this file as the selected row so toolbar actions
            // (like Add for UNVERSIONED) see the correct selection.
            onSelectChange?.(file)
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400 flex-shrink-0"
        />
        {fileIsDir ? (
          <FolderIcon className="h-4 w-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
        ) : (
          <DocumentIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0 text-sm text-gray-900 dark:text-white truncate">
          {showFullPath ? file.name : file.name.split('/').pop()}
        </div>
        <div className="flex-shrink-0">
          {getStatusChip(file.status)}
        </div>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {/* Root level files */}
      {rootFiles.map((file) => renderFile(file, true))}

      {/* Directory groups */}
      {Array.from(groupedFiles.entries()).map(([topDir, files]) => {
        const dirPath = topDir
        const dirStaged = areAllFilesInDirStaged(dirPath)
        const dirIndeterminate = areSomeFilesInDirStaged(dirPath)

        return (
          <div key={topDir}>
            {/* Directory header - clickable to select/deselect all */}
            {files.length > 0 && (
              <div
                className={`px-3 py-1.5 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 ${
                  dirStaged ? 'bg-teal-50/50 dark:bg-teal-900/10' : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  handleFileToggle(dirPath, e)
                }}
              >
                <input
                  type="checkbox"
                  checked={dirStaged}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = dirIndeterminate
                    }
                  }}
                  onChange={(e) => handleFileToggle(dirPath, e)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400 flex-shrink-0"
                />
                <FolderIcon className="h-4 w-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                <div className="flex-1 min-w-0 text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {topDir}/
                </div>
              </div>
            )}
            {/* Files in this directory */}
            {files.map((file) => renderFile(file, true))}
          </div>
        )
      })}
    </div>
  )
}
