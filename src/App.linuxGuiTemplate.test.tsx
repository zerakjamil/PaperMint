import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'

describe('App Linux GUI template flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('opens editor workspace when Linux GUI Template is selected', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Linux GUI Template' }))

    expect(screen.getByText('Template Library')).toBeInTheDocument()
    expect(screen.getByText('Sections')).toBeInTheDocument()
  })
})