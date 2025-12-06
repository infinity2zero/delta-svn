import { useState } from 'react'
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  RocketLaunchIcon,
  WrenchScrewdriverIcon,
  QuestionMarkCircleIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline'

type GuideSection = {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  content: React.ReactNode
}

type UserGuideScreenProps = {
  onClose: () => void
}

export function UserGuideScreen({ onClose }: UserGuideScreenProps) {
  const [selectedSection, setSelectedSection] = useState<string>('getting-started')

  const sections: GuideSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: RocketLaunchIcon,
      content: <GettingStartedContent />,
    },
    {
      id: 'features',
      title: 'Features',
      icon: BookOpenIcon,
      content: <FeaturesContent />,
    },
    {
      id: 'svn-commands',
      title: 'SVN Commands',
      icon: CommandLineIcon,
      content: <SVNCommandsContent />,
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: WrenchScrewdriverIcon,
      content: <TroubleshootingContent />,
    },
  ]

  const currentSection = sections.find((s) => s.id === selectedSection) || sections[0]

  return (
    <div className="w-full h-full bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
        <div className="flex items-center gap-2">
          <BookOpenIcon className="w-5 h-5 text-teal-500 dark:text-teal-400" />
          <h1 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
            User Guide
          </h1>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
          title="Close User Guide (Esc)"
        >
          <XMarkIcon className="w-4 h-4" />
          <span>Close</span>
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex flex-col">
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-2">
            {sections.map((section) => {
              const Icon = section.icon
              const isActive = selectedSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setSelectedSection(section.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors mb-1 ${
                    isActive
                      ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{section.title}</span>
                  {isActive && <ChevronRightIcon className="w-3.5 h-3.5" />}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 prose prose-sm dark:prose-invert max-w-none">
            {currentSection.content}
          </div>
        </div>
      </div>
    </div>
  )
}

function GettingStartedContent() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Getting Started with DELTA SVN
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Welcome to DELTA SVN! This guide will help you get started with managing your SVN repositories.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-teal-500" />
          Adding a Repository
        </h3>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 space-y-2">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            To add an existing working copy to DELTA SVN:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-700 dark:text-gray-300 ml-4">
            <li>Navigate to the <strong>Repositories</strong> tab</li>
            <li>Click the <strong>"Add Repository"</strong> button</li>
            <li>Select your working copy directory</li>
            <li>The repository will appear in your list</li>
          </ol>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-teal-500" />
          Checking Out from Remote
        </h3>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 space-y-2">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            To checkout a repository from a remote SVN server:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-700 dark:text-gray-300 ml-4">
            <li>Go to the <strong>Connections</strong> tab</li>
            <li>Add your SVN server connection (if not already added)</li>
            <li>Browse the remote repository structure</li>
            <li>Select the path you want to checkout</li>
            <li>Click <strong>"Checkout"</strong> and choose a local directory</li>
          </ol>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-teal-500" />
          Basic Operations
        </h3>
        <div className="space-y-2">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">Update</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Update your working copy to the latest revision from the repository. Use the <strong>Update</strong> button in the toolbar.
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">Commit</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Commit your changes to the repository. Stage files using checkboxes, enter a commit message, and click <strong>Commit</strong>.
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">Revert</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Revert changes to files, discarding local modifications. Select files and click <strong>Revert</strong>.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function FeaturesContent() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Features & Operations
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          DELTA SVN provides a comprehensive set of SVN operations to manage your repositories.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">File Operations</h3>
        <div className="grid gap-2">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5 flex items-center gap-2">
              <InformationCircleIcon className="w-4 h-4 text-teal-500" />
              Add Files
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Add unversioned files to version control. Select files in the Changes view and click <strong>Add</strong>.
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5 flex items-center gap-2">
              <InformationCircleIcon className="w-4 h-4 text-teal-500" />
              Delete Files
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Remove files from version control. Files are marked for deletion and removed on commit.
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5 flex items-center gap-2">
              <InformationCircleIcon className="w-4 h-4 text-teal-500" />
              Move/Rename
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Move or rename files while preserving history. Use the <strong>Move</strong> button to rename files.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Viewing Changes</h3>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 space-y-2">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Diff View:</strong> View side-by-side or unified diffs of your changes. Click on any modified file to see the differences.
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>History:</strong> Browse commit history with filtering options. View commit details, compare revisions, and export files.
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Blame:</strong> See who last modified each line of a file and when.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Advanced Features</h3>
        <div className="grid gap-2">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5 flex items-center gap-2">
              <InformationCircleIcon className="w-4 h-4 text-teal-500" />
              Diff Viewer
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              View side-by-side or unified diffs with syntax highlighting. Compare revisions, view blame annotations, and export files.
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5 flex items-center gap-2">
              <InformationCircleIcon className="w-4 h-4 text-teal-500" />
              History & Log
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Browse complete commit history with filtering, search, and detailed commit information. Compare any two revisions.
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5 flex items-center gap-2">
              <InformationCircleIcon className="w-4 h-4 text-teal-500" />
              Remote Browser
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Browse remote SVN repositories, view file contents, and checkout directly to your local machine.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h3>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">Ctrl/Cmd + S</kbd>
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Save</span>
            </div>
            <div>
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">Ctrl/Cmd + F</kbd>
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Search</span>
            </div>
            <div>
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">Ctrl/Cmd + ,</kbd>
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Settings</span>
            </div>
            <div>
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">Ctrl/Cmd + ?</kbd>
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Help</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function SVNCommandsContent() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          SVN Commands Tutorial
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Learn about SVN commands and how they work in DELTA SVN. This section covers the most commonly used SVN operations.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <CommandLineIcon className="w-4 h-4 text-teal-500" />
          Basic Operations
        </h3>
        
        <div className="space-y-2">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border-l-4 border-teal-500">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">svn commit</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1.5">
              Commits your changes to the repository. Requires a commit message.
            </p>
            <div className="bg-gray-900 dark:bg-black rounded p-2 font-mono text-sm text-green-400">
              <code>svn commit -m "Your commit message" [FILES...]</code>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">
              <strong>In DELTA SVN:</strong> Stage files using checkboxes, enter a commit message, and click "Commit".
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border-l-4 border-teal-500">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">svn status</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1.5">
              Shows the status of files in your working copy (modified, added, deleted, etc.).
            </p>
            <div className="bg-gray-900 dark:bg-black rounded p-2 font-mono text-sm text-green-400">
              <code>svn status [PATH]</code>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">
              <strong>In DELTA SVN:</strong> The Changes tab automatically shows file status. Status codes:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-sm text-gray-600 dark:text-gray-400 ml-4 mt-1.5">
              <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">M</code> - Modified</li>
              <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">A</code> - Added</li>
              <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">D</code> - Deleted</li>
              <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">?</code> - Unversioned</li>
              <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">!</code> - Missing</li>
            </ul>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border-l-4 border-teal-500">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">svn revert</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1.5">
              Reverts changes to files, discarding local modifications.
            </p>
            <div className="bg-gray-900 dark:bg-black rounded p-2 font-mono text-sm text-green-400">
              <code>svn revert [PATH...]</code>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">
              <strong>In DELTA SVN:</strong> Select files and click "Revert" in the toolbar.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <CommandLineIcon className="w-4 h-4 text-teal-500" />
          File Operations
        </h3>
        
        <div className="space-y-2">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border-l-4 border-blue-500">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">svn add</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1.5">
              Adds files or directories to version control. Files are scheduled for addition on the next commit.
            </p>
            <div className="bg-gray-900 dark:bg-black rounded p-2 font-mono text-sm text-green-400">
              <code>svn add [PATH...]</code>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">
              <strong>In DELTA SVN:</strong> Select unversioned files and click "Add" in the toolbar.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border-l-4 border-blue-500">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">svn delete</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1.5">
              Removes files from version control. Files are scheduled for deletion on the next commit.
            </p>
            <div className="bg-gray-900 dark:bg-black rounded p-2 font-mono text-sm text-green-400">
              <code>svn delete [PATH...]</code>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">
              <strong>In DELTA SVN:</strong> Select files and click "Delete". A confirmation dialog will appear.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border-l-4 border-blue-500">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">svn move / svn rename</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1.5">
              Moves or renames files while preserving history. Both source and destination must be committed together.
            </p>
            <div className="bg-gray-900 dark:bg-black rounded p-2 font-mono text-sm text-green-400">
              <code>svn move SOURCE DEST</code>
              <br />
              <code className="text-gray-500"># or</code>
              <br />
              <code>svn rename OLD NEW</code>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">
              <strong>In DELTA SVN:</strong> Select a file and click "Move" to rename it. DELTA SVN automatically handles committing both sides.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <CommandLineIcon className="w-4 h-4 text-teal-500" />
          Viewing & Comparing
        </h3>
        
        <div className="space-y-2">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border-l-4 border-purple-500">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">svn diff</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1.5">
              Shows the differences between your working copy and the repository, or between two revisions.
            </p>
            <div className="bg-gray-900 dark:bg-black rounded p-2 font-mono text-sm text-green-400">
              <code>svn diff [PATH]</code>
              <br />
              <code className="text-gray-500"># Compare revisions</code>
              <br />
              <code>svn diff -r REV1:REV2 [PATH]</code>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">
              <strong>In DELTA SVN:</strong> Click any modified file to view the diff. Use the History tab to compare revisions.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border-l-4 border-purple-500">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">svn log</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1.5">
              Shows commit history for files or directories.
            </p>
            <div className="bg-gray-900 dark:bg-black rounded p-2 font-mono text-sm text-green-400">
              <code>svn log [PATH]</code>
              <br />
              <code className="text-gray-500"># Limit number of entries</code>
              <br />
              <code>svn log -l 10 [PATH]</code>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">
              <strong>In DELTA SVN:</strong> Use the History tab to browse commit history with filtering and search.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border-l-4 border-purple-500">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">svn blame / svn annotate</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1.5">
              Shows who last modified each line of a file and in which revision.
            </p>
            <div className="bg-gray-900 dark:bg-black rounded p-2 font-mono text-sm text-green-400">
              <code>svn blame [PATH]</code>
              <br />
              <code className="text-gray-500"># or</code>
              <br />
              <code>svn annotate [PATH]</code>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">
              <strong>In DELTA SVN:</strong> View blame annotations in the Diff viewer when viewing files.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <CommandLineIcon className="w-4 h-4 text-teal-500" />
          Repository Operations
        </h3>
        
        <div className="space-y-2">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border-l-4 border-orange-500">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">svn checkout</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1.5">
              Checks out a working copy from a repository.
            </p>
            <div className="bg-gray-900 dark:bg-black rounded p-2 font-mono text-sm text-green-400">
              <code>svn checkout URL [PATH]</code>
              <br />
              <code className="text-gray-500"># Short form</code>
              <br />
              <code>svn co URL [PATH]</code>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">
              <strong>In DELTA SVN:</strong> Use the Connections tab to browse remote repositories and checkout.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border-l-4 border-orange-500">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">svn info</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1.5">
              Displays information about a working copy or URL.
            </p>
            <div className="bg-gray-900 dark:bg-black rounded p-2 font-mono text-sm text-green-400">
              <code>svn info [PATH]</code>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">
              <strong>In DELTA SVN:</strong> Repository information is displayed in the Repository Details panel.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <InformationCircleIcon className="w-4 h-4 text-teal-500" />
          Tips & Best Practices
        </h3>
        
        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-md p-3 space-y-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Commit Messages</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Write clear, descriptive commit messages. Start with a brief summary, then add details if needed.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Update Before Commit</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Always update your working copy before committing to avoid conflicts and ensure you're working with the latest code.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Review Changes</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Review your changes using the diff viewer before committing to catch any mistakes.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Atomic Commits</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Group related changes together in a single commit. This makes it easier to track changes and revert if needed.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function TroubleshootingContent() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Troubleshooting
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Common issues and solutions to help you resolve problems quickly.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-orange-500" />
          Connection Issues
        </h3>
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-3 space-y-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Cannot connect to SVN server</h4>
            <ul className="list-disc list-inside space-y-0.5 text-sm text-gray-700 dark:text-gray-300 ml-4">
              <li>Verify the server URL is correct</li>
              <li>Check your username and password</li>
              <li>Ensure the server is accessible from your network</li>
              <li>Check firewall settings</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-orange-500" />
          Commit Failures
        </h3>
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-3 space-y-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Commit fails with "out of date" error</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Your working copy is out of date. Update your working copy first, then try committing again.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Commit fails after move/rename</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              When moving or renaming files, both the source and destination must be committed together. DELTA SVN handles this automatically.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <QuestionMarkCircleIcon className="w-4 h-4 text-teal-500" />
          Frequently Asked Questions
        </h3>
        <div className="space-y-2">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">How do I switch branches?</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Branch switching functionality is coming soon. For now, use the SVN command line or checkout the branch to a different directory.
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">Can I use SSH keys for authentication?</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              SSH key support is planned for a future release. Currently, username/password authentication is supported.
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">How do I resolve conflicts?</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Conflict resolution UI is in development. For now, resolve conflicts manually or use SVN command line tools.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

