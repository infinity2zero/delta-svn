import './App.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { TitleBar } from './components/layout/TitleBar'
import { Toolbar } from './components/layout/Toolbar'
import { StatusBar } from './components/layout/StatusBar'
import { NavigationSidebar } from './components/navigation/NavigationSidebar'
import { RepositoryList } from './components/repositories/RepositoryList'
import { ChangesView } from './components/changes/ChangesView'
import { RepositoryDetails } from './components/details/RepositoryDetails'
import { useRepositories } from './hooks/useRepositories'
import { useTheme } from './hooks/useTheme'
import { useFontSize } from './hooks/useFontSize'
import { useUIStore } from './store/uiStore'
import type { UITab } from './store/uiStore'
import { useFileChanges } from './hooks/useFileChanges'
import { ConnectionsScreen } from './components/connections/ConnectionsScreen'
import { useUpdate } from './hooks/useUpdate'
import { Toast, type ToastType } from './components/ui/Toast'
import { SettingsModal } from './components/settings/SettingsModal'
import { OutputPanel } from './components/ui/OutputPanel'
import { useOutput } from './contexts/OutputContext'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
  DocumentTextIcon,
  FolderIcon,
  LinkIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { HistoryScreen } from './components/changes/HistoryScreen'
import { MoveRenameModal } from './components/changes/MoveRenameModal'
import { CopyFileModal } from './components/changes/CopyFileModal'
import { ConfirmDialog } from './components/ui/ConfirmDialog'
import { OnboardingScreen } from './components/onboarding/OnboardingScreen'
import { useOnboarding } from './hooks/useOnboarding'
import { UserGuideScreen } from './components/help/UserGuideScreen'
import { ConflictResolutionModal } from './components/conflicts/ConflictResolutionModal'
import { BranchSwitchModal } from './components/branches/BranchSwitchModal'
import { CreateBranchTagModal } from './components/branches/CreateBranchTagModal'

const navItems: { key: UITab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'changes', label: 'Changes', icon: DocumentTextIcon },
  { key: 'history', label: 'History', icon: ClockIcon },
  { key: 'repositories', label: 'Repositories', icon: FolderIcon },
  { key: 'connections', label: 'Connections', icon: LinkIcon },
]


function App() {
  const activeTab = useUIStore((state) => state.activeTab)
  const setActiveTab = useUIStore((state) => state.setActiveTab)
  const { repositories, selectedRepo: defaultSelectedRepo, loading: repoLoading, error: repoError } = useRepositories()
  const [selectedRepo, setSelectedRepo] = useState<typeof repositories[number] | null>(null)
  const { data: fileChanges = [], isLoading: statusLoading, error: statusError } = useFileChanges(selectedRepo?.path)
  const { theme, toggleTheme } = useTheme()
  useFontSize() // Initialize font size settings
  const [selectedChange, setSelectedChange] = useState<typeof fileChanges[number] | null>(null)
  const [stagedFiles, setStagedFiles] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showUserGuide, setShowUserGuide] = useState(false)
  const [showMoveRenameModal, setShowMoveRenameModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteAction, setDeleteAction] = useState<{ files: string[], isDirectory: boolean, isMultiple: boolean } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConflictResolution, setShowConflictResolution] = useState(false)
  const [showBranchSwitch, setShowBranchSwitch] = useState(false)
  const [showCopyFileModal, setShowCopyFileModal] = useState(false)
  const [showCreateBranch, setShowCreateBranch] = useState(false)
  const [showCreateTag, setShowCreateTag] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const updateMutation = useUpdate()
  const queryClient = useQueryClient()
  const { logs, progress, addLog, setProgress, clearLogs, isOpen, setIsOpen } = useOutput()
  const { showOnboarding, isLoading: onboardingLoading, completeOnboarding, skipOnboarding } = useOnboarding()

  // Listen for real-time SVN output
  useEffect(() => {
    let unlistenFn: (() => void) | null = null

    const setupSvnOutputListener = async () => {
      const unlisten = await listen<string>('svn-output', (event) => {
        // Add each line of SVN output as a log entry
        const lines = event.payload.split('\n').filter(line => line.trim().length > 0)
        lines.forEach(line => {
          // Determine log level based on content
          let level: 'info' | 'success' | 'error' | 'warning' = 'info'
          if (line.startsWith('$ ')) {
            // Command being executed
            level = 'info'
          } else if (line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')) {
            level = 'error'
          } else if (line.toLowerCase().includes('warning')) {
            level = 'warning'
          } else if (line.toLowerCase().includes('committed') || line.toLowerCase().includes('added') || line.toLowerCase().includes('success')) {
            level = 'success'
          }
          addLog(line, level)
        })
      })
      unlistenFn = unlisten
    }

    setupSvnOutputListener()

    return () => {
      if (unlistenFn) {
        unlistenFn()
      }
    }
  }, [addLog])

  // Auto-select repository: use defaultSelectedRepo or first repo if only one exists
  useEffect(() => {
    if (!selectedRepo) {
      if (defaultSelectedRepo) {
        setSelectedRepo(defaultSelectedRepo)
      } else if (repositories.length === 1) {
        setSelectedRepo(repositories[0])
      }
    }
  }, [defaultSelectedRepo, selectedRepo, repositories])

  const handleUpdate = useCallback(async () => {
    if (!selectedRepo?.path) return

    try {
      const result = await updateMutation.mutateAsync(selectedRepo.path)
      const message = `Update completed!\nUpdated to revision: ${result.updated_to_revision}\nFiles updated: ${result.files_updated}${
        result.conflicts > 0 ? `\nConflicts: ${result.conflicts}` : ''
      }`
      setToast({ message, type: 'success' })
    } catch (error) {
      setToast({
        message: `Update failed: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error',
      })
    }
  }, [selectedRepo?.path, updateMutation])


  const repoStats = useMemo(
    () => ({
      totalRepos: repositories.length,
      totalChanges: fileChanges.length, // Use actual file changes count instead of repo changes
    }),
    [repositories, fileChanges.length],
  )

  const handleRefresh = useCallback(() => {
    setLastRefreshTime(new Date())
    if (selectedRepo?.path) {
      queryClient.invalidateQueries({ queryKey: ['fileChanges', selectedRepo.path] })
      queryClient.invalidateQueries({ queryKey: ['repositories'] })
      // Also refresh commit history - reset pages first for infinite query
      queryClient.resetQueries({ 
        queryKey: ['commitHistory', selectedRepo.path],
        exact: false 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['commitHistory', selectedRepo.path],
        exact: false 
      })
      queryClient.refetchQueries({ 
        queryKey: ['commitHistory', selectedRepo.path],
        exact: false 
      })
    }
  }, [selectedRepo?.path, queryClient])

  const handleToolbarAction = useCallback((actionId: string) => {
    switch (actionId) {
      case 'update':
        handleUpdate()
        break
      case 'commit':
        setToast({ message: 'Use the commit panel at the bottom to commit changes', type: 'info' })
        break
      case 'revert':
        setToast({ message: 'Revert functionality coming soon', type: 'info' })
        break
      case 'add':
        if (activeTab !== 'changes') {
          setToast({ message: 'Add operation is only available on the Changes tab', type: 'info' })
          break
        }
        if (!selectedRepo?.path || !selectedChange) {
          setToast({ message: 'Please select an unversioned file or folder to add', type: 'info' })
          break
        }
        if (selectedChange.status !== 'UNVERSIONED') {
          setToast({ message: 'Selected item is not unversioned. Only unversioned files/folders can be added.', type: 'info' })
          break
        }
        
        // Determine the directory path and files to add
        // If the selected file is inside a directory (e.g., "newfolder/file.txt"),
        // we want to add the directory itself (e.g., "newfolder") to add all files recursively
        const selectedPath = selectedChange.name
        const pathParts = selectedPath.split('/')
        
        // Check if this is a file inside a directory (has a parent directory)
        const isFileInDir = pathParts.length > 1
        const parentDir = isFileInDir ? pathParts[0] : null
        
        // Get all unversioned files in the same directory (if it's a file in a directory)
        // or check if the selected path itself is a directory (has children)
        let filesToAdd: string[] = []
        let itemCount = 0
        let isDir = false
        
        if (isFileInDir && parentDir) {
          // Selected file is inside a directory - check if all files in that directory are unversioned
          const filesInParentDir = fileChanges.filter((f) => 
            f.status === 'UNVERSIONED' && 
            (f.name === parentDir || f.name.startsWith(parentDir + '/'))
          )
          
          if (filesInParentDir.length > 0) {
            // Add the directory itself - SVN will recursively add all files inside it
            filesToAdd = [parentDir]
            itemCount = filesInParentDir.length
            isDir = true
            addLog(`Adding directory to SVN: ${parentDir} (contains ${itemCount} unversioned file(s))`, 'info')
            setProgress({ active: true, message: `Adding ${parentDir} and ${itemCount} file(s)...` })
          } else {
            // No other files in directory, just add this file
            filesToAdd = [selectedPath]
            itemCount = 1
            addLog(`Adding file to SVN: ${selectedPath}`, 'info')
            setProgress({ active: true, message: `Adding ${selectedPath}...` })
          }
        } else {
          // Selected item is at root level - check if it's a directory (has children)
          isDir = fileChanges.some((f) => f.name !== selectedPath && f.name.startsWith(selectedPath + '/'))
          
          if (isDir) {
            // It's a directory - count unversioned files inside it
            const filesInDir = fileChanges.filter((f) => 
              f.status === 'UNVERSIONED' && 
              f.name !== selectedPath && 
              f.name.startsWith(selectedPath + '/')
            )
            itemCount = filesInDir.length
            
            if (itemCount === 0) {
              setToast({ message: 'No unversioned files found in the selected folder', type: 'info' })
              break
            }
            
            // Add the directory itself
            filesToAdd = [selectedPath]
            addLog(`Adding directory to SVN: ${selectedPath} (contains ${itemCount} file(s))`, 'info')
            setProgress({ active: true, message: `Adding ${selectedPath} and ${itemCount} file(s)...` })
          } else {
            // Single file at root
            filesToAdd = [selectedPath]
            itemCount = 1
            addLog(`Adding file to SVN: ${selectedPath}`, 'info')
            setProgress({ active: true, message: `Adding ${selectedPath}...` })
          }
        }
        
        invoke('add_files_to_svn', {
          workingCopyPath: selectedRepo.path,
          files: filesToAdd,
        })
          .then(async () => {
            const itemName = isDir ? `${selectedChange.name} (${itemCount} file(s))` : selectedChange.name
            addLog(`Successfully added ${itemName} to SVN`, 'success')
            setProgress({ active: false })
            setToast({ message: `Successfully added ${itemName} to SVN`, type: 'success' })
            // Force refresh file changes - wait a bit for SVN to update its internal state
            addLog('Refreshing file changes...', 'info')
            // Wait longer for SVN to update, especially for directories
            await new Promise(resolve => setTimeout(resolve, 500))
            // Invalidate and force refetch
            queryClient.invalidateQueries({ queryKey: ['fileChanges', selectedRepo.path] })
            await queryClient.refetchQueries({ 
              queryKey: ['fileChanges', selectedRepo.path],
              type: 'active'
            })
            // Also invalidate repositories to refresh counts
            queryClient.invalidateQueries({ queryKey: ['repositories'] })
            await queryClient.refetchQueries({ 
              queryKey: ['repositories'],
              type: 'active'
            })
            addLog('File changes refreshed', 'success')
          })
          .catch((error) => {
            const errorMsg = error instanceof Error ? error.message : String(error)
            addLog(`Failed to add: ${errorMsg}`, 'error')
            setProgress({ active: false })
            setToast({
              message: `Failed to add: ${errorMsg}`,
              type: 'error',
            })
          })
        break
      case 'delete':
        if (activeTab !== 'changes') {
          setToast({ message: 'Delete operation is only available on the Changes tab', type: 'info' })
          break
        }
        if (!selectedRepo?.path) {
          setToast({ message: 'No repository selected', type: 'error' })
          break
        }
        // Check if there are staged files selected (multiple selection via checkboxes)
        const hasStagedFiles = stagedFiles.size > 0
        
        if (!hasStagedFiles && !selectedChange) {
          setToast({ message: 'Please select a file or folder to delete', type: 'info' })
          break
        }
        
        // Determine files to delete
        let filesToDelete: string[] = []
        let isDirectory = false
        let isMultiple = false
        
        if (hasStagedFiles) {
          // Multiple files selected via checkboxes - use those
          filesToDelete = Array.from(stagedFiles)
          isMultiple = true
        } else if (selectedChange) {
          // Single file selected - check if it's a directory
          const fileToDelete = selectedChange.name
          
          // Check if it's a directory by seeing if any other files start with this path
          isDirectory = fileChanges.some(f => 
            f.name !== fileToDelete && f.name.startsWith(fileToDelete + '/')
          )
          
          if (isDirectory) {
            // Get all files in this directory
            filesToDelete = fileChanges
              .filter(f => f.name === fileToDelete || f.name.startsWith(fileToDelete + '/'))
              .map(f => f.name)
          } else {
            filesToDelete = [fileToDelete]
          }
        }
        
        // Store delete action and show confirmation dialog
        setDeleteAction({ files: filesToDelete, isDirectory, isMultiple })
        setShowDeleteConfirm(true)
        break
      case 'move':
        if (activeTab !== 'changes') {
          setToast({ message: 'Move/Rename operation is only available on the Changes tab', type: 'info' })
          break
        }
        if (!selectedRepo?.path) {
          setToast({ message: 'No repository selected', type: 'error' })
          break
        }
        if (!selectedChange) {
          setToast({ message: 'Please select a file or folder to move/rename', type: 'info' })
          break
        }
        setShowMoveRenameModal(true)
        break
      case 'resolve':
        if (!selectedRepo?.path) {
          setToast({ message: 'No repository selected', type: 'error' })
          break
        }
        // Check if there are conflicts
        const hasConflicts = fileChanges.some((f) => f.status === 'CONFLICTED')
        if (!hasConflicts) {
          setToast({ message: 'No conflicts found in the working copy', type: 'info' })
          break
        }
        setShowConflictResolution(true)
        break
      case 'switch':
        if (!selectedRepo?.path) {
          setToast({ message: 'No repository selected', type: 'error' })
          break
        }
        setShowBranchSwitch(true)
        break
      case 'copy':
        if (activeTab !== 'changes') {
          setToast({ message: 'Copy operation is only available on the Changes tab', type: 'info' })
          break
        }
        if (!selectedRepo?.path || !selectedChange) {
          setToast({ message: 'Please select a file to copy', type: 'info' })
          break
        }
        setShowCopyFileModal(true)
        break
      case 'branch':
        if (!selectedRepo?.path) {
          setToast({ message: 'No repository selected', type: 'error' })
          break
        }
        setShowCreateBranch(true)
        break
      case 'tag':
        if (!selectedRepo?.path) {
          setToast({ message: 'No repository selected', type: 'error' })
          break
        }
        setShowCreateTag(true)
        break
      case 'relocate':
      case 'merge':
      case 'cleanup':
      case 'diff':
      case 'log':
      case 'blame':
        if (!selectedRepo?.path) {
          setToast({ message: 'No repository selected', type: 'error' })
          break
        }
        if (!selectedChange) {
          setToast({ message: 'Please select a file to view blame', type: 'info' })
          break
        }
        // Blame functionality - show blame for selected file
        // This will be handled by the ChangesView component
        // For now, show a message that it's available via context menu
        setToast({ message: 'Blame available via right-click on file in History tab', type: 'info' })
        break
      case 'export':
        if (!selectedRepo?.path) {
          setToast({ message: 'No repository selected', type: 'error' })
          break
        }
        // Export current working copy
        invoke<string | null>('open_folder_dialog', {
          title: 'Select export destination',
          defaultPath: undefined,
        })
          .then(async (exportPath) => {
            if (exportPath) {
              try {
                // Export current working copy (HEAD revision)
                await invoke<string>('export_revision', {
                  workingCopyPath: selectedRepo.path,
                  revision: 'HEAD',
                  exportPath,
                })
                setToast({ message: `Exported working copy to ${exportPath}`, type: 'success' })
                addLog(`Exported working copy to ${exportPath}`, 'success')
              } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error)
                setToast({ message: `Failed to export: ${errorMsg}`, type: 'error' })
                addLog(`Failed to export: ${errorMsg}`, 'error')
              }
            }
          })
          .catch((error) => {
            const errorMsg = error instanceof Error ? error.message : String(error)
            setToast({ message: `Failed to open folder dialog: ${errorMsg}`, type: 'error' })
          })
        break
      case 'info':
      case 'import':
      case 'branch':
      case 'tag':
      case 'list':
      case 'properties':
      case 'ignore':
      case 'lock':
      case 'unlock':
        setToast({ message: `${actionId} functionality coming soon`, type: 'info' })
        break
      case 'help':
        setShowUserGuide(true)
        break
      default:
        console.log('Unknown action:', actionId)
    }
  }, [handleUpdate])

  // Set initial refresh time
  useEffect(() => {
    if (!lastRefreshTime) {
      setLastRefreshTime(new Date())
    }
  }, [lastRefreshTime])

  useEffect(() => {
    setSelectedChange(null)
  }, [activeTab, fileChanges.length])

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
      {showOnboarding && !onboardingLoading ? (
        <OnboardingScreen
          onComplete={completeOnboarding}
          onSkip={skipOnboarding}
        />
      ) : (
        <>
          <TitleBar selectedRepo={null} toolbarGroups={[]} />
          <div className="pt-[36px] flex flex-col flex-1 overflow-hidden">
            <Toolbar
              repositories={repositories}
              selectedRepo={selectedRepo}
              onSelectRepo={setSelectedRepo}
              fileChanges={fileChanges}
              selectedChange={selectedChange}
              onAction={handleToolbarAction}
              activeTab={activeTab}
            />
            <div className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
              <div className="flex flex-1 overflow-hidden">
                <NavigationSidebar
                  items={navItems}
                  activeKey={activeTab}
                  onSelect={(key) => setActiveTab(key as UITab)}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onShowSettings={() => setShowSettings(true)}
                  hasRepo={!!selectedRepo}
                  onHelp={() => handleToolbarAction('help')}
                  onInfo={() => handleToolbarAction('info')}
                />

                <div className="flex flex-col flex-1 overflow-hidden">
                  {isOpen ? (
                    <PanelGroup direction="vertical" className="flex-1">
                      {/* Main Content Area - When output panel is open */}
                      <Panel 
                        defaultSize={70} 
                        minSize={30} 
                        maxSize={90}
                        className="flex flex-col overflow-hidden"
                      >
                        {activeTab === 'repositories' ? (
                          <PanelGroup direction="horizontal" className="flex-1">
                            <Panel defaultSize={70} minSize={40} maxSize={85}>
                              <div className="flex flex-col flex-1 overflow-hidden">
                                <main className="flex-1 overflow-y-auto">
                                  <div className="px-2 py-2 h-full flex flex-col gap-2">
                                    <RepositoryList 
                                      repositories={repositories} 
                                      loading={repoLoading} 
                                      error={repoError}
                                      selectedRepo={selectedRepo}
                                      onSelect={(repo) => {
                                        setSelectedRepo(repo)
                                        setActiveTab('changes')
                                      }}
                                      onView={setSelectedRepo}
                                    />
                                  </div>
                                </main>
                              </div>
                            </Panel>
                            <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-800 hover:bg-teal-500 dark:hover:bg-teal-600 transition-colors cursor-col-resize" />
                            <Panel defaultSize={30} minSize={15} maxSize={60}>
                              <RepositoryDetails repository={selectedRepo} loading={repoLoading} />
                            </Panel>
                          </PanelGroup>
                        ) : (
                          <div className="flex flex-1 overflow-hidden">
                            <div className="flex flex-col flex-1 overflow-hidden">
                              <main className="flex-1 overflow-y-auto">
                                {showUserGuide ? (
                                  <UserGuideScreen onClose={() => setShowUserGuide(false)} />
                                ) : (
                                  <div className="px-2 py-2 h-full flex flex-col gap-2">
                                    {activeTab === 'connections' && (
                                      <div className="flex-1 overflow-hidden min-h-0">
                                        <ConnectionsScreen />
                                      </div>
                                    )}

                                    {activeTab === 'changes' && (
                                      <div className="flex-1 overflow-hidden min-h-0">
                                        {statusLoading ? (
                                          <div className="p-6 rounded-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-center text-gray-500 dark:text-gray-400">
                                            Loading status…
                                          </div>
                                        ) : statusError ? (
                                          <div className="p-6 rounded-none bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-center text-red-700 dark:text-red-300">
                                            {statusError instanceof Error ? statusError.message : 'Unable to load status'}
                                          </div>
                                        ) : (
                                          <ChangesView
                                            changes={fileChanges}
                                            branchName={selectedRepo?.branch}
                                            selectedChange={selectedChange ?? undefined}
                                            onSelectChange={setSelectedChange}
                                            workingCopyPath={selectedRepo?.path}
                                            repositoryUrl={selectedRepo?.url}
                                            onShowToast={(message, type) => setToast({ message, type })}
                                            onStagedFilesChange={setStagedFiles}
                                          />
                                        )}
                                      </div>
                                    )}

                                    {activeTab === 'history' && (
                                      <div className="flex-1 overflow-hidden min-h-0">
                                        {selectedRepo?.path ? (
                                          <HistoryScreen
                                            workingCopyPath={selectedRepo.path}
                                            repositoryUrl={selectedRepo.url}
                                            onShowToast={(message, type) => setToast({ message, type })}
                                          />
                                        ) : (
                                          <div className="p-6 rounded-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-center text-gray-500 dark:text-gray-400">
                                            Select a repository to view history
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </main>
                            </div>
                          </div>
                        )}
                      </Panel>

                      {/* Output Panel Resize Handle */}
                      <PanelResizeHandle className="h-1 bg-gray-200 dark:bg-gray-800 hover:bg-teal-500 dark:hover:bg-teal-600 transition-colors cursor-row-resize" />

                      {/* Output Panel - Open */}
                      <Panel defaultSize={30} minSize={10} maxSize={70} className="flex flex-col min-h-0">
                        <OutputPanel
                          logs={logs}
                          progress={progress}
                          isOpen={isOpen}
                          onToggle={() => setIsOpen(!isOpen)}
                          onClear={clearLogs}
                        />
                      </Panel>
                    </PanelGroup>
                  ) : (
                    <>
                      {/* Main Content Area - When output panel is closed (takes full height) */}
                      <div className="flex-1 overflow-hidden">
                        {activeTab === 'repositories' ? (
                          <PanelGroup direction="horizontal" className="flex-1 h-full">
                            <Panel defaultSize={70} minSize={40} maxSize={85}>
                              <div className="flex flex-col flex-1 overflow-hidden">
                                <main className="flex-1 overflow-y-auto">
                                  <div className="px-2 py-2 h-full flex flex-col gap-2">
                                    <RepositoryList 
                                      repositories={repositories} 
                                      loading={repoLoading} 
                                      error={repoError}
                                      selectedRepo={selectedRepo}
                                      onSelect={(repo) => {
                                        setSelectedRepo(repo)
                                        setActiveTab('changes')
                                      }}
                                      onView={setSelectedRepo}
                                    />
                                  </div>
                                </main>
                              </div>
                            </Panel>
                            <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-800 hover:bg-teal-500 dark:hover:bg-teal-600 transition-colors cursor-col-resize" />
                            <Panel defaultSize={30} minSize={15} maxSize={60}>
                              <RepositoryDetails repository={selectedRepo} loading={repoLoading} />
                            </Panel>
                          </PanelGroup>
                        ) : (
                          <div className="flex flex-1 overflow-hidden h-full">
                            <div className="flex flex-col flex-1 overflow-hidden">
                              <main className="flex-1 overflow-y-auto">
                                {showUserGuide ? (
                                  <UserGuideScreen onClose={() => setShowUserGuide(false)} />
                                ) : (
                                  <div className="px-2 py-2 h-full flex flex-col gap-2">
                                    {activeTab === 'connections' && (
                                      <div className="flex-1 overflow-hidden min-h-0">
                                        <ConnectionsScreen />
                                      </div>
                                    )}

                                    {activeTab === 'changes' && (
                                      <div className="flex-1 overflow-hidden min-h-0">
                                        {statusLoading ? (
                                          <div className="p-6 rounded-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-center text-gray-500 dark:text-gray-400">
                                            Loading status…
                                          </div>
                                        ) : statusError ? (
                                          <div className="p-6 rounded-none bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-center text-red-700 dark:text-red-300">
                                            {statusError instanceof Error ? statusError.message : 'Unable to load status'}
                                          </div>
                                        ) : (
                                          <ChangesView
                                            changes={fileChanges}
                                            branchName={selectedRepo?.branch}
                                            selectedChange={selectedChange ?? undefined}
                                            onSelectChange={setSelectedChange}
                                            workingCopyPath={selectedRepo?.path}
                                            repositoryUrl={selectedRepo?.url}
                                            onShowToast={(message, type) => setToast({ message, type })}
                                            onStagedFilesChange={setStagedFiles}
                                          />
                                        )}
                                      </div>
                                    )}

                                    {activeTab === 'history' && (
                                      <div className="flex-1 overflow-hidden min-h-0">
                                        {selectedRepo?.path ? (
                                          <HistoryScreen
                                            workingCopyPath={selectedRepo.path}
                                            repositoryUrl={selectedRepo.url}
                                            onShowToast={(message, type) => setToast({ message, type })}
                                          />
                                        ) : (
                                          <div className="p-6 rounded-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-center text-gray-500 dark:text-gray-400">
                                            Select a repository to view history
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </main>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Output Panel Header Bar - When closed */}
                      <div className="h-8 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
                        <OutputPanel
                          logs={logs}
                          progress={progress}
                          isOpen={isOpen}
                          onToggle={() => setIsOpen(!isOpen)}
                          onClear={clearLogs}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Status Bar */}
            <StatusBar
              selectedRepo={selectedRepo}
              totalRepos={repoStats.totalRepos}
              totalChanges={repoStats.totalChanges}
              onRefresh={handleRefresh}
              lastRefreshTime={lastRefreshTime}
            />
          </div>

          {/* Modals */}
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
          <SettingsModal 
            isOpen={showSettings} 
            onClose={() => setShowSettings(false)} 
            onShowUserGuide={() => { setShowSettings(false); setShowUserGuide(true); }} 
          />
          
          {/* Delete Confirmation Dialog */}
          <ConfirmDialog
            isOpen={showDeleteConfirm}
            onClose={() => {
              setShowDeleteConfirm(false)
              setDeleteAction(null)
            }}
            onConfirm={async () => {
              if (!deleteAction || !selectedRepo?.path) {
                setShowDeleteConfirm(false)
                setDeleteAction(null)
                return
              }
              
              // For single file deletion, selectedChange must exist
              if (!deleteAction.isMultiple && !selectedChange) {
                setShowDeleteConfirm(false)
                setDeleteAction(null)
                return
              }

              setIsDeleting(true)
              const deleteMessage = deleteAction.isMultiple
                ? `Deleting ${deleteAction.files.length} file(s)...`
                : `Deleting ${selectedChange?.name}...`
              setProgress({ active: true, message: deleteMessage })
              addLog(`Deleting ${deleteAction.files.length} file(s) from SVN...`, 'info')

              try {
                await invoke('delete_files_from_svn', {
                  workingCopyPath: selectedRepo.path,
                  files: deleteAction.files,
                })

                const itemName = deleteAction.isMultiple
                  ? `${deleteAction.files.length} file(s)`
                  : deleteAction.isDirectory 
                  ? `${selectedChange?.name} (${deleteAction.files.length} file(s))` 
                  : selectedChange?.name || 'file'
                
                addLog(`Successfully deleted ${itemName} from SVN`, 'success')
                setProgress({ active: false })
                setToast({ message: `Successfully deleted ${itemName} from SVN`, type: 'success' })
                
                // Refresh file changes
                await new Promise(resolve => setTimeout(resolve, 500))
                queryClient.invalidateQueries({ queryKey: ['fileChanges', selectedRepo.path] })
                await queryClient.refetchQueries({ 
                  queryKey: ['fileChanges', selectedRepo.path],
                  type: 'active'
                })
                queryClient.invalidateQueries({ queryKey: ['repositories'] })
                await queryClient.refetchQueries({ 
                  queryKey: ['repositories'],
                  type: 'active'
                })
                
                // Clear selection and staged files, then close dialog
                setSelectedChange(null)
                setStagedFiles(new Set())
                setShowDeleteConfirm(false)
                setDeleteAction(null)
              } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error)
                addLog(`Failed to delete: ${errorMsg}`, 'error')
                setProgress({ active: false })
                setToast({
                  message: `Failed to delete: ${errorMsg}`,
                  type: 'error',
                })
              } finally {
                setIsDeleting(false)
              }
            }}
            title="Confirm Delete"
            message={
              deleteAction
                ? deleteAction.isMultiple
                  ? `Are you sure you want to delete ${deleteAction.files.length} selected file(s)?\n\n${deleteAction.files.length <= 5 ? deleteAction.files.map(f => `  • ${f}`).join('\n') : deleteAction.files.slice(0, 5).map(f => `  • ${f}`).join('\n') + `\n  ... and ${deleteAction.files.length - 5} more`}\n\nThis will remove the files from version control. The files will be deleted from the repository on commit.`
                  : deleteAction.isDirectory
                  ? `Are you sure you want to delete "${selectedChange?.name}" and all ${deleteAction.files.length} file(s) inside it?\n\nThis will remove the files from version control. The files will be deleted from the repository on commit.`
                  : `Are you sure you want to delete "${selectedChange?.name}" from the repository?\n\nThis will remove the file from version control. The file will be deleted from the repository on commit.`
                : ''
            }
            confirmText="Delete"
            cancelText="Cancel"
            variant="danger"
            isLoading={isDeleting}
          />
          
          {/* Conflict Resolution Modal */}
          {selectedRepo && (
            <ConflictResolutionModal
              isOpen={showConflictResolution}
              onClose={() => setShowConflictResolution(false)}
              workingCopyPath={selectedRepo.path}
              onResolved={() => {
                setShowConflictResolution(false)
                // Refresh file changes after resolving conflicts
                queryClient.invalidateQueries({ queryKey: ['fileChanges', selectedRepo.path] })
                queryClient.invalidateQueries({ queryKey: ['repositories'] })
                setToast({ message: 'All conflicts resolved successfully', type: 'success' })
              }}
            />
          )}

          {/* Branch Switch Modal */}
          {selectedRepo && (
            <BranchSwitchModal
              isOpen={showBranchSwitch}
              onClose={() => setShowBranchSwitch(false)}
              workingCopyPath={selectedRepo.path}
              currentBranch={selectedRepo.branch}
              onSwitched={() => {
                setShowBranchSwitch(false)
                // Refresh repositories and file changes after switching
                queryClient.invalidateQueries({ queryKey: ['repositories'] })
                queryClient.invalidateQueries({ queryKey: ['fileChanges', selectedRepo.path] })
                setToast({ message: 'Branch switched successfully', type: 'success' })
              }}
            />
          )}

          {/* Create Branch Modal */}
          {selectedRepo && (
            <CreateBranchTagModal
              isOpen={showCreateBranch}
              onClose={() => setShowCreateBranch(false)}
              workingCopyPath={selectedRepo.path}
              kind="branch"
              onCreated={() => {
                setShowCreateBranch(false)
                queryClient.invalidateQueries({ queryKey: ['repositories'] })
                setToast({ message: 'Branch created successfully', type: 'success' })
              }}
            />
          )}

          {/* Create Tag Modal */}
          {selectedRepo && (
            <CreateBranchTagModal
              isOpen={showCreateTag}
              onClose={() => setShowCreateTag(false)}
              workingCopyPath={selectedRepo.path}
              kind="tag"
              onCreated={() => {
                setShowCreateTag(false)
                queryClient.invalidateQueries({ queryKey: ['repositories'] })
                setToast({ message: 'Tag created successfully', type: 'success' })
              }}
            />
          )}

          {/* Copy File Modal */}
          {selectedRepo && selectedChange && (
            <CopyFileModal
              isOpen={showCopyFileModal}
              onClose={() => setShowCopyFileModal(false)}
              onConfirm={async (destinationPath: string) => {
                if (!selectedRepo?.path || !selectedChange) {
                  return
                }
                
                setProgress({ active: true, message: `Copying ${selectedChange.name} to ${destinationPath}...` })
                addLog(`Copying ${selectedChange.name} to ${destinationPath}...`, 'info')
                
                try {
                  await invoke('copy_file_in_svn', {
                    workingCopyPath: selectedRepo.path,
                    sourcePath: selectedChange.name,
                    destinationPath: destinationPath,
                  })
                  
                  addLog(`Successfully copied ${selectedChange.name} to ${destinationPath}`, 'success')
                  setProgress({ active: false })
                  setToast({ 
                    message: `Successfully copied ${selectedChange.name} to ${destinationPath}`, 
                    type: 'success' 
                  })
                  setShowCopyFileModal(false)
                  
                  // Refresh file changes
                  await new Promise(resolve => setTimeout(resolve, 500))
                  queryClient.invalidateQueries({ queryKey: ['fileChanges', selectedRepo.path] })
                  await queryClient.refetchQueries({ 
                    queryKey: ['fileChanges', selectedRepo.path],
                    type: 'active'
                  })
                  queryClient.invalidateQueries({ queryKey: ['repositories'] })
                  await queryClient.refetchQueries({ 
                    queryKey: ['repositories'],
                    type: 'active'
                  })
                } catch (error) {
                  const errorMsg = error instanceof Error ? error.message : String(error)
                  addLog(`Failed to copy: ${errorMsg}`, 'error')
                  setProgress({ active: false })
                  setToast({
                    message: `Failed to copy: ${errorMsg}`,
                    type: 'error',
                  })
                }
              }}
              file={selectedChange}
              workingCopyPath={selectedRepo.path}
            />
          )}

          {/* Move/Rename Modal */}
          <MoveRenameModal
            isOpen={showMoveRenameModal}
            onClose={() => setShowMoveRenameModal(false)}
            onConfirm={async (destinationPath: string) => {
              if (!selectedRepo?.path || !selectedChange) {
                return
              }
              
              setProgress({ active: true, message: `Moving ${selectedChange.name} to ${destinationPath}...` })
              addLog(`Moving ${selectedChange.name} to ${destinationPath}...`, 'info')
              
              try {
                await invoke('move_file_in_svn', {
                  workingCopyPath: selectedRepo.path,
                  sourcePath: selectedChange.name,
                  destinationPath: destinationPath,
                })
                
                addLog(`Successfully moved ${selectedChange.name} to ${destinationPath}`, 'success')
                setProgress({ active: false })
                setToast({ 
                  message: `Successfully moved ${selectedChange.name} to ${destinationPath}`, 
                  type: 'success' 
                })
                setShowMoveRenameModal(false)
                
                // Refresh file changes
                await new Promise(resolve => setTimeout(resolve, 500))
                queryClient.invalidateQueries({ queryKey: ['fileChanges', selectedRepo.path] })
                await queryClient.refetchQueries({ 
                  queryKey: ['fileChanges', selectedRepo.path],
                  type: 'active'
                })
                queryClient.invalidateQueries({ queryKey: ['repositories'] })
                await queryClient.refetchQueries({ 
                  queryKey: ['repositories'],
                  type: 'active'
                })
                // Clear selection
                setSelectedChange(null)
              } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error)
                addLog(`Failed to move: ${errorMsg}`, 'error')
                setProgress({ active: false })
                setToast({
                  message: `Failed to move: ${errorMsg}`,
                  type: 'error',
                })
              }
            }}
            file={selectedChange}
            workingCopyPath={selectedRepo?.path || ''}
          />
        </>
        )}
    </div>
  )
}

export default App
