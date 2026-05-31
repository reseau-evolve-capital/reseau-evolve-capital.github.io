import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { AvatarUpload } from './AvatarUpload'

expect.extend(toHaveNoViolations)

const PREVIEW_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

describe('AvatarUpload — accessibilité', () => {
  it('état vide : pas de violations axe', async () => {
    const { container } = render(<AvatarUpload onFileSelected={() => {}} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('avec erreur : pas de violations axe', async () => {
    const { container } = render(
      <AvatarUpload onFileSelected={() => {}} error="Format non supporté." />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('avec prévisualisation : pas de violations axe', async () => {
    const { container } = render(
      <AvatarUpload onFileSelected={() => {}} previewUrl={PREVIEW_URI} />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('isUploading sans preview : affiche "Envoi…" et pas de violations axe', async () => {
    const { container } = render(<AvatarUpload onFileSelected={() => {}} isUploading />)
    expect(screen.getByText('Envoi…')).toBeInTheDocument()
    expect(screen.queryByText('Photo')).not.toBeInTheDocument()
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('isUploading avec preview : affiche "Envoi…" par-dessus l\'image et pas de violations axe', async () => {
    const { container } = render(
      <AvatarUpload onFileSelected={() => {}} isUploading previewUrl={PREVIEW_URI} />
    )
    // L'image de preview doit être présente
    expect(container.querySelector('img')).toBeInTheDocument()
    // L'overlay "Envoi…" doit être visible
    expect(screen.getByText('Envoi…')).toBeInTheDocument()
    // L'état vide "Photo" ne doit pas être visible
    expect(screen.queryByText('Photo')).not.toBeInTheDocument()
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
