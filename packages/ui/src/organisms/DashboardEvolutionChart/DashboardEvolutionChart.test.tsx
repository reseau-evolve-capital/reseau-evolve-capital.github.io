import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import {
  DashboardEvolutionChart,
  type DashboardEvolutionChartProps,
  type EvolutionPoint,
} from './DashboardEvolutionChart'

expect.extend(toHaveNoViolations)

// Recharts ResponsiveContainer utilise ResizeObserver — polyfill minimal pour jsdom
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock

const POINTS_30: EvolutionPoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(2026, 4, 1 + i).toISOString(),
  value: 60_000 + i * 95,
}))

const baseProps: DashboardEvolutionChartProps = {
  points: POINTS_30,
  period: '30d',
  onPeriodChange: () => {},
  periods: [
    { value: '7d', label: '7J' },
    { value: '30d', label: '30J' },
    { value: 'max', label: 'MAX' },
  ],
  summaryValue: '+2 854 €',
  summarySub: '(+4,55 %)',
  title: 'Évolution · 30 jours',
  axisStart: '12 mai',
  axisEnd: 'auj.',
}

function renderChart(overrides: Partial<DashboardEvolutionChartProps> = {}) {
  return render(
    <div style={{ width: 420, height: 300 }}>
      <DashboardEvolutionChart {...baseProps} {...overrides} />
    </div>
  )
}

// -------------------------------------------------------------------
// Rendu nominal — titre, résumé, axe de dates
// -------------------------------------------------------------------

describe('DashboardEvolutionChart — rendu', () => {
  it('affiche le titre, le résumé et les labels d’axe', () => {
    renderChart()
    expect(screen.getByText('Évolution · 30 jours')).toBeInTheDocument()
    expect(screen.getByText('+2 854 €')).toBeInTheDocument()
    expect(screen.getByText('(+4,55 %)')).toBeInTheDocument()
    expect(screen.getByText('12 mai')).toBeInTheDocument()
    expect(screen.getByText('auj.')).toBeInTheDocument()
  })

  it('le suffixe de résumé est rendu quand fourni (MAX)', () => {
    renderChart({ summarySuffix: 'depuis ton adhésion' })
    expect(screen.getByText('depuis ton adhésion')).toBeInTheDocument()
  })

  it('le graphe est décoratif (aria-hidden) — l’info passe par le résumé textuel', () => {
    const { container } = renderChart()
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  it('axisCenter ne se rend qu’en size="large"', () => {
    renderChart({ axisCenter: '28 avril' })
    expect(screen.queryByText('28 avril')).toBeNull()
    renderChart({ axisCenter: '28 avril', size: 'large' })
    expect(screen.getByText('28 avril')).toBeInTheDocument()
  })

  it('demoLabel est rendu quand fourni, absent sinon', () => {
    renderChart()
    expect(screen.queryByText('Courbe illustrative')).toBeNull()
    renderChart({ demoLabel: 'Courbe illustrative' })
    expect(screen.getByText('Courbe illustrative')).toBeInTheDocument()
  })
})

// -------------------------------------------------------------------
// Données dégradées — jamais de crash, jamais de NaN
// -------------------------------------------------------------------

describe('DashboardEvolutionChart — données insuffisantes', () => {
  it('points vides → la card rend le header/résumé et un « — » à la place du graphe', () => {
    renderChart({ points: [] })
    expect(screen.getByText('Évolution · 30 jours')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('1 seul point → « — », pas de crash', () => {
    const single = POINTS_30.slice(0, 1)
    renderChart({ points: single })
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('valeurs non finies filtrées : NaN partout → fallback « — »', () => {
    const dirty: EvolutionPoint[] = POINTS_30.map((p) => ({ ...p, value: NaN }))
    renderChart({ points: dirty })
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

// -------------------------------------------------------------------
// Toggle de périodes — état pressé + clavier
// -------------------------------------------------------------------

describe('DashboardEvolutionChart — toggle de périodes', () => {
  it('la période active porte aria-pressed="true", les autres "false"', () => {
    renderChart()
    expect(screen.getByRole('button', { name: '30J' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '7J' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'MAX' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('le groupe de périodes est nommé (role=group)', () => {
    renderChart()
    expect(screen.getByRole('group', { name: 'Période' })).toBeInTheDocument()
  })

  it('clic sur MAX → onPeriodChange("max")', async () => {
    const user = userEvent.setup()
    const onPeriodChange = vi.fn()
    renderChart({ onPeriodChange })
    await user.click(screen.getByRole('button', { name: 'MAX' }))
    expect(onPeriodChange).toHaveBeenCalledWith('max')
  })

  it('navigation clavier : Tab atteint les boutons, Enter déclenche le changement', async () => {
    const user = userEvent.setup()
    const onPeriodChange = vi.fn()
    renderChart({ onPeriodChange })
    await user.tab()
    expect(screen.getByRole('button', { name: '7J' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onPeriodChange).toHaveBeenCalledWith('7d')
    await user.tab()
    expect(screen.getByRole('button', { name: '30J' })).toHaveFocus()
  })

  it('périodes mobileHidden portent les classes hidden md:inline-flex (pas de useMediaQuery)', () => {
    renderChart({
      periods: [
        { value: '7d', label: '7J' },
        { value: '90d', label: '90J', mobileHidden: true },
        { value: 'max', label: 'MAX' },
      ],
    })
    const hiddenBtn = screen.getByRole('button', { name: '90J', hidden: true })
    expect(hiddenBtn.className).toContain('hidden')
    expect(hiddenBtn.className).toContain('md:inline-flex')
  })
})

// -------------------------------------------------------------------
// Règle hex — couleurs via tokens uniquement
// -------------------------------------------------------------------

describe('DashboardEvolutionChart — règle hex', () => {
  it('aucun code hex brut dans le rendu (tokens var(--data-*) uniquement)', () => {
    const { container } = renderChart()
    expect(container.innerHTML).not.toMatch(/#[0-9A-Fa-f]{6}/)
  })
})

// -------------------------------------------------------------------
// Accessibilité (jest-axe)
// -------------------------------------------------------------------

describe('DashboardEvolutionChart — accessibilité (jest-axe)', () => {
  it('cas nominal compact : pas de violations axe', async () => {
    const { container } = renderChart()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('cas large + suffixe + demoLabel : pas de violations axe', async () => {
    const { container } = renderChart({
      size: 'large',
      axisCenter: '28 avril',
      summarySuffix: 'depuis ton adhésion',
      demoLabel: 'Courbe illustrative',
    })
    expect(await axe(container)).toHaveNoViolations()
  })

  it('cas données vides : pas de violations axe', async () => {
    const { container } = renderChart({ points: [] })
    expect(await axe(container)).toHaveNoViolations()
  })
})
