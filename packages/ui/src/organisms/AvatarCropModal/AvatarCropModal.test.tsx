import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { AvatarCropModal } from './AvatarCropModal'

expect.extend(toHaveNoViolations)

// react-easy-crop s'appuie sur ResizeObserver + canvas (absents de jsdom). Mock léger
// qui déclenche onCropComplete au montage → active le bouton de validation.
vi.mock('react-easy-crop', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react')
  return {
    default: ({ onCropComplete }: { onCropComplete?: (a: unknown, b: unknown) => void }) => {
      React.useEffect(() => {
        onCropComplete?.(
          { x: 0, y: 0, width: 1, height: 1 },
          { x: 0, y: 0, width: 100, height: 100 }
        )
      }, [onCropComplete])
      return React.createElement('div', { 'data-testid': 'cropper' })
    },
  }
})

// canvas indisponible en jsdom → on mocke la génération du blob.
vi.mock('./cropImage', () => ({
  getCroppedBlob: vi.fn().mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' })),
}))

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => undefined
  if (!Element.prototype.releasePointerCapture)
    Element.prototype.releasePointerCapture = () => undefined
})

const SRC = 'blob:fake'

describe('AvatarCropModal', () => {
  it('ouverte : titre, description et CTA primaire', () => {
    render(<AvatarCropModal open imageSrc={SRC} onConfirm={() => {}} onOpenChange={() => {}} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Ajuster ta photo')).toBeInTheDocument()
    expect(screen.getByText(/Déplace et zoome/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Utiliser cette photo' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Zoom' })).toBeInTheDocument()
  })

  it('fermée : aucun dialog rendu', () => {
    render(
      <AvatarCropModal open={false} imageSrc={SRC} onConfirm={() => {}} onOpenChange={() => {}} />
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('confirme : remonte un Blob recadré via onConfirm', async () => {
    const u = userEvent.setup()
    const onConfirm = vi.fn()
    render(<AvatarCropModal open imageSrc={SRC} onConfirm={onConfirm} onOpenChange={() => {}} />)
    await u.click(screen.getByRole('button', { name: 'Utiliser cette photo' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm.mock.calls[0]?.[0]).toBeInstanceOf(Blob)
  })

  it('Annuler : onCancel + fermeture, aucun confirm', async () => {
    const u = userEvent.setup()
    const onCancel = vi.fn()
    const onOpenChange = vi.fn()
    const onConfirm = vi.fn()
    render(
      <AvatarCropModal
        open
        imageSrc={SRC}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onOpenChange={onOpenChange}
      />
    )
    await u.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('Escape : onOpenChange(false) + onCancel', async () => {
    const u = userEvent.setup()
    const onCancel = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <AvatarCropModal
        open
        imageSrc={SRC}
        onConfirm={() => {}}
        onCancel={onCancel}
        onOpenChange={onOpenChange}
      />
    )
    await u.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onCancel).toHaveBeenCalled()
  })

  it('labels i18n surchargeables', () => {
    render(
      <AvatarCropModal
        open
        imageSrc={SRC}
        onConfirm={() => {}}
        onOpenChange={() => {}}
        labels={{ title: 'Adjust your photo', confirm: 'Use this photo' }}
      />
    )
    expect(screen.getByText('Adjust your photo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use this photo' })).toBeInTheDocument()
  })

  it('accessibilité : pas de violation axe', async () => {
    const { baseElement } = render(
      <AvatarCropModal open imageSrc={SRC} onConfirm={() => {}} onOpenChange={() => {}} />
    )
    expect(await axe(baseElement)).toHaveNoViolations()
  })
})
