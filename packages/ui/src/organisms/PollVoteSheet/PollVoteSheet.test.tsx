import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'

import { PollVoteSheet, type PollVoteSheetProps, type PollOption } from './PollVoteSheet'

expect.extend(toHaveNoViolations)

// Radix Dialog s'appuie sur des API pointer absentes de jsdom.
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => undefined
  if (!Element.prototype.releasePointerCapture)
    Element.prototype.releasePointerCapture = () => undefined
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => undefined
})

const OPTIONS: PollOption[] = [
  { id: 'tech', label: 'Technologie' },
  { id: 'immo', label: 'Immobilier' },
  { id: 'energie', label: 'Énergie renouvelable' },
  { id: 'sante', label: 'Santé' },
]

function setup(props: Partial<PollVoteSheetProps> = {}) {
  const onOpenChange = vi.fn()
  const onSubmit = vi.fn<(v: unknown) => Promise<void>>().mockResolvedValue(undefined)
  const utils = render(
    <PollVoteSheet
      open
      onOpenChange={onOpenChange}
      title="Faut-il diversifier vers les SCPI ?"
      description="Le comité propose d’allouer 8 % du portefeuille."
      questionType="yes_no"
      onSubmit={onSubmit}
      {...props}
    />
  )
  return { onOpenChange, onSubmit, ...utils }
}

const submitBtn = () => screen.getByRole('button', { name: /Confirmer mon vote/i })

describe('PollVoteSheet — commun', () => {
  it('badge « Vote anonyme », titre et description', () => {
    setup()
    expect(screen.getByText('Vote anonyme')).toBeInTheDocument()
    expect(screen.getByText('Faut-il diversifier vers les SCPI ?')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('CTA désactivé sans sélection ; pas de mention définitive', () => {
    setup()
    expect(submitBtn()).toBeDisabled()
    expect(screen.queryByText(/Votre réponse est définitive/)).not.toBeInTheDocument()
  })

  it('Escape déclenche onOpenChange(false)', async () => {
    const u = userEvent.setup()
    const { onOpenChange } = setup()
    await u.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe('PollVoteSheet — yes_no', () => {
  it('3 options fixes Oui / Non / Abstention en radiogroup', () => {
    setup({ questionType: 'yes_no' })
    const group = screen.getByRole('radiogroup')
    const radios = within(group).getAllByRole('radio')
    expect(radios).toHaveLength(3)
    expect(within(group).getByRole('radio', { name: 'Oui' })).toBeInTheDocument()
    expect(within(group).getByRole('radio', { name: 'Non' })).toBeInTheDocument()
    expect(within(group).getByRole('radio', { name: 'Abstention' })).toBeInTheDocument()
  })

  it('sélection → aria-checked, mention définitive, CTA actif', async () => {
    const u = userEvent.setup()
    setup({ questionType: 'yes_no' })
    await u.click(screen.getByRole('radio', { name: 'Oui' }))
    expect(screen.getByRole('radio', { name: 'Oui' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(/Votre réponse est définitive/)).toBeInTheDocument()
    expect(submitBtn()).toBeEnabled()
  })

  it('soumet selectedOptions = [yes]', async () => {
    const u = userEvent.setup()
    const { onSubmit } = setup({ questionType: 'yes_no' })
    await u.click(screen.getByRole('radio', { name: 'Oui' }))
    await u.click(submitBtn())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0]![0]).toEqual({ selectedOptions: ['yes'], textResponse: null })
  })
})

describe('PollVoteSheet — single_choice', () => {
  it('radio exclusif : une 2e sélection remplace la 1re', async () => {
    const u = userEvent.setup()
    const { onSubmit } = setup({ questionType: 'single_choice', options: OPTIONS })
    await u.click(screen.getByRole('radio', { name: 'Technologie' }))
    await u.click(screen.getByRole('radio', { name: 'Énergie renouvelable' }))
    expect(screen.getByRole('radio', { name: 'Technologie' })).toHaveAttribute(
      'aria-checked',
      'false'
    )
    expect(screen.getByRole('radio', { name: 'Énergie renouvelable' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    await u.click(submitBtn())
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]![0]).toEqual({ selectedOptions: ['energie'], textResponse: null })
  })

  it('navigation flèches dans le radiogroup', async () => {
    const u = userEvent.setup()
    setup({ questionType: 'single_choice', options: OPTIONS })
    const first = screen.getByRole('radio', { name: 'Technologie' })
    first.focus()
    await u.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: 'Immobilier' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })
})

describe('PollVoteSheet — multiple_choice', () => {
  it('checkbox group + note + sélection multiple', async () => {
    const u = userEvent.setup()
    const { onSubmit } = setup({ questionType: 'multiple_choice', options: OPTIONS })
    expect(screen.getByText('Vous pouvez sélectionner plusieurs réponses.')).toBeInTheDocument()
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(4)
    await u.click(screen.getByRole('checkbox', { name: 'Technologie' }))
    await u.click(screen.getByRole('checkbox', { name: 'Santé' }))
    expect(screen.getByRole('checkbox', { name: 'Technologie' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    await u.click(submitBtn())
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]![0]).toEqual({
      selectedOptions: ['tech', 'sante'],
      textResponse: null,
    })
  })

  it('décocher une case la retire de la sélection', async () => {
    const u = userEvent.setup()
    setup({ questionType: 'multiple_choice', options: OPTIONS })
    const cb = screen.getByRole('checkbox', { name: 'Technologie' })
    await u.click(cb)
    expect(cb).toHaveAttribute('aria-checked', 'true')
    await u.click(cb)
    expect(cb).toHaveAttribute('aria-checked', 'false')
    expect(submitBtn()).toBeDisabled()
  })
})

describe('PollVoteSheet — short_text', () => {
  it('note anonymat, compteur 0/280, CTA désactivé', () => {
    setup({ questionType: 'short_text' })
    expect(
      screen.getByText(/Votre réponse sera visible de l’équipe sous forme anonyme/)
    ).toBeInTheDocument()
    expect(screen.getByText('0/280')).toBeInTheDocument()
    expect(submitBtn()).toBeDisabled()
  })

  it('saisie → compteur mis à jour + soumet textResponse trimé', async () => {
    const u = userEvent.setup()
    const { onSubmit } = setup({ questionType: 'short_text' })
    const textarea = screen.getByRole('textbox')
    await u.type(textarea, '  Renforcer la transparence  ')
    expect(screen.getByText('29/280')).toBeInTheDocument()
    expect(submitBtn()).toBeEnabled()
    await u.click(submitBtn())
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]![0]).toEqual({
      selectedOptions: [],
      textResponse: 'Renforcer la transparence',
    })
  })

  it('maxLength = 280 sur le textarea', () => {
    setup({ questionType: 'short_text' })
    expect(screen.getByRole('textbox')).toHaveAttribute('maxlength', '280')
  })
})

describe('PollVoteSheet — succès', () => {
  it('after_close : message « Résultats disponibles à la clôture le {date} »', async () => {
    const u = userEvent.setup()
    setup({ questionType: 'yes_no', resultsVisibility: 'after_close', closesAtLabel: '20 juin' })
    await u.click(screen.getByRole('radio', { name: 'Oui' }))
    await u.click(submitBtn())
    await waitFor(() => expect(screen.getByText('Vote enregistré')).toBeInTheDocument())
    expect(screen.getByText('Résultats disponibles à la clôture le 20 juin')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeInTheDocument()
  })

  it('live : sous-titre direct + chargement par défaut', async () => {
    const u = userEvent.setup()
    setup({ questionType: 'yes_no', resultsVisibility: 'live' })
    await u.click(screen.getByRole('radio', { name: 'Oui' }))
    await u.click(submitBtn())
    await waitFor(() =>
      expect(screen.getByText('Merci. Les résultats sont calculés en direct.')).toBeInTheDocument()
    )
    expect(screen.getByText('Chargement des résultats…')).toBeInTheDocument()
  })

  it('live avec slot fourni : affiche le slot au lieu du chargement', async () => {
    const u = userEvent.setup()
    setup({
      questionType: 'yes_no',
      resultsVisibility: 'live',
      liveResultsSlot: <div>Barres live</div>,
    })
    await u.click(screen.getByRole('radio', { name: 'Oui' }))
    await u.click(submitBtn())
    await waitFor(() => expect(screen.getByText('Barres live')).toBeInTheDocument())
    expect(screen.queryByText('Chargement des résultats…')).not.toBeInTheDocument()
  })

  it('Fermer en succès appelle onOpenChange(false)', async () => {
    const u = userEvent.setup()
    const { onOpenChange } = setup({ questionType: 'yes_no', closesAtLabel: '20 juin' })
    await u.click(screen.getByRole('radio', { name: 'Oui' }))
    await u.click(submitBtn())
    await waitFor(() => screen.getByRole('button', { name: 'Fermer' }))
    await u.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe('PollVoteSheet — erreur', () => {
  it('submit rejeté → bandeau alert, sélection conservée', async () => {
    const u = userEvent.setup()
    const onSubmit = vi.fn<(v: unknown) => Promise<void>>().mockRejectedValue(new Error('boom'))
    render(
      <PollVoteSheet
        open
        onOpenChange={vi.fn()}
        title="Vote"
        questionType="yes_no"
        onSubmit={onSubmit}
      />
    )
    await u.click(screen.getByRole('radio', { name: 'Oui' }))
    await u.click(submitBtn())
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('L’envoi a échoué.'))
    expect(screen.getByRole('radio', { name: 'Oui' })).toHaveAttribute('aria-checked', 'true')
  })
})

describe('PollVoteSheet — i18n & a11y', () => {
  it('libellés via props (EN)', () => {
    setup({
      questionType: 'yes_no',
      labels: {
        anonymous: 'Anonymous vote',
        submit: 'Confirm my vote',
        yesNo: { yes: 'Yes', no: 'No', abstain: 'Abstain' },
      },
    })
    expect(screen.getByText('Anonymous vote')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Yes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm my vote' })).toBeInTheDocument()
  })

  it('jamais de rouge brand en dur', () => {
    const { baseElement } = setup()
    expect(baseElement.innerHTML).not.toMatch(/E93E3A/i)
  })

  it('options ≥ 52px, CTA focus glow (classes)', async () => {
    const u = userEvent.setup()
    setup({ questionType: 'single_choice', options: OPTIONS })
    expect(screen.getByRole('radio', { name: 'Technologie' }).className).toMatch(/min-h-\[52px\]/)
    expect(submitBtn().className).toContain('--sh-glow')
    expect(submitBtn().className).toMatch(/min-h-\[52px\]/)
    void u
  })

  it('pas de violations axe (yes_no)', async () => {
    const { baseElement } = setup({ questionType: 'yes_no' })
    expect(await axe(baseElement)).toHaveNoViolations()
  })

  it('pas de violations axe (single_choice)', async () => {
    const { baseElement } = setup({ questionType: 'single_choice', options: OPTIONS })
    expect(await axe(baseElement)).toHaveNoViolations()
  })

  it('pas de violations axe (multiple_choice)', async () => {
    const { baseElement } = setup({ questionType: 'multiple_choice', options: OPTIONS })
    expect(await axe(baseElement)).toHaveNoViolations()
  })

  it('pas de violations axe (short_text)', async () => {
    const { baseElement } = setup({ questionType: 'short_text' })
    expect(await axe(baseElement)).toHaveNoViolations()
  })

  it('pas de violations axe (succès)', async () => {
    const u = userEvent.setup()
    const { baseElement } = setup({ questionType: 'yes_no', closesAtLabel: '20 juin' })
    await u.click(screen.getByRole('radio', { name: 'Oui' }))
    await u.click(submitBtn())
    await waitFor(() => screen.getByText('Vote enregistré'))
    expect(await axe(baseElement)).toHaveNoViolations()
  })
})
