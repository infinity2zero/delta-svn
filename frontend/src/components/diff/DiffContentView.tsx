import { useMemo, useRef, useState, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

type DiffLine = {
  type: 'header' | 'hunk' | 'added' | 'removed' | 'context' | 'no-newline'
  content: string
  oldLineNumber?: number | null
  newLineNumber?: number | null
  symbol: string
}

type DiffContentViewProps = {
  diffContent: string
  fullFileContent?: string
  viewMode?: 'unified' | 'split'
  maxLinesBeforeTruncate?: number
}

const DEFAULT_MAX_LINES = 1000 // Show first 1000 lines by default

// Parse unified diff into structured lines with line numbers
function parseDiffLines(diffContent: string): DiffLine[] {
  const lines = diffContent.split('\n')
  const parsed: DiffLine[] = []
  let oldLineNum: number | null = null
  let newLineNum: number | null = null
  let inHunk = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const firstChar = line[0] || ' '

    if (line.startsWith('---') || line.startsWith('+++')) {
      // File header
      parsed.push({
        type: 'header',
        content: line,
        symbol: ' ',
      })
      continue
    }

    if (line.startsWith('@@')) {
      // Hunk header: @@ -old_start,old_count +new_start,new_count @@
      const match = line.match(/@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/)
      if (match) {
        oldLineNum = parseInt(match[1], 10)
        newLineNum = parseInt(match[3], 10)
        inHunk = true
      }
      parsed.push({
        type: 'hunk',
        content: line,
        oldLineNumber: null,
        newLineNumber: null,
        symbol: ' ',
      })
      continue
    }

    if (!inHunk) {
      // Skip lines before first hunk
      continue
    }

    if (firstChar === '+') {
      // Added line
      parsed.push({
        type: 'added',
        content: line.substring(1),
        oldLineNumber: null,
        newLineNumber: newLineNum,
        symbol: '+',
      })
      if (newLineNum !== null) newLineNum++
    } else if (firstChar === '-') {
      // Removed line
      parsed.push({
        type: 'removed',
        content: line.substring(1),
        oldLineNumber: oldLineNum,
        newLineNumber: null,
        symbol: '−',
      })
      if (oldLineNum !== null) oldLineNum++
    } else if (firstChar === ' ') {
      // Context line (unchanged)
      parsed.push({
        type: 'context',
        content: line.substring(1),
        oldLineNumber: oldLineNum,
        newLineNumber: newLineNum,
        symbol: ' ',
      })
      if (oldLineNum !== null) oldLineNum++
      if (newLineNum !== null) newLineNum++
    } else if (line.trim() === '\\ No newline at end of file') {
      parsed.push({
        type: 'no-newline',
        content: line,
        oldLineNumber: null,
        newLineNumber: null,
        symbol: ' ',
      })
    }
  }

  return parsed
}

// Parse diff to identify which lines in the new file are changed
function getChangedLineNumbers(diffContent: string): Set<number> {
  const lines = diffContent.split('\n')
  const changedLines = new Set<number>()
  let newLineNum: number | null = null
  let inHunk = false

  for (const line of lines) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/)
      if (match) {
        newLineNum = parseInt(match[3], 10)
        inHunk = true
      }
      continue
    }

    if (!inHunk) continue

    const firstChar = line[0] || ' '
    if (firstChar === '+' || firstChar === ' ') {
      // Added or context line - track it
      if (newLineNum !== null) {
        if (firstChar === '+') {
          changedLines.add(newLineNum)
        }
        newLineNum++
      }
    } else if (firstChar === '-') {
      // Removed line - doesn't exist in new file, skip
      continue
    }
  }

  return changedLines
}

// Merge full file content with diff to show all lines
function mergeFullFileWithDiff(
  fullFileContent: string,
  diffContent: string
): DiffLine[] {
  const fileLines = fullFileContent.split('\n')
  const changedLines = getChangedLineNumbers(diffContent)
  const result: DiffLine[] = []
  
  // Create all lines from the full file
  for (let i = 0; i < fileLines.length; i++) {
    const lineNum = i + 1
    const lineContent = fileLines[i]
    
    if (changedLines.has(lineNum)) {
      // This line was added or modified
      result.push({
        type: 'added',
        content: lineContent,
        oldLineNumber: null,
        newLineNumber: lineNum,
        symbol: '+',
      })
    } else {
      // Unchanged line
      result.push({
        type: 'context',
        content: lineContent,
        oldLineNumber: lineNum,
        newLineNumber: lineNum,
        symbol: '·',
      })
    }
  }

  // Now add removed lines from the diff
  const diffLines = parseDiffLines(diffContent)
  for (const diffLine of diffLines) {
    if (diffLine.type === 'removed' && diffLine.oldLineNumber !== null && diffLine.oldLineNumber !== undefined) {
      // Insert removed line at approximate position
      // We'll place it before the line number it was at in the old file
      const insertPos = Math.min(diffLine.oldLineNumber - 1, result.length)
      result.splice(insertPos, 0, {
        type: 'removed',
        content: diffLine.content,
        oldLineNumber: diffLine.oldLineNumber,
        newLineNumber: null,
        symbol: '−',
      })
    }
  }

  return result
}

type CollapsibleSection = {
  type: 'collapsible'
  startLine: number // Index into the lines array
  endLine: number // Index into the lines array
  lineCount: number
  isExpanded: boolean
  id: string
  firstLineNumber?: number | null // Actual line number for display
  lastLineNumber?: number | null // Actual line number for display
}

type DisplayItem = DiffLine | CollapsibleSection

export function DiffContentView({
  diffContent,
  fullFileContent,
  viewMode = 'unified',
  maxLinesBeforeTruncate = DEFAULT_MAX_LINES,
}: DiffContentViewProps) {
  const [showFullDiff, setShowFullDiff] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const parentRef = useRef<HTMLDivElement>(null)

  // If full file content is provided, merge it with diff to show all lines
  const allLines = useMemo(() => {
    // Only use full file content if it's actually provided and not empty
    // Also need diffContent to merge properly
    if (fullFileContent && fullFileContent.length > 0 && diffContent && diffContent.trim()) {
      try {
        const fileLineCount = fullFileContent.split('\n').length
        const merged = mergeFullFileWithDiff(fullFileContent, diffContent)
        // Ensure we actually got lines from the full file
        // The merged result should have at least as many lines as the file (might have more due to removed lines)
        if (merged.length >= fileLineCount) {
          return merged
        }
        // If merge didn't work correctly, fall back to diff-only
        console.warn('Merge result has fewer lines than file. File lines:', fileLineCount, 'Merged lines:', merged.length)
      } catch (error) {
        console.error('Error merging full file with diff:', error)
      }
    }
    // Fallback to original diff-only parsing
    if (!diffContent) {
      return []
    }
    return parseDiffLines(diffContent)
  }, [diffContent, fullFileContent])

  // Group lines into collapsible sections for unchanged content
  const { displayItems } = useMemo(() => {
    const items: DisplayItem[] = []
    const MIN_COLLAPSIBLE_LINES = 5 // Minimum lines to make a section collapsible
    
    let unchangedStart: number | null = null
    let unchangedCount = 0
    
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i]
      
      const isUnchanged = line.type === 'context' && line.oldLineNumber === line.newLineNumber
      
      if (isUnchanged) {
        if (unchangedStart === null) {
          unchangedStart = i
          unchangedCount = 1
        } else {
          unchangedCount++
        }
      } else {
        // We hit a changed line, check if we need to collapse previous unchanged section
        if (unchangedStart !== null && unchangedCount >= MIN_COLLAPSIBLE_LINES) {
          const sectionId = `section-${unchangedStart}-${unchangedStart + unchangedCount - 1}`
          const isExpanded = expandedSections.has(sectionId)
          
          items.push({
            type: 'collapsible',
            startLine: unchangedStart,
            endLine: unchangedStart + unchangedCount - 1,
            lineCount: unchangedCount,
            isExpanded,
            id: sectionId,
          })
          
          // If expanded, add all the lines
          if (isExpanded) {
            for (let j = unchangedStart; j < unchangedStart + unchangedCount; j++) {
              items.push(allLines[j])
            }
          }
        } else if (unchangedStart !== null) {
          // Too few lines, just add them directly
          for (let j = unchangedStart; j < unchangedStart + unchangedCount; j++) {
            items.push(allLines[j])
          }
        }
        
        unchangedStart = null
        unchangedCount = 0
        items.push(line)
      }
    }
    
    // Handle trailing unchanged section
    if (unchangedStart !== null && unchangedCount >= MIN_COLLAPSIBLE_LINES) {
      const sectionId = `section-${unchangedStart}-${unchangedStart + unchangedCount - 1}`
      const isExpanded = expandedSections.has(sectionId)
      
      items.push({
        type: 'collapsible',
        startLine: unchangedStart,
        endLine: unchangedStart + unchangedCount - 1,
        lineCount: unchangedCount,
        isExpanded,
        id: sectionId,
      })
      
      if (isExpanded) {
        for (let j = unchangedStart; j < unchangedStart + unchangedCount; j++) {
          items.push(allLines[j])
        }
      }
    } else if (unchangedStart !== null) {
      for (let j = unchangedStart; j < unchangedStart + unchangedCount; j++) {
        items.push(allLines[j])
      }
    }
    
    return { displayItems: items }
  }, [allLines, expandedSections])

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }, [])

  const shouldTruncate = displayItems.length > maxLinesBeforeTruncate && !showFullDiff
  const finalDisplayItems = shouldTruncate ? displayItems.slice(0, maxLinesBeforeTruncate) : displayItems
  const hasMoreLines = displayItems.length > finalDisplayItems.length

  const virtualizer = useVirtualizer({
    count: finalDisplayItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = finalDisplayItems[index]
      if (item && 'type' in item && item.type === 'collapsible') {
        return 32 // Height for collapsible section header
      }
      return 20 // Estimated line height
    },
    overscan: 10, // Render 10 extra items above/below viewport
  })

  const getLineStyles = (line: DiffLine) => {
    switch (line.type) {
      case 'hunk':
        return {
          bg: 'bg-gray-50 dark:bg-gray-800/50',
          border: 'border-l-4 border-gray-300 dark:border-gray-600',
          textColor: 'text-gray-700 dark:text-gray-300',
        }
      case 'added':
        return {
          bg: 'bg-[#e6ffed] dark:bg-green-900/20',
          border: 'border-l-4 border-[#2cbe4e] dark:border-green-500',
          textColor: 'text-gray-900 dark:text-gray-100',
        }
      case 'removed':
        return {
          bg: 'bg-[#ffeef0] dark:bg-red-900/20',
          border: 'border-l-4 border-[#d73a49] dark:border-red-500',
          textColor: 'text-gray-900 dark:text-gray-100',
        }
      case 'no-newline':
        return {
          bg: 'bg-transparent dark:bg-transparent',
          border: 'border-l-4 border-transparent',
          textColor: 'text-gray-500 dark:text-gray-400 italic',
        }
      default:
        return {
          bg: 'bg-white dark:bg-gray-900',
          border: 'border-l-4 border-transparent',
          textColor: 'text-gray-900 dark:text-gray-100',
        }
    }
  }

  const getIcon = (line: DiffLine) => {
    switch (line.type) {
      case 'added':
        return '+'
      case 'removed':
        return '−'
      case 'hunk':
      case 'no-newline':
        return ' '
      default:
        return '·'
    }
  }

  const oldPanelRef = useRef<HTMLDivElement>(null)
  const newPanelRef = useRef<HTMLDivElement>(null)

  // Helper function to create collapsible sections for a list of lines
  const createCollapsibleItems = useCallback((lines: DiffLine[], side: 'old' | 'new'): DisplayItem[] => {
    const items: DisplayItem[] = []
    const MIN_COLLAPSIBLE_LINES = 5
    
    let unchangedStart: number | null = null
    let unchangedCount = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const isUnchanged = line.type === 'context' && line.oldLineNumber === line.newLineNumber
      
      if (isUnchanged) {
        if (unchangedStart === null) {
          unchangedStart = i
          unchangedCount = 1
        } else {
          unchangedCount++
        }
      } else {
        // We hit a changed line
        if (unchangedStart !== null && unchangedCount >= MIN_COLLAPSIBLE_LINES) {
          const sectionId = `${side}-section-${unchangedStart}-${unchangedStart + unchangedCount - 1}`
          const isExpanded = expandedSections.has(sectionId)
          const firstLine = lines[unchangedStart]
          const lastLine = lines[unchangedStart + unchangedCount - 1]
          
          items.push({
            type: 'collapsible',
            startLine: unchangedStart,
            endLine: unchangedStart + unchangedCount - 1,
            lineCount: unchangedCount,
            isExpanded,
            id: sectionId,
            firstLineNumber: side === 'old' ? firstLine.oldLineNumber : firstLine.newLineNumber,
            lastLineNumber: side === 'old' ? lastLine.oldLineNumber : lastLine.newLineNumber,
          })
          
          if (isExpanded) {
            for (let j = unchangedStart; j < unchangedStart + unchangedCount; j++) {
              items.push(lines[j])
            }
          }
        } else if (unchangedStart !== null) {
          for (let j = unchangedStart; j < unchangedStart + unchangedCount; j++) {
            items.push(lines[j])
          }
        }
        
        unchangedStart = null
        unchangedCount = 0
        items.push(line)
      }
    }
    
    // Handle trailing unchanged section
    if (unchangedStart !== null && unchangedCount >= MIN_COLLAPSIBLE_LINES) {
      const sectionId = `${side}-section-${unchangedStart}-${unchangedStart + unchangedCount - 1}`
      const isExpanded = expandedSections.has(sectionId)
      const firstLine = lines[unchangedStart]
      const lastLine = lines[unchangedStart + unchangedCount - 1]
      
      items.push({
        type: 'collapsible',
        startLine: unchangedStart,
        endLine: unchangedStart + unchangedCount - 1,
        lineCount: unchangedCount,
        isExpanded,
        id: sectionId,
        firstLineNumber: side === 'old' ? firstLine.oldLineNumber : firstLine.newLineNumber,
        lastLineNumber: side === 'old' ? lastLine.oldLineNumber : lastLine.newLineNumber,
      })
      
      if (isExpanded) {
        for (let j = unchangedStart; j < unchangedStart + unchangedCount; j++) {
          items.push(lines[j])
        }
      }
    } else if (unchangedStart !== null) {
      for (let j = unchangedStart; j < unchangedStart + unchangedCount; j++) {
        items.push(lines[j])
      }
    }
    
    return items
  }, [expandedSections])

  // Compute split view lines with collapsible sections
  // For split view, we need to show full file content on both sides
  // Use allLines which already has the full file merged when fullFileContent is available
  const { oldDisplayItems, newDisplayItems } = useMemo(() => {
    if (viewMode !== 'split') {
      return { oldDisplayItems: [], newDisplayItems: [] }
    }

    // Split allLines into old and new panels
    // allLines already contains the full file content merged with diff when fullFileContent is available
    const old: DiffLine[] = []
    const new_: DiffLine[] = []
    
    for (const line of allLines) {
      if (line.type === 'header' || line.type === 'hunk' || line.type === 'no-newline') {
        // Headers and hunks appear in both panels
        old.push(line)
        new_.push(line)
      } else if (line.type === 'removed') {
        // Removed lines only appear in old panel
        old.push(line)
        new_.push({
          type: 'context',
          content: '',
          oldLineNumber: null,
          newLineNumber: null,
          symbol: ' ',
        })
      } else if (line.type === 'added') {
        // Added lines only appear in new panel
        old.push({
          type: 'context',
          content: '',
          oldLineNumber: null,
          newLineNumber: null,
          symbol: ' ',
        })
        new_.push(line)
      } else {
        // Context lines (unchanged) appear in both panels
        old.push(line)
        new_.push(line)
      }
    }
    
    return {
      oldDisplayItems: createCollapsibleItems(old, 'old'),
      newDisplayItems: createCollapsibleItems(new_, 'new'),
    }
  }, [viewMode, allLines, createCollapsibleItems])

  // Always call hooks (React rules)
  const oldVirtualizer = useVirtualizer({
    count: viewMode === 'split' ? oldDisplayItems.length : 0,
    getScrollElement: () => oldPanelRef.current,
    estimateSize: (index) => {
      if (viewMode !== 'split') return 20
      const item = oldDisplayItems[index]
      if (item && 'type' in item && item.type === 'collapsible') {
        return 32
      }
      return 20
    },
    overscan: 10,
  })

  const newVirtualizer = useVirtualizer({
    count: viewMode === 'split' ? newDisplayItems.length : 0,
    getScrollElement: () => newPanelRef.current,
    estimateSize: (index) => {
      if (viewMode !== 'split') return 20
      const item = newDisplayItems[index]
      if (item && 'type' in item && item.type === 'collapsible') {
        return 32
      }
      return 20
    },
    overscan: 10,
  })

  // Synchronize scrolling between panels (useCallback to avoid recreating)
  const handleOldScroll = useCallback(() => {
    if (oldPanelRef.current && newPanelRef.current) {
      newPanelRef.current.scrollTop = oldPanelRef.current.scrollTop
    }
  }, [])

  const handleNewScroll = useCallback(() => {
    if (oldPanelRef.current && newPanelRef.current) {
      oldPanelRef.current.scrollTop = newPanelRef.current.scrollTop
    }
  }, [])

  if (viewMode === 'split') {

    return (
      <div className="h-full w-full flex flex-col bg-white dark:bg-gray-900">
        {hasMoreLines && (
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-between">
            <span className="text-xs text-yellow-700 dark:text-yellow-300">
              Showing first {maxLinesBeforeTruncate} of {allLines.length} lines
            </span>
            <button
              onClick={() => setShowFullDiff(true)}
              className="text-xs px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
            >
              Show Full Diff
            </button>
          </div>
        )}
        <div ref={parentRef} className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>
          {/* Old version (left) */}
          <div
            ref={oldPanelRef}
            onScroll={handleOldScroll}
            className="flex-1 h-full overflow-auto border-r border-gray-200 dark:border-gray-800"
            style={{ minHeight: 0 }}
          >
            <div
              style={{
                height: `${oldVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {oldVirtualizer.getVirtualItems().map((virtualItem) => {
                const item = oldDisplayItems[virtualItem.index]
                
                // Handle collapsible section
                if (item && 'type' in item && item.type === 'collapsible') {
                  const section = item as CollapsibleSection
                  
                  return (
                    <div
                      key={virtualItem.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                      className="grid grid-cols-[50px_1fr] bg-gray-100 dark:bg-gray-800/30 border-l-4 border-gray-300 dark:border-gray-600 py-1 font-mono text-[13px]"
                    >
                      <div className="text-right pr-2 text-gray-500 dark:text-gray-400 bg-[#f6f6f6] dark:bg-gray-800/50 border-r border-[#e1e1e1] dark:border-gray-700 select-none flex items-center justify-end">
                        {section.firstLineNumber ?? ' '}
                      </div>
                      <div className="pl-[10px] flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                        >
                          {section.isExpanded ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )}
                          <span className="text-xs">
                            {section.isExpanded ? 'Hide' : 'Show'} {section.lineCount} unchanged lines
                            {section.firstLineNumber && section.lastLineNumber && (
                              <span className="ml-1 text-gray-500">
                                (lines {section.firstLineNumber}-{section.lastLineNumber})
                              </span>
                            )}
                          </span>
                        </button>
                      </div>
                    </div>
                  )
                }
                
                // Handle regular diff line
                const line = item as DiffLine
                const styles = getLineStyles(line)
                const icon = getIcon(line)
                return (
                  <div
                    key={virtualItem.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                    className={`grid grid-cols-[50px_1fr] whitespace-pre ${styles.bg} ${styles.border} py-0.5 font-mono text-[13px]`}
                  >
                    <div className="text-right pr-2 text-gray-500 dark:text-gray-400 bg-[#f6f6f6] dark:bg-gray-800/50 border-r border-[#e1e1e1] dark:border-gray-700 select-none flex items-center justify-end">
                      {line.oldLineNumber ?? ' '}
                    </div>
                    <div className={`pl-[10px] flex items-center gap-1.5 ${styles.textColor}`}>
                      <span className="font-bold w-4 text-center">{icon}</span>
                      <span className="whitespace-pre-wrap break-words">{line.content || ' '}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* New version (right) */}
          <div
            ref={newPanelRef}
            onScroll={handleNewScroll}
            className="flex-1 h-full overflow-auto"
            style={{ minHeight: 0 }}
          >
            <div
              style={{
                height: `${newVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {newVirtualizer.getVirtualItems().map((virtualItem) => {
                const item = newDisplayItems[virtualItem.index]
                
                // Handle collapsible section
                if (item && 'type' in item && item.type === 'collapsible') {
                  const section = item as CollapsibleSection
                  
                  return (
                    <div
                      key={virtualItem.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                      className="grid grid-cols-[50px_1fr] bg-gray-100 dark:bg-gray-800/30 border-l-4 border-gray-300 dark:border-gray-600 py-1 font-mono text-[13px]"
                    >
                      <div className="text-right pr-2 text-gray-500 dark:text-gray-400 bg-[#f6f6f6] dark:bg-gray-800/50 border-r border-[#e1e1e1] dark:border-gray-700 select-none flex items-center justify-end">
                        {section.firstLineNumber ?? ' '}
                      </div>
                      <div className="pl-[10px] flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                        >
                          {section.isExpanded ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )}
                          <span className="text-xs">
                            {section.isExpanded ? 'Hide' : 'Show'} {section.lineCount} unchanged lines
                            {section.firstLineNumber && section.lastLineNumber && (
                              <span className="ml-1 text-gray-500">
                                (lines {section.firstLineNumber}-{section.lastLineNumber})
                              </span>
                            )}
                          </span>
                        </button>
                      </div>
                    </div>
                  )
                }
                
                // Handle regular diff line
                const line = item as DiffLine
                const styles = getLineStyles(line)
                const icon = getIcon(line)
                return (
                  <div
                    key={virtualItem.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                    className={`grid grid-cols-[50px_1fr] whitespace-pre ${styles.bg} ${styles.border} py-0.5 font-mono text-[13px]`}
                  >
                    <div className="text-right pr-2 text-gray-500 dark:text-gray-400 bg-[#f6f6f6] dark:bg-gray-800/50 border-r border-[#e1e1e1] dark:border-gray-700 select-none flex items-center justify-end">
                      {line.newLineNumber ?? ' '}
                    </div>
                    <div className={`pl-[10px] flex items-center gap-1.5 ${styles.textColor}`}>
                      <span className="font-bold w-4 text-center">{icon}</span>
                      <span className="whitespace-pre-wrap break-words">{line.content || ' '}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Unified view (default)
  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-gray-900">
      {hasMoreLines && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-between">
          <span className="text-xs text-yellow-700 dark:text-yellow-300">
            Showing first {maxLinesBeforeTruncate} of {allLines.length} lines
          </span>
          <button
            onClick={() => setShowFullDiff(true)}
            className="text-xs px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
          >
            Show Full Diff
          </button>
        </div>
      )}
      <div ref={parentRef} className="flex-1 overflow-auto bg-white dark:bg-gray-900" style={{ minHeight: 0 }}>
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = finalDisplayItems[virtualItem.index]
            
            // Handle collapsible section
            if (item && 'type' in item && item.type === 'collapsible') {
              const section = item as CollapsibleSection
              const firstLine = allLines[section.startLine]
              const lastLine = allLines[section.endLine]
              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className="grid grid-cols-[50px_50px_1fr] bg-gray-100 dark:bg-gray-800/30 border-l-4 border-gray-300 dark:border-gray-600 py-1 font-mono text-[13px]"
                >
                  <div className="text-right pr-2 text-gray-500 dark:text-gray-400 bg-[#f6f6f6] dark:bg-gray-800/50 border-r border-[#e1e1e1] dark:border-gray-700 select-none flex items-center justify-end">
                    {firstLine?.oldLineNumber ?? ' '}
                  </div>
                  <div className="text-right pr-2 text-gray-500 dark:text-gray-400 bg-[#f6f6f6] dark:bg-gray-800/50 border-r border-[#e1e1e1] dark:border-gray-700 select-none flex items-center justify-end">
                    {firstLine?.newLineNumber ?? ' '}
                  </div>
                  <div className="pl-[10px] flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                    >
                      {section.isExpanded ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                      <span className="text-xs">
                        {section.isExpanded ? 'Hide' : 'Show'} {section.lineCount} unchanged lines
                        {firstLine?.oldLineNumber && lastLine?.oldLineNumber && (
                          <span className="ml-1 text-gray-500">
                            (lines {firstLine.oldLineNumber}-{lastLine.oldLineNumber})
                          </span>
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              )
            }
            
            // Handle regular diff line
            const line = item as DiffLine
            const styles = getLineStyles(line)
            const icon = getIcon(line)
            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className={`grid grid-cols-[50px_50px_1fr] whitespace-pre ${styles.bg} ${styles.border} py-0.5 font-mono text-[13px]`}
              >
                <div className="text-right pr-2 text-gray-500 dark:text-gray-400 bg-[#f6f6f6] dark:bg-gray-800/50 border-r border-[#e1e1e1] dark:border-gray-700 select-none flex items-center justify-end">
                  {line.oldLineNumber ?? ' '}
                </div>
                <div className="text-right pr-2 text-gray-500 dark:text-gray-400 bg-[#f6f6f6] dark:bg-gray-800/50 border-r border-[#e1e1e1] dark:border-gray-700 select-none flex items-center justify-end">
                  {line.newLineNumber ?? ' '}
                </div>
                <div className={`pl-[10px] flex items-center gap-1.5 ${styles.textColor}`}>
                  <span className="font-bold w-4 text-center">{icon}</span>
                  <span className="whitespace-pre-wrap break-words">{line.content || ' '}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
