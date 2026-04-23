import { fireEvent, render, screen } from '@testing-library/react'

import { ValidationModal } from '@/components/dialogs/ValidationModal'

describe('ValidationModal', () => {
  it('disables export when blocking errors exist and allows jump action', () => {
    const onProceed = vi.fn()
    const onJumpToFix = vi.fn()

    render(
      <ValidationModal
        open
        mode="pdf"
        exportMode="student"
        warnings={[
          {
            id: 'missing-image-1',
            level: 'error',
            message: 'Section A Q1 image missing.',
            target: { kind: 'block', blockId: 'block-1', sectionId: 'section-1' },
          },
        ]}
        onClose={vi.fn()}
        onProceed={onProceed}
        onJumpToFix={onJumpToFix}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /jump to fix/i }))
    expect(onJumpToFix).toHaveBeenCalledTimes(1)

    const exportButton = screen.getByRole('button', { name: /export pdf/i })
    expect(exportButton).toBeDisabled()

    fireEvent.click(exportButton)
    expect(onProceed).not.toHaveBeenCalled()
  })

  it('allows export when warnings are non-blocking', () => {
    const onProceed = vi.fn()

    render(
      <ValidationModal
        open
        mode="docx"
        exportMode="instructor"
        warnings={[
          {
            id: 'missing-marks',
            level: 'warning',
            message: '2 question(s) missing marks value.',
            target: { kind: 'marks' },
          },
        ]}
        onClose={vi.fn()}
        onProceed={onProceed}
        onJumpToFix={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /export docx/i }))
    expect(onProceed).toHaveBeenCalledTimes(1)
  })
})
