import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { AvatarUpload } from './AvatarUpload'

expect.extend(toHaveNoViolations)

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
      <AvatarUpload onFileSelected={() => {}} previewUrl="data:image/png;base64,iVBORw0KGgo=" />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
