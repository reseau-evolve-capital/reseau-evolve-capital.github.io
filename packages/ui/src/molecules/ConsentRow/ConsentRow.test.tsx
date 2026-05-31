import { render, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ConsentRow } from './ConsentRow'

expect.extend(toHaveNoViolations)

describe('ConsentRow — accessibilité', () => {
  it('pas de violations axe (état non coché)', async () => {
    const { container } = render(
      <ConsentRow checked={false} onCheckedChange={() => undefined} label="J'accepte les CGU" />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('pas de violations axe (avec lien)', async () => {
    const { container } = render(
      <ConsentRow
        checked={false}
        onCheckedChange={() => undefined}
        label="J'accepte les CGU"
        linkHref="https://example.com/cgu"
      />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('ConsentRow — interaction', () => {
  it('cliquer sur le label appelle onCheckedChange', () => {
    const handler = vi.fn()
    const { getByText } = render(
      <ConsentRow checked={false} onCheckedChange={handler} label="J'accepte les CGU" />
    )
    fireEvent.click(getByText("J'accepte les CGU"))
    expect(handler).toHaveBeenCalledWith(true)
  })

  it("affiche l'astérisque si required", () => {
    const { container } = render(
      <ConsentRow checked={false} onCheckedChange={() => undefined} label="Obligatoire" required />
    )
    expect(container.innerHTML).toContain('*')
  })

  it('affiche le lien [lire] si linkHref fourni', () => {
    const { getByText } = render(
      <ConsentRow
        checked={false}
        onCheckedChange={() => undefined}
        label="J'accepte"
        linkHref="https://example.com/cgu"
        linkLabel="lire"
      />
    )
    expect(getByText('[lire]')).toBeTruthy()
  })

  it('cliquer sur [lire] ne déclenche PAS onCheckedChange (lien sibling du label)', () => {
    const handler = vi.fn()
    const { getByRole } = render(
      <ConsentRow
        checked={false}
        onCheckedChange={handler}
        label="J'accepte les CGU"
        linkHref="https://example.com/cgu"
        linkLabel="lire"
      />
    )
    const link = getByRole('link', { name: '[lire]' })
    fireEvent.click(link)
    expect(handler).not.toHaveBeenCalled()
  })
})
