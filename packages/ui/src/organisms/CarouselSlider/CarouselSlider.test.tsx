import { render, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { CarouselSlider } from './CarouselSlider'

expect.extend(toHaveNoViolations)

// jsdom n'implémente pas scrollIntoView — on le stubber pour éviter les erreurs
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

const sampleSlides = [
  <div key="1">Slide 1</div>,
  <div key="2">Slide 2</div>,
  <div key="3">Slide 3</div>,
]

describe('CarouselSlider — accessibilité (jest-axe)', () => {
  it('pas de violations axe', async () => {
    const { container } = render(
      <CarouselSlider slides={sampleSlides} active={0} onActiveChange={() => undefined} />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('CarouselSlider — navigation via CarouselDots', () => {
  it('cliquer sur le point 2 appelle onActiveChange(1)', () => {
    const handler = vi.fn()
    const { getByRole } = render(
      <CarouselSlider slides={sampleSlides} active={0} onActiveChange={handler} />
    )
    fireEvent.click(getByRole('tab', { name: 'Aller à la slide 2' }))
    expect(handler).toHaveBeenCalledWith(1)
  })
})

describe('CarouselSlider — navigation clavier', () => {
  it('ArrowRight appelle onActiveChange avec index + 1', () => {
    const handler = vi.fn()
    const { getByRole } = render(
      <CarouselSlider slides={sampleSlides} active={1} onActiveChange={handler} />
    )
    const region = getByRole('region', { name: 'Présentation' })
    fireEvent.keyDown(region, { key: 'ArrowRight' })
    expect(handler).toHaveBeenCalledWith(2)
  })

  it('ArrowLeft appelle onActiveChange avec index - 1', () => {
    const handler = vi.fn()
    const { getByRole } = render(
      <CarouselSlider slides={sampleSlides} active={1} onActiveChange={handler} />
    )
    const region = getByRole('region', { name: 'Présentation' })
    fireEvent.keyDown(region, { key: 'ArrowLeft' })
    expect(handler).toHaveBeenCalledWith(0)
  })

  it("ArrowRight ne dépasse pas l'index max", () => {
    const handler = vi.fn()
    const { getByRole } = render(
      <CarouselSlider slides={sampleSlides} active={2} onActiveChange={handler} />
    )
    const region = getByRole('region', { name: 'Présentation' })
    fireEvent.keyDown(region, { key: 'ArrowRight' })
    // index 2 est déjà le dernier — reste à 2
    expect(handler).toHaveBeenCalledWith(2)
  })

  it('ArrowLeft ne descend pas sous 0', () => {
    const handler = vi.fn()
    const { getByRole } = render(
      <CarouselSlider slides={sampleSlides} active={0} onActiveChange={handler} />
    )
    const region = getByRole('region', { name: 'Présentation' })
    fireEvent.keyDown(region, { key: 'ArrowLeft' })
    expect(handler).toHaveBeenCalledWith(0)
  })
})

describe('CarouselSlider — rendu', () => {
  it('rend autant de groupes slide que de slides fournies', () => {
    const { getAllByRole } = render(
      <CarouselSlider slides={sampleSlides} active={0} onActiveChange={() => undefined} />
    )
    expect(getAllByRole('group')).toHaveLength(3)
  })

  it('rend le contenu de chaque slide', () => {
    const { getByText } = render(
      <CarouselSlider slides={sampleSlides} active={0} onActiveChange={() => undefined} />
    )
    expect(getByText('Slide 1')).toBeTruthy()
    expect(getByText('Slide 2')).toBeTruthy()
    expect(getByText('Slide 3')).toBeTruthy()
  })
})
