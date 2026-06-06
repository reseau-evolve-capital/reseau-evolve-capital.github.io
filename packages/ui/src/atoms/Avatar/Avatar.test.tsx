import { render, screen, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Avatar } from './Avatar'

expect.extend(toHaveNoViolations)

const SRC = 'http://127.0.0.1:54321/storage/v1/object/public/avatars/u1/avatar.webp'

describe('Avatar', () => {
  it('sans src : affiche les initiales (2 max)', () => {
    const { container } = render(<Avatar name="Alice Courbet Martin" />)
    const wrapper = container.firstElementChild!
    expect(wrapper).toHaveAttribute('aria-label', 'Alice Courbet Martin')
    expect(wrapper).toHaveTextContent('AC')
  })

  it('avec src : rend une image cover, pleine taille, avec alt', () => {
    const { container } = render(<Avatar name="Marc Leduc" src={SRC} />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img).toHaveAttribute('alt', 'Marc Leduc')
    expect(img?.className).toContain('object-cover')
    expect(img?.className).toContain('h-full')
    expect(img?.className).toContain('w-full')
  })

  it("image en erreur (onError) : retombe sur les initiales — jamais d'image cassée", () => {
    const { container } = render(<Avatar name="Sophie Renard" src={SRC} />)
    const wrapper = container.firstElementChild!
    const img = wrapper.querySelector('img')
    expect(img).not.toBeNull()
    fireEvent.error(img!)
    expect(wrapper.querySelector('img')).toBeNull()
    expect(wrapper).toHaveTextContent('SR')
  })

  it('pas de violations axe (avec image)', async () => {
    const { container } = render(<Avatar name="Alice Courbet" src={SRC} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('pas de violations axe (initiales)', async () => {
    const { container } = render(<Avatar name="Alice Courbet" />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
