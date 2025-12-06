import { XMarkIcon } from '@heroicons/react/24/outline'
import type { CommitLogEntry } from '../../hooks/useCommitHistory'
import { format, parseISO, subDays, isAfter, startOfDay } from 'date-fns'

type HistoryStatisticsModalProps = {
  commits: CommitLogEntry[]
  isOpen: boolean
  onClose: () => void
}

type DailyBucket = {
  date: Date
  label: string
  count: number
}

export function HistoryStatisticsModal({ commits, isOpen, onClose }: HistoryStatisticsModalProps) {
  if (!isOpen) return null

  const now = new Date()
  const startDate = subDays(startOfDay(now), 29) // last 30 days including today

  // Filter commits to last 30 days for the time-series chart
  const recentCommits = commits.filter((c) => {
    try {
      const d = parseISO(c.date)
      return isAfter(d, subDays(startDate, 1)) // inclusive of startDate
    } catch {
      return false
    }
  })

  // Build daily buckets
  const dailyMap = new Map<string, DailyBucket>()
  for (let i = 0; i < 30; i++) {
    const day = subDays(startOfDay(now), i)
    const key = format(day, 'yyyy-MM-dd')
    dailyMap.set(key, {
      date: day,
      label: format(day, 'MMM d'),
      count: 0,
    })
  }

  for (const commit of recentCommits) {
    try {
      const d = parseISO(commit.date)
      const key = format(startOfDay(d), 'yyyy-MM-dd')
      const bucket = dailyMap.get(key)
      if (bucket) {
        bucket.count++
      }
    } catch {
      // ignore parse errors
    }
  }

  const dailyBuckets = Array.from(dailyMap.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )
  const maxDaily = dailyBuckets.reduce((max, b) => (b.count > max ? b.count : max), 0) || 1

  // Commits by author
  const authorCounts = new Map<string, number>()
  for (const commit of commits) {
    const author = commit.author || 'Unknown'
    authorCounts.set(author, (authorCounts.get(author) || 0) + 1)
  }
  const authorBuckets = Array.from(authorCounts.entries())
    .map(([author, count]) => ({ author, count }))
    .sort((a, b) => b.count - a.count)
  const topAuthors = authorBuckets.slice(0, 8)
  const maxAuthor = topAuthors.reduce((max, a) => (a.count > max ? a.count : max), 0) || 1

  const totalCommits = commits.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-[820px] max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3.5 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/95 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            History Statistics
          </h3>
          <button
            onClick={onClose}
            className="ml-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors flex-shrink-0"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3.5 py-2.5">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Total Commits Loaded
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {totalCommits}
              </div>
            </div>
            <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3.5 py-2.5">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Time Range (Chart)
              </div>
              <div className="mt-2 text-sm text-gray-900 dark:text-white">
                Last 30 days
              </div>
            </div>
            <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3.5 py-2.5">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Active Authors
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {authorBuckets.length}
              </div>
            </div>
          </div>

          {/* Commits over time */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Commits Over Time (Last 30 Days)
              </h4>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                Max per day: {maxDaily}
              </div>
            </div>
            <div className="h-40 border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-gray-950/40 px-3 py-2 flex items-end gap-[3px]">
              {dailyBuckets.map((bucket) => {
                const heightPct = (bucket.count / maxDaily) * 100
                return (
                  <div
                    key={bucket.label}
                    className="flex-1 flex flex-col justify-end items-center"
                  >
                    <div
                      className="w-full rounded-t-sm bg-teal-500/80 dark:bg-teal-400/80 transition-all"
                      style={{ height: `${heightPct}%` }}
                    />
                    <div className="mt-1 text-[9px] text-gray-500 dark:text-gray-400 rotate-[-45deg] origin-top">
                      {bucket.label}
                    </div>
                    {bucket.count > 0 && (
                      <div className="mt-0.5 text-[10px] text-gray-700 dark:text-gray-200">
                        {bucket.count}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Commits by author */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Commits by Author (Top {topAuthors.length})
              </h4>
            </div>
            {topAuthors.length === 0 ? (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                No authors found.
              </div>
            ) : (
              <div className="space-y-2">
                {topAuthors.map((author) => {
                  const widthPct = (author.count / maxAuthor) * 100
                  return (
                    <div
                      key={author.author}
                      className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200"
                    >
                      <div className="w-32 truncate">{author.author}</div>
                      <div className="flex-1 h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-500/80 dark:bg-teal-400/80"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                      <div className="w-8 text-right text-[11px] text-gray-600 dark:text-gray-300">
                        {author.count}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-3.5 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50/95 dark:bg-slate-900/90 flex items-center justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium bg-teal-600 text-white rounded-md hover:bg-teal-700 dark:hover:bg-teal-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}


