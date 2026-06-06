import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { SparklineMini } from './SparklineMini'

expect.extend(toHaveNoViolations)

// Recharts ResponsiveContainer utilise ResizeObserver — polyfill minimal pour jsdom
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock

const DATA_30 = Array.from({ length: 30 }, (_, i) => 100 + i * 5)

describe('SparklineMini — rendu', () => {
  it('data.length < 2 → retourne null (container vide)', () => {
    const { container } = render(
      <div style={{ width: 240, height: 40 }}>
        <SparklineMini data={[42]} />
      </div>
    )
    // Le composant ne monte aucun enfant propre
    expect(container.querySelector('[aria-hidden]')).toBeNull()
  })

  it('data vide → retourne null', () => {
    const { container } = render(
      <div style={{ width: 240, height: 40 }}>
        <SparklineMini data={[]} />
      </div>
    )
    expect(container.querySelector('[aria-hidden]')).toBeNull()
  })

  it('30 points → rend le wrapper div avec aria-hidden="true"', () => {
    const { container } = render(
      <div style={{ width: 240, height: 40 }}>
        <SparklineMini data={DATA_30} />
      </div>
    )
    const wrapper = container.querySelector('[aria-hidden="true"]')
    expect(wrapper).not.toBeNull()
  })

  it('className personnalisée est appliquée sur le wrapper', () => {
    const { container } = render(
      <div style={{ width: 240, height: 40 }}>
        <SparklineMini data={DATA_30} className="test-custom" />
      </div>
    )
    const wrapper = container.querySelector('.test-custom')
    expect(wrapper).not.toBeNull()
  })

  it('height est appliquée en style inline', () => {
    const { container } = render(
      <div style={{ width: 240, height: 60 }}>
        <SparklineMini data={DATA_30} height={60} />
      </div>
    )
    const wrapper = container.querySelector('[aria-hidden="true"]') as HTMLElement | null
    expect(wrapper?.style.height).toBe('60px')
  })
})

describe('SparklineMini — règle hex (pas de hex codé en dur)', () => {
  it('innerHTML ne contient aucun code couleur hex brut (#RRGGBB)', () => {
    const { container } = render(
      <div style={{ width: 240, height: 40 }}>
        <SparklineMini data={DATA_30} />
      </div>
    )
    // On ignore les attributs hors du composant SparklineMini (le div wrapper parent)
    const wrapper = container.querySelector('[aria-hidden="true"]')
    expect(wrapper?.innerHTML ?? '').not.toMatch(/#[0-9A-Fa-f]{6}/)
  })
})

describe('SparklineMini — accessibilité (jest-axe)', () => {
  it('pas de violations axe — le SVG est aria-hidden, transparent pour les AT', async () => {
    const { container } = render(
      <div style={{ width: 240, height: 40 }}>
        <SparklineMini data={DATA_30} />
      </div>
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('pas de violations axe — data courte (null render)', async () => {
    const { container } = render(
      <div style={{ width: 240, height: 40 }}>
        <SparklineMini data={[42]} />
      </div>
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
