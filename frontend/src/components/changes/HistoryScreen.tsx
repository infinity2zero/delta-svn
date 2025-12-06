import { useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { DocumentTextIcon } from '@heroicons/react/24/outline'
import { HistoryView } from './HistoryView'
import { RevisionDiffViewer } from '../diff/RevisionDiffViewer'
import type { CommitLogEntry } from '../../hooks/useCommitHistory'

type HistoryScreenProps = {
  workingCopyPath?: string
  repositoryUrl?: string
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void
}

export function HistoryScreen({ workingCopyPath, repositoryUrl, onShowToast }: HistoryScreenProps) {
  const [selectedCommit, setSelectedCommit] = useState<CommitLogEntry | null>(null)
  const [selectedHistoryFile, setSelectedHistoryFile] = useState<string | null>(null)

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">
            History
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Browse commits, inspect changed files, and view diffs for this working copy
          </p>
        </div>
        {repositoryUrl && (
          <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="truncate max-w-xs" title={repositoryUrl}>
              {repositoryUrl}
            </span>
          </div>
        )}
      </div>

      <PanelGroup direction="vertical" className="flex flex-1 overflow-hidden">
        {/* Top Panel: History (commits + changed files) */}
        <Panel defaultSize={55} minSize={35} maxSize={75}>
          <div className="h-full bg-white dark:bg-gray-900">
            <HistoryView
              workingCopyPath={workingCopyPath}
              selectedCommit={selectedCommit}
              onSelectCommit={(commit) => {
                setSelectedCommit(commit)
                setSelectedHistoryFile(null)
              }}
              selectedFilePath={selectedHistoryFile}
              onSelectFile={setSelectedHistoryFile}
              onShowToast={onShowToast}
              isActive={true}
            />
          </div>
        </Panel>

        {/* Resize Handle */}
        <PanelResizeHandle className="h-1 bg-gray-200 dark:bg-gray-800 hover:bg-teal-500 dark:hover:bg-teal-600 transition-colors cursor-row-resize" />

        {/* Bottom Panel: Revision Diff Viewer */}
        <Panel defaultSize={45} minSize={25}>
          <div className="h-full bg-white dark:bg-gray-900">
            {selectedCommit && selectedHistoryFile ? (
              <RevisionDiffViewer
                filePath={selectedHistoryFile}
                revision={selectedCommit.revision}
                workingCopyPath={workingCopyPath}
                changedPaths={selectedCommit.changed_paths}
                hideFileList={true}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <DocumentTextIcon className="h-16 w-16 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Select a file to view its diff</p>
                  <p className="text-xs mt-1 opacity-75">
                    Click on any file in the History table above
                  </p>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </PanelGroup>
    </div>
  )
}


