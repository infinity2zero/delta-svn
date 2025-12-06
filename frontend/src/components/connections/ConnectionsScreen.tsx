import { useState, useMemo, useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useConnectionStore } from '../../store/connectionStore'
import { RemoteBrowser } from './RemoteBrowser'
import { FileViewer } from './FileViewer'
import { ConnectionConfigView } from './ConnectionConfigView'
import { useRemoteFileContent } from '../../hooks/useRemoteFileContent'
import { FolderIcon, LinkIcon } from '@heroicons/react/24/outline'

export function ConnectionsScreen() {
  const { connections, activeConnectionId, addConnection, updateConnection, setActiveConnection } = useConnectionStore()
  
  // Single connection state (simplified from multiple connections)
  const [serverUrl, setServerUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [sshKeyPath, setSshKeyPath] = useState('')
  const [authMethod, setAuthMethod] = useState<'password' | 'ssh-key'>('password')
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'browser' | 'connection'>('browser')

  // Get active connection or create one from current state
  const activeConnection = useMemo(() => {
    if (activeConnectionId) {
      return connections.find(c => c.id === activeConnectionId) || null
    }
    // If we have server URL and username, create a temporary connection object
    if (serverUrl && username) {
      return {
        id: 'temp',
        name: 'Current',
        url: serverUrl,
        username,
        password: password || undefined,
      }
    }
    return null
  }, [connections, activeConnectionId, serverUrl, username, password])

  // Load saved connection if exists
  useEffect(() => {
    if (connections.length > 0 && activeConnectionId) {
      const conn = connections.find(c => c.id === activeConnectionId)
      if (conn) {
        setServerUrl(conn.url)
        setUsername(conn.username)
        setPassword(conn.password || '')
        setSshKeyPath(conn.sshKeyPath || '')
        setAuthMethod(conn.authMethod || 'password')
      }
    }
  }, [connections, activeConnectionId])

  const handleSaveConnection = () => {
    if (!serverUrl || !username) {
      return
    }

    // Check if connection already exists
    const existing = connections.find(c => c.url === serverUrl)
    
    if (existing) {
      // Update existing connection
      updateConnection(existing.id, {
        name: existing.name,
        url: serverUrl,
        username,
        password: authMethod === 'password' ? (password || undefined) : undefined,
        sshKeyPath: authMethod === 'ssh-key' ? (sshKeyPath || undefined) : undefined,
        authMethod,
      })
      setActiveConnection(existing.id)
    } else {
      // Create new connection
      addConnection({
        name: serverUrl.split('/').pop() || 'SVN Server',
        url: serverUrl,
        username,
        password: authMethod === 'password' ? (password || undefined) : undefined,
        sshKeyPath: authMethod === 'ssh-key' ? (sshKeyPath || undefined) : undefined,
        authMethod,
      })
    }

    // Switch to browser tab after saving
    setActiveTab('browser')
  }

  const handleFileClick = (filePath: string) => {
    setSelectedFilePath(filePath)
  }

  // Fetch file content when file is selected
  const { data: fileContent, isLoading: isLoadingFile, error: fileError } = useRemoteFileContent(
    activeConnection,
    selectedFilePath
  )

  return (
    <div className="flex flex-1 h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/95 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Tab Buttons */}
          <button
            onClick={() => setActiveTab('browser')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'browser'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
            }`}
          >
            <FolderIcon className="h-4 w-4" />
            <span>Repo Browser</span>
          </button>
          <button
            onClick={() => setActiveTab('connection')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'connection'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
            }`}
          >
            <LinkIcon className="h-4 w-4" />
            <span>Connection</span>
          </button>
        </div>
        {serverUrl && (
          <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="truncate max-w-xs" title={serverUrl}>
              {serverUrl}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === 'browser' ? (
        activeConnection ? (
          <PanelGroup direction="horizontal" className="flex flex-1 overflow-hidden">
            {/* Left: Repository Browser (40%) */}
            <Panel defaultSize={40} minSize={30} maxSize={60} className="flex flex-col overflow-hidden">
              <div className="h-full border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
                <div className="flex-1 overflow-y-auto px-2 py-2">
                  <RemoteBrowser connection={activeConnection} onFileClick={handleFileClick} />
                </div>
              </div>
            </Panel>

            {/* Resize Handle */}
            <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-800 hover:bg-teal-500 dark:hover:bg-teal-600 transition-colors cursor-col-resize" />

            {/* Right: File Viewer (60%) */}
            <Panel defaultSize={60} minSize={40} className="flex flex-col overflow-hidden">
              <FileViewer
                filePath={selectedFilePath}
                fileContent={fileContent || null}
                isLoading={isLoadingFile}
                error={fileError}
                connectionUrl={activeConnection.url}
              />
            </Panel>
          </PanelGroup>
        ) : (
          <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p className="text-sm font-medium mb-2">No server configured</p>
              <p className="text-xs">Go to the Connection tab to configure a server</p>
            </div>
          </div>
        )
      ) : (
        <div className="flex flex-1 overflow-hidden bg-white dark:bg-gray-900">
          <ConnectionConfigView
            serverUrl={serverUrl}
            onServerUrlChange={setServerUrl}
            username={username}
            onUsernameChange={setUsername}
            password={password}
            onPasswordChange={setPassword}
            sshKeyPath={sshKeyPath}
            onSshKeyPathChange={setSshKeyPath}
            authMethod={authMethod}
            onAuthMethodChange={setAuthMethod}
            onSave={handleSaveConnection}
          />
        </div>
      )}
    </div>
  )
}

