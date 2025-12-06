/**
 * Reconstructs the full old file content from the new file and diff
 */
export function reconstructOldFile(
  newFileContent: string,
  diffContent: string
): string {
  const newFileLines = newFileContent.split('\n')
  const diffLines = diffContent.split('\n')
  const oldFileLines: string[] = []
  
  // Build a mapping of new file line numbers to old file content
  // Process diff to understand the relationship between old and new lines
  let inHunk = false
  let oldLineIndex = 0
  let newLineIndex = 0
  
  // Track changes: for each new line, know if it was added, unchanged, or modified
  const lineMapping = new Map<number, { type: 'added' | 'unchanged' | 'modified', oldContent?: string }>()
  const removedLines: Array<{ oldLineNum: number, content: string }> = []
  
  for (const line of diffLines) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/)
      if (match) {
        const oldStart = parseInt(match[1], 10)
        const newStart = parseInt(match[3], 10)
        oldLineIndex = oldStart - 1 // Convert to 0-based
        newLineIndex = newStart - 1 // Convert to 0-based
        inHunk = true
      }
      continue
    }
    
    if (!inHunk) continue
    
    const firstChar = line[0] || ' '
    if (firstChar === '-') {
      // Removed line - exists in old but not in new
      const content = line.substring(1)
      removedLines.push({ oldLineNum: oldLineIndex + 1, content })
      oldLineIndex++
    } else if (firstChar === '+') {
      // Added line - exists in new but not in old
      lineMapping.set(newLineIndex + 1, { type: 'added' })
      newLineIndex++
    } else if (firstChar === ' ') {
      // Context line - exists in both
      lineMapping.set(newLineIndex + 1, { type: 'unchanged' })
      oldLineIndex++
      newLineIndex++
    }
  }
  
  // Now reconstruct old file
  // We need to match removed lines with their positions
  let removedLinePointer = 0
  let currentOldLineNum = 1
  
  for (let i = 0; i < newFileLines.length; i++) {
    const newLineNum = i + 1
    const mapping = lineMapping.get(newLineNum)
    
    if (mapping?.type === 'added') {
      // This line was added, skip it in old file
      // But check if there's a removed line that should go here
      while (removedLinePointer < removedLines.length) {
        const removed = removedLines[removedLinePointer]
        if (removed.oldLineNum <= currentOldLineNum) {
          oldFileLines.push(removed.content)
          removedLinePointer++
          currentOldLineNum++
        } else {
          break
        }
      }
      // Don't add the new line to old file
    } else {
      // This line exists in both (unchanged) or we don't have mapping info
      // Check if there's a removed line that should replace it
      while (removedLinePointer < removedLines.length) {
        const removed = removedLines[removedLinePointer]
        if (removed.oldLineNum < currentOldLineNum) {
          // This removed line should have been added earlier, add it now
          oldFileLines.push(removed.content)
          removedLinePointer++
        } else if (removed.oldLineNum === currentOldLineNum) {
          // This is a modified line - use the removed content
          oldFileLines.push(removed.content)
          removedLinePointer++
          currentOldLineNum++
          break
        } else {
          break
        }
      }
      
      // Add the unchanged line (or new line if no mapping)
      if (mapping?.type === 'unchanged' || !mapping) {
        oldFileLines.push(newFileLines[i])
        currentOldLineNum++
      }
    }
  }
  
  // Add any remaining removed lines
  while (removedLinePointer < removedLines.length) {
    const removed = removedLines[removedLinePointer]
    oldFileLines.push(removed.content)
    removedLinePointer++
  }
  
  return oldFileLines.join('\n')
}

