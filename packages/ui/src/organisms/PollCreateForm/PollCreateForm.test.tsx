import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'

import { PollCreateForm } from './PollCreateForm'

expect.extend(toHaveNoViolations)

// Radix Switch (step 2) s'appuie sur ResizeObserver, absent de jsdom.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverMock as never)

function setup() {
  const onSubmit = vi.fn()
  const utils = render(<PollCreateForm onSubmit={onSubmit} />)
  return { onSubmit, ...utils }
}

describe('PollCreateForm — step 1', () => {
  it('affiche intitulé, description et la grille 2×2 de types (radiogroup)', () => {
    setup()
    expect(screen.getByLabelText('Intitulé du vote')).toBeInTheDocument()
    expect(screen.getByLabelText('Description (optionnel)')).toBeInTheDocument()
    const group = screen.getByRole('radiogroup', { name: 'Type de réponse' })
    const cards = screen.getAllByRole('radio')
    expect(cards).toHaveLength(4)
    expect(group).toBeInTheDocument()
  })

  it('Continuer désactivé tant que le titre est vide', async () => {
    const u = userEvent.setup()
    setup()
    expect(screen.getByRole('button', { name: /Continuer/ })).toBeDisabled()
    await u.type(screen.getByLabelText('Intitulé du vote'), 'Mon vote')
    expect(screen.getByRole('button', { name: /Continuer/ })).toBeEnabled()
  })

  it('sélection d’un type met aria-checked', async () => {
    const u = userEvent.setup()
    setup()
    await u.click(screen.getByRole('radio', { name: /Choix multiple/ }))
    expect(screen.getByRole('radio', { name: /Choix multiple/ })).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })
})

describe('PollCreateForm — step 2 (options + paramètres)', () => {
  async function gotoStep2(type: RegExp = /Choix unique/) {
    const u = userEvent.setup()
    setup()
    await u.type(screen.getByLabelText('Intitulé du vote'), 'Quel secteur prioriser ?')
    await u.click(screen.getByRole('radio', { name: type }))
    await u.click(screen.getByRole('button', { name: /Continuer/ }))
    return u
  }

  it('single_choice : section options + ajout/suppression', async () => {
    const u = await gotoStep2(/Choix unique/)
    expect(screen.getByText('Options de réponse')).toBeInTheDocument()
    // 2 options minimum au départ.
    expect(screen.getAllByLabelText(/Options de réponse \d/)).toHaveLength(2)
    await u.click(screen.getByRole('button', { name: 'Ajouter une option' }))
    expect(screen.getAllByLabelText(/Options de réponse \d/)).toHaveLength(3)
    await u.click(screen.getByRole('button', { name: /Retirer l’option 3/ }))
    expect(screen.getAllByLabelText(/Options de réponse \d/)).toHaveLength(2)
  })

  it('le bouton retirer est désactivé au minimum de 2 options', async () => {
    await gotoStep2(/Choix unique/)
    const removes = screen.getAllByRole('button', { name: /Retirer l’option/ })
    removes.forEach((b) => expect(b).toBeDisabled())
  })

  it('yes_no : pas de section options, paramètres seuls', async () => {
    await gotoStep2(/Oui \/ Non/)
    expect(screen.queryByText('Options de réponse')).not.toBeInTheDocument()
    expect(screen.getByText('Paramètres')).toBeInTheDocument()
    expect(screen.getByText('Résultats visibles après la clôture')).toBeInTheDocument()
    expect(screen.getByText('Notifier par e-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Date de clôture')).toBeInTheDocument()
  })

  it('Publier émet un payload complet avec action=publish', async () => {
    const u = userEvent.setup()
    const onSubmit = vi.fn()
    render(<PollCreateForm onSubmit={onSubmit} />)
    await u.type(screen.getByLabelText('Intitulé du vote'), '  Quel secteur ?  ')
    await u.type(screen.getByLabelText('Description (optionnel)'), 'Contexte')
    await u.click(screen.getByRole('radio', { name: /Choix unique/ }))
    await u.click(screen.getByRole('button', { name: /Continuer/ }))
    const opts = screen.getAllByLabelText(/Options de réponse \d/)
    await u.type(opts[0]!, 'Technologie')
    await u.type(opts[1]!, 'Santé')
    await u.click(screen.getByRole('button', { name: 'Publier' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const [payload, action] = onSubmit.mock.calls[0]!
    expect(action).toBe('publish')
    expect(payload).toMatchObject({
      title: 'Quel secteur ?',
      description: 'Contexte',
      questionType: 'single_choice',
      options: ['Technologie', 'Santé'],
      resultsVisibility: 'after_close',
      notifyByEmail: false,
      closesAt: null,
    })
  })

  it('Sauver le brouillon émet action=draft', async () => {
    const u = userEvent.setup()
    const onSubmit = vi.fn()
    render(<PollCreateForm onSubmit={onSubmit} />)
    await u.type(screen.getByLabelText('Intitulé du vote'), 'Vote AG')
    await u.click(screen.getByRole('radio', { name: /Oui \/ Non/ }))
    await u.click(screen.getByRole('button', { name: /Continuer/ }))
    await u.click(screen.getByRole('button', { name: 'Sauver le brouillon' }))
    expect(onSubmit.mock.calls[0]![1]).toBe('draft')
    expect(onSubmit.mock.calls[0]![0].options).toEqual([])
  })

  it('options insuffisantes (< 2) → Publier désactivé', async () => {
    const u = await gotoStep2(/Choix unique/)
    const opts = screen.getAllByLabelText(/Options de réponse \d/)
    await u.type(opts[0]!, 'Seule option')
    expect(screen.getByRole('button', { name: 'Publier' })).toBeDisabled()
  })

  it('toggle results_visibility → live', async () => {
    const u = userEvent.setup()
    const onSubmit = vi.fn()
    render(<PollCreateForm onSubmit={onSubmit} />)
    await u.type(screen.getByLabelText('Intitulé du vote'), 'Vote')
    await u.click(screen.getByRole('radio', { name: /Oui \/ Non/ }))
    await u.click(screen.getByRole('button', { name: /Continuer/ }))
    // Décocher « résultats après clôture » → live.
    await u.click(screen.getByRole('switch', { name: /Résultats visibles après la clôture/ }))
    await u.click(screen.getByRole('button', { name: 'Publier' }))
    expect(onSubmit.mock.calls[0]![0].resultsVisibility).toBe('live')
  })

  it('Retour revient au step 1 en conservant le titre', async () => {
    const u = await gotoStep2(/Choix unique/)
    await u.click(screen.getByRole('button', { name: /Retour/ }))
    expect(screen.getByLabelText('Intitulé du vote')).toHaveValue('Quel secteur prioriser ?')
  })
})

describe('PollCreateForm — i18n & a11y', () => {
  it('libellés via props (EN)', () => {
    render(
      <PollCreateForm
        onSubmit={vi.fn()}
        labels={{ titleLabel: 'Poll title', publish: 'Publish', next: 'Next' }}
      />
    )
    expect(screen.getByLabelText('Poll title')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Next/ })).toBeInTheDocument()
  })

  it('jamais de rouge brand en dur', () => {
    const { container } = setup()
    expect(container.innerHTML).not.toMatch(/E93E3A/i)
  })

  it('pas de violations axe (step 1)', async () => {
    const { container } = setup()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('pas de violations axe (step 2)', async () => {
    const u = userEvent.setup()
    const { container } = setup()
    await u.type(screen.getByLabelText('Intitulé du vote'), 'V')
    await u.click(screen.getByRole('radio', { name: /Choix unique/ }))
    await u.click(screen.getByRole('button', { name: /Continuer/ }))
    expect(await axe(container)).toHaveNoViolations()
  })
})
