import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  EyeIcon,
  EyeSlashIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  KeyIcon,
  FolderIcon,
} from '@heroicons/react/24/outline'

type ConnectionConfigViewProps = {
  serverUrl: string
  onServerUrlChange: (url: string) => void
  username: string
  onUsernameChange: (username: string) => void
  password: string
  onPasswordChange: (password: string) => void
  sshKeyPath?: string
  onSshKeyPathChange?: (path: string) => void
  authMethod?: 'password' | 'ssh-key'
  onAuthMethodChange?: (method: 'password' | 'ssh-key') => void
  onSave: () => void
}

export function ConnectionConfigView({
  serverUrl,
  onServerUrlChange,
  username,
  onUsernameChange,
  password,
  onPasswordChange,
  sshKeyPath = '',
  onSshKeyPathChange,
  authMethod = 'password',
  onAuthMethodChange,
  onSave,
}: ConnectionConfigViewProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error'; message?: string } | null>(null)
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    lastTested: null as Date | null,
    latency: null as number | null,
    repositoryCount: null as number | null,
  })

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

  return (
    <div className="h-full overflow-y-auto px-2 py-2">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Main Form Section - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Server Configuration */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Server Configuration</h3>
              
              {/* Server URL */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                  Server URL
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => onServerUrlChange(e.target.value)}
                  placeholder="svn://server.company.com"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400"
                />
              </div>
            </div>

            {/* Credentials */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Credentials</h3>
              <div className="space-y-4">
                {/* Authentication Method */}
                {onAuthMethodChange && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                      Authentication Method
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => onAuthMethodChange('password')}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                          authMethod === 'password'
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
                            : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        Password
                      </button>
                      <button
                        type="button"
                        onClick={() => onAuthMethodChange('ssh-key')}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                          authMethod === 'ssh-key'
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
                            : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <KeyIcon className="h-4 w-4 inline-block mr-1.5" />
                        SSH Key
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => onUsernameChange(e.target.value)}
                    placeholder="Enter username"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400"
                  />
                </div>

                {authMethod === 'password' ? (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => onPasswordChange(e.target.value)}
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
                ) : (
                  onSshKeyPathChange && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                        SSH Private Key Path
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={sshKeyPath}
                          onChange={(e) => onSshKeyPathChange(e.target.value)}
                          placeholder="/path/to/private/key or ~/.ssh/id_rsa"
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400 font-mono"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const selected = await invoke<string | null>('open_folder_dialog', {
                                title: 'Select SSH Private Key',
                                defaultPath: undefined,
                              })
                              if (selected) {
                                onSshKeyPathChange(selected)
                              }
                            } catch (error) {
                              console.error('Failed to select SSH key:', error)
                            }
                          }}
                          className="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          title="Browse for SSH key file"
                        >
                          <FolderIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                        Use svn+ssh:// URLs for SSH connections (e.g., svn+ssh://user@host/repo)
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Connection Status & Information */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Connection Status</h3>
              
              {/* Connection Status */}
              {connectionStatus.lastTested ? (
                <div className="p-4 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 space-y-3">
                  <div className="flex items-center gap-2">
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
                  <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <p>Last tested: {connectionStatus.lastTested.toLocaleTimeString()}</p>
                    {connectionStatus.latency !== null && (
                      <p>Latency: {connectionStatus.latency}ms</p>
                    )}
                    {connectionStatus.repositoryCount !== null && (
                      <p>Repositories: {connectionStatus.repositoryCount} available</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">No connection test performed yet. Click "Test Connection" to verify your settings.</p>
                </div>
              )}
            </div>

            {/* Test Result */}
            {testResult && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Test Result</h3>
                <div
                  className={`p-4 rounded-md text-sm ${
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
              </div>
            )}
          </div>
        </div>

        {/* Actions - Full Width */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
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

            <button
              onClick={onSave}
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

