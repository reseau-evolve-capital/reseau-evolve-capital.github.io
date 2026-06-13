import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'

import { PollCard } from './PollCard'

expect.extend(toHaveNoViolations)

describe('PollCard — to_vote', () => {
  it('badge « À voter », méta et CTA Voter', async () => {
    const u = userEvent.setup()
    const onVote = vi.fn()
    render(
      <PollCard
        title="Faut-il diversifier vers les SCPI ?"
        status="to_vote"
        type="Choix unique"
        deadline="Clôture 20 juin"
        onVote={onVote}
      />
    )
    expect(screen.getByText('À voter')).toBeInTheDocument()
    expect(screen.getByText('Choix unique · Clôture 20 juin')).toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: /Voter/ }))
    expect(onVote).toHaveBeenCalledTimes(1)
  })
})

describe('PollCard — voted', () => {
  it('badge « ✓ Voté » + hint résultats à la clôture quand non disponibles', () => {
    render(
      <PollCard title="AG septembre ?" status="voted" type="Oui / Non" deadline="Clôture 28 juin" />
    )
    expect(screen.getByText('✓ Voté')).toBeInTheDocument()
    expect(screen.getByText('Résultats disponibles à la clôture')).toBeInTheDocument()
  })

  it('lien Résultats quand resultsAvailable', async () => {
    const u = userEvent.setup()
    const onViewResults = vi.fn()
    render(
      <PollCard title="Vote live" status="voted" resultsAvailable onViewResults={onViewResults} />
    )
    await u.click(screen.getByRole('button', { name: /Voir résultats/ }))
    expect(onViewResults).toHaveBeenCalledTimes(1)
  })
})

describe('PollCard — closed', () => {
  it('badge « Clôturé », participation et lien Voir résultats', async () => {
    const u = userEvent.setup()
    const onViewResults = vi.fn()
    render(
      <PollCard
        title="Quel secteur prioriser pour Q3 ?"
        status="closed"
        closedAt="Clos le 31 mai"
        participation="10/12 membres ont voté (83 %)"
        onViewResults={onViewResults}
      />
    )
    expect(screen.getByText('Clôturé')).toBeInTheDocument()
    expect(screen.getByText('Clos le 31 mai')).toBeInTheDocument()
    expect(screen.getByText('10/12 membres ont voté (83 %)')).toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: /Voir résultats/ }))
    expect(onViewResults).toHaveBeenCalledTimes(1)
  })

  it('participation manquante → repli « — »', () => {
    render(<PollCard title="Vote" status="closed" onViewResults={vi.fn()} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('PollCard — a11y', () => {
  it('CTA ≥ 44px (classes)', () => {
    render(<PollCard title="Vote" status="to_vote" onVote={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Voter/ }).className).toMatch(/min-h-\[44px\]/)
  })

  it('pas de violations axe (les 3 statuts)', async () => {
    const { container } = render(
      <div>
        <PollCard
          title="A"
          status="to_vote"
          type="Choix unique"
          deadline="Clôture 20 juin"
          onVote={vi.fn()}
        />
        <PollCard title="B" status="voted" deadline="Clôture 28 juin" />
        <PollCard
          title="C"
          status="closed"
          closedAt="Clos le 2 mai"
          participation="8/12 (67 %)"
          onViewResults={vi.fn()}
        />
      </div>
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
