import * as React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { SheetConnectionTest } from './SheetConnectionTest'
import { DEMO_LABELS } from './fixtures'

expect.extend(toHaveNoViolations)

const SA = 'sync-bot@evolve-capital-prod.iam.gserviceaccount.com'

function setup(props: Partial<React.ComponentProps<typeof SheetConnectionTest>> = {}) {
  const onChange = vi.fn()
  const onTest = vi.fn()
  const onCopyEmail = vi.fn()
  render(
    <SheetConnectionTest
      value=""
      onChange={onChange}
      serviceAccountEmail={SA}
      onCopyEmail={onCopyEmail}
      onTest={onTest}
      status="idle"
      labels={DEMO_LABELS}
      {...props}
    />
  )
  return { onChange, onTest, onCopyEmail }
}

describe('SheetConnectionTest — comportement', () => {
  it('le bouton « Tester » est désactivé tant que le champ est vide', () => {
    setup({ value: '' })
    expect(screen.getByRole('button', { name: /Tester/i })).toBeDisabled()
  })

  it('le bouton « Tester » est activé quand une valeur est saisie', () => {
    setup({ value: 'sheet-abc' })
    expect(screen.getByRole('button', { name: /Tester/i })).toBeEnabled()
  })

  it('le bouton « Tester » émet onTest', async () => {
    const { onTest } = setup({ value: 'sheet-abc' })
    await userEvent.click(screen.getByRole('button', { name: /Tester/i }))
    expect(onTest).toHaveBeenCalledTimes(1)
  })

  it('affiche l’email du Service Account et émet onCopyEmail au clic', async () => {
    const { onCopyEmail } = setup()
    expect(screen.getByText(SA)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Copier/i }))
    expect(onCopyEmail).toHaveBeenCalledTimes(1)
  })

  it('succès : bloc role=status avec l’aperçu membres/positions', () => {
    setup({ status: 'success', preview: { members: 18, positions: 24, tabsFound: 6 } })
    const box = screen.getByRole('status')
    expect(box).toHaveTextContent(/18 membres/)
    expect(box).toHaveTextContent(/24 positions/)
  })

  it('not_shared : bloc role=alert citant l’email du SA', () => {
    setup({ status: 'not_shared' })
    expect(screen.getByRole('alert')).toHaveTextContent(SA)
  })

  it('structure : bloc role=alert citant le VRAI nom d’onglet (POSITIONS, jamais Portefeuille)', () => {
    setup({ status: 'structure', missingTabs: ['POSITIONS'] })
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(/POSITIONS/)
    expect(screen.queryByText(/Portefeuille/)).not.toBeInTheDocument()
  })

  it('testing : bouton en chargement (aria-busy), spinner visible', () => {
    setup({ value: 'sheet-abc', status: 'testing' })
    const btn = screen.getByRole('button', { name: /Test en cours/i })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
  })
})

describe('SheetConnectionTest — accessibilité (jest-axe)', () => {
  it('pas de violations axe (idle)', async () => {
    const { container } = render(
      <SheetConnectionTest
        value=""
        onChange={() => {}}
        serviceAccountEmail={SA}
        onCopyEmail={() => {}}
        onTest={() => {}}
        status="idle"
        labels={DEMO_LABELS}
      />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('pas de violations axe (succès)', async () => {
    const { container } = render(
      <SheetConnectionTest
        value="sheet-abc"
        onChange={() => {}}
        serviceAccountEmail={SA}
        onCopyEmail={() => {}}
        onTest={() => {}}
        status="success"
        preview={{ members: 18, positions: 24, tabsFound: 6 }}
        labels={DEMO_LABELS}
      />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('pas de violations axe (not_shared)', async () => {
    const { container } = render(
      <SheetConnectionTest
        value="sheet-notshared"
        onChange={() => {}}
        serviceAccountEmail={SA}
        onCopyEmail={() => {}}
        onTest={() => {}}
        status="not_shared"
        labels={DEMO_LABELS}
      />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
