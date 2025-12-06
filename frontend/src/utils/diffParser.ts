/**
 * Parses unified diff format into old and new file content
 */
export function parseUnifiedDiff(diffContent: string): {
  oldContent: string
  newContent: string
  oldFileName?: string
  newFileName?: string
} {
  const lines = diffContent.split('\n')
  let oldContent: string[] = []
  let newContent: string[] = []
  let oldFileName: string | undefined
  let newFileName: string | undefined
  let inHunk = false
  let oldLineNum = 0
  let newLineNum = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Extract file names from diff header
    if (line.startsWith('---')) {
      oldFileName = line.replace(/^---\s+/, '').split('\t')[0]
      continue
    }
    if (line.startsWith('+++')) {
      newFileName = line.replace(/^\+\+\+\s+/, '').split('\t')[0]
      continue
    }

    // Skip diff header lines
    if (line.startsWith('@@')) {
      // Parse hunk header: @@ -old_start,old_count +new_start,new_count @@
      const match = line.match(/@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/)
      if (match) {
        oldLineNum = parseInt(match[1], 10) - 1 // Convert to 0-based
        newLineNum = parseInt(match[3], 10) - 1 // Convert to 0-based
        inHunk = true
      }
      continue
    }

    if (!inHunk) continue

    // Process diff lines
    if (line.startsWith('-') && !line.startsWith('---')) {
      // Removed line (old version)
      oldContent.push(line.substring(1))
      oldLineNum++
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      // Added line (new version)
      newContent.push(line.substring(1))
      newLineNum++
    } else if (line.startsWith(' ')) {
      // Context line (unchanged) - add to both
      const contextLine = line.substring(1)
      oldContent.push(contextLine)
      newContent.push(contextLine)
      oldLineNum++
      newLineNum++
    } else if (line.trim() === '\\ No newline at end of file') {
      // Handle missing newline indicator
      continue
    }
  }

  // Pad arrays to ensure same length for side-by-side view
  const maxLength = Math.max(oldContent.length, newContent.length)
  while (oldContent.length < maxLength) {
    oldContent.push('')
  }
  while (newContent.length < maxLength) {
    newContent.push('')
  }

  return {
    oldContent: oldContent.join('\n'),
    newContent: newContent.join('\n'),
    oldFileName,
    newFileName,
  }
}

