import { useEffect, useState } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import type { Repository } from '../../types'

type ActionButton = {
  id: string
  label: string
  disabled?: boolean
  onClick?: () => void
  loading?: boolean
}

type ActionGroup = {
  id: string
  title?: string
  actions: ActionButton[]
}

type TitleBarProps = {
  selectedRepo: Repository | null
  toolbarGroups?: ActionGroup[]
}

export function TitleBar({ selectedRepo, toolbarGroups }: TitleBarProps) {
  const [platform, setPlatform] = useState<'macos' | 'windows' | 'linux'>('windows')
  const [appWindow, setAppWindow] = useState<ReturnType<typeof getCurrentWindow> | null>(null)

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase()
    
    if (userAgent.includes('mac')) {
      setPlatform('macos')
    } else if (userAgent.includes('win')) {
      setPlatform('windows')
    } else {
      setPlatform('linux')
    }

    // Get window instance
    setAppWindow(getCurrentWindow())
  }, [])

  const handleMinimize = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (appWindow) {
      try {
        await appWindow.minimize()
      } catch (error) {
        console.error('Failed to minimize:', error)
      }
    }
  }

  const handleMaximize = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (appWindow) {
      try {
        // Try toggleMaximize first, fallback to maximize if needed
        const isMaximized = await appWindow.isMaximized()
        if (isMaximized) {
          await appWindow.unmaximize()
        } else {
          await appWindow.maximize()
        }
      } catch (error) {
        console.error('Failed to toggle maximize:', error)
        // Fallback: try toggleMaximize
        try {
          await appWindow.toggleMaximize()
        } catch (fallbackError) {
          console.error('Fallback toggleMaximize also failed:', fallbackError)
        }
      }
    }
  }

  const handleClose = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (appWindow) {
      try {
        await appWindow.close()
      } catch (error) {
        console.error('Failed to close:', error)
      }
    }
  }

  const isMacOS = platform === 'macos'

  return (
    <div className="titlebar">
      {/* macOS Layout: [Traffic Lights] [Logo + Tagline] [Repository Info] */}
      {isMacOS ? (
        <>
          {/* Traffic Lights on Left */}
          <div className="flex items-center gap-1.5 px-3">
            <button 
              id="titlebar-close" 
              title="close" 
              className="traffic-light traffic-light-close"
              type="button"
              onClick={handleClose}
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <circle cx="6" cy="6" r="5.5" fill="#ff5f57" stroke="#e0443e" strokeWidth="0.5" />
                <path d="M4 4l4 4M8 4l-4 4" stroke="#4d0000" strokeWidth="0.8" strokeLinecap="round" opacity="0" />
              </svg>
            </button>
            <button 
              id="titlebar-minimize" 
              title="minimize" 
              className="traffic-light traffic-light-minimize"
              type="button"
              onClick={handleMinimize}
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <circle cx="6" cy="6" r="5.5" fill="#ffbd2e" stroke="#dea123" strokeWidth="0.5" />
                <path d="M3 6h6" stroke="#975500" strokeWidth="0.8" strokeLinecap="round" opacity="0" />
              </svg>
            </button>
            <button 
              id="titlebar-maximize" 
              title="maximize" 
              className="traffic-light traffic-light-maximize"
              type="button"
              onClick={handleMaximize}
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <circle cx="6" cy="6" r="5.5" fill="#28ca42" stroke="#1aab29" strokeWidth="0.5" />
                <path d="M4 4h4v4H4z" stroke="#006400" strokeWidth="0.8" fill="none" opacity="0" />
              </svg>
            </button>
          </div>

          {/* Logo + Tagline */}
          <div className="flex items-center gap-4 flex-1 min-w-0 px-4" data-tauri-drag-region>
            <div className="h-6 w-6 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
              Δ
            </div>
            <div className="flex-shrink-0">
              <div className="text-xs font-bold text-gray-900 dark:text-white leading-tight">DELTA SVN</div>
              <div className="text-[9px] text-gray-500 dark:text-gray-400 tracking-widest uppercase leading-tight">Track Every Change</div>
            </div>
          </div>
        </>
      ) : (
        /* Windows/Linux Layout: [Logo + Tagline] [Repository Info] [Menus] [Controls] */
        <>
          {/* Logo + Tagline on Left */}
          <div className="flex items-center gap-3 flex-1 min-w-0 px-4" data-tauri-drag-region>
            <div className="h-6 w-6 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
              Δ
            </div>
            <div className="flex-shrink-0">
              <div className="text-xs font-bold text-gray-900 dark:text-white leading-tight">DELTA SVN</div>
              <div className="text-[9px] text-gray-500 dark:text-gray-400 tracking-widest uppercase leading-tight">Track Every Change</div>
            </div>
          </div>

          {/* Menus/Actions in Center */}
          {toolbarGroups && toolbarGroups.length > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0 px-4" data-tauri-drag-region>
              {toolbarGroups.map((group, index) => (
                <div key={group.id} className="flex items-center gap-1.5">
                  {group.actions.map((action) => {
                    const isPrimary = index === 0
                    return (
                      <button
                        key={action.id}
                        disabled={action.disabled || action.loading}
                        onClick={action.onClick}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-none border text-[10px] font-medium transition-colors ${
                          isPrimary
                            ? 'border-teal-500/30 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-200 dark:border-teal-700/60'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                        } disabled:opacity-40 disabled:cursor-not-allowed shadow-sm`}
                      >
                        {action.loading ? (
                          <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <span className="text-[8px] opacity-70">●</span>
                        )}
                        {action.loading ? 'Updating...' : action.label}
                      </button>
                    )
                  })}
                  {index < toolbarGroups.length - 1 && (
                    <span className="h-4 w-px bg-gray-200 dark:bg-gray-800 mx-1" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Window Controls on Right */}
          <div className="flex items-center flex-shrink-0">
            <button 
              id="titlebar-minimize" 
              title="minimize" 
              className="titlebar-btn"
              type="button"
              onClick={handleMinimize}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
              >
                <path fill="currentColor" d="M19 13H5v-2h14z" />
              </svg>
            </button>
            <button 
              id="titlebar-maximize" 
              title="maximize" 
              className="titlebar-btn"
              type="button"
              onClick={handleMaximize}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
              >
                <path fill="currentColor" d="M4 4h16v16H4zm2 4v10h12V8z" />
              </svg>
            </button>
            <button 
              id="titlebar-close" 
              title="close" 
              className="titlebar-btn titlebar-btn-close"
              type="button"
              onClick={handleClose}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M13.46 12L19 17.54V19h-1.46L12 13.46L6.46 19H5v-1.46L10.54 12L5 6.46V5h1.46L12 10.54L17.54 5H19v1.46z"
                />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
