import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

type ConnectionConfigModalProps = {
  isOpen: boolean
  onClose: () => void
  initialServerUrl?: string
  initialUsername?: string
  initialPassword?: string
  onSave: (serverUrl: string, username: string, password: string) => void
}

export function ConnectionConfigModal({
  isOpen,
  onClose,
  initialServerUrl = '',
  initialUsername = '',
  initialPassword = '',
  onSave,
}: ConnectionConfigModalProps) {
  const [serverUrl, setServerUrl] = useState(initialServerUrl)
  const [username, setUsername] = useState(initialUsername)
  const [password, setPassword] = useState(initialPassword)
  const [showPassword, setShowPassword] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error'; message?: string } | null>(null)
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    lastTested: null as Date | null,
    latency: null as number | null,
    repositoryCount: null as number | null,
  })

  // Reset form when modal opens/closes or initial values change
  useEffect(() => {
    if (isOpen) {
      setServerUrl(initialServerUrl)
      setUsername(initialUsername)
      setPassword(initialPassword)
      setTestResult(null)
      setConnectionStatus({
        isConnected: false,
        lastTested: null,
        latency: null,
        repositoryCount: null,
      })
    }
  }, [isOpen, initialServerUrl, initialUsername, initialPassword])

  const handleTestConnection = async () => {
    if (!serverUrl || !username) {
      setTestResult({ status: 'error', message: 'Server URL and username are required' })
      return
    }

    setIsTesting(true)
    setTestResult(null)

    const startTime = Date.now()

    try {
      await invoke('list_remote_entries', {
        baseUrl: serverUrl,
        path: '/',
        username,
        password: password || '',
      })

      const latency = Date.now() - startTime
      
      // Try to count repositories (list entries at root)
      let repoCount: number | null = null
      try {
        const entries = await invoke<Array<{ name: string; kind: string }>>('list_remote_entries', {
          baseUrl: serverUrl,
          path: '/',
          username,
          password: password || '',
        })
        repoCount = entries.length
      } catch {
        // Ignore error, just don't set count
      }

      setTestResult({ status: 'success', message: 'Connection successful' })
      setConnectionStatus({
        isConnected: true,
        lastTested: new Date(),
        latency,
        repositoryCount: repoCount,
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setTestResult({ status: 'error', message: errorMsg })
      setConnectionStatus({
        isConnected: false,
        lastTested: new Date(),
        latency: null,
        repositoryCount: null,
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = () => {
    if (!serverUrl || !username) {
      setTestResult({ status: 'error', message: 'Server URL and username are required' })
      return
    }
    onSave(serverUrl, username, password)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full h-full bg-white dark:bg-gray-900 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Connection Configuration</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Server URL */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                Server URL
              </label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="svn://server.company.com"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400"
              />
            </div>

            {/* Credentials */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Connection Status */}
            {connectionStatus.lastTested && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  {connectionStatus.isConnected ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-green-500"></span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Connected</span>
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Not connected</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last tested: {connectionStatus.lastTested.toLocaleTimeString()}
                </p>
                {connectionStatus.latency !== null && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Latency: {connectionStatus.latency}ms
                  </p>
                )}
                {connectionStatus.repositoryCount !== null && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Repositories: {connectionStatus.repositoryCount} available
                  </p>
                )}
              </div>
            )}

            {/* Test Result */}
            {testResult && (
              <div
                className={`p-3 rounded-md text-sm ${
                  testResult.status === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResult.status === 'success' ? (
                    <CheckCircleIcon className="h-5 w-5" />
                  ) : (
                    <XCircleIcon className="h-5 w-5" />
                  )}
                  <span>{testResult.message || (testResult.status === 'success' ? 'Connection successful' : 'Connection failed')}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
          <button
            onClick={handleTestConnection}
            disabled={isTesting || !serverUrl || !username}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <WrenchScrewdriverIcon className="h-4 w-4" />
                <span>Test Connection</span>
              </>
            )}
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!serverUrl || !username}
              className="px-4 py-2 text-sm font-medium rounded-md border border-teal-600 dark:border-teal-500 bg-teal-600 dark:bg-teal-700 text-white hover:bg-teal-700 dark:hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

