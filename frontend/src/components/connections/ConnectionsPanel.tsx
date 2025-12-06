import React, { type FormEvent, useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useConnectionStore } from '../../store/connectionStore'
import type { Connection } from '../../store/connectionStore'
import { invoke } from '@tauri-apps/api/core'
import {
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  TrashIcon,
  CheckCircleIcon,
  PencilIcon,
  WrenchScrewdriverIcon,
  PlusIcon,
  ServerIcon,
} from '@heroicons/react/24/outline'
import { Tooltip } from 'react-tooltip'

export function ConnectionsPanel() {
  const { connections, activeConnectionId, addConnection, removeConnection, updateConnection, setActiveConnection } =
    useConnectionStore()
  const [formState, setFormState] = useState({
    name: '',
    url: 'svn://localhost/svn-remote-repo',
    username: '',
    password: '',
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [testingConnection, setTestingConnection] = useState(false)
  const [testMessage, setTestMessage] = useState<{ status: 'idle' | 'success' | 'error'; message?: string }>({
    status: 'idle',
  })
  const [showDialog, setShowDialog] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set())
  const [testResults, setTestResults] = useState<Map<string, { status: 'success' | 'error'; message: string }>>(new Map())
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const isEditing = !!editingId

  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) {
        next.delete(rowId)
      } else {
        next.add(rowId)
      }
      return next
    })
  }

  const validateForm = () => {
    const name = formState.name.trim()
    const url = formState.url.trim()
    const username = formState.username.trim()

    if (!name || !url || !username) {
      return 'Name, URL, and Username are required.'
    }

    const lowerUrl = url.toLowerCase()
    if (
      !(
        lowerUrl.startsWith('svn://') ||
        lowerUrl.startsWith('http://') ||
        lowerUrl.startsWith('https://')
      )
    ) {
      return 'URL should start with svn://, http://, or https://'
    }

    return null
  }

  const handleTestConnection = async (connection?: Connection) => {
    const conn = connection || {
      id: '',
      name: formState.name.trim(),
      url: formState.url.trim(),
      username: formState.username.trim(),
      password: formState.password.trim() || undefined,
    }

    const error = validateForm()
    if (error && !connection) {
      setFormError(error)
      return
    }

    setTestingConnection(!connection)
    if (connection) {
      setTestingIds((prev) => new Set(prev).add(connection.id))
    }
    setTestMessage({ status: 'idle' })
    setFormError(null)

    try {
      await invoke('list_remote_entries', {
        baseUrl: conn.url,
        path: '/',
        username: conn.username,
        password: conn.password ?? '',
      })
      const successMsg = 'Connection successful.'
      setTestMessage({ status: 'success', message: successMsg })
      if (connection) {
        setTestResults((prev) => new Map(prev).set(connection.id, { status: 'success', message: successMsg }))
        setTimeout(() => {
          setTestResults((prev) => {
            const next = new Map(prev)
            next.delete(connection.id)
            return next
          })
        }, 3000)
      }
    } catch (err) {
      console.error(err)
      const errorMsg = err instanceof Error ? err.message : String(err)
      setTestMessage({
        status: 'error',
        message: errorMsg,
      })
      if (connection) {
        setTestResults((prev) => new Map(prev).set(connection.id, { status: 'error', message: errorMsg }))
        setTimeout(() => {
          setTestResults((prev) => {
            const next = new Map(prev)
            next.delete(connection.id)
            return next
          })
        }, 5000)
      }
    } finally {
      setTestingConnection(false)
      if (connection) {
        setTestingIds((prev) => {
          const next = new Set(prev)
          next.delete(connection.id)
          return next
        })
      }
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const error = validateForm()
    if (error) {
      setFormError(error)
      return
    }

    const payload = {
      name: formState.name.trim(),
      url: formState.url.trim(),
      username: formState.username.trim(),
      password: formState.password.trim() || undefined,
    }

    if (isEditing && editingId) {
      updateConnection(editingId, payload)
    } else {
      addConnection(payload)
    }

    setFormState({
      name: '',
      url: 'svn://localhost/svn-remote-repo',
      username: '',
      password: '',
    })
    setFormError(null)
    setTestMessage({ status: 'idle' })
    setEditingId(null)
    setShowDialog(false)
  }

  const columns = useMemo<ColumnDef<Connection>[]>(
    () => [
      {
        id: 'expand',
        header: '',
        cell: (info) => {
          const rowId = info.row.id
          const isExpanded = expandedRows.has(rowId)
          return (
            <button
              data-tooltip-id="expand-tooltip"
              data-tooltip-content={isExpanded ? 'Collapse details' : 'Expand details'}
              data-tooltip-place="right"
              onClick={() => toggleRowExpansion(rowId)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>
          )
        },
        size: 40,
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: (info) => {
          const connection = info.row.original
          const isActive = connection.id === activeConnectionId
          return (
            <div className="flex items-center gap-2">
              {isActive && <span className="h-2 w-2 rounded-full bg-teal-500" />}
              <span className={`text-sm font-medium ${isActive ? 'text-teal-700 dark:text-teal-300' : 'text-gray-900 dark:text-gray-100'}`}>
                {info.getValue() as string}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: 'url',
        header: 'URL',
        cell: (info) => (
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'username',
        header: 'User',
        cell: (info) => <span className="text-sm text-gray-700 dark:text-gray-300">{info.getValue() as string}</span>,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (info) => {
          const connection = info.row.original
          const isActive = connection.id === activeConnectionId

          return (
            <div className="flex items-center justify-end gap-2">
              <button
                data-tooltip-id="select-tooltip"
                data-tooltip-content={isActive ? 'Active connection' : 'Select connection'}
                data-tooltip-place="top"
                className={`p-1.5 rounded-none border transition-colors ${
                  isActive
                    ? 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => setActiveConnection(connection.id)}
              >
                <CheckCircleIcon className="h-4 w-4" />
              </button>
              <button
                data-tooltip-id="remove-tooltip"
                data-tooltip-content="Remove connection"
                data-tooltip-place="top"
                className="p-1.5 rounded-none border border-red-100 dark:border-red-800 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                onClick={() => removeConnection(connection.id)}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          )
        },
      },
    ],
    [activeConnectionId, setActiveConnection, removeConnection, expandedRows],
  )

  const table = useReactTable({
    data: connections,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      globalFilter,
    },
  })

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Connections</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Manage SVN servers and credentials. Connections are saved until you remove them.
            </p>
          </div>
          <button
            data-tooltip-id="add-connection-tooltip"
            data-tooltip-content="Add Connection"
            data-tooltip-place="bottom"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600 transition-colors"
            onClick={() => {
              setFormState({ name: '', url: 'svn://localhost/svn-remote-repo', username: '', password: '' })
              setFormError(null)
              setTestMessage({ status: 'idle' })
              setEditingId(null)
              setShowDialog(true)
            }}
          >
            <PlusIcon className="h-4 w-4" />
            <ServerIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search connections..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
            />
          </div>
          {globalFilter && (
            <button
              onClick={() => setGlobalFilter('')}
              className="px-3 py-1.5 text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* TanStack Table */}
        <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide ${
                          header.column.getCanSort() ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800' : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                        style={{ width: header.id === 'expand' ? '40px' : undefined }}
                      >
                        <div className="flex items-center gap-2">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="text-gray-400">
                              {{
                                asc: <ArrowUpIcon className="h-3 w-3" />,
                                desc: <ArrowDownIcon className="h-3 w-3" />,
                              }[header.column.getIsSorted() as string] ?? (
                                <span className="opacity-0">
                                  <ArrowUpIcon className="h-3 w-3" />
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-6 text-center text-xs text-gray-500 dark:text-gray-400"
                    >
                      {globalFilter
                        ? 'No connections match your search.'
                        : 'No connections yet. Click "Add Connection" to create one.'}
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => {
                    const connection = row.original
                    const isActive = connection.id === activeConnectionId
                    const isExpanded = expandedRows.has(row.id)
                    const isTesting = testingIds.has(connection.id)
                    const testResult = testResults.get(connection.id)

                    return (
                      <React.Fragment key={row.id}>
                        <tr
                          className={`border-t border-gray-100 dark:border-gray-800 transition-colors ${
                            isActive ? 'bg-teal-50/60 dark:bg-teal-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-4 py-3">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                        {isExpanded && (
                          <tr className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                            <td colSpan={columns.length} className="px-4 py-4">
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                      Name
                                    </label>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">{connection.name}</p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                      URL
                                    </label>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">{connection.url}</p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                      Username
                                    </label>
                                    <p className="text-sm text-gray-900 dark:text-gray-100">{connection.username}</p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                      Password
                                    </label>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {connection.password ? '••••••••' : '(not set)'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-800">
                                  <button
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                                    onClick={() => handleTestConnection(connection)}
                                    disabled={isTesting}
                                  >
                                    <WrenchScrewdriverIcon className="h-4 w-4" />
                                    {isTesting ? 'Testing...' : 'Test Connection'}
                                  </button>
                                  {testResult && (
                                    <span
                                      className={`text-xs px-3 py-1.5 rounded-md ${
                                        testResult.status === 'success'
                                          ? 'text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-300'
                                          : 'text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300'
                                      }`}
                                      title={testResult.message}
                                    >
                                      {testResult.status === 'success' ? '✓ Connection successful' : `✗ ${testResult.message}`}
                                    </span>
                                  )}
                                  <button
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    onClick={() => {
                                      setEditingId(connection.id)
                                      setFormState({
                                        name: connection.name,
                                        url: connection.url,
                                        username: connection.username,
                                        password: connection.password ?? '',
                                      })
                                      setFormError(null)
                                      setTestMessage({ status: 'idle' })
                                      setShowDialog(true)
                                    }}
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                    Edit Connection
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Add Connection Dialog */}
      {showDialog && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
          onClick={() => setShowDialog(false)}
        >
          <div
            className="w-full max-w-lg rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {isEditing ? 'Edit Connection' : 'Add Connection'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enter the SVN server URL and credentials. We'll use these to connect and browse repositories.
                </p>
              </div>
              <button
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                onClick={() => setShowDialog(false)}
              >
                ✕
              </button>
            </div>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
                  placeholder="Production Repo"
                  value={formState.name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  URL
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
                  placeholder="svn://localhost/svn-remote-repo"
                  value={formState.url}
                  onChange={(event) => setFormState((prev) => ({ ...prev, url: event.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Username
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
                  placeholder="tester"
                  value={formState.username}
                  onChange={(event) => setFormState((prev) => ({ ...prev, username: event.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Password
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600"
                  placeholder="••••••••"
                  value={formState.password}
                  onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
                />
              </div>
              <div className="md:col-span-2 flex items-center justify-between mt-2">
                <div className="flex-1">
                  {formError && <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>}
                  {testMessage.status === 'success' && (
                    <p className="text-xs text-green-600 dark:text-green-400">{testMessage.message}</p>
                  )}
                  {testMessage.status === 'error' && (
                    <p className="text-xs text-red-600 dark:text-red-400">{testMessage.message}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-4 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    onClick={() => handleTestConnection()}
                    disabled={testingConnection}
                  >
                    {testingConnection ? 'Testing…' : 'Test'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tooltips */}
      <Tooltip id="expand-tooltip" />
      <Tooltip id="select-tooltip" />
      <Tooltip id="remove-tooltip" />
      <Tooltip id="add-connection-tooltip" />
    </div>
  )
}
