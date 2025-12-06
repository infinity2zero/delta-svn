import { useState } from 'react'
import { XMarkIcon, BookOpenIcon } from '@heroicons/react/24/outline'
import { useTheme, type ThemeMode } from '../../hooks/useTheme'
import { DropdownSelect } from '../ui/DropdownSelect'
import { useActionRailSettings } from '../../hooks/useActionRailSettings'
import { useFontSize } from '../../hooks/useFontSize'
import { useOnboarding } from '../../hooks/useOnboarding'

type SettingsModalProps = {
  isOpen: boolean
  onClose: () => void
  onShowUserGuide?: () => void
}

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
]

export function SettingsModal({ isOpen, onClose, onShowUserGuide }: SettingsModalProps) {
  const { theme, mode, setMode } = useTheme()
  const { iconOnly, setIconOnly } = useActionRailSettings()
  const { fontSize, setFontSize } = useFontSize()
  const { resetOnboarding } = useOnboarding()
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    return localStorage.getItem('delta-svn-language') || 'en'
  })
  const [autoSave, setAutoSave] = useState<boolean>(() => {
    const saved = localStorage.getItem('delta-svn-auto-save')
    return saved ? saved === 'true' : true
  })
  const [showHiddenFiles, setShowHiddenFiles] = useState<boolean>(() => {
    const saved = localStorage.getItem('delta-svn-show-hidden')
    return saved ? saved === 'true' : false
  })
  const [confirmBeforeDelete, setConfirmBeforeDelete] = useState<boolean>(() => {
    const saved = localStorage.getItem('delta-svn-confirm-delete')
    return saved ? saved === 'true' : true
  })

  if (!isOpen) return null

  const handleLanguageChange = (langCode: string) => {
    setSelectedLanguage(langCode)
    localStorage.setItem('delta-svn-language', langCode)
    // TODO: Implement i18n language switching
  }

  const handleAutoSaveChange = (value: boolean) => {
    setAutoSave(value)
    localStorage.setItem('delta-svn-auto-save', value.toString())
  }

  const handleShowHiddenFilesChange = (value: boolean) => {
    setShowHiddenFiles(value)
    localStorage.setItem('delta-svn-show-hidden', value.toString())
  }

  const handleConfirmDeleteChange = (value: boolean) => {
    setConfirmBeforeDelete(value)
    localStorage.setItem('delta-svn-confirm-delete', value.toString())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] rounded-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Language Settings */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Language</h3>
            <div className="space-y-2">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">
                Select your preferred language
              </label>
              <DropdownSelect
                value={selectedLanguage}
                onChange={handleLanguageChange}
                options={languages.map((lang) => ({
                  value: lang.code,
                  label: `${lang.nativeName} (${lang.name})`,
                }))}
                size="md"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Language changes will take effect after restarting the application.
              </p>
            </div>
          </section>

          {/* Appearance Settings */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Appearance</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-gray-900 dark:text-gray-100">Theme</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Choose your preferred color theme
                  </p>
                </div>
                <DropdownSelect
                  value={mode}
                  onChange={(val) => setMode(val as ThemeMode)}
                  options={[
                    { value: 'system', label: 'System default' },
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                  ]}
                  size="sm"
                  className="min-w-[160px]"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-gray-900 dark:text-gray-100">Action Rail Display</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Show icons only or icons with labels</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {iconOnly ? 'Icons Only' : 'Icons + Labels'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={iconOnly}
                      onChange={(e) => setIconOnly(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 dark:peer-focus:ring-teal-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-teal-600"></div>
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="text-sm text-gray-900 dark:text-gray-100 mb-2 block">Font Size</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Adjust the base font size for the entire application (10px - 20px)
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (fontSize > 10) {
                          setFontSize(fontSize - 1)
                        }
                      }}
                      disabled={fontSize <= 10}
                      className="px-3 py-2 rounded-none border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="10"
                      max="20"
                      value={fontSize}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10)
                        if (!isNaN(value) && value >= 10 && value <= 20) {
                          setFontSize(value)
                        }
                      }}
                      className="w-20 px-3 py-2 rounded-none border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 text-center focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (fontSize < 20) {
                          setFontSize(fontSize + 1)
                        }
                      }}
                      disabled={fontSize >= 20}
                      className="px-3 py-2 rounded-none border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">px</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* General Settings */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">General</h3>
            {onShowUserGuide && (
              <div className="mb-4">
                <button
                  onClick={onShowUserGuide}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/30 border border-teal-200 dark:border-teal-800 rounded-md transition-colors text-left"
                >
                  <BookOpenIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">User Guide</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">View help documentation and tutorials</div>
                  </div>
                </button>
              </div>
            )}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-gray-900 dark:text-gray-100">Auto-save changes</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Automatically save changes when editing files</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSave}
                    onChange={(e) => handleAutoSaveChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 dark:peer-focus:ring-teal-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-teal-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-gray-900 dark:text-gray-100">Show hidden files</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Display hidden files and folders in file lists</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showHiddenFiles}
                    onChange={(e) => handleShowHiddenFilesChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 dark:peer-focus:ring-teal-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-teal-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-gray-900 dark:text-gray-100">Confirm before delete</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Show confirmation dialog before deleting items</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmBeforeDelete}
                    onChange={(e) => handleConfirmDeleteChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 dark:peer-focus:ring-teal-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-teal-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <label className="text-sm text-gray-900 dark:text-gray-100">Show onboarding again</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Reset and show the welcome screen on next launch</p>
                </div>
                <button
                  onClick={() => {
                    resetOnboarding()
                    onClose()
                    // Force reload to show onboarding
                    window.location.reload()
                  }}
                  className="px-4 py-2 text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </section>

          {/* SVN Settings */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">SVN</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Default Checkout Directory
                </label>
                <input
                  type="text"
                  defaultValue="./svn-working-copies"
                  className="w-full px-3 py-2 rounded-none border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="./svn-working-copies"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Default directory for checking out repositories
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-none border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

