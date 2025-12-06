import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BranchSwitchModal } from '../BranchSwitchModal'

// Mock Tauri invoke
const mockInvoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}))

describe('BranchSwitchModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    workingCopyPath: '/path/to/repo',
    currentBranch: 'trunk',
    onSwitched: vi.fn(),
  }

  const mockBranchesTags = [
    {
      name: 'trunk',
      kind: 'trunk',
      url: 'svn://repo/trunk',
      revision: '100',
    },
    {
      name: 'feature-branch',
      kind: 'branch',
      url: 'svn://repo/branches/feature-branch',
      revision: '95',
    },
    {
      name: 'v1.0.0',
      kind: 'tag',
      url: 'svn://repo/tags/v1.0.0',
      revision: '90',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock to return branches/tags by default
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'list_branches_tags') {
        return Promise.resolve(mockBranchesTags)
      }
      return Promise.resolve(null)
    })
  })

  it('renders when open', async () => {
    render(<BranchSwitchModal {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Switch Branch/Tag')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('loads branches and tags on open', async () => {
    render(<BranchSwitchModal {...defaultProps} />)
    
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('list_branches_tags', {
        workingCopyPath: '/path/to/repo',
      })
    }, { timeout: 3000 })
  })

  it('displays branches and tags grouped', async () => {
    render(<BranchSwitchModal {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Trunk')).toBeInTheDocument()
      expect(screen.getByText('Branches')).toBeInTheDocument()
      expect(screen.getByText('Tags')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('highlights current branch', async () => {
    render(<BranchSwitchModal {...defaultProps} currentBranch="trunk" />)
    
    await waitFor(() => {
      const trunkButton = screen.getByText('trunk').closest('button')
      expect(trunkButton).toBeInTheDocument()
      // Check if it has the selected styling
      expect(trunkButton).toHaveClass(/bg-teal-50|border-teal-500/)
    }, { timeout: 3000 })
  })

  it('filters branches/tags by search query', async () => {
    render(<BranchSwitchModal {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('feature-branch')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search branches/tags...')
    fireEvent.change(searchInput, { target: { value: 'feature' } })

    await waitFor(() => {
      expect(screen.queryByText('v1.0.0')).not.toBeInTheDocument()
      expect(screen.getByText('feature-branch')).toBeInTheDocument()
    })
  })

  it('switches branch when selected and switch clicked', async () => {
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'list_branches_tags') {
        return Promise.resolve(mockBranchesTags)
      }
      if (cmd === 'switch_branch') {
        return Promise.resolve('Success')
      }
      return Promise.resolve(null)
    })

    render(<BranchSwitchModal {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('feature-branch')).toBeInTheDocument()
    }, { timeout: 3000 })

    const branchButton = screen.getByText('feature-branch').closest('button')
    expect(branchButton).toBeInTheDocument()
    fireEvent.click(branchButton!)

    const switchButton = screen.getByText('Switch')
    fireEvent.click(switchButton)

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('switch_branch', {
        workingCopyPath: '/path/to/repo',
        branchUrl: 'svn://repo/branches/feature-branch',
      })
    }, { timeout: 3000 })
  })

  it('shows loading state while switching', async () => {
    let switchResolve: (value: any) => void
    const switchPromise = new Promise(resolve => {
      switchResolve = resolve
    })

    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'list_branches_tags') {
        return Promise.resolve(mockBranchesTags)
      }
      if (cmd === 'switch_branch') {
        return switchPromise
      }
      return Promise.resolve(null)
    })

    render(<BranchSwitchModal {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('feature-branch')).toBeInTheDocument()
    }, { timeout: 3000 })

    const branchButton = screen.getByText('feature-branch').closest('button')
    fireEvent.click(branchButton!)

    const switchButton = screen.getByText('Switch')
    fireEvent.click(switchButton)

    await waitFor(() => {
      expect(screen.getByText(/Switching/i)).toBeInTheDocument()
    })
    
    // Resolve the promise to complete the test
    switchResolve!('Success')
  })

  it('handles switch error gracefully', async () => {
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'list_branches_tags') {
        return Promise.resolve(mockBranchesTags)
      }
      if (cmd === 'switch_branch') {
        return Promise.reject(new Error('Switch failed'))
      }
      return Promise.resolve(null)
    })

    render(<BranchSwitchModal {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('feature-branch')).toBeInTheDocument()
    }, { timeout: 3000 })

    const branchButton = screen.getByText('feature-branch').closest('button')
    fireEvent.click(branchButton!)

    const switchButton = screen.getByText('Switch')
    fireEvent.click(switchButton)

    await waitFor(() => {
      expect(screen.getByText(/Failed to switch/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('calls onSwitched after successful switch', async () => {
    const onSwitched = vi.fn()
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'list_branches_tags') {
        return Promise.resolve(mockBranchesTags)
      }
      if (cmd === 'switch_branch') {
        return Promise.resolve('Success')
      }
      return Promise.resolve(null)
    })

    render(<BranchSwitchModal {...defaultProps} onSwitched={onSwitched} />)
    
    await waitFor(() => {
      expect(screen.getByText('feature-branch')).toBeInTheDocument()
    }, { timeout: 3000 })

    const branchButton = screen.getByText('feature-branch').closest('button')
    fireEvent.click(branchButton!)

    const switchButton = screen.getByText('Switch')
    fireEvent.click(switchButton)

    await waitFor(() => {
      expect(onSwitched).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('disables switch button when no branch selected', async () => {
    render(<BranchSwitchModal {...defaultProps} />)
    
    await waitFor(() => {
      const switchButton = screen.getByText('Switch')
      expect(switchButton).toBeInTheDocument()
      expect(switchButton).toBeDisabled()
    }, { timeout: 3000 })
  })
})

