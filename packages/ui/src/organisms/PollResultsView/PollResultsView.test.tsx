import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

import { PollResultsView, type PollResultRow } from './PollResultsView'

expect.extend(toHaveNoViolations)

const YESNO: PollResultRow[] = [
  { label: 'Oui', pct: 67 },
  { label: 'Non', pct: 25 },
  { label: 'Abstention', pct: 8 },
]

describe('PollResultsView — options', () => {
  it('titre, badge Résultats, barres et pied participation', () => {
    render(
      <PollResultsView
        title="Faut-il diversifier vers les SCPI ?"
        questionType="yes_no"
        rows={YESNO}
        participation="12/12 membres ont voté (100 %)"
      />
    )
    expect(screen.getByText('Faut-il diversifier vers les SCPI ?')).toBeInTheDocument()
    expect(screen.getByText('Résultats')).toBeInTheDocument()
    expect(screen.getByText('12/12 membres ont voté (100 %)')).toBeInTheDocument()
    expect(screen.getAllByRole('progressbar')).toHaveLength(3)
  })

  it('marque l’option majoritaire (1ère au pct max)', () => {
    render(<PollResultsView title="V" questionType="yes_no" rows={YESNO} />)
    // Le label « Option majoritaire » n'apparaît qu'une fois.
    expect(screen.getAllByText(/Option majoritaire/i)).toHaveLength(1)
  })

  it('multiple_choice : note « % dépassent 100 % »', () => {
    render(
      <PollResultsView
        title="Thèmes AG"
        questionType="multiple_choice"
        rows={[
          { label: 'Gouvernance', pct: 91 },
          { label: 'Bilan annuel', pct: 82 },
        ]}
      />
    )
    expect(
      screen.getByText('Les % dépassent 100 % car les réponses sont multiples.')
    ).toBeInTheDocument()
  })

  it('valeurs pct clampées/arrondies : jamais de NaN', () => {
    render(
      <PollResultsView
        title="V"
        questionType="single_choice"
        rows={[
          { label: 'A', pct: NaN },
          { label: 'B', pct: 150 },
          { label: 'C', pct: 44.6 },
        ]}
      />
    )
    expect(screen.getByText('0 %')).toBeInTheDocument()
    expect(screen.getByText('100 %')).toBeInTheDocument()
    expect(screen.getByText('45 %')).toBeInTheDocument()
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
  })

  it('aucune row → EmptyState + pied repli « — »', () => {
    render(<PollResultsView title="V" questionType="yes_no" rows={[]} />)
    expect(screen.getByText('Aucun résultat')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('PollResultsView — short_text', () => {
  it('liste numérotée + « … N autres réponses » sans attribution', () => {
    render(
      <PollResultsView
        title="Une remarque ?"
        questionType="short_text"
        textResponses={['R1', 'R2', 'R3', 'R4', 'R5']}
        participation="9/12 membres ont voté (75 %)"
      />
    )
    expect(screen.getByText('R1')).toBeInTheDocument()
    expect(screen.getByText('R3')).toBeInTheDocument()
    expect(screen.queryByText('R4')).not.toBeInTheDocument()
    expect(screen.getByText('… 2 autres réponses')).toBeInTheDocument()
    expect(screen.getByText('9/12 membres ont voté (75 %)')).toBeInTheDocument()
  })

  it('aucune réponse texte → EmptyState', () => {
    render(<PollResultsView title="V" questionType="short_text" textResponses={[]} />)
    expect(screen.getByText('Aucun résultat')).toBeInTheDocument()
  })
})

describe('PollResultsView — i18n & a11y', () => {
  it('libellés via props (EN)', () => {
    render(
      <PollResultsView
        title="Results"
        questionType="yes_no"
        rows={YESNO}
        labels={{ results: 'Results', majority: 'Top answer' }}
      />
    )
    expect(screen.getByRole('heading', { name: 'Results' })).toBeInTheDocument()
    expect(screen.getByText(/Top answer/i)).toBeInTheDocument()
  })

  it('jamais de rouge brand en dur', () => {
    const { container } = render(<PollResultsView title="V" questionType="yes_no" rows={YESNO} />)
    expect(container.innerHTML).not.toMatch(/E93E3A/i)
  })

  it('pas de violations axe (barres)', async () => {
    const { container } = render(
      <PollResultsView title="V" questionType="yes_no" rows={YESNO} participation="12/12 (100 %)" />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('pas de violations axe (short_text)', async () => {
    const { container } = render(
      <PollResultsView
        title="V"
        questionType="short_text"
        textResponses={['R1', 'R2']}
        participation="9/12 (75 %)"
      />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
