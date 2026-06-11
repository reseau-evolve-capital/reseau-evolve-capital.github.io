import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { DashboardHero } from './DashboardHero'

expect.extend(toHaveNoViolations)

// Recharts ResponsiveContainer utilise ResizeObserver — polyfill minimal pour jsdom
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock

// -------------------------------------------------------------------
// Rendu nominal
// -------------------------------------------------------------------

describe('DashboardHero — rendu', () => {
  it('affiche le label "Ta quote-part"', () => {
    const { getByText } = render(<DashboardHero netMarketValue={64_320.5} />)
    expect(getByText('Ta quote-part')).toBeTruthy()
  })

  it('rend le montant formaté (CurrencyAmount xl)', () => {
    const { container } = render(<DashboardHero netMarketValue={64_320.5} />)
    // CurrencyAmount expose aria-label avec le texte formaté
    const amountEl = container.querySelector('[aria-label]')
    expect(amountEl).not.toBeNull()
  })

  it('syncedAt → affiche "Mis à jour …"', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000)
    const { getByText } = render(<DashboardHero netMarketValue={10_000} syncedAt={date} />)
    expect(getByText(/mis à jour/i)).toBeTruthy()
  })

  it('syncedAt absent → le texte "Mis à jour" est absent', () => {
    const { queryByText } = render(<DashboardHero netMarketValue={10_000} />)
    expect(queryByText(/mis à jour/i)).toBeNull()
  })
})

// -------------------------------------------------------------------
// État loading
// -------------------------------------------------------------------

describe('DashboardHero — isLoading', () => {
  it('isLoading=true → rend un skeleton (aria-hidden), pas le label ni le montant', () => {
    const { queryByText, container } = render(<DashboardHero netMarketValue={64_320.5} isLoading />)
    expect(queryByText('Ta quote-part')).toBeNull()
    const skeleton = container.querySelector('[aria-hidden="true"]')
    expect(skeleton).not.toBeNull()
  })
})

// -------------------------------------------------------------------
// onClick / wrapper sémantique
// -------------------------------------------------------------------

describe('DashboardHero — onClick', () => {
  it('onClick fourni → rend un <button>', () => {
    const { getByRole } = render(
      <DashboardHero netMarketValue={10_000} onClick={() => undefined} />
    )
    expect(getByRole('button')).toBeTruthy()
  })

  it('onClick absent → pas de <button>', () => {
    const { queryByRole } = render(<DashboardHero netMarketValue={10_000} />)
    expect(queryByRole('button')).toBeNull()
  })

  it('clic sur le bouton appelle onClick', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    const { getByRole } = render(<DashboardHero netMarketValue={10_000} onClick={handleClick} />)
    await user.click(getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})

// -------------------------------------------------------------------
// Prop variation (TrendBadge)
// -------------------------------------------------------------------

describe('DashboardHero — variation', () => {
  it('variation fournie → TrendBadge visible (le text value est affiché)', () => {
    const { getByText } = render(
      <DashboardHero
        netMarketValue={10_000}
        variation={{ direction: 'up', value: '+1,2 %', subValue: '+773 €' }}
      />
    )
    expect(getByText('+1,2 %')).toBeTruthy()
  })

  it('variation absente → pas de TrendBadge (cas V0)', () => {
    const { queryByText } = render(<DashboardHero netMarketValue={10_000} />)
    // Aucun signe de variation
    expect(queryByText(/[+-]\d/)).toBeNull()
  })
})

// -------------------------------------------------------------------
// Prop historicalData (SparklineMini)
// -------------------------------------------------------------------

describe('DashboardHero — historicalData', () => {
  it('historicalData ≥ 2 points → wrapper sparkline présent (aria-hidden)', () => {
    const data = Array.from({ length: 30 }, (_, i) => 58_000 + i * 250)
    const { container } = render(
      <div style={{ width: 360, height: 200 }}>
        <DashboardHero netMarketValue={10_000} historicalData={data} />
      </div>
    )
    const sparklineWrapper = container.querySelector('[aria-hidden="true"]')
    expect(sparklineWrapper).not.toBeNull()
  })

  it('historicalData absent → pas de sparkline', () => {
    const { container } = render(
      <div style={{ width: 360, height: 200 }}>
        <DashboardHero netMarketValue={10_000} />
      </div>
    )
    // Sans historicalData, SparklineMini n'est pas monté → pas de wrapper recharts aria-hidden
    // On vérifie via la classe mt-3 que SparklineMini attend
    const sparklineEl = container.querySelector('.mt-3')
    expect(sparklineEl).toBeNull()
  })

  it('historicalData avec 1 seul point → sparkline non rendue', () => {
    const { container } = render(
      <div style={{ width: 360, height: 200 }}>
        <DashboardHero netMarketValue={10_000} historicalData={[42]} />
      </div>
    )
    const sparklineEl = container.querySelector('.mt-3')
    expect(sparklineEl).toBeNull()
  })
})

// -------------------------------------------------------------------
// Accessibilité (jest-axe)
// -------------------------------------------------------------------

// -------------------------------------------------------------------
// Variante V2 « open » + variationMeta + action (additif — défaut inchangé)
// -------------------------------------------------------------------

describe('DashboardHero — appearance="open" (V2)', () => {
  it('open → le chrome de carte (bg-card) disparaît, le contenu reste', () => {
    const { container, getByText } = render(
      <DashboardHero netMarketValue={64_320.5} appearance="open" />
    )
    expect(getByText('Ta quote-part')).toBeTruthy()
    expect(container.querySelector('.bg-card')).toBeNull()
  })

  it('défaut (card) → le chrome de carte est présent (non-régression)', () => {
    const { container } = render(<DashboardHero netMarketValue={64_320.5} />)
    expect(container.querySelector('.bg-card')).not.toBeNull()
  })

  it('variationMeta est rendue à côté du TrendBadge quand variation est fournie', () => {
    const { getByText } = render(
      <DashboardHero
        netMarketValue={64_320.5}
        variation={{ direction: 'up', value: '+1,2 %' }}
        variationMeta="hier · 10.06"
      />
    )
    expect(getByText('hier · 10.06')).toBeTruthy()
  })

  it('variationMeta sans variation → non rendue (elle accompagne le badge)', () => {
    const { queryByText } = render(
      <DashboardHero netMarketValue={64_320.5} variationMeta="hier · 10.06" />
    )
    expect(queryByText('hier · 10.06')).toBeNull()
  })

  it('le slot action est rendu sous la ligne de variation', () => {
    const { getByRole } = render(
      <DashboardHero
        netMarketValue={64_320.5}
        appearance="open"
        action={<a href="#comprendre">Comprendre ma quote-part</a>}
      />
    )
    expect(getByRole('link', { name: 'Comprendre ma quote-part' })).toBeTruthy()
  })

  it('open : pas de violations axe (avec méta + action)', async () => {
    const { container } = render(
      <DashboardHero
        netMarketValue={64_320.5}
        appearance="open"
        variation={{ direction: 'up', value: '+1,2 %' }}
        variationMeta="hier · 10.06"
        action={<a href="#comprendre">Comprendre ma quote-part</a>}
      />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('DashboardHero — accessibilité (jest-axe)', () => {
  it('cas nominal (div) : pas de violations axe', async () => {
    const { container } = render(
      <DashboardHero netMarketValue={64_320.5} syncedAt={new Date(Date.now() - 5 * 60 * 1000)} />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('cas cliquable (button) : pas de violations axe', async () => {
    const { container } = render(
      <DashboardHero netMarketValue={64_320.5} onClick={() => undefined} />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('état loading : pas de violations axe', async () => {
    const { container } = render(<DashboardHero netMarketValue={0} isLoading />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
