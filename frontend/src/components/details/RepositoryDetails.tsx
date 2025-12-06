import React, { useState } from 'react'
import type { Repository } from '../../types'
import { 
  FolderIcon, 
  LinkIcon, 
  MapPinIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { Tooltip } from 'react-tooltip'

type RepositoryDetailsProps = {
  repository: Repository | null
  loading: boolean
}

export function RepositoryDetails({ repository, loading }: RepositoryDetailsProps) {
  if (loading) {
    return (
      <aside className="h-full border-l border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 overflow-y-auto flex-shrink-0">
        <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs">
          Loading repository details…
        </div>
      </aside>
    )
  }

  if (!repository) {
    return (
      <aside className="h-full border-l border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 overflow-y-auto flex-shrink-0">
        <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs">
          Select a repository to view details
        </div>
      </aside>
    )
  }

  return (
    <aside className="h-full border-l border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 overflow-y-auto flex-shrink-0">
      <div className="p-4 space-y-4">
        <section>
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Repository Info
          </h2>
          <div className="space-y-3 bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
            <div className="flex items-start gap-2">
              <FolderIcon className="h-4 w-4 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1 truncate">
                  {repository.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate" title={repository.url}>
                  {repository.url}
                </div>
              </div>
            </div>
            <Divider />
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1.5 ${
                  repository.status === 'synced'
                    ? 'text-green-700 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : repository.status === 'error'
                      ? 'text-red-700 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      : 'text-blue-700 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${
                  repository.status === 'synced'
                    ? 'bg-green-400'
                    : repository.status === 'error'
                      ? 'bg-red-400'
                      : 'bg-blue-400'
                }`} />
                {repository.status === 'synced' ? 'Synced' : repository.status === 'error' ? 'Error' : 'Updating'}
              </span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Working Copy
          </h2>
          <div className="space-y-3 bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
            <LocalPathRow path={repository.path} />
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Statistics
          </h2>
          <div className="space-y-3 bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
            <InfoRowWithIcon 
              icon={CodeBracketIcon}
              label="Current Revision" 
              value={repository.revision}
              valueClass="text-teal-700 dark:text-teal-300"
            />
            <Divider />
            <InfoRowWithIcon 
              icon={LinkIcon}
              label="Branch" 
              value={repository.branch || 'trunk'}
              valueClass="text-teal-700 dark:text-teal-300"
            />
            <Divider />
            <InfoRowWithIcon 
              icon={DocumentTextIcon}
              label="Changes" 
              value={`${repository.changes} ${repository.changes === 1 ? 'change' : 'changes'}`}
              valueClass="text-orange-600 dark:text-orange-400"
            />
          </div>
        </section>
      </div>
    </aside>
  )
}

function InfoRowWithIcon({ 
  icon: Icon, 
  label, 
  value, 
  valueClass, 
  truncate 
}: { 
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  valueClass?: string
  truncate?: boolean
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</div>
        <div className={`text-sm font-semibold text-gray-900 dark:text-white ${valueClass || ''} ${truncate ? 'truncate' : ''}`} title={truncate ? value : undefined}>
          {value}
        </div>
      </div>
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-gray-100 dark:bg-gray-800" />
}

function LocalPathRow({ path }: { path: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(path)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy path:', err)
    }
  }

  return (
    <div className="flex items-start gap-2">
      <MapPinIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Local Path</div>
          <button
            onClick={handleCopy}
            data-tooltip-id="copy-path-tooltip"
            data-tooltip-content={copied ? 'Copied!' : 'Copy path to clipboard'}
            data-tooltip-place="top"
            className="p-1 text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded transition-colors flex-shrink-0"
          >
            {copied ? (
              <CheckIcon className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            ) : (
              <ClipboardDocumentIcon className="h-3.5 w-3.5" />
            )}
          </button>
          <Tooltip id="copy-path-tooltip" />
        </div>
        <div className="text-sm font-semibold text-gray-900 dark:text-white font-mono text-xs break-words whitespace-normal">
          {path}
        </div>
      </div>
    </div>
  )
}

