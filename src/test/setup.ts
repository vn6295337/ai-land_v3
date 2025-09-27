/// <reference types="vitest/globals" />
import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver for lazy loading tests
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver for responsive components
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock requestAnimationFrame for animation tests
global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 0))
global.cancelAnimationFrame = vi.fn(id => clearTimeout(id))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.sessionStorage = sessionStorageMock

// Mock navigator.onLine for network status tests
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Custom test utilities
export const createMockModel = (overrides = {}) => ({
  id: 'test-model-1',
  name: 'Test Model',
  description: 'A test model for unit testing',
  provider: 'openai' as const,
  category: 'text-generation' as const,
  metrics: {
    accuracy: 0.85,
    speed: 0.75,
    cost: 0.001,
    popularity: 0.9,
    lastUpdated: new Date().toISOString(),
  },
  ...overrides,
})

export const createMockError = (message = 'Test error') => ({
  message,
  code: 'TEST_ERROR',
  timestamp: new Date().toISOString(),
  retry: vi.fn(),
})

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Environment setup for tests
process.env.NODE_ENV = 'test'
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'