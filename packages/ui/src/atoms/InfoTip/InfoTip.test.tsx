import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { InfoTip } from './InfoTip'

// Radix Popover (use-size, Arrow) utilise ResizeObserver — polyfill minimal pour jsdom
// (même pattern que AllocationDonut / SparklineMini).
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock

expect.extend(toHaveNoViolations)

const CONTENT = 'Capacité restante d’investissement sur l’année en cours.'
const LABEL = 'En savoir plus sur la capacité d’investissement'

function renderTip() {
  return render(<InfoTip content={CONTENT} aria-label={LABEL} />)
}

describe('InfoTip — déclencheur', () => {
  it('rend un vrai <button> avec le libellé accessible fourni', () => {
    renderTip()
    const trigger = screen.getByRole('button', { name: LABEL })
    expect(trigger).toBeInTheDocument()
    expect(trigger.tagName).toBe('BUTTON')
  })

  it('fermé par défaut — le contenu n’est pas dans le document', () => {
    renderTip()
    expect(screen.queryByText(CONTENT)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: LABEL })).toHaveAttribute('aria-expanded', 'false')
  })

  it('zone de hit tactile étendue via ::after (cible ≥ 44px sans layout shift)', () => {
    renderTip()
    const trigger = screen.getByRole('button', { name: LABEL })
    expect(trigger.className).toContain('after:-inset-3.5')
  })
})

describe('InfoTip — interactions', () => {
  it('clic/tap → ouvre (toggle), le contenu devient visible', async () => {
    const user = userEvent.setup()
    renderTip()
    await user.click(screen.getByRole('button', { name: LABEL }))
    expect(screen.getByText(CONTENT)).toBeVisible()
    expect(screen.getByRole('button', { name: LABEL })).toHaveAttribute('aria-expanded', 'true')
  })

  it('second clic → referme', async () => {
    const user = userEvent.setup()
    renderTip()
    const trigger = screen.getByRole('button', { name: LABEL })
    await user.click(trigger)
    await user.click(trigger)
    expect(screen.queryByText(CONTENT)).not.toBeInTheDocument()
  })

  it('clavier : Enter ouvre, Échap ferme', async () => {
    const user = userEvent.setup()
    renderTip()
    await user.tab()
    expect(screen.getByRole('button', { name: LABEL })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByText(CONTENT)).toBeVisible()
    await user.keyboard('{Escape}')
    expect(screen.queryByText(CONTENT)).not.toBeInTheDocument()
  })
})

describe('InfoTip — accessibilité (jest-axe)', () => {
  it('pas de violations axe (fermé)', async () => {
    const { container } = renderTip()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('pas de violations axe (ouvert)', async () => {
    const user = userEvent.setup()
    const { baseElement } = renderTip()
    await user.click(screen.getByRole('button', { name: LABEL }))
    expect(await axe(baseElement)).toHaveNoViolations()
  })
})
