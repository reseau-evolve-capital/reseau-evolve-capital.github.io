import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { SlideCard } from './SlideCard'

expect.extend(toHaveNoViolations)

const defaultProps = {
  imageSrc: 'https://placehold.co/240x160/F5C842/1A1A1A?text=Test',
  imageAlt: 'Image de test',
  title: 'Titre de la slide',
  body: 'Description de la slide pour les membres.',
}

describe('SlideCard — accessibilité', () => {
  it('pas de violations axe', async () => {
    const { container } = render(<SlideCard {...defaultProps} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('SlideCard — rendu', () => {
  it('affiche le titre', () => {
    const { getByText } = render(<SlideCard {...defaultProps} />)
    expect(getByText('Titre de la slide')).toBeTruthy()
  })

  it('affiche le corps de texte', () => {
    const { getByText } = render(<SlideCard {...defaultProps} />)
    expect(getByText('Description de la slide pour les membres.')).toBeTruthy()
  })

  it("l'image a bien l'alt fourni", () => {
    const { getByAltText } = render(<SlideCard {...defaultProps} />)
    expect(getByAltText('Image de test')).toBeTruthy()
  })
})
