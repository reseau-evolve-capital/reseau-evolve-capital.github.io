import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { StrategySection } from './StrategySection'
import type { ClubDoc } from '@/lib/content-types'

const base = { name: 'Club' } as ClubDoc
const empty = { focusAreas: null, riskProfile: null, decisionProcess: null, minimumInvestment: null, monthlyContribution: null }

describe('StrategySection', () => {
  it('ne rend rien quand la strategie est vide', () => {
    expect(renderToStaticMarkup(<StrategySection club={{ ...base, investmentStrategy: null }} locale="fr" />)).toBe('')
    expect(renderToStaticMarkup(<StrategySection club={{ ...base, investmentStrategy: empty }} locale="fr" />)).toBe('')
  })

  it('rend le titre avec un seul champ renseigne', () => {
    const html = renderToStaticMarkup(
      <StrategySection club={{ ...base, investmentStrategy: { ...empty, focusAreas: 'ETF' } }} locale="fr" />,
    )
    expect(html).toContain("Stratégie d&#x27;investissement")
    expect(html).toContain('ETF')
    expect(html).not.toMatch(/undefined|NaN/)
  })
})
