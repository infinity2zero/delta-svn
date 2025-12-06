import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  EyeSlashIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { Tooltip } from 'react-tooltip'

type ServerConfigPanelProps = {
  serverUrl: string
  onServerUrlChange: (url: string) => void
  username: string
  onUsernameChange: (username: string) => void
  password: string
  onPasswordChange: (password: string) => void
  onTestConnection: () => Promise<void>
  onSaveCredentials: () => void
  onClearCredentials: () => void
  connectionStatus: {
    isConnected: boolean
    lastTested: Date | null
    latency: number | null
    repositoryCount: number | null
  }
  isTesting: boolean
  testResult: { status: 'success' | 'error'; message?: string } | null
}

export function ServerConfigPanel({
  serverUrl,
  onServerUrlChange,
  username,
  onUsernameChange,
  password,
  onPasswordChange,
  onTestConnection,
  onSaveCredentials,
  onClearCredentials,
  connectionStatus,
  isTesting,
  testResult,
}: ServerConfigPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberCredentials, setRememberCredentials] = useState(true)

  if (isCollapsed) {
    return (
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-900 dark:text-white">Server Configuration</span>
            {connectionStatus.isConnected && (
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
            )}
          </div>
          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    )
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
            Server Configuration
          </h3>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <ChevronUpIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Server URL */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
              Server URL
            </label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => onServerUrlChange(e.target.value)}
              placeholder="svn://server.company.com"
              className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400"
            />
          </div>

          {/* Credentials */}
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => onUsernameChange(e.target.value)}
                placeholder="Enter username"
                className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3 py-1.5 pr-10 text-xs border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={rememberCredentials}
                onChange={(e) => setRememberCredentials(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500"
              />
              <span>Remember credentials</span>
            </label>
          </div>

          {/* Connection Status */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              {connectionStatus.isConnected ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white">Connected</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Not connected</span>
                </>
              )}
            </div>
            {connectionStatus.lastTested && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Last tested: {connectionStatus.lastTested.toLocaleTimeString()}
              </p>
            )}
            {connectionStatus.latency !== null && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Latency: {connectionStatus.latency}ms
              </p>
            )}
            {connectionStatus.repositoryCount !== null && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Repositories: {connectionStatus.repositoryCount} available
              </p>
            )}
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              className={`p-2 rounded-md text-xs ${
                testResult.status === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.status === 'success' ? (
                  <CheckCircleIcon className="h-4 w-4" />
                ) : (
                  <XCircleIcon className="h-4 w-4" />
                )}
                <span>{testResult.message || (testResult.status === 'success' ? 'Connection successful' : 'Connection failed')}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={onTestConnection}
              disabled={isTesting || !serverUrl || !username}
              className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

            <div className="flex gap-2">
              <button
                onClick={onSaveCredentials}
                disabled={!serverUrl || !username}
                className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md border border-teal-600 dark:border-teal-500 bg-teal-600 dark:bg-teal-700 text-white hover:bg-teal-700 dark:hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
              <button
                onClick={onClearCredentials}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

