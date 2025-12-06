import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CopyFileModal } from '../CopyFileModal'
import type { FileChange } from '../../../types'

// Mock Tauri invoke
const mockInvoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}))

describe('CopyFileModal', () => {
  const mockFile: FileChange = {
    name: 'test.txt',
    status: 'MODIFIED',
    revision: '123',
    author: 'testuser',
  }

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    file: mockFile,
    workingCopyPath: '/path/to/repo',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when open', () => {
    render(<CopyFileModal {...defaultProps} />)
    expect(screen.getByText('Copy File')).toBeInTheDocument()
    expect(screen.getByText('test.txt')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<CopyFileModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Copy File')).not.toBeInTheDocument()
  })

  it('auto-suggests copy name', () => {
    render(<CopyFileModal {...defaultProps} />)
    const destinationInput = screen.getByPlaceholderText('Enter destination path') as HTMLInputElement
    expect(destinationInput.value).toContain('_copy')
  })

  it('validates empty destination', async () => {
    const onConfirm = vi.fn()
    render(<CopyFileModal {...defaultProps} onConfirm={onConfirm} />)
    
    const destinationInput = screen.getByPlaceholderText('Enter destination path')
    fireEvent.change(destinationInput, { target: { value: '' } })
    
    const copyButton = screen.getByText('Copy')
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(screen.getByText(/Destination path cannot be empty/i)).toBeInTheDocument()
    })
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('validates same source and destination', async () => {
    const onConfirm = vi.fn()
    render(<CopyFileModal {...defaultProps} onConfirm={onConfirm} />)
    
    const destinationInput = screen.getByPlaceholderText('Enter destination path')
    fireEvent.change(destinationInput, { target: { value: 'test.txt' } })
    
    const copyButton = screen.getByText('Copy')
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(screen.getByText(/cannot be the same/i)).toBeInTheDocument()
    }, { timeout: 3000 })
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('validates path with ..', async () => {
    const onConfirm = vi.fn()
    render(<CopyFileModal {...defaultProps} onConfirm={onConfirm} />)
    
    const destinationInput = screen.getByPlaceholderText('Enter destination path')
    fireEvent.change(destinationInput, { target: { value: '../test_copy.txt' } })
    
    const copyButton = screen.getByText('Copy')
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(screen.getByText(/cannot contain/i)).toBeInTheDocument()
    }, { timeout: 3000 })
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('calls onConfirm with valid destination', async () => {
    const onConfirm = vi.fn()
    render(<CopyFileModal {...defaultProps} onConfirm={onConfirm} />)
    
    const destinationInput = screen.getByPlaceholderText('Enter destination path')
    fireEvent.change(destinationInput, { target: { value: 'test_copy.txt' } })
    
    const copyButton = screen.getByText('Copy')
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('test_copy.txt')
    }, { timeout: 3000 })
  })

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn()
    render(<CopyFileModal {...defaultProps} onClose={onClose} />)
    
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('handles file in directory correctly', () => {
    const fileInDir: FileChange = {
      name: 'folder/test.txt',
      status: 'MODIFIED',
      revision: '123',
      author: 'testuser',
    }

    render(<CopyFileModal {...defaultProps} file={fileInDir} />)
    const destinationInput = screen.getByPlaceholderText('Enter destination path') as HTMLInputElement
    expect(destinationInput.value).toContain('folder/')
    expect(destinationInput.value).toContain('_copy')
  })
})

