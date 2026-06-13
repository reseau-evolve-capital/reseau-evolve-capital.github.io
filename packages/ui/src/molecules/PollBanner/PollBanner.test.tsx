import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'

import { PollBanner } from './PollBanner'

expect.extend(toHaveNoViolations)

describe('PollBanner — single', () => {
  it('affiche titre, type, deadline et le CTA Voter', () => {
    render(
      <PollBanner
        title="Faut-il diversifier vers les SCPI ?"
        type="Choix unique"
        deadline="Clôture 20 juin"
        onVote={vi.fn()}
      />
    )
    expect(screen.getByText('Faut-il diversifier vers les SCPI ?')).toBeInTheDocument()
    expect(screen.getByText('Choix unique · Clôture 20 juin')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Voter/ })).toBeInTheDocument()
  })

  it('le clic sur Voter déclenche onVote', async () => {
    const u = userEvent.setup()
    const onVote = vi.fn()
    render(<PollBanner title="Vote" type="Oui / Non" onVote={onVote} />)
    await u.click(screen.getByRole('button', { name: /Voter/ }))
    expect(onVote).toHaveBeenCalledTimes(1)
  })

  it('titre manquant → repli « — », pas de crash', () => {
    render(<PollBanner onVote={vi.fn()} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('CTA ≥ 44px et focus glow (classes)', () => {
    render(<PollBanner title="Vote" onVote={vi.fn()} />)
    const cta = screen.getByRole('button', { name: /Voter/ })
    expect(cta.className).toMatch(/min-h-\[44px\]/)
    expect(cta.className).toContain('--sh-glow')
  })
})

describe('PollBanner — aggregate', () => {
  it('affiche le nombre de votes en attente et le CTA Voir tous', async () => {
    const u = userEvent.setup()
    const onViewAll = vi.fn()
    render(
      <PollBanner
        variant="aggregate"
        count={4}
        aggregateSubtitle="Échéances entre le 18 et le 30 juin"
        onViewAll={onViewAll}
      />
    )
    expect(screen.getByText('4 votes en attente de votre réponse')).toBeInTheDocument()
    expect(screen.getByText('Échéances entre le 18 et le 30 juin')).toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: /Voir tous/ }))
    expect(onViewAll).toHaveBeenCalledTimes(1)
  })
})

describe('PollBanner — i18n & a11y', () => {
  it('libellés via props (EN)', () => {
    render(
      <PollBanner
        title="Diversify into REITs?"
        type="Single choice"
        labels={{ voteCta: 'Vote' }}
        onVote={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /Vote/ })).toBeInTheDocument()
  })

  it('jamais de rouge brand en dur', () => {
    const { container } = render(<PollBanner title="Vote" onVote={vi.fn()} />)
    expect(container.innerHTML).not.toMatch(/E93E3A/i)
  })

  it('pas de violations axe (single)', async () => {
    const { container } = render(
      <PollBanner title="Vote" type="Oui / Non" deadline="Clôture 20 juin" onVote={vi.fn()} />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('pas de violations axe (aggregate)', async () => {
    const { container } = render(
      <PollBanner variant="aggregate" count={3} aggregateSubtitle="…" onViewAll={vi.fn()} />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
