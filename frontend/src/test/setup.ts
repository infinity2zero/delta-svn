import { expect, afterEach, vi, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Setup DOM environment
beforeAll(() => {
  // Ensure window object exists
  if (typeof window === 'undefined') {
    global.window = {} as any
  }
  
  // Mock Tauri API
  global.window.__TAURI_INTERNALS__ = {}
  
  // Mock HTMLElement if needed
  if (typeof HTMLElement === 'undefined') {
    global.HTMLElement = class {} as any
  }
})

// Mock @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

// Mock @tauri-apps/api/event
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}))

// Mock @tauri-apps/api/dialog
vi.mock('@tauri-apps/api/dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
}))

// Cleanup after each test
afterEach(() => {
  cleanup()
})

