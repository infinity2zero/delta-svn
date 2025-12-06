import React, { useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useQueryClient } from '@tanstack/react-query'
import type { Connection } from '../../store/connectionStore'
import { useRemoteList } from '../../hooks/useRemoteList'
import { CheckoutModal } from './CheckoutModal'
import { FolderIcon, DocumentIcon, ChevronRightIcon, ArrowUpIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline'
import { Tooltip } from 'react-tooltip'

type RemoteBrowserProps = {
  connection: Connection
  onFileClick?: (filePath: string) => void
}

export function RemoteBrowser({ connection, onFileClick }: RemoteBrowserProps) {
  const [currentPath, setCurrentPath] = useState('/')
  const [checkoutMessage, setCheckoutMessage] = useState<{ status: 'idle' | 'success' | 'error'; message?: string }>({
    status: 'idle',
  })
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [checkoutTarget, setCheckoutTarget] = useState<{ remoteUrl: string; folderName: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const { data: entries = [], isLoading, error, refetch } = useRemoteList(connection, currentPath)
  const queryClient = useQueryClient()

  const pathSegments = useMemo(() => {
    if (currentPath === '/' || currentPath.trim() === '') {
      return [] as string[]
    }
    return currentPath
      .split('/')
      .filter(Boolean)
  }, [currentPath])

  const navigateTo = (targetPath: string) => {
    if (!targetPath || targetPath === '/') {
      setCurrentPath('/')
      return
    }
    setCurrentPath(targetPath.startsWith('/') ? targetPath : `/${targetPath}`)
  }

  const handleEntryClick = (entryName: string, kind: string) => {
    if (kind === 'directory') {
      const nextPath = buildPath(currentPath, entryName)
      navigateTo(nextPath)
    } else if (kind === 'file' && onFileClick) {
      // File clicked - notify parent to load file content
      const filePath = buildPath(currentPath, entryName)
      onFileClick(filePath)
    }
  }

  const handleBreadcrumbClick = (index: number) => {
    if (index < 0) {
      navigateTo('/')
      return
    }
    const nextPath = '/' + pathSegments.slice(0, index + 1).join('/')
    navigateTo(nextPath)
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(connection.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCheckoutClick = (e: React.MouseEvent, targetName?: string) => {
    e.stopPropagation()

    const remotePath = targetName ? buildPath(currentPath, targetName) : currentPath
    const remoteUrl = buildRemoteUrl(connection.url, remotePath)

    const folderName =
      targetName ??
      remotePath
        .replace(/^\/+/, '')
        .replace(/\/+/g, '_')
        .replace(/^$/, 'working-copy')

    setCheckoutTarget({ remoteUrl, folderName })
    setShowCheckoutModal(true)
  }

  const handleCheckoutConfirm = async (destination: string) => {
    if (!checkoutTarget) return

    setCheckoutMessage({ status: 'idle' })

    try {
      const result = await invoke<string>('checkout_remote', {
        remoteUrl: checkoutTarget.remoteUrl,
        destination,
        username: connection.username,
        password: connection.password ?? '',
      })

      setCheckoutMessage({
        status: 'success',
        message: `Successfully checked out to ${result}. The repository has been added to your list.`,
      })

      await queryClient.invalidateQueries({ queryKey: ['repositories'] })
    } catch (err) {
      console.error('Checkout error:', err)
      let errorMessage = err instanceof Error ? err.message : String(err)

      if (errorMessage.includes('\n')) {
        errorMessage = errorMessage
          .split('\n')
          .map((line, idx) => (idx === 0 ? line : `  ${line}`))
          .join('\n')
      }

      setCheckoutMessage({
        status: 'error',
        message: errorMessage,
      })
      throw err
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Repository Browser</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all flex-1">{connection.url}</p>
              <button
                data-tooltip-id="copy-url-tooltip"
                data-tooltip-content={copied ? 'Copied!' : 'Copy URL to clipboard'}
                data-tooltip-place="top"
                onClick={handleCopyUrl}
                className="flex-shrink-0 p-1.5 rounded-none border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
              >
                {copied ? (
                  <CheckIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <ClipboardIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-none border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <button
              onClick={() => navigateTo('/')}
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
            >
              Root
            </button>
            {pathSegments.map((segment, index) => (
              <React.Fragment key={`${segment}-${index}`}>
                <ChevronRightIcon className="h-3 w-3 text-gray-400" />
                <button
                  onClick={() => handleBreadcrumbClick(index)}
                  className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                >
                  {segment}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Snackbar for copy notification */}
        {copied && (
          <div className="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-none border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium shadow-lg animate-in slide-in-from-bottom-2">
            URL copied to clipboard!
          </div>
        )}

        {/* Status Messages */}
        {checkoutMessage.status !== 'idle' && (
          <div
            className={`p-3 rounded-none border text-xs whitespace-pre-line ${
              checkoutMessage.status === 'success'
                ? 'text-green-700 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
                : 'text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
            }`}
          >
            {checkoutMessage.message}
          </div>
        )}

        {/* Repository Content */}
        <div className="rounded-none border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent mb-2"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading repository contents...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-sm text-red-700 dark:text-red-400 mb-3">{(error as Error).message}</p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 text-xs font-semibold rounded-none border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {/* Parent Directory Button */}
              {currentPath !== '/' && (
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800"
                  onClick={() => {
                    const segments = pathSegments.slice(0, -1)
                    const nextPath = segments.length ? `/${segments.join('/')}` : '/'
                    navigateTo(nextPath)
                  }}
                >
                  <ArrowUpIcon className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">Parent Directory</span>
                </button>
              )}

              {/* Directory/File Entries */}
              {entries.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  <FolderIcon className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p>This folder is empty.</p>
                </div>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry.name}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <button
                      className={`flex items-center gap-3 flex-1 text-left min-w-0 ${
                        entry.kind === 'file' ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => handleEntryClick(entry.name, entry.kind)}
                    >
                      {entry.kind === 'directory' ? (
                        <FolderIcon className="h-5 w-5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                      ) : (
                        <DocumentIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {entry.name}
                      </span>
                      {entry.kind === 'directory' && (
                        <ChevronRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                    {entry.kind === 'directory' ? (
                      <button
                        className="ml-3 px-3 py-1.5 text-xs font-semibold rounded-none border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors flex-shrink-0"
                        onClick={(e) => handleCheckoutClick(e, entry.name)}
                        title={`Checkout ${entry.name}`}
                      >
                        Checkout
                      </button>
                    ) : (
                      <button
                        className="ml-3 px-3 py-1.5 text-xs font-semibold rounded-none border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          const filePath = buildPath(currentPath, entry.name)
                          onFileClick?.(filePath)
                        }}
                        title={`View ${entry.name}`}
                      >
                        View
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Checkout Button - Show for root or any folder */}
        {entries.length >= 0 && (
          <div className="flex justify-end pt-2">
            <button
              className="px-4 py-2 text-sm font-semibold rounded-none border border-teal-600 dark:border-teal-500 bg-teal-600 dark:bg-teal-700 text-white hover:bg-teal-700 dark:hover:bg-teal-600 transition-colors"
              onClick={(e) => handleCheckoutClick(e)}
            >
              {currentPath === '/' ? 'Checkout Repository' : 'Checkout This Folder'}
            </button>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {showCheckoutModal && checkoutTarget && (
        <CheckoutModal
          isOpen={showCheckoutModal}
          remoteUrl={checkoutTarget.remoteUrl}
          defaultFolderName={checkoutTarget.folderName}
          onClose={() => {
            setShowCheckoutModal(false)
            setCheckoutTarget(null)
          }}
          onConfirm={handleCheckoutConfirm}
        />
      )}

      {/* Tooltip */}
      <Tooltip id="copy-url-tooltip" />
    </>
  )
}

function buildPath(current: string, entry: string): string {
  if (current === '/' || current.trim() === '') {
    return `/${entry}`
  }
  return `${current.replace(/\/$/, '')}/${entry}`
}

function buildRemoteUrl(base: string, path: string): string {
  const sanitizedBase = base.replace(/\/$/, '')
  if (!path || path === '/') {
    return sanitizedBase
  }
  return `${sanitizedBase}/${path.replace(/^\/+/, '')}`
}
