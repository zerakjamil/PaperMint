import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { useExamStore } from '@/app/store/examStore'

describe('App Linux GUI template flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useExamStore.setState({ screen: 'home' })
  })

  it('opens editor workspace when Linux GUI Template is selected', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Shaqlawa Linux GUI' }))

    expect(screen.getByText('Template Library')).toBeInTheDocument()
    expect(screen.getByText('Sections')).toBeInTheDocument()
  })

  it('opens editor workspace when Shaqlawa Blank is selected', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Shaqlawa Blank' }))

    expect(screen.getByText('Template Library')).toBeInTheDocument()
    expect(screen.getByText('Sections')).toBeInTheDocument()
  })
})
