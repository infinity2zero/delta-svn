import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  XMarkIcon,
  ArrowPathIcon,
  CodeBracketIcon,
  BookmarkIcon,
  FolderIcon,
} from '@heroicons/react/24/outline'
import { Toast, type ToastType } from '../ui/Toast'

type BranchTag = {
  name: string
  kind: string // "branch", "tag", or "trunk"
  url: string
  revision: string
}

type BranchSwitchModalProps = {
  isOpen: boolean
  onClose: () => void
  workingCopyPath: string
  currentBranch?: string
  onSwitched: () => void
}

export function BranchSwitchModal({
  isOpen,
  onClose,
  workingCopyPath,
  currentBranch,
  onSwitched,
}: BranchSwitchModalProps) {
  const [branchesTags, setBranchesTags] = useState<BranchTag[]>([])
  const [loading, setLoading] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  useEffect(() => {
    if (isOpen && workingCopyPath) {
      loadBranchesTags()
    }
  }, [isOpen, workingCopyPath])

  const loadBranchesTags = async () => {
    if (!workingCopyPath) return

    setLoading(true)
    try {
      const items: BranchTag[] = await invoke('list_branches_tags', {
        workingCopyPath,
      })
      setBranchesTags(items)
      
      // Set current branch as selected if available
      if (currentBranch) {
        const current = items.find(
          (item) => item.name === currentBranch || item.url.includes(currentBranch)
        )
        if (current) {
          setSelectedBranch(current.url)
        }
      }
    } catch (error) {
      setToast({
        message: `Failed to load branches/tags: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSwitch = async () => {
    if (!selectedBranch || !workingCopyPath) return

    setSwitching(true)
    try {
      await invoke('switch_branch', {
        workingCopyPath,
        branchUrl: selectedBranch,
      })

      const selectedItem = branchesTags.find((item) => item.url === selectedBranch)
      setToast({
        message: `Successfully switched to ${selectedItem?.name || selectedBranch}`,
        type: 'success',
      })

      onSwitched()
      onClose()
    } catch (error) {
      setToast({
        message: `Failed to switch branch: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error',
      })
    } finally {
      setSwitching(false)
    }
  }

  const filteredItems = branchesTags.filter((item) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      item.name.toLowerCase().includes(query) ||
      item.kind.toLowerCase().includes(query) ||
      item.revision.includes(query)
    )
  })

  const groupedItems = {
    trunk: filteredItems.filter((item) => item.kind === 'trunk'),
    branches: filteredItems.filter((item) => item.kind === 'branch'),
    tags: filteredItems.filter((item) => item.kind === 'tag'),
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <CodeBracketIcon className="h-6 w-6 text-teal-500" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Switch Branch/Tag
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a branch or tag to switch your working copy to
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

          {/* Search */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <input
              type="text"
              placeholder="Search branches/tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                  Loading branches and tags...
                </span>
              </div>
            ) : branchesTags.length === 0 ? (
              <div className="text-center py-12">
                <FolderIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No branches or tags found
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Make sure your repository has a standard structure (trunk/branches/tags)
                </p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No branches/tags match your search
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Trunk */}
                {groupedItems.trunk.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Trunk
                    </h3>
                    <div className="space-y-1">
                      {groupedItems.trunk.map((item) => (
                        <button
                          key={item.url}
                          onClick={() => setSelectedBranch(item.url)}
                          className={`w-full text-left px-4 py-3 rounded-md transition-colors ${
                            selectedBranch === item.url
                              ? 'bg-teal-50 dark:bg-teal-900/20 border-2 border-teal-500'
                              : 'border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FolderIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {item.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  Revision {item.revision}
                                </div>
                              </div>
                            </div>
                            {selectedBranch === item.url && (
                              <div className="h-2 w-2 rounded-full bg-teal-500" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Branches */}
                {groupedItems.branches.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <CodeBracketIcon className="h-4 w-4" />
                      Branches
                    </h3>
                    <div className="space-y-1">
                      {groupedItems.branches.map((item) => (
                        <button
                          key={item.url}
                          onClick={() => setSelectedBranch(item.url)}
                          className={`w-full text-left px-4 py-3 rounded-md transition-colors ${
                            selectedBranch === item.url
                              ? 'bg-teal-50 dark:bg-teal-900/20 border-2 border-teal-500'
                              : 'border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CodeBracketIcon className="h-5 w-5 text-blue-500" />
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {item.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  Revision {item.revision}
                                </div>
                              </div>
                            </div>
                            {selectedBranch === item.url && (
                              <div className="h-2 w-2 rounded-full bg-teal-500" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {groupedItems.tags.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <BookmarkIcon className="h-4 w-4" />
                      Tags
                    </h3>
                    <div className="space-y-1">
                      {groupedItems.tags.map((item) => (
                        <button
                          key={item.url}
                          onClick={() => setSelectedBranch(item.url)}
                          className={`w-full text-left px-4 py-3 rounded-md transition-colors ${
                            selectedBranch === item.url
                              ? 'bg-teal-50 dark:bg-teal-900/20 border-2 border-teal-500'
                              : 'border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <BookmarkIcon className="h-5 w-5 text-purple-500" />
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {item.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  Revision {item.revision}
                                </div>
                              </div>
                            </div>
                            {selectedBranch === item.url && (
                              <div className="h-2 w-2 rounded-full bg-teal-500" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {selectedBranch
                ? `Selected: ${branchesTags.find((item) => item.url === selectedBranch)?.name || 'Unknown'}`
                : 'Please select a branch or tag'}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSwitch}
                disabled={!selectedBranch || switching}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-2"
              >
                {switching ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Switching...
                  </>
                ) : (
                  'Switch'
                )}
              </button>
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

