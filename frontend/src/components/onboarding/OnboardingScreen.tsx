import { useState } from 'react'
import { XMarkIcon, ArrowRightIcon, ArrowLeftIcon, SparklesIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon as CheckCircleOutlineIcon, XCircleIcon, ArrowPathIcon, LinkIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { TitleBar } from '../layout/TitleBar'
import { invoke } from '@tauri-apps/api/core'
import { useConnectionStore } from '../../store/connectionStore'

type OnboardingStep = {
  id: number
  title: string
  description: string
  illustration: React.ReactNode
  features?: string[]
  actionLabel?: string
  onAction?: () => void
  isCredentialsStep?: boolean
}

type OnboardingScreenProps = {
  onComplete: () => void
  onSkip: () => void
}

export function OnboardingScreen({ onComplete, onSkip }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const { addConnection } = useConnectionStore()
  
  // Credentials state
  const [serverUrl, setServerUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error'; message?: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const steps: OnboardingStep[] = [
    {
      id: 0,
      title: 'Welcome to DELTA SVN',
      description: 'A modern, beautiful SVN client designed for developers who value simplicity and power.',
      illustration: <WelcomeIllustration />,
      features: [
        'Modern, intuitive interface',
        'Cross-platform support',
        'Lightning-fast operations',
        'Beautiful dark & light themes'
      ]
    },
    {
      id: 1,
      title: 'Manage Your Repositories',
      description: 'Add local repositories or checkout from remote servers. Everything in one place.',
      illustration: <RepositoryIllustration />,
      features: [
        'Add existing working copies',
        'Browse and checkout from remote',
        'Switch between repositories easily',
        'View repository details at a glance'
      ]
    },
    {
      id: 2,
      title: 'Track Changes Effortlessly',
      description: 'See what changed, stage files, and commit with confidence. All your SVN operations made simple.',
      illustration: <ChangesIllustration />,
      features: [
        'Visual diff viewer',
        'Stage and unstage files',
        'Commit with rich messages',
        'View complete history'
      ]
    },
    {
      id: 3,
      title: 'Connect to Your SVN Server',
      description: 'Add your SVN server credentials to browse and checkout repositories. You can also do this later in the Connections screen.',
      illustration: <ConnectionIllustration />,
      isCredentialsStep: true
    },
    {
      id: 4,
      title: 'You\'re All Set!',
      description: 'Start managing your SVN repositories with ease. Need help? Check out the user guide anytime.',
      illustration: <ReadyIllustration />,
      actionLabel: 'Get Started',
      onAction: onComplete
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection('forward')
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setDirection('backward')
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    onSkip()
  }

  const currentStepData = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden bg-gradient-to-br from-teal-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* TitleBar */}
      <TitleBar selectedRepo={null} toolbarGroups={[]} />
      
      {/* Main content area */}
      <div className="pt-[36px] flex flex-col flex-1 overflow-hidden relative">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-72 h-72 bg-teal-200/20 dark:bg-teal-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-300/20 dark:bg-teal-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-100/10 dark:bg-teal-600/5 rounded-full blur-3xl" />
        </div>

        {/* Main content */}
        <div className="relative z-10 w-full max-w-3xl mx-auto px-4 py-4 h-full flex flex-col">
        {/* Header with skip button */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-teal-500 flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">DELTA SVN</span>
          </div>
          <button
            onClick={handleSkip}
            className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors flex items-center gap-1.5"
          >
            Skip
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center transition-all duration-300 ${
                  index < steps.length - 1 ? 'flex-1' : ''
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index <= currentStep
                      ? 'bg-teal-500 dark:bg-teal-400 scale-110'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-1.5 transition-all duration-300 ${
                      index < currentStep
                        ? 'bg-teal-500 dark:bg-teal-400'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>

        {/* Step content */}
        <div className="relative flex-1 flex items-center justify-center min-h-0">
          <div
            key={currentStep}
            className={`w-full animate-fade-in ${
              direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'
            }`}
          >
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-lg shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
              {/* Illustration */}
              <div className="flex justify-center mb-4">
                <div className="w-full max-w-xs">
                  {currentStepData.illustration}
                </div>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
                {currentStepData.title}
              </h2>

              {/* Description */}
              <p className="text-sm text-center text-gray-600 dark:text-gray-300 mb-4 max-w-xl mx-auto">
                {currentStepData.description}
              </p>

              {/* Features list */}
              {currentStepData.features && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4 max-w-xl mx-auto">
                  {currentStepData.features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded-md bg-teal-50/50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800/30"
                    >
                      <CheckCircleIcon className="w-4 h-4 text-teal-500 dark:text-teal-400 flex-shrink-0" />
                      <span className="text-xs text-gray-700 dark:text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Credentials form */}
              {currentStepData.isCredentialsStep && (
                <div className="max-w-md mx-auto space-y-3">
                  <div className="text-xs text-center text-gray-500 dark:text-gray-400 mb-3">
                    You can skip this step and add connections later in the Connections screen
                  </div>
                  
                  {/* Server URL */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Server URL
                    </label>
                    <input
                      type="text"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="svn://localhost/repo or https://svn.example.com"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400"
                    />
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password (optional)"
                        className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Test Connection Button */}
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (!serverUrl || !username) {
                          setTestResult({ status: 'error', message: 'Server URL and username are required' })
                          return
                        }

                        setIsTesting(true)
                        setTestResult(null)

                        try {
                          await invoke('list_remote_entries', {
                            baseUrl: serverUrl,
                            path: '/',
                            username,
                            password: password || '',
                          })
                          setTestResult({ status: 'success', message: 'Connection successful!' })
                        } catch (err) {
                          const errorMsg = err instanceof Error ? err.message : String(err)
                          setTestResult({ status: 'error', message: errorMsg })
                        } finally {
                          setIsTesting(false)
                        }
                      }}
                      disabled={isTesting || !serverUrl || !username}
                      className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700 text-white text-sm font-medium rounded-md shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isTesting ? (
                        <>
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                          <span>Testing...</span>
                        </>
                      ) : (
                        <>
                          <LinkIcon className="w-4 h-4" />
                          <span>Test Connection</span>
                        </>
                      )}
                    </button>

                    {/* Save Connection Button */}
                    {testResult?.status === 'success' && (
                      <button
                        onClick={async () => {
                          if (!serverUrl || !username) return
                          
                          setIsSaving(true)
                          try {
                            addConnection({
                              name: serverUrl.split('/').pop() || 'SVN Server',
                              url: serverUrl,
                              username,
                              password: password || undefined,
                            })
                            setTestResult({ status: 'success', message: 'Connection saved successfully!' })
                            // Auto-advance after a short delay
                            setTimeout(() => {
                              handleNext()
                            }, 1000)
                          } catch (err) {
                            setTestResult({ status: 'error', message: 'Failed to save connection' })
                          } finally {
                            setIsSaving(false)
                          }
                        }}
                        disabled={isSaving}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white text-sm font-medium rounded-md shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? (
                          <>
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircleOutlineIcon className="w-4 h-4" />
                            <span>Save</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Test Result */}
                  {testResult && (
                    <div className={`p-2 rounded-md text-xs flex items-center gap-2 ${
                      testResult.status === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                    }`}>
                      {testResult.status === 'success' ? (
                        <CheckCircleOutlineIcon className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <XCircleIcon className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action button for last step */}
              {isLastStep && currentStepData.onAction && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={currentStepData.onAction}
                    className="px-6 py-2 bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700 text-white text-sm font-semibold rounded-md shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                  >
                    {currentStepData.actionLabel}
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation buttons */}
        {!isLastStep && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handlePrevious}
              disabled={isFirstStep}
              className={`px-4 py-2 text-sm rounded-md font-medium transition-all duration-200 flex items-center gap-2 ${
                isFirstStep
                  ? 'opacity-50 cursor-not-allowed text-gray-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Previous
            </button>

            <button
              onClick={handleNext}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700 text-white text-sm font-semibold rounded-md shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
            >
              Next
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-right {
          from { transform: translateX(30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slide-in-left {
          from { transform: translateX(-30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.4s ease-out;
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.4s ease-out;
        }
      `}</style>
    </div>
  )
}

// Illustration Components
function WelcomeIllustration() {
  return (
    <div className="relative">
      <svg viewBox="0 0 400 300" className="w-full h-auto max-h-48">
        {/* Background circle */}
        <circle cx="200" cy="150" r="120" fill="url(#gradient1)" opacity="0.2" />
        
        {/* Main icon - Version control symbol */}
        <g transform="translate(200, 150)">
          {/* Branch lines */}
          <path
            d="M -60 -40 L -20 -40 L -20 0 L 20 0 L 20 40 L 60 40"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-teal-500 dark:text-teal-400"
            strokeLinecap="round"
          />
          {/* Nodes */}
          <circle cx="-60" cy="-40" r="8" fill="currentColor" className="text-teal-500 dark:text-teal-400" />
          <circle cx="-20" cy="-40" r="8" fill="currentColor" className="text-teal-500 dark:text-teal-400" />
          <circle cx="-20" cy="0" r="8" fill="currentColor" className="text-teal-500 dark:text-teal-400" />
          <circle cx="20" cy="0" r="8" fill="currentColor" className="text-teal-500 dark:text-teal-400" />
          <circle cx="20" cy="40" r="8" fill="currentColor" className="text-teal-500 dark:text-teal-400" />
          <circle cx="60" cy="40" r="8" fill="currentColor" className="text-teal-500 dark:text-teal-400" />
        </g>
        
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

function RepositoryIllustration() {
  return (
    <div className="relative">
      <svg viewBox="0 0 400 300" className="w-full h-auto max-h-48">
        {/* Folder stack */}
        <g transform="translate(200, 150)">
          {/* Folder 1 */}
          <path
            d="M -80 -60 L 20 -60 L 30 -40 L 30 20 L -80 20 Z"
            fill="currentColor"
            className="text-teal-400 dark:text-teal-500"
            opacity="0.8"
          />
          <path
            d="M -80 -60 L -70 -50 L 20 -50"
            stroke="currentColor"
            strokeWidth="2"
            className="text-teal-600 dark:text-teal-400"
            fill="none"
          />
          
          {/* Folder 2 */}
          <path
            d="M -60 -50 L 40 -50 L 50 -30 L 50 30 L -60 30 Z"
            fill="currentColor"
            className="text-teal-500 dark:text-teal-400"
            opacity="0.9"
          />
          <path
            d="M -60 -50 L -50 -40 L 40 -40"
            stroke="currentColor"
            strokeWidth="2"
            className="text-teal-600 dark:text-teal-400"
            fill="none"
          />
          
          {/* Folder 3 */}
          <path
            d="M -40 -40 L 60 -40 L 70 -20 L 70 40 L -40 40 Z"
            fill="currentColor"
            className="text-teal-600 dark:text-teal-300"
          />
          <path
            d="M -40 -40 L -30 -30 L 60 -30"
            stroke="currentColor"
            strokeWidth="2"
            className="text-teal-700 dark:text-teal-200"
            fill="none"
          />
        </g>
      </svg>
    </div>
  )
}

function ChangesIllustration() {
  return (
    <div className="relative">
      <svg viewBox="0 0 400 300" className="w-full h-auto max-h-48">
        {/* Document with diff lines */}
        <g transform="translate(200, 150)">
          {/* Document */}
          <rect x="-60" y="-80" width="120" height="160" rx="4" fill="white" className="dark:fill-slate-700 dark:stroke-gray-600" stroke="currentColor" strokeWidth="2" />
          
          {/* Lines */}
          <line x1="-50" y1="-60" x2="50" y2="-60" stroke="currentColor" strokeWidth="2" className="text-gray-400" />
          <line x1="-50" y1="-40" x2="50" y2="-40" stroke="currentColor" strokeWidth="2" className="text-gray-400" />
          
          {/* Added line (green) */}
          <rect x="-50" y="-20" width="100" height="8" rx="2" fill="currentColor" className="text-green-500 dark:text-green-400" />
          
          <line x1="-50" y1="0" x2="50" y2="0" stroke="currentColor" strokeWidth="2" className="text-gray-400" />
          
          {/* Modified line (yellow) */}
          <rect x="-50" y="20" width="100" height="8" rx="2" fill="currentColor" className="text-yellow-500 dark:text-yellow-400" />
          
          <line x1="-50" y1="40" x2="50" y2="40" stroke="currentColor" strokeWidth="2" className="text-gray-400" />
          <line x1="-50" y1="60" x2="50" y2="60" stroke="currentColor" strokeWidth="2" className="text-gray-400" />
        </g>
      </svg>
    </div>
  )
}

function ConnectionIllustration() {
  return (
    <div className="relative">
      <svg viewBox="0 0 400 300" className="w-full h-auto max-h-48">
        <g transform="translate(200, 150)">
          {/* Server/Cloud */}
          <ellipse cx="0" cy="-40" rx="60" ry="30" fill="currentColor" className="text-teal-400 dark:text-teal-500" opacity="0.3" />
          <ellipse cx="0" cy="-40" rx="50" ry="25" fill="currentColor" className="text-teal-500 dark:text-teal-400" />
          
          {/* Connection lines */}
          <line x1="-50" y1="-40" x2="-80" y2="20" stroke="currentColor" strokeWidth="3" className="text-teal-500 dark:text-teal-400" strokeLinecap="round" />
          <line x1="0" y1="-40" x2="0" y2="20" stroke="currentColor" strokeWidth="3" className="text-teal-500 dark:text-teal-400" strokeLinecap="round" />
          <line x1="50" y1="-40" x2="80" y2="20" stroke="currentColor" strokeWidth="3" className="text-teal-500 dark:text-teal-400" strokeLinecap="round" />
          
          {/* Client/Computer */}
          <rect x="-90" y="20" width="40" height="30" rx="4" fill="currentColor" className="text-teal-600 dark:text-teal-300" />
          <rect x="-85" y="25" width="30" height="20" fill="white" className="dark:fill-gray-800" />
          
          <rect x="-20" y="20" width="40" height="30" rx="4" fill="currentColor" className="text-teal-600 dark:text-teal-300" />
          <rect x="-15" y="25" width="30" height="20" fill="white" className="dark:fill-gray-800" />
          
          <rect x="50" y="20" width="40" height="30" rx="4" fill="currentColor" className="text-teal-600 dark:text-teal-300" />
          <rect x="55" y="25" width="30" height="20" fill="white" className="dark:fill-gray-800" />
        </g>
      </svg>
    </div>
  )
}

function ReadyIllustration() {
  return (
    <div className="relative">
      <svg viewBox="0 0 400 300" className="w-full h-auto max-h-48">
        <g transform="translate(200, 150)">
          {/* Checkmark circle */}
          <circle cx="0" cy="0" r="80" fill="url(#gradient2)" opacity="0.2" />
          <circle cx="0" cy="0" r="60" fill="currentColor" className="text-teal-500 dark:text-teal-400" />
          
          {/* Checkmark */}
          <path
            d="M -20 0 L -5 15 L 20 -10"
            stroke="white"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          
          {/* Sparkles */}
          <g className="animate-pulse">
            <circle cx="-80" cy="-80" r="4" fill="currentColor" className="text-teal-400" />
            <circle cx="80" cy="-80" r="4" fill="currentColor" className="text-teal-400" />
            <circle cx="-80" cy="80" r="4" fill="currentColor" className="text-teal-400" />
            <circle cx="80" cy="80" r="4" fill="currentColor" className="text-teal-400" />
          </g>
        </g>
        
        <defs>
          <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

