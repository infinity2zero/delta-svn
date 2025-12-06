import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConnectionConfigView } from '../ConnectionConfigView'

// Mock Tauri invoke
const mockInvoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}))

// Mock Tauri dialog
const mockOpen = vi.fn()
vi.mock('@tauri-apps/api/dialog', () => ({
  open: (...args: any[]) => mockOpen(...args),
}))

describe('ConnectionConfigView', () => {
  const defaultProps = {
    serverUrl: 'svn://localhost/repo',
    onServerUrlChange: vi.fn(),
    username: 'testuser',
    onUsernameChange: vi.fn(),
    password: 'testpass',
    onPasswordChange: vi.fn(),
    onSave: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders connection form', () => {
    render(<ConnectionConfigView {...defaultProps} />)
    expect(screen.getByText('Server Configuration')).toBeInTheDocument()
    expect(screen.getByText('Credentials')).toBeInTheDocument()
  })

  it('displays server URL', () => {
    render(<ConnectionConfigView {...defaultProps} />)
    const urlInput = screen.getByPlaceholderText('svn://server.company.com') as HTMLInputElement
    expect(urlInput.value).toBe('svn://localhost/repo')
  })

  it('calls onServerUrlChange when URL changes', () => {
    const onServerUrlChange = vi.fn()
    render(<ConnectionConfigView {...defaultProps} onServerUrlChange={onServerUrlChange} />)
    
    const urlInput = screen.getByPlaceholderText('svn://server.company.com')
    fireEvent.change(urlInput, { target: { value: 'svn://newserver/repo' } })

    expect(onServerUrlChange).toHaveBeenCalledWith('svn://newserver/repo')
  })

  it('shows password field when auth method is password', () => {
    render(<ConnectionConfigView {...defaultProps} authMethod="password" />)
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument()
  })

  it('shows SSH key field when auth method is ssh-key', () => {
    render(
      <ConnectionConfigView
        {...defaultProps}
        authMethod="ssh-key"
        sshKeyPath=""
        onSshKeyPathChange={vi.fn()}
        onAuthMethodChange={vi.fn()}
      />
    )
    // The placeholder text is "/path/to/private/key or ~/.ssh/id_rsa"
    expect(screen.getByPlaceholderText(/path\/to\/private\/key/i)).toBeInTheDocument()
  })

  it('toggles between password and SSH key auth', () => {
    const onAuthMethodChange = vi.fn()
    render(
      <ConnectionConfigView
        {...defaultProps}
        authMethod="password"
        onAuthMethodChange={onAuthMethodChange}
        sshKeyPath=""
        onSshKeyPathChange={vi.fn()}
      />
    )

    const sshKeyButton = screen.getByText(/SSH Key/i)
    fireEvent.click(sshKeyButton)

    expect(onAuthMethodChange).toHaveBeenCalledWith('ssh-key')
  })

  it('tests connection successfully', async () => {
    mockInvoke.mockResolvedValue([])

    render(<ConnectionConfigView {...defaultProps} />)

    const testButton = screen.getByText('Test Connection')
    fireEvent.click(testButton)

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('list_remote_entries', {
        baseUrl: 'svn://localhost/repo',
        path: '/',
        username: 'testuser',
        password: 'testpass',
      })
    })

    await waitFor(() => {
      expect(screen.getByText(/Connection successful/i)).toBeInTheDocument()
    })
  })

  it('handles connection test error', async () => {
    mockInvoke.mockRejectedValue(new Error('Connection failed'))

    render(<ConnectionConfigView {...defaultProps} />)

    const testButton = screen.getByText('Test Connection')
    fireEvent.click(testButton)

    await waitFor(() => {
      expect(screen.getByText(/Connection failed/i)).toBeInTheDocument()
    })
  })

  it('opens file browser for SSH key', async () => {
    mockInvoke.mockResolvedValue('/path/to/key')

    const onSshKeyPathChange = vi.fn()
    render(
      <ConnectionConfigView
        {...defaultProps}
        authMethod="ssh-key"
        sshKeyPath=""
        onSshKeyPathChange={onSshKeyPathChange}
        onAuthMethodChange={vi.fn()}
      />
    )

    const browseButton = screen.getByTitle(/Browse for SSH key/i)
    fireEvent.click(browseButton)

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('open_folder_dialog', expect.objectContaining({
        title: 'Select SSH Private Key',
      }))
      expect(onSshKeyPathChange).toHaveBeenCalledWith('/path/to/key')
    }, { timeout: 3000 })
  })

  it('toggles password visibility', () => {
    render(<ConnectionConfigView {...defaultProps} />)

    const passwordInput = screen.getByPlaceholderText('Enter password') as HTMLInputElement
    expect(passwordInput.type).toBe('password')

    // Find the toggle button by finding the EyeIcon (it's inside a button)
    // The button contains the EyeIcon, so we can find it by finding the input's parent's sibling
    const passwordContainer = passwordInput.closest('.relative')
    const toggleButton = passwordContainer?.querySelector('button[type="button"]')
    
    if (toggleButton) {
      fireEvent.click(toggleButton)
      expect(passwordInput.type).toBe('text')
    } else {
      // Fallback: find by the icon's parent button
      const eyeIcon = passwordContainer?.querySelector('svg')
      const button = eyeIcon?.closest('button')
      if (button) {
        fireEvent.click(button)
        expect(passwordInput.type).toBe('text')
      }
    }
  })

  it('calls onSave when save button is clicked', () => {
    const onSave = vi.fn()
    render(<ConnectionConfigView {...defaultProps} onSave={onSave} />)

    const saveButton = screen.getByText('Save')
    fireEvent.click(saveButton)

    expect(onSave).toHaveBeenCalled()
  })

  it('disables save button when URL or username is empty', () => {
    render(<ConnectionConfigView {...defaultProps} serverUrl="" username="" />)

    const saveButton = screen.getByText('Save')
    expect(saveButton).toBeDisabled()
  })
})

