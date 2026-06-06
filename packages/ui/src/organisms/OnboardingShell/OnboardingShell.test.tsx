import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { OnboardingShell } from './OnboardingShell'

expect.extend(toHaveNoViolations)

describe('OnboardingShell — accessibilité (jest-axe)', () => {
  it('rendu complet sans violations axe', async () => {
    const { container } = render(
      <OnboardingShell
        header={<h2>En-tête de test</h2>}
        footer={<button type="button">Continuer</button>}
      >
        <p>Contenu principal</p>
      </OnboardingShell>
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('sans footer — pas de violations axe', async () => {
    const { container } = render(
      <OnboardingShell header={<h2>Sans footer</h2>}>
        <p>Contenu seul</p>
      </OnboardingShell>
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('OnboardingShell — rendu des slots', () => {
  it('affiche le header quand fourni', () => {
    const { getByText } = render(
      <OnboardingShell header={<h2>Mon en-tête</h2>}>
        <p>Contenu</p>
      </OnboardingShell>
    )
    expect(getByText('Mon en-tête')).toBeTruthy()
  })

  it('affiche le contenu children', () => {
    const { getByText } = render(
      <OnboardingShell>
        <p>Contenu principal unique</p>
      </OnboardingShell>
    )
    expect(getByText('Contenu principal unique')).toBeTruthy()
  })

  it('affiche le footer quand fourni', () => {
    const { getByText } = render(
      <OnboardingShell footer={<button type="button">Étape suivante</button>}>
        <p>Contenu</p>
      </OnboardingShell>
    )
    expect(getByText('Étape suivante')).toBeTruthy()
  })

  it("n'affiche pas le footer quand non fourni", () => {
    const { queryByRole } = render(
      <OnboardingShell>
        <p>Contenu sans footer</p>
      </OnboardingShell>
    )
    // Aucun bouton de navigation n'est rendu
    expect(queryByRole('button')).toBeNull()
  })

  it('largeur narrow par défaut (640 px), wide sur demande (960 px)', () => {
    const { container, rerender } = render(
      <OnboardingShell>
        <p>Contenu</p>
      </OnboardingShell>
    )
    expect(container.querySelector('.max-w-\\[640px\\]')).toBeTruthy()

    rerender(
      <OnboardingShell width="wide">
        <p>Contenu</p>
      </OnboardingShell>
    )
    expect(container.querySelector('.max-w-\\[960px\\]')).toBeTruthy()
  })
})
