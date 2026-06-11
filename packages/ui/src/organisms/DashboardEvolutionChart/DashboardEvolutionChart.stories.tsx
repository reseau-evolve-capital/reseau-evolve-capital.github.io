import type { Meta, StoryObj } from '@storybook/react'
import { fn, within, userEvent, expect } from 'storybook/test'
import { DashboardEvolutionChart, type EvolutionPoint } from './DashboardEvolutionChart'

/** 30 points croissants façon « quote-part » (déterministe, pas de Math.random). */
function makePoints(count: number, base = 60_000, slope = 95): EvolutionPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    date: new Date(2026, 4, 1 + i).toISOString(),
    value: base + i * slope + Math.sin(i / 3) * 320,
  }))
}

const PERIODS_MOBILE: Array<{ value: '7d' | '30d' | 'max'; label: string }> = [
  { value: '7d', label: '7J' },
  { value: '30d', label: '30J' },
  { value: 'max', label: 'MAX' },
]

const PERIODS_DESKTOP = [
  { value: '7d' as const, label: '7J' },
  { value: '30d' as const, label: '30J' },
  { value: '90d' as const, label: '90J', mobileHidden: true },
  { value: '1y' as const, label: '1A', mobileHidden: true },
  { value: 'max' as const, label: 'MAX' },
]

const meta: Meta<typeof DashboardEvolutionChart> = {
  title: 'Organisms/DashboardEvolutionChart',
  component: DashboardEvolutionChart,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 420, padding: 16, background: 'var(--color-bg-page)' }}>
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof DashboardEvolutionChart>

/** Compact 30 jours — cas mobile nominal. Le clic MAX remonte la période. */
export const Compact30J: Story = {
  args: {
    points: makePoints(30),
    period: '30d',
    onPeriodChange: fn(),
    periods: PERIODS_MOBILE,
    summaryValue: '+2 854 €',
    summarySub: '(+4,55 %)',
    title: 'Évolution · 30 jours',
    axisStart: '12 mai',
    axisEnd: 'auj.',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    // Toggle : MAX est relâché, 30J est pressé
    const maxButton = canvas.getByRole('button', { name: 'MAX' })
    expect(maxButton).toHaveAttribute('aria-pressed', 'false')
    expect(canvas.getByRole('button', { name: '30J' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(maxButton)
    expect(args.onPeriodChange).toHaveBeenCalledWith('max')
  },
}

/** Compact MAX — avec suffixe « depuis ton adhésion ». */
export const CompactMax: Story = {
  args: {
    points: makePoints(48, 48_000, 380),
    period: 'max',
    onPeriodChange: fn(),
    periods: PERIODS_MOBILE,
    summaryValue: '+18 230 €',
    summarySub: '(+39,6 %)',
    summarySuffix: 'depuis ton adhésion',
    title: 'Évolution',
    axisStart: 'juin 2022',
    axisEnd: 'auj.',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(canvas.getByRole('button', { name: 'MAX' })).toHaveAttribute('aria-pressed', 'true')
    expect(canvas.getByText('depuis ton adhésion')).toBeInTheDocument()
  },
}

/** Large desktop — 5 périodes (90J/1A masquées en mobile), axe avec label central. */
export const LargeDesktop: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 760, padding: 24, background: 'var(--color-bg-page)' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    points: makePoints(90, 55_000, 110),
    period: '90d',
    onPeriodChange: fn(),
    periods: PERIODS_DESKTOP,
    summaryValue: '+9 870 €',
    summarySub: '(+17,9 %)',
    title: 'Évolution',
    axisStart: '14 mars',
    axisCenter: '28 avril',
    axisEnd: 'auj.',
    size: 'large',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(canvas.getByText('28 avril')).toBeInTheDocument()
    expect(canvas.getByRole('group', { name: 'Période' })).toBeInTheDocument()
  },
}

/** Variation négative — courbe en var(--data-negative), jamais le rouge brand. */
export const Negative: Story = {
  args: {
    points: makePoints(30, 66_000, -120),
    period: '30d',
    onPeriodChange: fn(),
    periods: PERIODS_MOBILE,
    summaryValue: '−3 540 €',
    summarySub: '(−5,2 %)',
    title: 'Évolution · 30 jours',
    axisStart: '12 mai',
    axisEnd: 'auj.',
    direction: 'down',
  },
}

/** Micro-label « Courbe illustrative » (données de démo). */
export const WithDemoLabel: Story = {
  args: {
    points: makePoints(30),
    period: '30d',
    onPeriodChange: fn(),
    periods: PERIODS_MOBILE,
    summaryValue: '+2 854 €',
    summarySub: '(+4,55 %)',
    title: 'Évolution · 30 jours',
    axisStart: '12 mai',
    axisEnd: 'auj.',
    demoLabel: 'Courbe illustrative',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(canvas.getByText('Courbe illustrative')).toBeInTheDocument()
  },
}

/** Moins de 2 points → zone graphe « — », jamais de crash. */
export const EmptyData: Story = {
  args: {
    points: [],
    period: '30d',
    onPeriodChange: fn(),
    periods: PERIODS_MOBILE,
    summaryValue: '—',
    summarySub: '',
    title: 'Évolution · 30 jours',
    axisStart: '',
    axisEnd: '',
  },
}

/** Variante sombre (data-theme="dark") — courbes light & dark côte à côte. */
export const Dark: Story = {
  decorators: [
    (Story) => (
      <div
        data-theme="dark"
        style={{ width: 420, padding: 16, background: 'var(--color-bg-page)' }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    points: makePoints(30),
    period: '30d',
    onPeriodChange: fn(),
    periods: PERIODS_MOBILE,
    summaryValue: '+2 854 €',
    summarySub: '(+4,55 %)',
    title: 'Évolution · 30 jours',
    axisStart: '12 mai',
    axisEnd: 'auj.',
  },
}
