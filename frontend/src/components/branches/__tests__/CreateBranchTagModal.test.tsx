import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CreateBranchTagModal } from '../CreateBranchTagModal'

// Mock Tauri invoke
const mockInvoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}))

describe('CreateBranchTagModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    workingCopyPath: '/path/to/repo',
    kind: 'branch' as const,
    onCreated: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders branch modal when kind is branch', () => {
    render(<CreateBranchTagModal {...defaultProps} kind="branch" />)
    // Check for the input field which is unique to the branch modal
    expect(screen.getByPlaceholderText('Enter branch name')).toBeInTheDocument()
  })

  it('renders tag modal when kind is tag', () => {
    render(<CreateBranchTagModal {...defaultProps} kind="tag" />)
    expect(screen.getByText(/Create Tag/i)).toBeInTheDocument()
  })

  it('validates empty name', async () => {
    const onCreated = vi.fn()
    render(<CreateBranchTagModal {...defaultProps} onCreated={onCreated} />)
    
    const createButtons = screen.getAllByText('Create Branch')
    const createButton = createButtons.find(btn => btn.tagName === 'BUTTON') || createButtons[0]
    expect(createButton).toBeDisabled()
  })

  it('creates branch with name only', async () => {
    mockInvoke.mockResolvedValue('Success')
    const onCreated = vi.fn()

    render(<CreateBranchTagModal {...defaultProps} onCreated={onCreated} />)
    
    const nameInput = screen.getByPlaceholderText('Enter branch name')
    fireEvent.change(nameInput, { target: { value: 'feature-branch' } })

    const createButtons = screen.getAllByText('Create Branch')
    const createButton = createButtons.find(btn => btn.tagName === 'BUTTON') || createButtons[0]
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('create_branch_or_tag', {
        workingCopyPath: '/path/to/repo',
        name: 'feature-branch',
        kind: 'branch',
        sourcePath: null,
      })
    })

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalled()
    })
  })

  it('creates branch with source path', async () => {
    mockInvoke.mockResolvedValue('Success')
    const onCreated = vi.fn()

    render(<CreateBranchTagModal {...defaultProps} onCreated={onCreated} />)
    
    const nameInput = screen.getByPlaceholderText('Enter branch name')
    fireEvent.change(nameInput, { target: { value: 'feature-branch' } })

    const sourceInput = screen.getByPlaceholderText(/Leave empty/i)
    fireEvent.change(sourceInput, { target: { value: 'trunk' } })

    const createButtons = screen.getAllByText('Create Branch')
    const createButton = createButtons.find(btn => btn.tagName === 'BUTTON') || createButtons[0]
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('create_branch_or_tag', {
        workingCopyPath: '/path/to/repo',
        name: 'feature-branch',
        kind: 'branch',
        sourcePath: 'trunk',
      })
    })
  })

  it('creates tag correctly', async () => {
    mockInvoke.mockResolvedValue('Success')
    const onCreated = vi.fn()

    render(<CreateBranchTagModal {...defaultProps} kind="tag" onCreated={onCreated} />)
    
    const nameInput = screen.getByPlaceholderText('Enter tag name')
    fireEvent.change(nameInput, { target: { value: 'v1.0.0' } })

    const createButtons = screen.getAllByText('Create Tag')
    const createButton = createButtons.find(btn => btn.tagName === 'BUTTON') || createButtons[0]
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('create_branch_or_tag', {
        workingCopyPath: '/path/to/repo',
        name: 'v1.0.0',
        kind: 'tag',
        sourcePath: null,
      })
    })
  })

  it('handles creation error', async () => {
    mockInvoke.mockRejectedValue(new Error('Creation failed'))
    const onCreated = vi.fn()

    render(<CreateBranchTagModal {...defaultProps} onCreated={onCreated} />)
    
    const nameInput = screen.getByPlaceholderText('Enter branch name')
    fireEvent.change(nameInput, { target: { value: 'feature-branch' } })

    const createButtons = screen.getAllByText('Create Branch')
    const createButton = createButtons.find(btn => btn.tagName === 'BUTTON') || createButtons[0]
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(screen.getByText(/Failed to create/i)).toBeInTheDocument()
    })

    expect(onCreated).not.toHaveBeenCalled()
  })

  it('shows loading state during creation', async () => {
    mockInvoke.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('Success'), 100)))

    render(<CreateBranchTagModal {...defaultProps} />)
    
    const nameInput = screen.getByPlaceholderText('Enter branch name')
    fireEvent.change(nameInput, { target: { value: 'feature-branch' } })

    const createButtons = screen.getAllByText('Create Branch')
    const createButton = createButtons.find(btn => btn.tagName === 'BUTTON') || createButtons[0]
    fireEvent.click(createButton)

    expect(screen.getByText(/Creating/i)).toBeInTheDocument()
    expect(createButton).toBeDisabled()
  })

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn()
    render(<CreateBranchTagModal {...defaultProps} onClose={onClose} />)
    
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('resets form when modal reopens', async () => {
    const { rerender } = render(<CreateBranchTagModal {...defaultProps} isOpen={false} />)
    
    rerender(<CreateBranchTagModal {...defaultProps} isOpen={true} />)

    const nameInput = screen.getByPlaceholderText('Enter branch name') as HTMLInputElement
    expect(nameInput.value).toBe('')
  })
})

