import { useMemo, useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { editor } from 'monaco-editor'

type BlameViewerProps = {
  blameContent: string
  filePath: string
  revision?: string
  onClose: () => void
  onJumpToRevision?: (revision: string) => void
}

export function BlameViewer({ blameContent, filePath, revision, onClose, onJumpToRevision }: BlameViewerProps) {
  const editorTheme = useMemo(() => {
    return document.documentElement.classList.contains('dark') ? 'vs-dark' : 'light'
  }, [])

  // Parse blame output - SVN blame format: "REV AUTHOR DATE LINE"
  // Standard format: "     REV AUTHOR      YYYY-MM-DD HH:MM:SS LINE_CONTENT"
  // But can also be: "REV AUTHOR LINE" (without date)
  const parsedBlame = useMemo(() => {
    const lines = blameContent.split('\n')
    const annotations: Array<{ rev: string; author: string; date: string; line: string }> = []
    
    // Debug: log raw blame content to understand the format
    console.log('Raw blame content (first 5 lines):', lines.slice(0, 5).map(l => JSON.stringify(l)))
    
    for (const line of lines) {
      if (!line.trim()) {
        continue // Skip empty lines
      }
      
      // Try multiple patterns to match different SVN blame formats
      // Pattern 1: Full format with date: "     REV AUTHOR      YYYY-MM-DD HH:MM:SS LINE_CONTENT"
      let match = line.match(/^\s*(\d+)\s+(\S+)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(.*)$/)
      
      if (match) {
        annotations.push({
          rev: match[1],
          author: match[2],
          date: match[3],
          line: match[4],
        })
        continue
      }
      
      // Pattern 2: Format without date: "     REV AUTHOR      LINE_CONTENT"
      // This is the most common format - revision number, author, then content
      match = line.match(/^\s*(\d+)\s+(\S+)\s+(.+)$/)
      if (match) {
        annotations.push({
          rev: match[1],
          author: match[2],
          date: '?',
          line: match[3],
        })
        continue
      }
      
      // Pattern 3: Minimal format - just revision and author at start: "REV AUTHOR" or "REV AUTHOR ..."
      // Extract revision number and author from the beginning
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
        // First part is a number (revision), second is author
        const rev = parts[0]
        const author = parts[1]
        // Everything after author is the line content
        const lineContent = parts.slice(2).join(' ') || line.replace(/^\s*\d+\s+\S+\s*/, '').trim()
        annotations.push({
          rev,
          author,
          date: '?',
          line: lineContent,
        })
        continue
      }
      
      // Fallback: Line without proper annotation
      annotations.push({
        rev: '?',
        author: '?',
        date: '?',
        line: line,
      })
    }
    
    return annotations
  }, [blameContent])

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<any>(null)

  // Create content with annotations as comments and clickable revisions
  const annotatedContent = useMemo(() => {
    return parsedBlame.map((ann) => {
      const revDisplay = ann.rev !== '?' ? `r${ann.rev}` : '?'
      return `// ${revDisplay} | ${ann.author} | ${ann.date}\n${ann.line}`
    }).join('\n')
  }, [parsedBlame])

  // Handle editor mount and set up click handlers
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: any) => {
    editorRef.current = editor
    monacoRef.current = monaco

    let decorationIds: string[] = []
    let isOverRevision = false

    // Add click handler for revision numbers
    editor.onMouseDown((e: any) => {
      if (!onJumpToRevision) return
      
      const model = editor.getModel()
      if (!model) return

      // Get position from mouse event - try multiple methods for reliability
      let position = e.target?.position
      
      // If position not available, try to get it from the editor using getTargetAtClientPoint
      if (!position && e.event?.browserEvent) {
        const target = editor.getTargetAtClientPoint(
          e.event.browserEvent.clientX,
          e.event.browserEvent.clientY
        )
        if (target?.position) {
          position = target.position
        }
      }
      
      if (!position) return

      const lineContent = model.getLineContent(position.lineNumber)
      
      // Only check comment lines (lines starting with //)
      if (!lineContent.trim().startsWith('//')) return
      
      // Check if clicked on a revision number (r123 pattern in comment lines)
      const revMatch = lineContent.match(/r(\d+)/)
      if (revMatch) {
        const rev = revMatch[1]
        const revStart = lineContent.indexOf(revMatch[0])
        const revEnd = revStart + revMatch[0].length
        const clickColumn = position.column

        // Check if click is within the revision number
        // Monaco columns are 1-indexed, so we compare directly with lineContent positions
        // The lineContent is "// r123 | ..." so we check if column is in range
        if (clickColumn >= revStart + 1 && clickColumn <= revEnd + 1) {
          if (e.event?.browserEvent) {
            e.event.browserEvent.preventDefault()
            e.event.browserEvent.stopPropagation()
          }
          onJumpToRevision(rev)
          onClose() // Close the blame modal after jumping
        }
      }
    })

    // Add hover effect for revision numbers with better detection
    editor.onMouseMove((e: any) => {
      const model = editor.getModel()
      if (!model) return

      const position = e.target.position
      if (!position) return

      const lineContent = model.getLineContent(position.lineNumber)
      
      // Only check comment lines (lines starting with //)
      if (!lineContent.trim().startsWith('//')) {
        // Clear decorations if not on a comment line
        if (decorationIds.length > 0) {
          editor.deltaDecorations(decorationIds, [])
          decorationIds = []
        }
        if (isOverRevision) {
          const domNode = editor.getDomNode()
          if (domNode) {
            domNode.style.cursor = 'default'
          }
          isOverRevision = false
        }
        return
      }
      
      const revMatch = lineContent.match(/r(\d+)/)
      
      // Clear previous decorations
      if (decorationIds.length > 0) {
        editor.deltaDecorations(decorationIds, [])
        decorationIds = []
      }

      if (revMatch) {
        const revStart = lineContent.indexOf(revMatch[0])
        const revEnd = revStart + revMatch[0].length
        const clickColumn = position.column

        // Check if cursor is over the revision number
        // Monaco columns are 1-indexed, so we compare directly
        if (clickColumn >= revStart + 1 && clickColumn <= revEnd + 1) {
          // Add decoration to highlight ONLY the revision number, not the whole line
          const range = new monaco.Range(
            position.lineNumber,
            revStart + 1, // +1 because Monaco is 1-indexed
            position.lineNumber,
            revEnd + 1
          )
          decorationIds = editor.deltaDecorations([], [{
            range,
            options: {
              inlineClassName: 'blame-revision-link',
              hoverMessage: { value: `Click to jump to revision ${revMatch[1]}` },
            },
          }])
          
          // Change cursor to pointer using DOM manipulation
          if (!isOverRevision) {
            const domNode = editor.getDomNode()
            if (domNode) {
              domNode.style.cursor = 'pointer'
            }
            isOverRevision = true
          }
        } else {
          if (isOverRevision) {
            const domNode = editor.getDomNode()
            if (domNode) {
              domNode.style.cursor = 'default'
            }
            isOverRevision = false
          }
        }
      } else {
        if (isOverRevision) {
          const domNode = editor.getDomNode()
          if (domNode) {
            domNode.style.cursor = 'default'
          }
          isOverRevision = false
        }
      }
    })
  }

  // Add CSS for revision links
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'blame-revision-link-style'
    style.textContent = `
      .blame-revision-link {
        color: #0d9488 !important;
        text-decoration: underline;
        cursor: pointer !important;
        font-weight: 500;
      }
      .blame-revision-link:hover {
        color: #14b8a6 !important;
        text-decoration: underline;
      }
      /* Ensure Monaco editor shows pointer cursor when over revision links */
      .monaco-editor .blame-revision-link {
        cursor: pointer !important;
      }
    `
    // Remove existing style if present
    const existing = document.getElementById('blame-revision-link-style')
    if (existing) {
      existing.remove()
    }
    document.head.appendChild(style)
    return () => {
      const styleEl = document.getElementById('blame-revision-link-style')
      if (styleEl) {
        document.head.removeChild(styleEl)
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-[90vw] h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3.5 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/95 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-between flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">Blame / Annotate</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {filePath} {revision && `(Revision ${revision})`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors flex-shrink-0"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="plaintext"
            value={annotatedContent || blameContent}
            theme={editorTheme}
            onMount={handleEditorDidMount}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 12,
              lineNumbers: 'on',
              wordWrap: 'on',
              renderWhitespace: 'selection',
            }}
          />
        </div>
        {/* Info text */}
        <div className="px-3.5 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50/95 dark:bg-slate-900/90 text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
          Click on revision numbers (r###) to jump to that commit in History
        </div>
      </div>
    </div>
  )
}

