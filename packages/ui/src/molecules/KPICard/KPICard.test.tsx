import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { KPICard } from './KPICard'

expect.extend(toHaveNoViolations)

describe('KPICard — rétrocompatibilité (format eur par défaut)', () => {
  it('value={1234.56} sans format → "1 234,56 €"', () => {
    const { container } = render(<KPICard title="Quote-part" value={1234.56} />)
    // NBSP (U+00A0) ou espace fine insécable (U+202F) selon l'env Intl
    expect(container.textContent).toMatch(/1[\s  ]234,56/)
    expect(container.textContent).toMatch(/€/)
  })

  it('affiche le titre', () => {
    const { getByText } = render(<KPICard title="Portefeuille" value={1000} />)
    expect(getByText('Portefeuille')).toBeTruthy()
  })
})

describe('KPICard — format pct', () => {
  it('value={0.1234} format="pct" → "12,34 %"', () => {
    const { container } = render(<KPICard title="Détention" value={0.1234} format="pct" />)
    // formatPct(0.1234, { showSign: false }) → "12,34 %"
    expect(container.textContent).toMatch(/12,34[\s  ]%/)
  })

  it('pas de signe + ou − avec format="pct" (showSign: false)', () => {
    const { container } = render(<KPICard title="Part" value={0.05} format="pct" />)
    expect(container.textContent).not.toMatch(/^[+−]/)
  })
})

describe('KPICard — format raw', () => {
  it('value="À jour" format="raw" → "À jour" affiché tel quel', () => {
    const { getByText } = render(<KPICard title="Statut" value="À jour" format="raw" />)
    expect(getByText('À jour')).toBeTruthy()
  })

  it('value="En retard" format="raw" → "En retard"', () => {
    const { getByText } = render(<KPICard title="Cotisation" value="En retard" format="raw" />)
    expect(getByText('En retard')).toBeTruthy()
  })
})

describe('KPICard — isLoading', () => {
  it("isLoading=true → la valeur formatée n'est PAS rendue", () => {
    const { container } = render(<KPICard title="Quote-part" value={65574.87} isLoading />)
    expect(container.textContent).not.toMatch(/65/)
    expect(container.textContent).not.toMatch(/€/)
  })

  it('isLoading=true → un élément skeleton est présent (aria-hidden)', () => {
    const { container } = render(<KPICard title="Quote-part" value={65574.87} isLoading />)
    const skeleton = container.querySelector('[aria-hidden="true"]')
    expect(skeleton).toBeTruthy()
  })

  it('isLoading=true → trend et lien "Voir détail" sont masqués', () => {
    const { queryByText } = render(
      <KPICard
        title="Quote-part"
        value={65574.87}
        isLoading
        trend={{ direction: 'up', value: '+1,2 %' }}
        href="/portfolio"
      />
    )
    expect(queryByText('Voir détail')).toBeNull()
    expect(queryByText('+1,2 %')).toBeNull()
  })

  it('isLoading=false → la valeur est visible', () => {
    const { container } = render(<KPICard title="Quote-part" value={1234.56} isLoading={false} />)
    expect(container.textContent).toMatch(/1[\s  ]234,56/)
  })
})

describe('KPICard — règle hex (pas de hex codé en dur dans le HTML rendu)', () => {
  it('innerHTML ne contient aucun code couleur hex brut', () => {
    const { container } = render(<KPICard title="Quote-part" value={65574.87} />)
    expect(container.innerHTML).not.toMatch(/#[0-9A-Fa-f]{6}/)
  })
})

describe('KPICard — accessibilité (jest-axe)', () => {
  it('pas de violations axe (rendu par défaut EUR)', async () => {
    const { container } = render(<KPICard title="Quote-part estimée" value={65574.87} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('pas de violations axe (format pct)', async () => {
    const { container } = render(<KPICard title="Détention" value={0.1234} format="pct" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('pas de violations axe (format raw)', async () => {
    const { container } = render(<KPICard title="Statut" value="À jour" format="raw" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('pas de violations axe (isLoading)', async () => {
    const { container } = render(<KPICard title="Quote-part" value={65574.87} isLoading />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('pas de violations axe (avec trend + href)', async () => {
    const { container } = render(
      <KPICard
        title="Portefeuille"
        value={65574.87}
        trend={{ direction: 'up', value: '+1,2 %', subValue: '+773 €' }}
        href="/portfolio"
      />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
